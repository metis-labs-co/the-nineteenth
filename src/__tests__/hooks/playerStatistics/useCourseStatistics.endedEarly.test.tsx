/**
 * Course statistics retain ended rounds in played-hole metrics and activity,
 * while excluding them from round records, trends and round averages.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCourseStatistics } from '@/hooks/playerStatistics/courseQueries';
import type { CourseStatisticsData } from '@/hooks/playerStatistics/types';
import {
  COURSE_ID,
  ENDED_EARLY_CARD,
  FULL_CARD,
  NINE_CARD,
  PLAYER_ID,
  STATS_CARDS,
  UNTRACKED_FULL_CARD,
  buildStatsCard,
  range,
  resolvingQuery,
} from './statsFixtures';

const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();
const mockIn = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

async function loadCourseStats(cards: unknown[] = STATS_CARDS): Promise<CourseStatisticsData> {
  mockFrom.mockImplementation(() => {
    const chain = resolvingQuery({ data: cards, error: null });
    chain.select = (...args: unknown[]) => { mockSelect(...args); return chain; };
    chain.eq = (...args: unknown[]) => { mockEq(...args); return chain; };
    chain.is = (...args: unknown[]) => { mockIs(...args); return chain; };
    chain.in = (...args: unknown[]) => { mockIn(...args); return chain; };
    return chain;
  });
  const { result } = renderHook(() => useCourseStatistics(PLAYER_ID, COURSE_ID), {
    wrapper: makeWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data!;
}

describe('useCourseStatistics — early-ended rounds', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();
    mockIs.mockReset();
    mockIn.mockReset();
  });

  it('counts the early-ended round and its holes in every per-hole stat (locks current behaviour)', async () => {
    const stats = await loadCourseStats();

    expect(stats.timesPlayed).toBe(3);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.bestGrossScore).toBe(90);
    expect(stats.averageScorePerHole).toBe(4.82);
    expect(stats.averagePuttsPerHole).toBe(1.82);
    expect(stats.bunkerStats.totalBunkerShots).toBe(6);
    expect(stats.hazardStats.totalHazards).toBe(1);
    expect(stats.holeStats.find((h) => h.holeNumber === 1)?.timesPlayed).toBe(3);
    expect(stats.recentRounds.map((r) => r.roundId)).toEqual([
      'round-ended', 'round-nine', 'round-full',
    ]);
  });

  it('preserves ended-hole statistics, directions and score trends (locks current behaviour)', async () => {
    const trackedEnded = {
      ...ENDED_EARLY_CARD,
      scores: Object.fromEntries(Object.entries(ENDED_EARLY_CARD.scores).map(([n, score]) => [
        n, { ...score, fairwayHit: false, fairwayMissDirection: 'left',
          greenInRegulation: false, greenMissDirection: 'short' },
      ])),
    };
    const stats = await loadCourseStats([FULL_CARD, NINE_CARD, trackedEnded]);

    expect(stats.totalPutts).toBe(60);
    expect(stats.holesWithPuttsRecorded).toBe(33);
    expect(stats.fairwaysHit).toBe(0);
    expect(stats.fairwayOpportunities).toBe(4);
    expect(stats.fairwayPercentage).toBe(0);
    expect(stats.greensInRegulation).toBe(0);
    expect(stats.girOpportunities).toBe(6);
    expect(stats.girPercentage).toBe(0);
    expect(stats.scoreDistribution).toEqual({
      eagles: 0, birdies: 1, pars: 9, bogeys: 17, doubleBogeys: 6, triplePlus: 0,
    });
    expect(stats.totalScoreDistribution).toBe(33);
    expect(stats.parOrBetterPercentage).toBe(30.3);
    expect(stats.par3Stats.holesPlayed).toBe(8);
    expect(stats.par4Stats.holesPlayed).toBe(18);
    expect(stats.par5Stats.holesPlayed).toBe(7);
    expect(stats.par4Stats.averageScore).toBe(4.83);
    expect(stats.shortGame).toMatchObject({ scrambleAttempts: 6, scramblesMade: 4 });
    expect(stats.puttingDepth).toMatchObject({ onePuttPercentage: 18.2, threePuttPercentage: 0 });
    expect(stats.fairwayMissDirection).toMatchObject({ leftCount: 6, totalMisses: 6 });
    expect(stats.greenMissDirection).toMatchObject({ shortCount: 6, totalMisses: 6 });
    expect(stats.holeStats.find((h) => h.holeNumber === 1)).toEqual({
      holeNumber: 1, par: 4, averageScore: 4.67, scoreToPar: 0.67,
      bestScore: 4, worstScore: 5, averagePutts: 1.67, girPercentage: 0,
      fairwayPercentage: 0, timesPlayed: 3, birdieOrBetterPercentage: 0,
      parPercentage: 33.3, bogeyPercentage: 66.7, doublePlusPercentage: 0,
      scoreTrend: [
        { date: FULL_CARD.rounds.date, score: 5 },
        { date: NINE_CARD.rounds.date, score: 5 },
        { date: ENDED_EARLY_CARD.rounds.date, score: 4 },
      ],
    });
  });

  it('preserves ordinary full and planned-nine records with absent metadata (locks current behaviour)', async () => {
    const { holes_played: _fullEnd, ...fullRound } = FULL_CARD.rounds;
    const { holes_played: _nineEnd, ...nineRound } = NINE_CARD.rounds;
    const stats = await loadCourseStats([
      { ...FULL_CARD, rounds: fullRound },
      { ...NINE_CARD, rounds: { ...nineRound, nine_type: 'front9' } },
    ]);

    expect(stats.timesPlayed).toBe(2);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.bestGrossScore).toBe(90);
    expect(stats.worstGrossScore).toBe(90);
    expect(stats.averageStablefordPoints).toBe(30);
    expect(stats.averageScorePerHole).toBe(5);
    expect(stats.averagePuttsPerRound).toBe(27);
    expect(stats.roundTrends.map((r) => r.roundId)).toEqual(['round-full', 'round-nine']);
    expect(stats.recentRounds.every((r) => r.isHandicapRound && !r.isPracticeRound)).toBe(true);
  });

  it('preserves pickup rules and the course query shared-ball inclusion (locks current behaviour)', async () => {
    const pickup = buildStatsCard({
      id: 'pickup', date: '2026-09-10', holeNumbers: [1], strokes: 10,
      putts: 0, holesPlayed: null, points: 0,
    });
    const stats = await loadCourseStats([
      pickup, { ...FULL_CARD, rounds: { ...FULL_CARD.rounds, team_format: 'scramble' } },
    ]);

    expect(stats.timesPlayed).toBe(2);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.totalScoreDistribution).toBe(18);
    expect(stats.averageScorePerHole).toBe(5.26);
    expect(stats.par4Stats.holesPlayed).toBe(11);
    expect(stats.averagePuttsPerRound).toBe(18);
    expect(stats.holeStats[0]).toMatchObject({ worstScore: 10, timesPlayed: 2, doublePlusPercentage: 50 });
    expect(stats.roundTrends.map((r) => r.roundId)).toEqual(['round-full', 'round-pickup']);
  });

  it('preserves existing player/course, deleted and completed filters (locks current behaviour)', async () => {
    await loadCourseStats();
    expect(mockFrom).toHaveBeenCalledWith('scorecards');
    expect(mockSelect).toHaveBeenCalledWith(expect.stringMatching(/rounds!inner[\s\S]*courses!inner/));
    expect(mockEq.mock.calls).toEqual([['player_id', PLAYER_ID], ['rounds.course_id', COURSE_ID]]);
    expect(mockIs.mock.calls).toEqual([['rounds.deleted_at', null]]);
    expect(mockIn).toHaveBeenCalledWith('status', ['completed', 'confirmed']);
  });

  it('keeps the early-ended round out of the trend sparkline', async () => {
    const stats = await loadCourseStats();
    expect(stats.roundTrends.map((t) => t.roundId)).toEqual(['round-full', 'round-nine']);
  });

  it('leaves the early-ended round out of the per-round putts, bunker and hazard averages', async () => {
    const stats = await loadCourseStats();
    expect(stats.averagePuttsPerRound).toBe(27);
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBe(0);
    expect(stats.hazardStats.averageHazardsPerRound).toBe(0);
  });

  it('shows no per-round average when only the early-ended round tracked the stat', async () => {
    const stats = await loadCourseStats([UNTRACKED_FULL_CARD, ENDED_EARLY_CARD]);
    expect(stats.averagePuttsPerRound).toBeNull();
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBeNull();
    expect(stats.hazardStats.averageHazardsPerRound).toBeNull();
    expect(stats.averagePuttsPerHole).toBe(1);
    expect(stats.bunkerStats.totalBunkerShots).toBe(6);
    expect(stats.hazardStats.totalHazards).toBe(1);
  });

  it('selects early-end metadata without filtering ended cards out of the query', async () => {
    await loadCourseStats();
    expect(mockSelect).toHaveBeenCalledWith(expect.stringMatching(/rounds!inner[\s\S]*holes_played/));
    expect(mockIs).not.toHaveBeenCalledWith('rounds.holes_played', null);
  });

  it('keeps full18 ended at nine out of round aggregates while retaining planned-nine data', async () => {
    const endedNine = buildStatsCard({
      id: 'ended-nine', date: '2026-09-10', holeNumbers: range(1, 9), strokes: 3,
      putts: 1, bunkerShots: 1, trackHazards: true, hazardOnFirstHole: true,
      holesPlayed: 9, points: 50,
    });
    const stats = await loadCourseStats([
      FULL_CARD, { ...NINE_CARD, rounds: { ...NINE_CARD.rounds, nine_type: 'front9' } },
      { ...endedNine, rounds: { ...endedNine.rounds, nine_type: 'full' } },
    ]);

    expect(stats.timesPlayed).toBe(3);
    expect(stats.averageScorePerHole).toBe(4.5);
    expect(stats.averagePuttsPerHole).toBe(1.75);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.bestGrossScore).toBe(90);
    expect(stats.worstGrossScore).toBe(90);
    expect(stats.averageStablefordPoints).toBe(30);
    expect(stats.roundTrends.map((r) => r.roundId)).toEqual(['round-full', 'round-nine']);
    expect(stats.recentRounds[0]).toMatchObject({ roundId: 'round-ended-nine', holesPlayed: 9 });
    expect(stats.holeStats[0].scoreTrend[2]).toEqual({ date: endedNine.rounds.date, score: 3 });
    expect(stats.averagePuttsPerRound).toBe(27);
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBe(0);
    expect(stats.hazardStats.averageHazardsPerRound).toBe(0);
  });

  it('keeps ended cards out of full records even with eighteen scored holes', async () => {
    // Metadata decides eligibility independently of the legacy scored-hole bucket.
    const endedFull = buildStatsCard({
      id: 'ended-full', date: '2026-09-10', holeNumbers: range(1, 18), strokes: 3,
      holesPlayed: 9, points: 50,
    });
    const stats = await loadCourseStats([FULL_CARD, endedFull]);

    expect(stats.timesPlayed).toBe(2);
    expect(stats.averageScorePerHole).toBe(4);
    expect(stats.averageGrossScore).toBe(90);
    expect(stats.bestGrossScore).toBe(90);
    expect(stats.worstGrossScore).toBe(90);
    expect(stats.averageStablefordPoints).toBe(30);
    expect(stats.holeStats[0].timesPlayed).toBe(2);
    expect(stats.recentRounds[0].roundId).toBe('round-ended-full');
  });

  it('shows no per-round average when all cards are ended while retaining hole metrics and activity', async () => {
    const stats = await loadCourseStats([ENDED_EARLY_CARD]);

    expect(stats.timesPlayed).toBe(1);
    expect(stats.averageScorePerHole).toBe(4);
    expect(stats.averagePuttsPerHole).toBe(1);
    expect(stats.bunkerStats.totalBunkerShots).toBe(6);
    expect(stats.hazardStats.totalHazards).toBe(1);
    expect(stats.averagePuttsPerRound).toBeNull();
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBeNull();
    expect(stats.hazardStats.averageHazardsPerRound).toBeNull();
    expect(stats.averageGrossScore).toBe(0);
    expect(stats.bestGrossScore).toBe(0);
    expect(stats.worstGrossScore).toBe(0);
    expect(stats.averageStablefordPoints).toBe(0);
    expect(stats.roundTrends).toEqual([]);
    expect(stats.recentRounds.map((r) => r.roundId)).toEqual(['round-ended']);
    expect(stats.holeStats[0].scoreTrend).toEqual([{ date: ENDED_EARLY_CARD.rounds.date, score: 4 }]);
  });

  it('leaves ended tracking out of averages with eligible tracked and untracked rounds', async () => {
    const stats = await loadCourseStats([FULL_CARD, UNTRACKED_FULL_CARD, ENDED_EARLY_CARD]);

    // Eligible rounds both count in the denominator, even when one did not track.
    expect(stats.averagePuttsPerRound).toBe(18);
    expect(stats.bunkerStats.averageBunkerShotsPerRound).toBe(0);
    expect(stats.hazardStats.averageHazardsPerRound).toBe(0);
  });
});
