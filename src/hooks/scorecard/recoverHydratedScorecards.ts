import type { Scorecard } from '@/types';
import { useScorecardStore } from '@/store/scorecardStore';
import { getScorecardsByRound } from '@/services/offline/database';
import {
  captureRoundPersistenceSource, isRoundPersistenceSourceCurrent,
  withRoundPersistence, RoundPersistenceSourceChangedError,
} from '@/services/offline/roundPersistenceBarrier';

export interface DurableHydrationRecovery {
  roundId: string;
  /** The ORIGINAL owner/private session; a fresh epoch must not grant a new session. */
  isCurrent: () => boolean;
  originals: Map<string, Scorecard>;
}

const hasScores = (card: Scorecard) => Object.values(card.scores).some(
  score => score && ('strokes' in score ? score.strokes !== undefined : true)
);

/** Recover committed local writes, never acknowledge a captured remote snapshot. */
export async function recoverHydratedScorecards(recovery: DurableHydrationRecovery): Promise<boolean> {
  const { roundId } = recovery;
  const source = captureRoundPersistenceSource(roundId);
  const assertCurrent = () => {
    if (!recovery.isCurrent() || !isRoundPersistenceSourceCurrent(source))
      throw new RoundPersistenceSourceChangedError(roundId);
  };
  return withRoundPersistence(source, async () => {
    assertCurrent();
    const before = useScorecardStore.getState();
    const originals = before.groupScorecards;
    const durableCards = await getScorecardsByRound(roundId);
    assertCurrent();
    const current = useScorecardStore.getState();
    const merged = new Map(current.groupScorecards);
    for (const durable of durableCards) {
      const expected = recovery.originals.get(durable.playerId);
      const memory = current.groupScorecards.get(durable.playerId);
      if (!expected || !memory || memory !== originals.get(durable.playerId) || hasScores(memory) ||
        durable.id !== expected.id || durable.id !== memory.id || durable.roundId !== roundId ||
        memory.roundId !== roundId || durable.playerId !== memory.playerId ||
        JSON.stringify(durable.createdAt) !== JSON.stringify(expected.createdAt) ||
        JSON.stringify(memory.createdAt) !== JSON.stringify(expected.createdAt) ||
        (durable.holesPlayed ?? null) !== (current.holesPlayed ?? null) ||
        ((current.holesPlayed != null || durable.syncNineType != null) && durable.syncNineType !== current.nineType)) continue;
      merged.set(durable.playerId, {
        ...durable,
        player: memory.player ?? durable.player,
        ...(memory.status === 'completed' || memory.status === 'confirmed' ? { status: memory.status } : {}),
        submittedAt: memory.submittedAt ?? durable.submittedAt,
        submittedBy: memory.submittedBy ?? durable.submittedBy,
        ...(memory.serverRevision != null && {
          serverRevision: Math.max(memory.serverRevision, durable.serverRevision ?? 0),
        }),
      });
    }
    assertCurrent();
    useScorecardStore.setState({ groupScorecards: merged });
    // Cancellation may have prevented later players' saves entirely. Check all
    // CURRENT round cards so their remaining blanks get a fresh remote read too.
    return [...merged.values()].some(card => card.roundId === roundId && !hasScores(card));
  });
}
