/**
 * initializeRoundSlice - Round initialization and offline loading for scorecardStore
 */

import { Scorecard, Player, Hole, GameType, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import { isSingleBallScore } from '@/types/database/base';
import {
  saveScorecard,
  getScorecardsByRound,
  saveHoles,
  getHoles,
} from '@/services/offline/database';
import { supabase } from '@/services/supabase/client';
import { storeLogger } from '@/utils/debugLogger';
import { pushDiagnostic } from '@/services/diagnostics';
import { filterHolesByNineType, transformHolesIfNeeded } from '@/utils/holeTransformers';
import { isValidUUID } from './utils/scorecardCalculations';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => {
  currentRoundId: string | null;
  currentPlayers: Player[];
  groupScorecards: Map<string, Scorecard>;
};

/**
 * Read the players embedded in cached scorecards for a round. Used as a
 * recovery fallback when the network player query returns 0 — e.g. when
 * round_players is missing on the server but local scorecards still exist
 * from a previous successful initialization.
 */
export async function getOfflinePlayersForRound(roundId: string): Promise<Player[]> {
  try {
    const scorecards = await getScorecardsByRound(roundId);
    const seen = new Set<string>();
    const players: Player[] = [];
    for (const sc of scorecards) {
      if (!sc.player) continue;
      if (!isValidUUID(sc.playerId)) continue;
      if (seen.has(sc.playerId)) continue;
      seen.add(sc.playerId);
      players.push(sc.player);
    }
    return players;
  } catch {
    return [];
  }
}

/**
 * Recovery fetch: pull the course holes for a round from Supabase.
 * Used when the SQLite holes cache has been intentionally cleared (e.g.
 * after a nine_type change) but scorecards still hold scored data — so
 * loadFromOffline can resume rather than fall through to a fresh init
 * that would overwrite the scorecards with empty scores.
 *
 * Yardage hydration is intentionally skipped here — the yardage-hydration
 * effect in useRoundData will fill them in (correctly filtered by
 * nine_type) on the next render. Returning the bare hole structure is
 * enough to unstick the offline-load path.
 */
async function fetchCourseHolesForRound(roundId: string): Promise<Hole[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed query workaround
    const { data, error } = (await (supabase.from('rounds') as any)
      .select(`courses!course_id ( holes )`)
      .eq('id', roundId)
      .maybeSingle()) as {
        data: { courses: { holes: unknown[] | null } | null } | null;
        error: { message: string } | null;
      };

    if (error || !data?.courses?.holes) return null;
    const holes = transformHolesIfNeeded(data.courses.holes);
    return holes.length > 0 ? holes : null;
  } catch {
    return null;
  }
}

