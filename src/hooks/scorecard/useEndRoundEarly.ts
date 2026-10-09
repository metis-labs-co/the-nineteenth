/** End confirmation uses one held coordinator and the existing atomic local/authoritative repair paths. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScorecardStore, type CapturedRoundEndEarly } from '@/store/scorecardStore';
import { scoresEveryPlayer } from '@/store/endRoundEarlySlice';
import { useToast } from '@/context/ToastContext';
import { checkIsOnline } from '@/hooks/useOnlineStatus';
import { filterHolesByNineType, filterPlayableHoles } from '@/utils/holeTransformers';
import { calculatePlayerStats } from '@/utils/scorecardCalculations';
import {
  describeEndRoundEarlyResult,
  planEndRoundEarly,
  type EndEarlyMatchContext,
  type EndRoundEarlyPlan,
  type EndRoundEarlyStatsRow,
} from '@/utils/endRoundEarly';
import {
  applyEndRoundEarly,
  EndRoundEarlyError,
  type EndRoundEarlyErrorCode,
} from '@/services/rounds/applyEndRoundEarly';
import { queryClient } from '@/services/queryClient';
import { roundKeys, skinsKeys } from '@/hooks/queryKeys';
import { scoringLogger } from '@/utils/debugLogger';
import type { EndRoundEarlySheetProps } from '@/components/scorecard/EndRoundEarlySheet';
import type { GameType, HandicapSource, NineType, TeamFormat } from '@/types/database/enums';
import type { Hole, Player, Scorecard, TeeBox } from '@/types';

import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { useAuthSession } from '@/hooks/auth/useAuthSession';
import {
  withRoundScoringWrite,
  getRoundEndPrerequisite,
} from '@/services/rounds/roundScoringCoordinator';
import { fetchRoundScoringShape } from '@/services/rounds/roundScoringShape';
import { adoptRoundShapeWithinScoringWrite } from '@/services/rounds/roundScoringAdoption';
import {
  captureRoundPersistenceSource,
  isRoundPersistenceSourceCurrent,
} from '@/services/offline/roundPersistenceBarrier';
import { removePendingSync } from '@/services/offline/database';
import {
  capturePendingEndIntentSnapshot,
  isOwnedEndIntentSnapshot,
} from '@/services/offline/dao/pendingSyncRecovery';

export interface UseEndRoundEarlyArgs {
  roundId: string;
  /** From the round row (competition_id == null) when available — social rounds only. */
  isStandalone: boolean;
  gameType: GameType;
  /** Round team format. Team stroke formats get no result preview. */
  teamFormat?: TeamFormat | null;
  /** With scoring pairs, currentPlayers is only the paired subset — never offer the action. */
  scoringPairsEnabled: boolean;
  /** Match-play screens: the live match state (built with the screen's match handicaps). */
  getMatchContext?: () => EndEarlyMatchContext | null;
  /** Fires once the round is ended (N may be the server's N after a conflict). */
  onEnded: (holesPlayed: number) => void;
}

export interface UseEndRoundEarlyResult {
  canEndRoundEarly: boolean;
  /** The store holds this round and it has been ended early. */
  isEnded: boolean;
  open: () => void;
  sheetProps: EndRoundEarlySheetProps;
}

interface PreviewInputs {
  plan: EndRoundEarlyPlan;
  holes: Hole[];
  nineType: NineType;
  gameType: GameType;
  teamFormat: TeamFormat | null;
  isMultiBall: boolean;
  getMatchContext?: () => EndEarlyMatchContext | null;
  players: Player[];
  scorecards: Map<string, Scorecard>;
  playerTeeMap: Map<string, TeeBox>;
  selectedTeeData: TeeBox | null;
  handicapSource: HandicapSource;
}

/**
 * The preview runs the same maths as the finish screen: the round's PLANNED
 * holes plus holesPlayed — never a played-only slice — so the daily handicap
 * (derived from Σpar) is the one the round keeps. Multi-ball rounds get no
 * preview (calculatePlayerStats reads single-ball scores only).
 */
