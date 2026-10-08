/**
 * endRoundEarlySlice - "End round early" for scorecardStore.
 *
 * The store keeps the PLANNED holes: every daily-handicap calculation derives
 * par from the holes passed in (docs/guides/SCORING_ARCHITECTURE.md), so
 * cutting `holes` to the played holes would inflate the DHC. Ending early
 * records `holesPlayed`; anything that renders, validates or counts holes
 * remaining slices via getPlayedHoles().
 *
 * Ending is final (R12). The end is stamped onto every card (holesPlayed +
 * the player's tee) and persisted to SQLite, so a relaunch keeps it (R15).
 * The server learns of it from B6c (end_round_early RPC, or a queued
 * 'end_early' round item) — this slice never touches the network.
 */

import type { Scorecard, Player, Hole, GameType, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import { persistRoundEarlyEnd } from '@/services/offline/database';
import { storeLogger } from '@/utils/debugLogger';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { lastPlayedHoleNumber } from '@/utils/roundShape';
import { persistScorecardUpdate } from './scorecardPersistence';
import { debouncedQueueScorecardSync } from './scorecardSyncDebounce';
import { calculatePlayerTotals, type PlayerTotalsContext } from './utils/scorecardCalculations';

interface StoreState {
  currentRoundId: string | null;
  isLoading: boolean;
  currentPlayers: Player[];
  currentHole: number;
  holes: Hole[];
  nineType: NineType;
  holesPlayed: number | null;
  gameType: GameType;
  handicapSource: HandicapSource;
  selectedTeeData: TeeBox | null;
  playerTeeMap: Map<string, TeeBox>;
  groupScorecards: Map<string, Scorecard>;
  allowedPlayerIds: string[];
}

type GetFn = () => StoreState;
type SetFn = (
  partial: Partial<Pick<StoreState, 'holesPlayed' | 'groupScorecards' | 'currentHole'>>
) => void;

/**
 * Thrown when a reset/reinitialization invalidated this scoring session during
 * an await. The durable end may already have committed for the old session;
 * no further state changes or syncs are applied to the new session.
 */
export class EndRoundEarlyRoundChangedError extends Error {
  constructor(readonly roundId: string) {
    super(`Round ${roundId} was unloaded while it was being ended early`);
    this.name = 'EndRoundEarlyRoundChangedError';
  }
}

/**
 * Whether this device scores every player (Global Constraints, "Who can
 * end"). ScorecardEntryScreen always fills allowedPlayerIds, so "non-empty"
 * alone is not a refusal: it must cover every current player and every card.
 * Exported so useEndRoundEarly's gate (B6c) applies the same rule.
 */
export function scoresEveryPlayer(state: {
  allowedPlayerIds: readonly string[];
  currentPlayers: readonly { id: string }[];
  groupScorecards: ReadonlyMap<string, unknown>;
}): boolean {
  if (state.allowedPlayerIds.length === 0) return true;
  const allowed = new Set(state.allowedPlayerIds);
  return (
    state.currentPlayers.every((player) => allowed.has(player.id)) &&
    [...state.groupScorecards.keys()].every((playerId) => allowed.has(playerId))
  );
}

/** Score keys on `scorecard` that are not played holes, ascending. */
function keysOutside(scorecard: Scorecard, played: Set<number>): number[] {
  return Object.keys(scorecard.scores)
    .map(Number)
    .filter((holeNumber) => !played.has(holeNumber))
    .sort((a, b) => a - b);
}

/** Rebuild a played slice while deriving handicap from the PLANNED holes. */
export function rebuildEndedScorecard(
  scorecard: Scorecard,
  played: ReadonlySet<number>,
  holesPlayed: number,
  plannedHoles: Hole[],
  gameType: GameType,
  context: PlayerTotalsContext,
  updatedAt: Date = new Date()
): Scorecard {
  const scores: Scorecard['scores'] = {};
  for (const [key, value] of Object.entries(scorecard.scores)) {
    if (played.has(Number(key))) scores[Number(key)] = value;
  }
  const updated = {
    ...scorecard,
    scores,
    holesPlayed,
    teeData: context.selectedTee ?? null,
    updatedAt,
  };
  const totals = calculatePlayerTotals(updated, plannedHoles, gameType, context);
  return {
    ...updated,
    totalGross: totals.gross,
    totalNet: totals.net,
    total_par_score: totals.parScore,
  };
}

/**
 * End the round after `n` holes. Idempotent. Durably stamp and trim every
 * card together, then rebuild store cards, save metadata and schedule sync.
 * Validation/transaction failures leave state untouched. A session change after
 * commit throws EndRoundEarlyRoundChangedError and stops further work; the
 * committed end remains on disk for the old session.
 */
export async function endRoundEarly(
  get: GetFn,
  set: SetFn,
  n: number,
  options: { getSessionGeneration?: () => number } = {}
): Promise<void> {
  const getSessionGeneration = options.getSessionGeneration ?? (() => 0);
  const session = getSessionGeneration();
  const state = get();
  const { currentRoundId, holes, nineType } = state;

  if (!currentRoundId) {
    throw new Error('No round ID set');
  }
  // Init has already advanced the generation but may still expose old holes
  // and cards. Do not capture that transitional shape as the new session.
  if (state.isLoading) {
    throw new Error('Cannot end round early while round initialization or loading is pending');
  }
  if (!Number.isInteger(n) || n < 1 || n >= holes.length) {
    throw new Error(`Invalid holes played: ${n} (the round has ${holes.length} planned holes)`);
  }
  if (!scoresEveryPlayer(state)) {
    throw new Error('A round can only be ended early from a device that scores every player');
  }

  const played = new Set<number>(filterPlayableHoles(holes, nineType, n).map((hole) => hole.number));
  const removals = [...state.groupScorecards.values()]
    .map((scorecard) => ({
      scorecardId: scorecard.id,
      holeNumbers: keysOutside(scorecard, played),
    }))
    .filter((entry) => entry.holeNumbers.length > 0);
  const allStamped = [...state.groupScorecards.values()].every(
    (scorecard) => scorecard.holesPlayed === n
  );
  if (state.holesPlayed === n && removals.length === 0 && allStamped) return;

  storeLogger.info('Ending round early', {
    roundId: currentRoundId.substring(0, 8) + '...',
    holesPlayed: n,
    removedCardCount: removals.length,
  });

  // Expo's exclusive transaction owns a separate native connection. Marker,
  // effective tee and cleanup commit together, even when there are no removals.
  await persistRoundEarlyEnd(
    currentRoundId,
    n,
    nineType,
    [...played],
    [...state.groupScorecards].map(([playerId, scorecard]) => ({
      scorecardId: scorecard.id,
      teeData: state.playerTeeMap.get(playerId) ?? state.selectedTeeData,
    }))
  );

  const assertSession = () => {
    if (getSessionGeneration() !== session || get().currentRoundId !== currentRoundId) {
      throw new EndRoundEarlyRoundChangedError(currentRoundId);
    }
  };
  assertSession();
  const current = get();
  const now = new Date();
  const nextScorecards = new Map<string, Scorecard>();
  for (const [playerId, scorecard] of current.groupScorecards) {
    const teeData = current.playerTeeMap.get(playerId) ?? current.selectedTeeData;
    const updated = rebuildEndedScorecard(
      scorecard,
      played,
      n,
      current.holes,
      current.gameType,
      {
        selectedTee: teeData,
        handicapSource: current.handicapSource,
        nineType: current.nineType,
      },
      now
    );
    nextScorecards.set(playerId, updated);
  }

  set({
    groupScorecards: nextScorecards,
    holesPlayed: n,
    currentHole: played.has(current.currentHole)
      ? current.currentHole
      : lastPlayedHoleNumber(current.nineType, n),
  });

  // Best-effort full-card metadata/totals saves follow the durable boundary.
  // Snapshot sync replaces server scores wholesale, propagating removals.
  for (const [playerId, scorecard] of nextScorecards) {
    assertSession();
    await persistScorecardUpdate({
      scorecard: { scorecardId: scorecard.id, scorecard },
      context: 'endRoundEarly',
    });
    assertSession();
    if (!scorecard.isStandalone) {
      debouncedQueueScorecardSync(scorecard.id, () =>
        getSessionGeneration() === session && get().currentRoundId === currentRoundId
          ? get().groupScorecards.get(playerId)
          : undefined
      );
    }
  }
}
