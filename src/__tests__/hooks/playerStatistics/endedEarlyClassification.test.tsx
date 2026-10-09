/**
 * An ended-early round never counts toward the handicap index, so the stats
 * hooks classify it as a Practice round, never a Handicap round. Practice +
 * Handicap + Competition still add up to Rounds Played.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlayerStatistics } from '@/hooks/playerStatistics/queries';
import { useCourseStatistics } from '@/hooks/playerStatistics/courseQueries';
import type { RoundSummary } from '@/hooks/playerStatistics/types';
import {
  COURSE_ID,
  PLAYER_ID,
  STATS_CARDS,
  FULL_CARD,
  resolvingQuery,
} from './statsFixtures';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function byRoundId(rounds: RoundSummary[]): Record<string, RoundSummary> {
  return Object.fromEntries(rounds.map((r) => [r.roundId, r]));
}

type StatsCard = Omit<typeof FULL_CARD, 'rounds'> & {
  rounds: Omit<
    typeof FULL_CARD.rounds,
    'handicap_source' | 'competitions' | 'competition_id'
  > & {
    handicap_source?: string | null;
    competition_id: string | null;
    competitions: { id: string; name: string; handicap_source: string } | null;
  };
};

async function loadPlayerStats(cards: StatsCard[] = STATS_CARDS) {
  mockFrom.mockImplementation((table: string) =>
    resolvingQuery(
      table === 'scorecards'
        ? { data: cards, error: null }
        : { data: [], error: null }
    )
  );
  const { result } = renderHook(() => usePlayerStatistics(PLAYER_ID), {
    wrapper: makeWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data!;
}

async function loadCourseStats(cards: StatsCard[] = STATS_CARDS) {
  mockFrom.mockImplementation(() =>
    resolvingQuery({ data: cards, error: null })
  );
  const { result } = renderHook(
    () => useCourseStatistics(PLAYER_ID, COURSE_ID),
    {
      wrapper: makeWrapper(),
    }
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result.current.data!;
}

describe('stats classification', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('counts complete standalone rounds as Handicap rounds (locks current behaviour)', async () => {
    const stats = await loadPlayerStats();
    const recent = byRoundId(stats.recentRounds);

    expect(recent['round-full']).toMatchObject({
      isHandicapRound: true,
      isPracticeRound: false,
      competitionName: 'Handicap Round',
    });
    expect(recent['round-nine'].isHandicapRound).toBe(true);
  });

  it('classifies an ended-early round as Practice, never Handicap (usePlayerStatistics)', async () => {
    const stats = await loadPlayerStats();
    const recent = byRoundId(stats.recentRounds);

    // Before: handicapRoundsPlayed 3, practiceRoundsPlayed 0.
    expect(stats.handicapRoundsPlayed).toBe(2);
    expect(stats.practiceRoundsPlayed).toBe(1);
    expect(
      stats.handicapRoundsPlayed +
        stats.practiceRoundsPlayed +
        stats.competitionRoundsPlayed
    ).toBe(stats.roundsPlayed);
    expect(recent['round-ended']).toMatchObject({
      isHandicapRound: false,
      isPracticeRound: true,
      competitionName: 'Practice Round',
    });
  });

  it('classifies an ended-early round as Practice, never Handicap (useCourseStatistics)', async () => {
    const stats = await loadCourseStats();
    const recent = byRoundId(stats.recentRounds);

    expect(recent['round-ended']).toMatchObject({
      isHandicapRound: false,
      isPracticeRound: true,
    });
    expect(recent['round-full'].isHandicapRound).toBe(true);
  });
});

const ordinaryCards: StatsCard[] = [
  'profile',
  'calculated',
  'none',
  null,
  undefined,
].map((source, index) => ({
  ...FULL_CARD,
  id: `source-${index}`,
  round_id: `round-source-${index}`,
  rounds: {
    ...FULL_CARD.rounds,
    id: `round-source-${index}`,
    handicap_source: source,
  },
}));
ordinaryCards.push({
  ...FULL_CARD,
  id: 'competition',
  round_id: 'round-competition',
  rounds: {
    ...FULL_CARD.rounds,
    id: 'round-competition',
    competition_id: 'comp-1',
    competitions: { id: 'comp-1', name: 'Winter Cup', handicap_source: 'none' },
  },
});

describe('ordinary statistics source partition', () => {
  beforeEach(() => mockFrom.mockReset());
  it('preserves default sources and keeps Competition outside Practice/Handicap', async () => {
    const player = await loadPlayerStats(ordinaryCards);
    expect(player).toMatchObject({
      roundsPlayed: 6,
      handicapRoundsPlayed: 4,
      practiceRoundsPlayed: 1,
      competitionRoundsPlayed: 1,
    });
    for (const stats of [
      await loadPlayerStats(ordinaryCards.slice(0, 5)),
      await loadCourseStats(ordinaryCards.slice(0, 5)),
    ]) {
      const recent = byRoundId(stats.recentRounds);
      for (const index of [0, 1, 3, 4])
        expect(recent[`round-source-${index}`]).toMatchObject({
          isHandicapRound: true,
          isPracticeRound: false,
        });
      expect(recent['round-source-2']).toMatchObject({
        isHandicapRound: false,
        isPracticeRound: true,
      });
    }
    for (const stats of [
      await loadPlayerStats(ordinaryCards.slice(5)),
      await loadCourseStats(ordinaryCards.slice(5)),
    ]) {
      expect(stats.recentRounds[0]).toMatchObject({
        isHandicapRound: false,
        isPracticeRound: false,
        competitionName: 'Winter Cup',
      });
    }
  });
  it.each([0, -1, 1.5, NaN])(
    'keeps invalid end marker %s ordinary, preserving raw metadata and scored count',
    async (marker) => {
      const cards = [
        { ...FULL_CARD, rounds: { ...FULL_CARD.rounds, holes_played: marker } },
      ];
      for (const stats of [
        await loadPlayerStats(cards),
        await loadCourseStats(cards),
      ]) {
        expect(stats.recentRounds[0]).toMatchObject({
          isHandicapRound: true,
          isPracticeRound: false,
          holesPlayed: 18,
          roundHolesPlayed: marker,
        });
      }
    }
  );
});

describe('ended source and competition statistics', () => {
  beforeEach(() => mockFrom.mockReset());
  it.each(['profile', 'calculated', 'none', null, undefined])(
    'makes valid ended source %s Practice in both hooks',
    async (source) => {
      const card: StatsCard = {
        ...FULL_CARD,
        rounds: {
          ...FULL_CARD.rounds,
          handicap_source: source,
          holes_played: 9,
        },
      };
      const player = await loadPlayerStats([card]);
      expect(player).toMatchObject({
        roundsPlayed: 1,
        handicapRoundsPlayed: 0,
        practiceRoundsPlayed: 1,
        competitionRoundsPlayed: 0,
        nineHoleRoundsPlayed: 0,
      });
      for (const stats of [player, await loadCourseStats([card])]) {
        expect(stats.recentRounds[0]).toMatchObject({
          isHandicapRound: false,
          isPracticeRound: true,
          competitionName: 'Practice Round',
          holesPlayed: 18,
          roundHolesPlayed: 9,
        });
      }
    }
  );
  it('preserves Competition separately even with end metadata', async () => {
    const card = ordinaryCards[5];
    const cards = [{ ...card, rounds: { ...card.rounds, holes_played: 6 } }];
    const player = await loadPlayerStats(cards);
    expect(player).toMatchObject({
      roundsPlayed: 1,
      handicapRoundsPlayed: 0,
      practiceRoundsPlayed: 0,
      competitionRoundsPlayed: 1,
    });
    for (const stats of [player, await loadCourseStats(cards)]) {
      expect(stats.recentRounds[0]).toMatchObject({
        isHandicapRound: false,
        isPracticeRound: false,
        competitionName: 'Winter Cup',
      });
    }
  });
});
