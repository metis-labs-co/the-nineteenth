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
import type { OwnedRoundEndIntent } from '@/services/rounds/roundScoringWrite';
import { getSyncAuthUserId } from '@/services/offline/sync/networkState';
import { requestSyncDrain } from '@/services/offline/sync/drain';
import { persistRoundEarlyEnd } from '@/services/offline/database';
import { storeLogger } from '@/utils/debugLogger';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { createRoundScoringContext } from '@/services/rounds/roundScoringContext';
import type { RoundScoringSession } from './scorecardStore';
import { adoptAuthoritativeRoundShape } from '@/services/rounds/roundScoringAdoption';
import { withRoundScoringWrite, getRoundEndPrerequisite } from '@/services/rounds/roundScoringCoordinator';
import { captureRoundPersistenceSource, isRoundPersistenceSourceCurrent, RoundPersistenceSourceChangedError, withRoundPersistenceTransition } from '@/services/offline/roundPersistenceBarrier';
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
  captureRoundScoringSession?: (roundId: string) => RoundScoringSession | null;
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
  holesPlayed: number | null,
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

interface EndRoundEarlyOptions {
  getSessionGeneration?: () => number;
  /** Adopt an existing end, regardless of which players this device scores. */
  reconcile?: boolean;
  /** Captured by an owning caller; the public producer activates in B6b-2. */
  intent?: OwnedRoundEndIntent;
  /** Internal callers already holding the server boundary must opt in explicitly. */
  withinScoringWrite?: boolean;
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
  options: EndRoundEarlyOptions = {}
): Promise<void> {
  if (
    options.intent &&
    (options.reconcile ||
      !options.intent.userId?.trim() ||
      getSyncAuthUserId() !== options.intent.userId)
  ) {
    throw new Error('Captured end owner no longer matches the authenticated account');
  }
  const getSessionGeneration = options.getSessionGeneration ?? (() => 0);
  const session = getSessionGeneration();
  const state = get();
  const { currentRoundId, holes, nineType } = state;
  const ownerId = getSyncAuthUserId();
  const source = currentRoundId ? captureRoundPersistenceSource(currentRoundId) : undefined;

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
  if (options.reconcile) {
    await adoptAuthoritativeRoundShape(currentRoundId, { nine_type: nineType, holes_played: n }, { ownerId: ownerId ?? '' });
    return;
  }
  if (!scoresEveryPlayer(state)) {
    throw new Error('A round can only be ended early from a device that scores every player');
  }

  const played = new Set<number>(
    filterPlayableHoles(holes, nineType, n).map((hole) => hole.number)
  );
  const removals = [...state.groupScorecards.values()]
    .map((scorecard) => ({
      scorecardId: scorecard.id,
      holeNumbers: keysOutside(scorecard, played),
    }))
    .filter((entry) => entry.holeNumbers.length > 0);
  const allStamped = [...state.groupScorecards.values()].every(
    (scorecard) => scorecard.holesPlayed === n
  );
  if (!options.intent && state.holesPlayed === n && removals.length === 0 && allStamped) return;

  storeLogger.info('Ending round early', {
    roundId: currentRoundId.substring(0, 8) + '...',
    holesPlayed: n,
    removedCardCount: removals.length,
  });

  const assertSession = () => {
    if (options.intent && getSyncAuthUserId() !== options.intent.userId) {
      throw new Error('Authenticated account changed after durable end intent');
    }
    if (getSyncAuthUserId() !== ownerId) throw new Error('Authenticated account changed after durable end');
    if (getSessionGeneration() !== session || get().currentRoundId !== currentRoundId || get().isLoading) {
      throw new EndRoundEarlyRoundChangedError(currentRoundId);
    }
  };
  const target = { nine_type: nineType, holes_played: n };
  let committedCards: Scorecard[] = [];
  const liveContext = (source: Scorecard) => {
    assertSession();
    return get().captureRoundScoringSession?.(currentRoundId)?.getLiveContext(source);
  };
  const transition = () => withRoundPersistenceTransition(currentRoundId, target, async () => {
    assertSession();
    // A local submission may have completed while this transition drained its lease.
    const current = get();
    const alreadySameEnd = current.holesPlayed === n && [...current.groupScorecards.values()].every(card => card.holesPlayed === n);
    if (!alreadySameEnd && [...current.groupScorecards.values()].some(card => card.status === 'completed' || card.status === 'confirmed' || card.submittedAt || card.submittedBy)) {
      throw new Error('Cannot end a submitted or completed scorecard');
    }
    if (options.intent && current.holesPlayed != null) {
      const existing = await getRoundEndPrerequisite(currentRoundId);
      assertSession();
      if (!existing || existing.type !== 'round' || existing.action !== 'update' ||
        existing.data?.id !== currentRoundId || existing.data?.action !== 'end_early' ||
        existing.data?.holesPlayed !== n || existing.data?.userId !== options.intent.userId)
        throw new Error('An existing local end requires its original owned end intent');
    }
    if (!scoresEveryPlayer(current)) throw new Error('A round can only be ended early from a device that scores every player');
    // Drained writers may have changed context and scores. Prepare these CURRENT sources.
    const rebuild = createRoundScoringContext(currentRoundId, { getLiveContext: liveContext });
    committedCards = [...get().groupScorecards.values()].map(card => rebuild(card, played, target));
    await persistRoundEarlyEnd(currentRoundId, n, nineType, [...played], committedCards.map(card => ({
      scorecardId: card.id, teeData: card.teeData ?? null, syncHandicapSource: card.syncHandicapSource,
      playerHandicap: card.playerHandicap, playerGender: card.playerGender, coursePar: card.coursePar,
      syncHoles: card.syncHoles, syncGameType: card.syncGameType,
    })), ...(options.intent ? [{ intent: options.intent,
      ...((state.holesPlayed != null || [...state.groupScorecards.values()].some(card => card.holesPlayed != null) || current.holesPlayed != null)
        ? { requireExistingIntent: true } : {}),
    }] : []));
  }, () => {
    // The owned commit must request drain even if session/application now throws.
    if (options.intent) requestSyncDrain('round-end-early');
    assertSession();
    const current = get();
    const rebuild = createRoundScoringContext(currentRoundId, { sources: committedCards, getLiveContext: liveContext });
    const cards = new Map([...current.groupScorecards].map(([playerId, card]) => [playerId, rebuild(card, played, target)]));
    set({ groupScorecards: cards, holesPlayed: n,
      currentHole: played.has(current.currentHole) ? current.currentHole : lastPlayedHoleNumber(nineType, n) });
  });
  if (options.withinScoringWrite) await transition();
  else await withRoundScoringWrite(currentRoundId, () => {
    assertSession();
    if (getSyncAuthUserId() !== ownerId || !source || !isRoundPersistenceSourceCurrent(source)) throw new RoundPersistenceSourceChangedError(currentRoundId);
    return transition();
  });
  const nextScorecards = get().groupScorecards;
  const committedSource = captureRoundPersistenceSource(currentRoundId);

  // Best-effort full-card metadata/totals saves follow the durable boundary.
  // Snapshot sync replaces server scores wholesale, propagating removals.
  const cardsThatLostScores = new Set(removals.map((entry) => entry.scorecardId));
  for (const [playerId, scorecard] of nextScorecards) {
    assertSession();
    await persistScorecardUpdate({
      scorecard: { scorecardId: scorecard.id, scorecard },
      context: options.reconcile ? 'endRoundEarly:reconcile' : 'endRoundEarly',
      source: committedSource,
      resolveCurrentScorecard: () => getSessionGeneration() === session && get().currentRoundId === currentRoundId && !get().isLoading ? get().groupScorecards.get(playerId) : undefined,
    });
    assertSession();
    if (!scorecard.isStandalone && (!options.reconcile || cardsThatLostScores.has(scorecard.id))) {
      debouncedQueueScorecardSync(scorecard.id, () =>
        getSessionGeneration() === session && get().currentRoundId === currentRoundId
          ? get().groupScorecards.get(playerId)
          : undefined
      );
    }
  }
}

/** An authoritative end disagrees with local keys or a cached card marker. */
export function needsEndRoundEarlyReconcile(state: StoreState): boolean {
  const n = state.holesPlayed;
  if (n == null) return false;
  const played = new Set<number>(filterPlayableHoles(state.holes, state.nineType, n).map((hole) => hole.number));
  return [...state.groupScorecards.values()].some(
    (card) => card.holesPlayed !== n || keysOutside(card, played).length > 0
  );
}

/** Reconciliation uses the same queue-aware authoritative repair; failures keep the caller blocked. */
export async function reconcileEndedEarly(
  get: GetFn,
  set: SetFn,
  options: Pick<EndRoundEarlyOptions, 'getSessionGeneration'> = {}
): Promise<void> {
  const n = get().holesPlayed;
  if (n != null) await endRoundEarly(get, set, n, { ...options, reconcile: true });
}