export async function initializeRound(
  set: SetFn,
  initSyncListener: () => void,
  roundId: string,
  players: Player[],
  holes: Hole[],
  gameType: GameType = 'stableford',
  isStandalone = false,
  allowedPlayerIds: string[] = [],
  selectedTeeData: TeeBox | null = null,
  handicapSource: HandicapSource = 'profile',
  playerTeeMap: Map<string, TeeBox> = new Map(),
  nineType: NineType = 'full',
  startHole: number = 1,
): Promise<void> {
  // Defensive filter: callers may pass the full course holes (18) regardless
  // of the round's nine_type. Filtering here keeps the in-memory state, the
  // SQLite snapshot, and downstream count/par/sync logic in sync with what
  // the player is actually scoring. Idempotent for already-filtered inputs.
  const filteredHoles = filterHolesByNineType(holes, nineType);

  storeLogger.info('Initializing round', {
    roundId,
    playerCount: players.length,
    holeCount: filteredHoles.length,
    gameType,
    nineType,
    isStandalone,
    allowedPlayerCount: allowedPlayerIds.length,
    hasTeeData: !!selectedTeeData,
  });
  pushDiagnostic('initialize_round.entered', {
    roundId,
    playerCount: players.length,
    holeCount: filteredHoles.length,
    gameType,
    nineType,
  });
  set({ isLoading: true, selectedTeeData });
  initSyncListener();

  try {
    storeLogger.debug('Saving holes to SQLite', { roundId, holeCount: filteredHoles.length });
    await saveHoles(roundId, filteredHoles);

    const newScorecards = new Map<string, Scorecard>();

    for (const player of players) {
      const scorecard: Scorecard = {
        id: `scorecard-${roundId}-${player.id}`,
        roundId,
        playerId: player.id,
        player,
        scores: {},
        totalGross: 0,
        totalNet: 0,
        status: 'in-progress',
        createdAt: new Date(),
        updatedAt: new Date(),
        isStandalone,
      };

      newScorecards.set(player.id, scorecard);

      storeLogger.debug('Saving scorecard to SQLite', {
        scorecardId: scorecard.id,
        playerId: player.id,
        playerName: player.name,
      });
      await saveScorecard(scorecard);
    }

    set({
      currentRoundId: roundId,
      currentPlayers: players,
      currentHole: filteredHoles[0]?.number ?? 1,
      holes: filteredHoles,
      gameType,
      handicapSource,
      groupScorecards: newScorecards,
      allowedPlayerIds,
      playerTeeMap,
      nineType,
      startHole,
      isLoading: false,
      isInitialized: true,
    });

    storeLogger.info('Round initialized successfully', {
      roundId,
      scorecardCount: newScorecards.size,
      allowedPlayers: allowedPlayerIds.length > 0 ? allowedPlayerIds.length : 'all',
    });
    pushDiagnostic('initialize_round.success', {
      roundId,
      scorecardCount: newScorecards.size,
      holeCount: filteredHoles.length,
    });
  } catch (error) {
    storeLogger.error('Failed to initialize round', error, { roundId });
    pushDiagnostic('initialize_round.threw', {
      roundId,
      error: error instanceof Error ? error.message : String(error),
    }, 'error');
    set({ isLoading: false });
    throw error;
  }
}

