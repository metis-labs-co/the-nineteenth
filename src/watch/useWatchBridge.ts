/**
 * useWatchBridge — Apple Watch companion wiring hook (plan task M3.2)
 *
 * Thin integration glue between existing app state and the watch transport.
 * All testable logic lives in the pure functions:
 *   - buildWatchSnapshot (./snapshot)
 *   - applyWatchScoreWrite (./scoreWrite)
 *   - createWatchConnectivityTransport (./transport)
 *
 * Responsibilities:
 *  1. Build a WatchSnapshot from current app state and push it through the
 *     transport whenever inputs change.
 *  2. Subscribe to inbound WatchScoreWrite messages, apply each, and ack back.
 *
 * Safety: the transport is a no-op (isSupported() === false) on non-iOS and
 * when react-native-watch-connectivity is unavailable, so both effects
 * early-return when unsupported / no active round / no user. Queries default
 * to empty arrays so undefined data never crashes the mapping.
 *
 * Correctness is verified on-device (plan M5); there is no unit test for this
 * wiring hook.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayersToScore } from '@/hooks/scoringPairs/queries';
import { useStatsVisibilityWithTier } from '@/hooks/subscription/statsVisibility';
import { useIsPremium } from '@/context/SubscriptionContext';
import { useCompetitionLeaderboard } from '@/hooks/competitions/leaderboard';
import { useHoleCoordinates } from '@/hooks/coordinates';
import { useWeather } from '@/hooks/weather';
import { useAuth } from '@/hooks/useAuth';
import type { HoleScore } from '@/types/database/base';
import { buildWatchSnapshot } from './snapshot';
import { applyWatchScoreWrite, type ScoreWriteContext } from './scoreWrite';
import { createWatchTransport } from './transport';
import { useActiveRoundIds } from './useActiveRoundIds';
import type { WatchScoreWrite, WatchStatFlags } from './types';

export interface UseWatchBridgeOptions {
  /** Active competition id override (otherwise resolved from the active round). */
  competitionId?: string;
  /** Active course id override (otherwise resolved from the active round). */
  courseId?: string;
}