function buildResultPreview({
  plan,
  holes,
  nineType,
  gameType,
  teamFormat,
  isMultiBall,
  getMatchContext,
  players,
  scorecards,
  playerTeeMap,
  selectedTeeData,
  handicapSource,
}: PreviewInputs): string | null {
  const matchContext = getMatchContext?.() ?? null;
  if (matchContext) {
    const playedHoleNumbers = filterPlayableHoles(holes, nineType, plan.holesPlayed).map(
      (hole) => hole.number
    );
    return describeEndRoundEarlyResult({
      ...matchContext,
      playedHoleNumbers,
      // The same planned count the match views pass as totalHoles (B5b):
      // the round's own holes, so a 'full' round on a 9-hole course is
      // measured over 9, not getHoleCount('full') = 18.
      plannedHoles: filterHolesByNineType(holes, nineType).length,
      holesPlayed: plan.holesPlayed,
    });
  }

  if (teamFormat || isMultiBall) return null;
  if (gameType !== 'stroke' && gameType !== 'stableford' && gameType !== 'par') return null;

  const stats: EndRoundEarlyStatsRow[] = players.map((player) => {
    const scorecard = scorecards.get(player.id);
    const [playerStats] = calculatePlayerStats(
      [
        {
          id: player.id,
          playerId: player.id,
          player: {
            id: player.id,
            name: player.name,
            handicap: player.handicap ?? null,
            handicap_index: player.handicapIndex ?? null,
            gender: player.gender ?? null,
          },
          scores: scorecard?.scores ?? null,
          hasScorecard: !!scorecard,
        },
      ],
      filterHolesByNineType(holes, nineType),
      playerTeeMap.get(player.id) ?? selectedTeeData,
      handicapSource,
      { holesPlayed: plan.holesPlayed }
    );
    return playerStats;
  });

  return describeEndRoundEarlyResult({ kind: gameType, stats });
}

function endEarlyErrorCode(error: unknown): EndRoundEarlyErrorCode | null {
  return error instanceof EndRoundEarlyError ? error.code : null;
}

/** The server now holds holes_played: refresh what reads the round shape
 *  (useSkinsHoleCounts, Review's roundDetails / ViewRound's round row). */
function invalidateRoundShapeQueries(roundId: string): void {
  void queryClient.invalidateQueries({ queryKey: skinsKeys.holeCounts(roundId) });
  void queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
}

const END_FAILED_TITLE = 'Could not end the round';

function currentPlan(
  state: ReturnType<typeof useScorecardStore.getState>,
  args: UseEndRoundEarlyArgs,
  sessionOwner: string | null
) {
  if (!sessionOwner || sessionOwner !== getSyncAuthUserId()) return null;
  if (
    !args.isStandalone ||
    args.scoringPairsEnabled ||
    state.currentRoundId !== args.roundId ||
    state.isLoading ||
    !state.isInitialized ||
    !state.holes.length ||
    !state.currentPlayers.length ||
    state.holesPlayed != null ||
    !getSyncAuthUserId()?.trim() ||
    !scoresEveryPlayer(state)
  )
    return null;
  if (
    [...state.groupScorecards.values()].some(
      (card) =>
        card.status === 'completed' ||
        card.status === 'confirmed' ||
        card.submittedAt ||
        card.submittedBy
    )
  )
    return null;
  return planEndRoundEarly({
    holes: state.holes,
    nineType: state.nineType,
    players: state.currentPlayers,
    scorecards: state.groupScorecards,
  });
}
function routeScope(
  args: UseEndRoundEarlyArgs,
  state: ReturnType<typeof useScorecardStore.getState>
) {
  return JSON.stringify([
    args.roundId,
    args.isStandalone,
    args.scoringPairsEnabled,
    args.gameType,
    args.teamFormat ?? null,
    [...state.allowedPlayerIds].sort(),
    state.currentPlayers.map((p) => p.id).sort(),
    [...state.groupScorecards.keys()].sort(),
  ]);
}
interface OpenConfirmation {
  operation: CapturedRoundEndEarly;
  plan: EndRoundEarlyPlan;
  scope: string;
  routeIdentity: object;
}