export async function loadFromOffline(
  set: SetFn,
  initSyncListener: () => void,
  roundId: string,
): Promise<boolean> {
  storeLogger.info('Loading round from offline storage', { roundId });
  pushDiagnostic('offline_load.entered', { roundId });
  set({ isLoading: true });
  initSyncListener();

  try {
    const scorecards = await getScorecardsByRound(roundId);
    storeLogger.debug('Loaded scorecards from SQLite', {
      roundId,
      scorecardCount: scorecards.length,
    });
    pushDiagnostic('offline_load.scorecards_read', {
      roundId,
      scorecardCount: scorecards.length,
    });

    if (scorecards.length === 0) {
      storeLogger.info('No cached scorecards found', { roundId });
      pushDiagnostic('offline_load.no_cached_scorecards', { roundId });
      set({ isLoading: false });
      return false;
    }

    const hasInvalidData = scorecards.some(
      (sc) => !isValidUUID(sc.playerId) || !isValidUUID(sc.roundId)
    );

    if (hasInvalidData) {
      storeLogger.warn('Cached data has invalid UUIDs (mock data), ignoring', { roundId });
      pushDiagnostic('offline_load.invalid_uuids', { roundId }, 'warn');
      set({ isLoading: false });
      return false;
    }

    let cachedHoles = await getHoles(roundId);
    storeLogger.debug('Loaded holes from SQLite', { roundId, holeCount: cachedHoles.length });
    pushDiagnostic('offline_load.holes_read', {
      roundId,
      holeCount: cachedHoles.length,
    });

    if (cachedHoles.length === 0) {
      // The holes cache may have been intentionally cleared (e.g. after a
      // nine_type change in EditNineTypeSheet) while scorecards still hold
      // scored data. Falling through to fresh init via initializeRound would
      // overwrite those SQLite scorecards with empty `scores: {}` — losing
      // any unsynced strokes. Try a network recovery fetch first; only bail
      // if Supabase is unreachable.
      storeLogger.info('Holes cache empty, attempting recovery fetch from network', { roundId });
      pushDiagnostic('offline_load.holes_recovery_fetch', { roundId });
      const remoteHoles = await fetchCourseHolesForRound(roundId);
      if (!remoteHoles || remoteHoles.length === 0) {
        storeLogger.warn('Holes recovery fetch failed, will fetch from network', { roundId });
        pushDiagnostic('offline_load.no_cached_holes', { roundId }, 'warn');
        set({ isLoading: false });
        return false;
      }
      await saveHoles(roundId, remoteHoles);
      cachedHoles = remoteHoles;
      pushDiagnostic('offline_load.holes_recovered', {
        roundId,
        holeCount: remoteHoles.length,
      });
    }

    const newScorecards = new Map<string, Scorecard>();
    const players: Player[] = [];

    for (const scorecard of scorecards) {
      newScorecards.set(scorecard.playerId, scorecard);
      if (scorecard.player) {
        players.push(scorecard.player);
      }
    }

    // Refresh each not-yet-submitted player's handicap from the live `players`
    // table. The player object embedded in a cached scorecard is frozen into
    // SQLite (ScorecardDAO.player_handicap) when the round is FIRST opened on
    // this device; if the player's handicap changed since, resuming the round
    // would otherwise score with — and snapshot at submit — the stale value
    // (the original cause of a resumed round using a month-old handicap).
    // Submitted cards ('completed'/'confirmed') are intentionally left frozen
    // so their recorded handicap is preserved. Network-guarded: on any failure
    // we keep the cached values (offline-first). players[i] and
    // newScorecards.get(id).player are the same reference (loop above), so
    // patching `players` updates the embedded scorecard players too.
    try {
      const refreshableIds = new Set(
        scorecards
          .filter((sc) => sc.status !== 'completed' && sc.status !== 'confirmed')
          .map((sc) => sc.playerId)
      );
      const idsToRefresh = players
        .map((p) => p.id)
        .filter((id) => refreshableIds.has(id));
      if (idsToRefresh.length > 0) {
        const { data: livePlayers } = (await (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed query workaround
          supabase.from('players') as any
        )
          .select('id, handicap, handicap_index, gender')
          .in('id', idsToRefresh)) as {
          data:
            | {
                id: string;
                handicap: number | null;
                handicap_index: number | null;
                gender: 'male' | 'female' | null;
              }[]
            | null;
        };
        if (livePlayers && livePlayers.length > 0) {
          const liveById = new Map(livePlayers.map((lp) => [lp.id, lp]));
          for (const p of players) {
            const live = liveById.get(p.id);
            if (!live) continue;
            if (live.handicap != null) p.handicap = live.handicap;
            if (live.handicap_index != null) p.handicapIndex = live.handicap_index;
            if (live.gender != null) p.gender = live.gender;
          }
        }
      }
    } catch (err) {
      storeLogger.warn(
        'Could not refresh live player handicaps during offline load (using cached)',
        { roundId, error: err instanceof Error ? err.message : String(err) }
      );
    }

    // Restore tee + game context from persisted scorecard metadata +
    // a lightweight query to the rounds table. Without this, a mid-round
    // resume after an app kill would submit with teeData=null, causing
    // sync to skip the handicap snapshot (see calculateHandicapData).
    //
    // Strategy:
    //  1. Use the first scorecard's persisted teeData as the default
    //     selectedTeeData and build playerTeeMap from each scorecard.
    //  2. Fall back to rounds.selected_tee from Supabase if scorecards
    //     have no teeData yet (e.g. round was created but not submitted
    //     before the app was killed).
    //  3. Pull game_type / handicap_source / nine_type from the rounds
    //     row so stableford/par/stroke scoring uses the right calc.
    //
    // All supabase reads live behind a try/catch so offline-first
    // behaviour still works when there's no network — we just fall
    // back to sensible defaults.
    let selectedTeeData: TeeBox | null = null;
    const playerTeeMap = new Map<string, TeeBox>();
    for (const sc of scorecards) {
      if (sc.teeData) {
        playerTeeMap.set(sc.playerId, sc.teeData);
        if (!selectedTeeData) selectedTeeData = sc.teeData;
      }
    }

    let gameType: GameType = 'stableford';
    let handicapSource: HandicapSource = 'profile';
    let nineType: NineType = 'full';
    let nineTypeKnown = false;
    let startHole = 1;

    let courseId: string | null = null;

    try {
      // Race the metadata fetch against a 15s timeout. Without this, a
      // hung Supabase request (no response, no error) blocks loadFromOffline
      // from ever returning, which leaves `isInitialized` false and the
      // score-entry screen stuck on "Loading scorecard…" forever.
      //
      // Important: keep this select to columns on `rounds` only. A failed
      // join (e.g. against a column that doesn't exist yet because a
      // migration hasn't been applied) would surface as an error here and
      // hit the catch below. We now track `nineTypeKnown` so a failed read
      // doesn't silently default to 'full' — instead we bail and let
      // useRoundData's hook-driven init use useRoundMetadata's value.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed query workaround
      const fetchMetadata = (supabase.from('rounds') as any)
        .select('game_type, handicap_source, nine_type, selected_tee, course_id')
        .eq('id', roundId)
        .maybeSingle();

      const { data: roundData } = (await Promise.race([
        fetchMetadata,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Round metadata fetch timed out after 15s')), 15_000)
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- result shape from Supabase race
      ])) as { data: any };

      if (roundData) {
        if (roundData.game_type) gameType = roundData.game_type as GameType;
        if (roundData.handicap_source) handicapSource = roundData.handicap_source as HandicapSource;
        if (roundData.nine_type) {
          nineType = roundData.nine_type as NineType;
          nineTypeKnown = true;
        }
        // If no scorecard had persisted teeData, fall back to the round's default
        if (!selectedTeeData && roundData.selected_tee) {
          selectedTeeData = roundData.selected_tee as TeeBox;
        }
        courseId = (roundData.course_id as string | null) ?? null;
      }
    } catch (err) {
      storeLogger.warn('Could not fetch round metadata during offline load', {
        roundId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // If the metadata fetch failed (or returned no nine_type), we can't safely
    // filter cachedHoles here — silently using 'full' would resume a Front 9 /
    // Back 9 round with all 18 holes visible. Bail so useRoundData falls
    // through to its hook-driven init path, which uses useRoundMetadata
    // (with React Query retry) to resolve nine_type before calling
    // initializeRound. initializeRound then filters defensively.
    if (!nineTypeKnown) {
      storeLogger.warn(
        'Could not determine nine_type during offline load — falling back to network init',
        { roundId }
      );
      pushDiagnostic('offline_load.nine_type_unknown', { roundId }, 'warn');
      set({ isLoading: false });
      return false;
    }

    // start_hole is queried separately so a missing column or join issue
    // can't break the nine_type read above. Failure here just leaves
    // startHole=1 — useRoundCourse will populate the correct value on its
    // next render.
    if (courseId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed query workaround
        const { data: courseRow } = (await (supabase.from('courses') as any)
          .select('start_hole')
          .eq('id', courseId)
          .maybeSingle()) as { data: { start_hole?: number | null } | null };
        const courseStartHole = courseRow?.start_hole;
        if (typeof courseStartHole === 'number') startHole = courseStartHole;
      } catch (startHoleErr) {
        storeLogger.warn('start_hole fetch failed during offline load — defaulting to 1', {
          roundId,
          error: startHoleErr instanceof Error ? startHoleErr.message : String(startHoleErr),
        });
      }
    }

    // Defensive filter: SQLite may hold 18 holes (round saved by older code,
    // or via a path that didn't pass nine_type). Apply the round's nine_type
    // so getCompletedHolesCount, coursePar, and submit validation match what
    // the player is actually scoring.
    const holes = filterHolesByNineType(cachedHoles, nineType);

    const holeNumbers = holes.map((h: any) => h.number ?? h.hole_number);
    let currentHole = holeNumbers[0] ?? 1;
    for (const h of holeNumbers) {
      const allComplete = players.every((player) => {
        const sc = newScorecards.get(player.id);
        const score = sc?.scores[h];
        return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
      });
      if (!allComplete) {
        currentHole = h;
        break;
      }
      if (h === holeNumbers[holeNumbers.length - 1]) {
        currentHole = h;
      }
    }

    set({
      currentRoundId: roundId,
      currentPlayers: players,
      currentHole,
      holes,
      groupScorecards: newScorecards,
      selectedTeeData,
      playerTeeMap,
      gameType,
      handicapSource,
      nineType,
      startHole,
      isLoading: false,
      isInitialized: true,
    });

    storeLogger.info('Loaded from offline successfully', {
      roundId,
      playerCount: players.length,
      resumeAtHole: currentHole,
      hasTeeData: !!selectedTeeData,
      gameType,
      nineType,
    });
    pushDiagnostic('offline_load.success', {
      roundId,
      playerCount: players.length,
      holeCount: holes.length,
      resumeAtHole: currentHole,
      hasTeeData: !!selectedTeeData,
      gameType,
      nineType,
    });
    return true;
  } catch (error) {
    storeLogger.error('Failed to load from offline', error, { roundId });
    pushDiagnostic('offline_load.threw', {
      roundId,
      error: error instanceof Error ? error.message : String(error),
    }, 'error');
    set({ isLoading: false });
    return false;
  }
}

/**
 * Idempotent backfill for team-member scorecards.
 *
 * Why this exists: `initializeRound` runs once when scoring first opens —
 * if a player is added to a team after that point, no scorecard ever gets
 * created for them. They appear on the Teams tab and as a contribution
 * candidate (those read team_members directly), but they're missing from
 * the round leaderboard team list and have no entry on the scorecard
 * screen.
 *
 * Called on every mount of useRoundData after the early-return paths so
 * any newly-added team members get a scorecard inserted now. Skips
 * players who already have a scorecard.
 */
export async function ensureTeamMemberScorecards(
  set: SetFn,
  get: GetFn,
  teamMemberPlayers: Player[]
): Promise<void> {
  const state = get();
  const { currentRoundId, currentPlayers, groupScorecards } = state;

  if (!currentRoundId) return;
  if (teamMemberPlayers.length === 0) return;

  const missing = teamMemberPlayers.filter(
    (p) => !groupScorecards.has(p.id)
  );

  if (missing.length === 0) return;

  storeLogger.info('Ensuring scorecards for newly-added team members', {
    roundId: currentRoundId,
    missingCount: missing.length,
    missingPlayers: missing.map((p) => p.name),
  });

  const updatedScorecards = new Map(groupScorecards);

  for (const player of missing) {
    const scorecard: Scorecard = {
      id: `scorecard-${currentRoundId}-${player.id}`,
      roundId: currentRoundId,
      playerId: player.id,
      player,
      scores: {},
      totalGross: 0,
      totalNet: 0,
      status: 'in-progress',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Match initializeRound's behaviour: inherit isStandalone from any
      // existing scorecard (they all share the same flag for a round).
      isStandalone: groupScorecards.values().next().value?.isStandalone ?? false,
    };

    updatedScorecards.set(player.id, scorecard);

    try {
      await saveScorecard(scorecard);
    } catch (error) {
      storeLogger.error('Failed to save backfill scorecard to SQLite', error, {
        scorecardId: scorecard.id,
        playerId: player.id,
      });
      // Don't bail on the whole batch — keep going for other missing
      // players. The in-memory state still gets updated below.
    }
  }

  // Merge the new players into currentPlayers (preserving original order
  // for stable rendering, then appending the new ones at the end).
  const existingIds = new Set(currentPlayers.map((p) => p.id));
  const appendedPlayers = missing.filter((p) => !existingIds.has(p.id));

  set({
    currentPlayers: [...currentPlayers, ...appendedPlayers],
    groupScorecards: updatedScorecards,
  });

  storeLogger.info('Backfilled team member scorecards', {
    roundId: currentRoundId,
    added: missing.length,
  });
}
