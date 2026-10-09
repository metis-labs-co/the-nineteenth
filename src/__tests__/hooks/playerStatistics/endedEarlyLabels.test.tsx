import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlayerStatistics } from '@/hooks/playerStatistics/queries';
import { useCourseStatistics } from '@/hooks/playerStatistics/courseQueries';
import { recentRoundEndedEarlyLabel } from '@/hooks/playerStatistics/recentRounds';
import { COURSE_ID, PLAYER_ID, STATS_CARDS, buildStatsCard, range, resolvingQuery } from './statsFixtures';

const mockFrom = jest.fn();
const mockSelect = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const back9 = buildStatsCard({
  id: 'back9', date: '2026-09-12', holeNumbers: range(10, 15), strokes: 4,
  putts: 2, holesPlayed: 6, points: 12,
});
const CARDS = [...STATS_CARDS, { ...back9, rounds: { ...back9.rounds, nine_type: 'back9' } }];

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function stubCards(cards: unknown[]) {
  mockFrom.mockImplementation((table: string) => {
    const chain = resolvingQuery({ data: table === 'scorecards' ? cards : [], error: null });
    chain.select = (selection: string) => { mockSelect(selection); return chain; };
    return chain;
  });
}

async function loadStats(cards: unknown[] = CARDS) {
  stubCards(cards);
  const { result } = renderHook(() => ({
    player: usePlayerStatistics(PLAYER_ID),
    course: useCourseStatistics(PLAYER_ID, COURSE_ID),
  }), { wrapper: makeWrapper() });
  await waitFor(() => {
    expect(result.current.player.isSuccess).toBe(true);
    expect(result.current.course.isSuccess).toBe(true);
  });
  return [result.current.player.data!, result.current.course.data!];
}

describe('recent-round summary shape', () => {
  beforeEach(() => { mockFrom.mockReset(); mockSelect.mockReset(); });

  it('retains full, planned-nine and ended activity with scored-hole counts (characterization)', async () => {
    const stats = await loadStats();
    for (const result of stats) {
      expect(result.recentRounds.map((r) => [r.roundId, r.holesPlayed])).toEqual([
        ['round-back9', 6], ['round-ended', 6], ['round-nine', 9], ['round-full', 18],
      ]);
      expect(result.roundTrends.map((r) => r.roundId)).toEqual(['round-full', 'round-nine']);
      expect(result.averageGrossScore).toBe(90);
    }
  });

  it('carries round end metadata and planned nine through both hooks and selects', async () => {
    for (const result of await loadStats()) {
      const recent = Object.fromEntries(result.recentRounds.map((r) => [r.roundId, r]));
      expect(recent['round-ended']).toMatchObject({ roundHolesPlayed: 6, nineType: 'full' });
      expect(recent['round-back9']).toMatchObject({ roundHolesPlayed: 6, nineType: 'back9' });
      expect(recent['round-full']).toMatchObject({ roundHolesPlayed: null, nineType: 'full' });
      expect(recentRoundEndedEarlyLabel(recent['round-back9'])).toBe('Ended after 6 of 9');
      expect(recentRoundEndedEarlyLabel(recent['round-full'])).toBeNull();
    }
    const statsSelections = mockSelect.mock.calls.map(([selection]) => selection)
      .filter((selection: string) => selection.includes('rounds!inner'));
    expect(statsSelections).toHaveLength(2);
    for (const selection of statsSelections) {
      expect(selection).toMatch(/holes_played,\s*nine_type,/);
    }
  });

  it.each([0, -2, 2.5, NaN, undefined])('preserves raw marker %s and scored count with ordinary eligibility', async (marker) => {
    const card = buildStatsCard({ id: 'raw', date: '2026-09-15', holeNumbers: range(1, 18), strokes: 5, holesPlayed: null, points: 30 });
    const cards = [{ ...card, rounds: { ...card.rounds, holes_played: marker } }];
    for (const result of await loadStats(cards)) {
      expect(result.recentRounds[0]).toMatchObject({ holesPlayed: 18, roundHolesPlayed: marker ?? null, nineType: 'full' });
      expect(recentRoundEndedEarlyLabel(result.recentRounds[0])).toBeNull();
      expect(result.roundTrends.map((r) => r.roundId)).toEqual(['round-raw']);
    }
  });

  it('keeps the raw end count distinct from the scored-hole count', async () => {
    const card = buildStatsCard({ id: 'mismatch', date: '2026-09-15', holeNumbers: range(1, 18), strokes: 4, holesPlayed: 6, points: 12 });
    for (const result of await loadStats([card])) {
      expect(result.recentRounds[0]).toMatchObject({ holesPlayed: 18, roundHolesPlayed: 6, nineType: 'full' });
      expect(result.roundTrends).toEqual([]);
    }
  });
});