export function useEndRoundEarly(args: UseEndRoundEarlyArgs): UseEndRoundEarlyResult {
  const store = useScorecardStore();
  const { session, isLoading: authLoading } = useAuthSession();
  const sessionOwner = authLoading ? null : (session?.user.id ?? null);
  const latestOwner = useRef(sessionOwner);
  latestOwner.current = sessionOwner;
  const { showErrorToast, showToast } = useToast();
  const [sheet, setSheet] = useState<OpenConfirmation | null>(null);
  const latestSheet = useRef(sheet);
  latestSheet.current = sheet;
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const latest = useRef(args);
  latest.current = args;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const plan = currentPlan(store, args, sessionOwner);
  const scope = routeScope(args, store);
  // Callback ownership follows route/scope replacements without another store generation.
  const route = useRef({ scope, identity: {} });
  if (route.current.scope !== scope) route.current = { scope, identity: {} };
  const routeIdentity = route.current.identity;
  const renderOperation = useMemo(
    () => (sessionOwner ? store.captureRoundEndEarlyOperation(args.roundId) : null),
    [store, args.roundId, sessionOwner]
  );
  const identityCurrent = useCallback(
    (confirmation: OpenConfirmation) =>
      mounted.current &&
      route.current.identity === confirmation.routeIdentity &&
      latestOwner.current === confirmation.operation.ownerId &&
      confirmation.operation.isCurrent() &&
      routeScope(latest.current, useScorecardStore.getState()) === confirmation.scope,
    []
  );
  const eligible = useCallback(
    (confirmation: OpenConfirmation) =>
      identityCurrent(confirmation) &&
      JSON.stringify(
        currentPlan(useScorecardStore.getState(), latest.current, latestOwner.current)
      ) === JSON.stringify(confirmation.plan),
    [identityCurrent]
  );
  const sheetCurrent = !!sheet && eligible(sheet);
  useEffect(() => {
    if (sheet && !sheetCurrent && !inFlight.current) setSheet(null);
  }, [sheet, sheetCurrent]);
  const open = useCallback(() => {
    if (!mounted.current || !plan || !renderOperation || inFlight.current) return;
    const confirmation = { operation: renderOperation, plan, scope, routeIdentity };
    if (!eligible(confirmation)) return;
    try {
      renderOperation.assertSourceCurrent();
      setSheet(confirmation);
    } catch {
      /* Obsolete callback. */
    }
  }, [plan, renderOperation, scope, routeIdentity, eligible]);
  const onCancel = useCallback(() => {
    if (!inFlight.current && latestSheet.current === sheet) setSheet(null);
  }, [sheet]);
  const runConfirm = useCallback(async () => {
    if (!sheet || latestSheet.current !== sheet || inFlight.current || !eligible(sheet)) return;
    const confirmation = sheet;
    const { operation } = confirmation;
    const roundId = latest.current.roundId;
    const n = confirmation.plan.holesPlayed;
    const onEnded = latest.current.onEnded;
    const assertEligible = () => {
      operation.assertSourceCurrent();
      if (!eligible(confirmation)) throw new Error('End confirmation changed');
    };
    // Inside the closed local gate source equality is enforced by the slice; gate closure is our own.
    const assertUserContext = () => {
      if (!eligible(confirmation)) throw new Error('End confirmation changed');
    };
    inFlight.current = true;
    setLoading(true);
    let serverHoldsEnd = false;
    try {
      await withRoundScoringWrite(roundId, async () => {
        assertEligible();
        const prerequisite = await getRoundEndPrerequisite(roundId);
        assertEligible();
        let originalSnapshot = null;
        if (prerequisite) {
          if (
            !isOwnedEndIntentSnapshot(prerequisite) ||
            !Number.isInteger(prerequisite.id) ||
            (prerequisite.id ?? 0) < 1 ||
            !Number.isInteger(prerequisite.revision) ||
            (prerequisite.revision ?? 0) < 1
          )
            throw new Error('Invalid existing end intent');
          const data = JSON.parse(prerequisite.endIntentRead!.rawData);
          if (data.id !== roundId || data.userId !== operation.ownerId || data.holesPlayed !== n)
            throw new Error('Incompatible existing end intent');
          originalSnapshot = capturePendingEndIntentSnapshot(prerequisite);
        }
        const online = await checkIsOnline();
        assertEligible();
        let missingError: EndRoundEarlyError | undefined;
        if (online) {
          try {
            await applyEndRoundEarly(roundId, n);
            serverHoldsEnd = true;
          } catch (error) {
            // Conflict repair is authoritative, including CURRENT submitted cards.
            operation.assertSourceCurrent();
            if (!identityCurrent(confirmation)) throw new Error('End confirmation context changed');
            const code = endEarlyErrorCode(error);
            if (code === 'conflict') {
              const source = captureRoundPersistenceSource(roundId);
              const shape = await fetchRoundScoringShape(roundId);
              operation.assertSourceCurrent();
              if (!identityCurrent(confirmation) || shape.holes_played === null)
                throw new Error('Authoritative end unavailable');
              await adoptRoundShapeWithinScoringWrite(roundId, shape, {
                ownerId: operation.ownerId,
                originalSession: operation.session,
                isCurrent: () => identityCurrent(confirmation),
              });
              const acceptedSource = { ...source, epoch: source.epoch + 1 };
              if (
                !identityCurrent(confirmation) ||
                !isRoundPersistenceSourceCurrent(acceptedSource)
              )
                return;
              serverHoldsEnd = true;
              invalidateRoundShapeQueries(roundId);
              setSheet(null);
              showToast({
                variant: 'info',
                title: 'Round already ended',
                message: `This round was already ended after ${shape.holes_played} holes on another device.`,
              });
              onEnded(shape.holes_played);
              return;
            }
            assertEligible();
            if (code === 'not_found') missingError = error as EndRoundEarlyError;
            else if (code === 'forbidden' || code === 'invalid' || code === 'busy') {
              showErrorToast(
                END_FAILED_TITLE,
                code === 'forbidden'
                  ? "You don't have permission to end this round."
                  : code === 'busy'
                    ? 'Scorecards are being updated. Please try again.'
                    : "This round can't be ended right now."
              );
              return;
            } else if (code !== 'network') throw error;
          }
        }
        assertEligible();
        await operation.finishWithinScoringWrite(
          n,
          missingError
            ? { mode: 'server_missing', missingError, assertEligible: assertUserContext }
            : { mode: 'owned', assertEligible: assertUserContext }
        );
        const committedCurrent = () =>
          identityCurrent(confirmation) && operation.isCommittedSourceCurrent();
        if (!committedCurrent()) return;
        if (missingError && originalSnapshot) {
          await removePendingSync(
            originalSnapshot.id!,
            originalSnapshot.revision!,
            committedCurrent,
            undefined,
            { expectedRecovery: originalSnapshot }
          );
          if (!committedCurrent()) return;
        }
        if (serverHoldsEnd) invalidateRoundShapeQueries(roundId);
        setSheet(null);
        onEnded(n);
      });
    } catch (error) {
      scoringLogger.error('End round early failed', error, { roundId, holesPlayed: n });
      if (identityCurrent(confirmation)) {
        let originalSourceCurrent = false;
        try {
          operation.assertSourceCurrent();
          originalSourceCurrent = true;
        } catch {
          /* Obsolete source. */
        }
        if (serverHoldsEnd && (originalSourceCurrent || operation.isCommittedSourceCurrent()))
          invalidateRoundShapeQueries(roundId);
        showErrorToast(END_FAILED_TITLE, 'Please try again.');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setLoading(false);
        if (!identityCurrent(confirmation)) setSheet(null);
      }
    }
  }, [sheet, eligible, identityCurrent, showErrorToast, showToast]);
  const resultPreview =
    sheetCurrent && plan
      ? buildResultPreview({
          plan,
          holes: store.holes,
          nineType: store.nineType,
          gameType: args.gameType,
          teamFormat: args.teamFormat ?? null,
          isMultiBall: store.isMultiBall,
          getMatchContext: args.getMatchContext,
          players: store.currentPlayers,
          scorecards: store.groupScorecards,
          playerTeeMap: store.playerTeeMap,
          selectedTeeData: store.selectedTeeData,
          handicapSource: store.handicapSource,
        })
      : null;
  return {
    canEndRoundEarly: plan !== null,
    isEnded:
      store.currentRoundId === args.roundId &&
      Number.isInteger(store.holesPlayed) &&
      (store.holesPlayed ?? 0) > 0,
    open,
    sheetProps: {
      visible: sheetCurrent,
      plan,
      resultPreview,
      startHole: store.startHole,
      loading,
      handicapRound: store.handicapSource !== 'none',
      onConfirm: () => {
        void runConfirm();
      },
      onCancel,
    },
  };
}
