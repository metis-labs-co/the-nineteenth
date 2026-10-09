// src/__tests__/hooks/playerStatistics/usePlayerStatistics.endedEarly.test.tsx
/**
 * usePlayerStatistics — early-ended social rounds (rounds.holes_played set).
 *
 * An early-ended round counts as a round played and feeds every per-hole
 * metric, but stays out of every per-round aggregate: the 18- and 9-hole
 * buckets, the trend sparkline and the per-round putts / bunker / hazard
 * averages. It still shows in recent rounds.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlayerStatistics } from '@/hooks/playerStatistics/queries';
import type { PlayerStatistics } from '@/hooks/playerStatistics/types';
import {
  ENDED_EARLY_CARD, FULL_CARD, NINE_CARD, PLAYER_ID, STATS_CARDS,
  UNTRACKED_FULL_CARD, buildStatsCard, range, resolvingQuery,
} from './statsFixtures';

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockIs = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

async function loadStats(cards: unknown[] = STATS_CARDS): Promise<PlayerStatistics> {
  mockFrom.mockImplementation((table: string) => {
    const chain = resolvingQuery(
      table === 'scorecards' ? { data: cards, error: null } : { data: [], error: null },
    );
    chain.select = (selection: string) => { mockSelect(table, selection); return chain; };
    chain.is = (column: string, value: unknown) => { mockIs(table, column, value); return chain; };
    return chain;
  });
  const { result } = renderHook(() => usePlayerStatistics(PLAYER_ID), { wrapper: makeWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data!;
}

describe('usePlayerStatistics — early-ended rounds', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockSelect.mockReset();
    mockIs.mockReset();
  });

  it('counts the early-ended round and its holes in every per-hole stat (locks current behaviour)', async () => {
    const stats = await loadStats();

    expect(stats.roundsPlayed).toBe(3);
    expect(stats.holesPlayed).toBe(33);
    expect(stats.averageGrossScore).toBe(90);
    // (90 + 45 + 24) / 33 holes
    expect(stats.averageScorePerHole).toBe(4.82);
    // 60 putts / 33 holes
    expect(stats.averagePuttsPerHole).toBe(1.82);
    expect(stats.bunkerStats.totalBunkerShots).toBe(6);
    expect(stats.hazardStats.totalHazards).toBe(1);
    expect(stats.recentRounds.map((r) => r.roundId)).toEqual([
      'round-ended',
      'round-nine',
      'round-full',
    ]);
  });

  it('keeps the early-ended round out of the 9-hole bucket', async () => {
    const stats = await loadStats();

    // Before: 2 rounds / 34.5 / 'round-ended' — the 6-hole card was bucketed as a 9-hole round.
    expect(stats.nineHoleRoundsPlayed).toBe(1);
    expect(stats.averageNineHoleScore).toBe(45);
    expect(stats.bestNineHoleRound?.roundId).toBe('round-nine');
  });

  it('keeps the early-ended round out of the trend sparkline', async () => {
    const stats = await loadStats();

    expect(stats.roundTrends.map((t) => t.roundId)).toEqual(['round-full', 'round-nine']);
  });

  it('leaves the early-ended round out of the per-round putts, bunker and hazard averages', async () => {
    const stats = await loadStats();

    // Before: 60 / 3 = 20, 6 / 3 = 2, 1 / 3 = 0.3.
    expect(stats.averagePuttsPerRound).toBe(27); // (60 − 6) / 2
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBe(0);
    expect(stats.hazardStats.averageHazardsPerRound).toBe(0);
  });

  it('shows no per-round average ("—") when only the early-ended round tracked the stat', async () => {
    const stats = await loadStats([UNTRACKED_FULL_CARD, ENDED_EARLY_CARD]);

    // Before: 3 / 3 / 0.5 (every round in the average). Excluding the ended
    // round without also excluding it from the "tracked" check would give 0.
    expect(stats.averagePuttsPerRound).toBeNull();
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBeNull();
    expect(stats.hazardStats.averageHazardsPerRound).toBeNull();
    // Per-hole figures still use the ended card's holes.
    expect(stats.averagePuttsPerHole).toBe(1);
  });

  it('preserves ended-hole FIR, GIR, distribution and par-type metrics (locks current behaviour)', async () => {
    const trackedEnded = {
      ...ENDED_EARLY_CARD,
      scores: Object.fromEntries(Object.entries(ENDED_EARLY_CARD.scores).map(([n, score]) => [
        n, { ...score, fairwayHit: true, greenInRegulation: false },
      ])),
    };
    const stats = await loadStats([FULL_CARD, NINE_CARD, trackedEnded]);

    expect(stats.fairwaysHit).toBe(4);
    expect(stats.fairwayOpportunities).toBe(4);
    expect(stats.fairwayPercentage).toBe(100);
    expect(stats.girOpportunities).toBe(6);
    expect(stats.girPercentage).toBe(0);
    expect(stats.scoreDistribution).toEqual({
      eagles: 0, birdies: 1, pars: 9, bogeys: 17, doubleBogeys: 6, triplePlus: 0,
    });
    expect(stats.par3Stats.holesPlayed).toBe(8);
    expect(stats.par4Stats.holesPlayed).toBe(18);
    expect(stats.par5Stats.holesPlayed).toBe(7);
    expect(stats.par4Stats.averageScore).toBe(4.83);
    expect(stats.shortGame.scrambleAttempts).toBe(6);
    expect(stats.shortGame.scramblesMade).toBe(4);
  });

  it('preserves ordinary full and planned-nine records with missing metadata (locks current behaviour)', async () => {
    const { holes_played: _fullEnd, ...fullRound } = FULL_CARD.rounds;
    const { holes_played: _nineEnd, ...nineRound } = NINE_CARD.rounds;
    const date = `${new Date().getFullYear()}-09-01`;
    const stats = await loadStats([
      { ...FULL_CARD, rounds: { ...fullRound, date } },
      { ...NINE_CARD, rounds: { ...nineRound, nine_type: 'front9' } },
    ]);

    expect(stats.roundsPlayed).toBe(2);
    expect(stats.holesPlayed).toBe(27);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.averageStablefordPoints).toBe(30);
    expect(stats.roundsPlayedYtd).toBe(1);
    expect(stats.averageGrossScoreYtd).toBe(90);
    expect(stats.bestRound?.roundId).toBe('round-full');
    expect(stats.worstRound?.roundId).toBe('round-full');
    expect(stats.bestStablefordRound?.roundId).toBe('round-full');
    expect(stats.courseStats).toEqual([{
      courseId: 'course-1', courseName: 'Test Course', timesPlayed: 1, averageScore: 90, bestScore: 90,
    }]);
    expect(stats.nineHoleRoundsPlayed).toBe(1);
    expect(stats.averageNineHoleScore).toBe(45);
    expect(stats.averagePuttsPerRound).toBe(27);
    expect(stats.handicapRoundsPlayed).toBe(2);
    expect(stats.practiceRoundsPlayed).toBe(0);
  });

  it('preserves pickup and shared-ball policies (locks current behaviour)', async () => {
    const pickup = buildStatsCard({
      id: 'pickup', date: '2026-09-10', holeNumbers: [1], strokes: 10,
      putts: 0, holesPlayed: null, points: 0,
    });
    const stats = await loadStats([
      pickup,
      { ...FULL_CARD, rounds: { ...FULL_CARD.rounds, team_format: 'scramble' } },
    ]);

    expect(stats.roundsPlayed).toBe(1);
    expect(stats.holesPlayed).toBe(1);
    expect(stats.totalScoreDistribution).toBe(0);
    expect(stats.averageScorePerHole).toBe(10);
    expect(stats.averagePuttsPerRound).toBe(0);
    expect(stats.par4Stats.holesPlayed).toBe(1);
  });

  it('selects early-end metadata without filtering ended cards out of the query', async () => {
    await loadStats();
    expect(mockSelect).toHaveBeenCalledWith('scorecards', expect.stringMatching(/rounds!inner[\s\S]*holes_played/));
    expect(mockIs).toHaveBeenCalledWith('scorecards', 'rounds.deleted_at', null);
    expect(mockIs).not.toHaveBeenCalledWith('scorecards', 'rounds.holes_played', null);
  });

  it('keeps full18 ended at nine out of records while retaining planned-nine records', async () => {
    const endedNine = buildStatsCard({
      id: 'ended-nine', date: '2026-09-10', holeNumbers: range(1, 9), strokes: 3,
      putts: 1, holesPlayed: 9, points: 50,
    });
    const stats = await loadStats([
      FULL_CARD,
      { ...NINE_CARD, rounds: { ...NINE_CARD.rounds, nine_type: 'front9' } },
      { ...endedNine, rounds: { ...endedNine.rounds, nine_type: 'full' } },
    ]);

    expect(stats.roundsPlayed).toBe(3);
    expect(stats.holesPlayed).toBe(36);
    expect(stats.averageScorePerHole).toBe(4.5);
    expect(stats.nineHoleRoundsPlayed).toBe(1);
    expect(stats.averageNineHoleScore).toBe(45);
    expect(stats.bestNineHoleRound?.roundId).toBe('round-nine');
    expect(stats.roundTrends.map((r) => r.roundId)).toEqual(['round-full', 'round-nine']);
    expect(stats.recentRounds[0].roundId).toBe('round-ended-nine');
    expect(stats.averagePuttsPerRound).toBe(27);
  });

  it('keeps ended cards out of full records, YTD and course bests even with eighteen scored holes', async () => {
    // End metadata decides eligibility independently of the legacy scored-hole bucket.
    const date = `${new Date().getFullYear()}-09-10`;
    const endedFull = buildStatsCard({
      id: 'ended-full', date, holeNumbers: range(1, 18), strokes: 3,
      holesPlayed: 9, points: 50,
    });
    const stats = await loadStats([
      { ...FULL_CARD, rounds: { ...FULL_CARD.rounds, date } }, endedFull,
    ]);

    expect(stats.roundsPlayed).toBe(2);
    expect(stats.holesPlayed).toBe(36);
    expect(stats.averageScorePerHole).toBe(4);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.averageStablefordPoints).toBe(30);
    expect(stats.bestRound?.roundId).toBe('round-full');
    expect(stats.worstRound?.roundId).toBe('round-full');
    expect(stats.bestStablefordRound?.roundId).toBe('round-full');
    expect(stats.roundsPlayedYtd).toBe(1);
    expect(stats.averageGrossScoreYtd).toBe(90);
    expect(stats.courseStats[0]).toMatchObject({ timesPlayed: 1, averageScore: 90, bestScore: 90 });
    expect(stats.lowestGrossScore).toBe(90);
    expect(stats.highestStablefordPoints).toBe(30);
  });

  it('shows no per-round average when every card is ended while retaining hole totals and activity', async () => {
    const stats = await loadStats([ENDED_EARLY_CARD]);

    expect(stats.roundsPlayed).toBe(1);
    expect(stats.holesPlayed).toBe(6);
    expect(stats.averageScorePerHole).toBe(4);
    expect(stats.averagePuttsPerHole).toBe(1);
    expect(stats.bunkerStats.totalBunkerShots).toBe(6);
    expect(stats.hazardStats.totalHazards).toBe(1);
    expect(stats.averagePuttsPerRound).toBeNull();
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBeNull();
    expect(stats.hazardStats.averageHazardsPerRound).toBeNull();
    expect(stats.nineHoleRoundsPlayed).toBe(0);
    expect(stats.bestNineHoleRound).toBeNull();
    expect(stats.averageNineHoleScore).toBeNull();
    expect(stats.bestRound).toBeNull();
    expect(stats.roundTrends).toEqual([]);
    expect(stats.recentRounds.map((r) => r.roundId)).toEqual(['round-ended']);
  });
});