export function useWatchBridge(opts: UseWatchBridgeOptions = {}) {
  const transport = useMemo(() => createWatchTransport(), []);
  const revRef = useRef(0);
  const seenRef = useRef(new Set<string>());
  const lastEditedRef = useRef(new Map<string, number>());

  const { user } = useAuth();

  // Scorecard store (Zustand — no provider needed).
  const roundId = useScorecardStore((s) => s.currentRoundId);
  const currentHole = useScorecardStore((s) => s.currentHole);
  const currentPlayers = useScorecardStore((s) => s.currentPlayers);
  const holes = useScorecardStore((s) => s.holes);
  const groupScorecards = useScorecardStore((s) => s.groupScorecards);
  const updatePlayerHoleScore = useScorecardStore((s) => s.updatePlayerHoleScore);
  const setCurrentHole = useScorecardStore((s) => s.setCurrentHole);

  const unit = useSettingsStore((s) => s.distanceUnit);
  const vis = useStatsVisibilityWithTier();
  const isPremium = useIsPremium();

  // Resolve the active round's course/competition ids so distance-to-green and
  // leaderboard populate without the caller threading ids through. Explicit
  // opts win when provided.
  const resolvedIds = useActiveRoundIds(roundId);
  const competitionId = opts.competitionId ?? resolvedIds.competitionId ?? '';
  const courseId = opts.courseId ?? resolvedIds.courseId ?? '';

  // Disabled (returns undefined) when ids are absent; defaulted to [].
  const { data: playersToScore = [] } = usePlayersToScore(roundId ?? '', user?.id ?? '');
  const { data: leaderboard = [] } = useCompetitionLeaderboard(competitionId);
  const { data: coords = [] } = useHoleCoordinates(courseId);

  // Course location for the wind fetch: the current hole's green centre, else any
  // green centre, else any coord. Open-Meteo rounds to ~0.01° so course-level
  // precision is plenty and the query key stays stable across holes.
  const weatherCoord = useMemo(() => {
    if (!coords.length) return null;
    const pick =
      coords.find((c) => c.hole_number === currentHole && c.poi_type === 'green_center') ??
      coords.find((c) => c.poi_type === 'green_center') ??
      coords[0];
    return { lat: pick.latitude, lng: pick.longitude };
  }, [coords, currentHole]);

  const { data: weather } = useWeather(
    weatherCoord ? { kind: 'current', lat: weatherCoord.lat, lng: weatherCoord.lng } : null,
  );

  // Stable while the (React Query–cached) weather value is stable, so it can be a
  // snapshot-effect dependency without re-pushing every render.
  const wind = useMemo(
    () => (weather ? { speedKph: weather.windKph, fromDeg: weather.windDirDeg } : undefined),
    [weather],
  );

  // Map the app's tier-resolved stat visibility to the watch's flag shape.
  const statFlags: WatchStatFlags = {
    putts: vis.showPutts,
    fairways: vis.showFairwayHit,
    gir: vis.showGreenInRegulation,
    penalties: vis.showHazards,
    bunker: vis.showBunkerShots,
    fairwayDirection: vis.showFairwayMissDirection,
    greenDirection: vis.showGreenMissDirection,
  };

  // Players the current user is allowed to score. When no scoring pairs are
  // configured the user scores only themselves.
  const allowedIds = playersToScore.length
    ? playersToScore.map((p) => p.id)
    : user
      ? [user.id]
      : [];

  // Read a player's per-hole scores from their scorecard. The watch only deals
  // with single-ball scores, so we treat the JSONB map as Record<string, HoleScore>.
  const scoresFor = (playerId: string): Record<string, HoleScore> =>
    (groupScorecards.get(playerId)?.scores as Record<string, HoleScore> | undefined) ?? {};

  // Refs mirroring the latest render values so the (stable) inbound-write
  // subscription can build a fresh ScoreWriteContext per message instead of
  // closing over stale authorization / premium / scorecard data. Assigned on
  // every render — NOT inside an effect — so they always reflect current state.
  const allowedIdsRef = useRef<string[]>([]);
  allowedIdsRef.current = allowedIds;
  const groupScorecardsRef = useRef(groupScorecards);
  groupScorecardsRef.current = groupScorecards;
  const statFlagsRef = useRef(statFlags);
  statFlagsRef.current = statFlags;

  // ── Effect 1: push snapshot whenever inputs change ────────────────────────
  useEffect(() => {
    if (!transport.isSupported() || !roundId || !user) return;
    const rev = ++revRef.current;
    transport.updateContext(
      buildWatchSnapshot({
        rev,
        roundId,
        competitionName: 'Round',
        unit,
        isPremium,
        statFlags,
        currentHole,
        currentUserId: user.id,
        holes: holes.map((h) => ({
          hole: h.number,
          par: h.par,
          strokeIndex: h.strokeIndex,
        })),
        coords: coords.map((c) => ({
          hole: c.hole_number,
          poiType: c.poi_type,
          latitude: c.latitude,
          longitude: c.longitude,
        })),
        pairPlayers: currentPlayers
          .filter((p) => allowedIds.includes(p.id))
          .map((p) => ({ playerId: p.id, name: p.name, scores: scoresFor(p.id) })),
        leaderboard: leaderboard.map((e) => ({
          rank: e.position,
          name: e.participantName,
          detail: String(e.totalPoints),
          playerId: e.participantId,
        })),
        wind,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    transport,
    roundId,
    user,
    unit,
    isPremium,
    currentHole,
    holes,
    coords,
    currentPlayers,
    groupScorecards,
    leaderboard,
    wind,
  ]);

  // ── Effect 2: apply inbound writes and ack ────────────────────────────────
  // The subscription is stable (created once per supported+round+user). The
  // ScoreWriteContext is rebuilt FRESH inside the onMessage callback on every
  // inbound message, reading current values from refs, so authorization /
  // premium / scorecard data can never go stale mid-round.
  useEffect(() => {
    if (!transport.isSupported() || !roundId || !user) return;

    const off = transport.onMessage(async (msg: WatchScoreWrite) => {
      const ctx: ScoreWriteContext = {
        currentUserId: user.id,
        allowedPlayerIds: new Set(
          allowedIdsRef.current.length ? allowedIdsRef.current : user ? [user.id] : [],
        ),
        statFlags: statFlagsRef.current,
        getExisting: (playerId, hole) =>
          (groupScorecardsRef.current.get(playerId)?.scores as
            | Record<string, HoleScore>
            | undefined)?.[String(hole)],
        getLastEditedRev: (playerId, hole) =>
          lastEditedRef.current.get(`${playerId}:${hole}`) ?? -1,
        seen: seenRef.current,
        applyHoleScore: async (playerId, hole, holeScore) => {
          await updatePlayerHoleScore(playerId, hole, holeScore);
        },
        markEdited: (playerId, hole, rev) =>
          lastEditedRef.current.set(`${playerId}:${hole}`, rev),
        nextRev: () => ++revRef.current,
      };

      const res = await applyWatchScoreWrite(msg, ctx);
      transport.sendAck({
        clientWriteId: res.clientWriteId,
        status: res.status,
        rev: res.rev ?? revRef.current,
      });
    });
    return off;
  }, [transport, roundId, user, updatePlayerHoleScore]);

  // ── Effect 3: apply inbound hole-navigation from the watch ────────────────
  useEffect(() => {
    if (!transport.isSupported() || !roundId || !user) return;
    const off = transport.onNavigate((nav) => {
      setCurrentHole(nav.hole);
    });
    return off;
  }, [transport, roundId, user, setCurrentHole]);
}
