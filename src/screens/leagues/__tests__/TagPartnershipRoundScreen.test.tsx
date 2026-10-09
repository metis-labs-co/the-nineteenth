import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import TagPartnershipRoundScreen from '../TagPartnershipRoundScreen';
import * as partnershipApi from '@/services/api/partnershipLeagues';
import type { PartnershipFormat } from '@/types/database';

const mockFrom = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const mockUser = { id: 'user-1' };
let mockFormat: PartnershipFormat = 'combined_stroke';
const mockPartnership = { player_1_id: 'user-1', player_2_id: 'user-2' };
const mockMutation = { mutateAsync: jest.fn(), isPending: false };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/hooks/useLeagues', () => ({
  useLeague: () => ({ data: { partnership_format: mockFormat } }),
}));
jest.mock('@/hooks/usePartnershipLeague', () => ({
  useMyPartnership: () => ({ data: mockPartnership }),
  useTagPartnershipRound: () => mockMutation,
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { leagueId: 'league-1', partnershipId: 'partnership-1' } }),
}));
jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({}) }));
jest.mock('react-native-paper', () => ({
  Text: require('react-native').Text,
  Icon: () => null,
}));
jest.mock('@/components/common', () => ({
  PageHeader: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{title}</Text>;
  },
  LoadingSpinner: () => {
    const { Text } = require('react-native');
    return <Text testID="cards-loading">Loading</Text>;
  },
}));
jest.mock('@/components/leagues/DifficultyLevelSelector', () => ({
  DifficultyLevelSelector: () => null,
}));

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: unknown };
let calls: Call[];

function wire(result: Result | Promise<Result>) {
  calls = [];
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'not', 'is', 'order']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  mockFrom.mockReturnValue(chain);
}

function cardRow(id: string, playerId: string, courseName: string, holesPlayed: number | null = null) {
  return {
    id,
    player_id: playerId,
    total_gross: 88,
    status: 'completed',
    daily_handicap_used: 14,
    course_rating_used: 71.2,
    slope_rating_used: 128,
    rounds: {
      date: '2026-09-10',
      course_id: 'course-1',
      par: 72,
      holes_played: holesPlayed,
      courses: { name: courseName },
    },
  };
}

describe('TagPartnershipRoundScreen card loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormat = 'combined_stroke';
    jest.spyOn(partnershipApi, 'getPartnershipEligibleCards');
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it.each<{ format: PartnershipFormat; playerIds: string[] }>([
    { format: 'combined_stroke', playerIds: ['user-1', 'user-2'] },
    { format: 'scramble', playerIds: ['user-1'] },
  ])('loads the appropriate players for $format (locks current behaviour)', async ({ format, playerIds }) => {
    mockFormat = format;
    wire({
      data: [cardRow('mine', 'user-1', 'My Course'), cardRow('partner', 'user-2', 'Partner Course')],
      error: null,
    });
    const screen = render(<TagPartnershipRoundScreen />);
    expect(screen.getByTestId('cards-loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('My Course')).toBeTruthy());

    expect(mockFrom).toHaveBeenCalledWith('scorecards');
    expect(partnershipApi.getPartnershipEligibleCards).toHaveBeenCalledWith(playerIds);
    expect(calls).toEqual(expect.arrayContaining([
      { method: 'in', args: ['player_id', playerIds] },
      { method: 'in', args: ['status', ['completed', 'confirmed']] },
      { method: 'not', args: ['total_gross', 'is', null] },
      { method: 'is', args: ['rounds.deleted_at', null] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ]));
    const select = String(calls.find((c) => c.method === 'select')?.args[0]);
    expect(select).toContain('rounds!inner');
    for (const field of ['id', 'player_id', 'total_gross', 'status', 'daily_handicap_used',
      'course_rating_used', 'slope_rating_used', 'date', 'course_id', 'par', 'courses ( name )']) {
      expect(select).toContain(field);
    }
    expect(screen.queryByTestId('cards-loading')).toBeNull();
    expect(screen.queryByText('Partner Course') != null).toBe(format !== 'scramble');
    expect(screen.getAllByText(/Gross 88/)).toHaveLength(format === 'scramble' ? 1 : 2);
  });

  it('keeps loading visible until the query settles (locks current behaviour)', async () => {
    let resolve!: (result: Result) => void;
    wire(new Promise<Result>((done) => { resolve = done; }));
    const screen = render(<TagPartnershipRoundScreen />);
    expect(screen.getByTestId('cards-loading')).toBeTruthy();
    await act(async () => { resolve({ data: null, error: null }); });
    expect(screen.queryByTestId('cards-loading')).toBeNull();
    expect(screen.getByText('No eligible completed scorecards found.')).toBeTruthy();
  });

  it('logs the query error and clears loading (locks current behaviour)', async () => {
    const error = { message: 'boom' };
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      wire({ data: null, error });
      const screen = render(<TagPartnershipRoundScreen />);
      await waitFor(() => expect(screen.queryByTestId('cards-loading')).toBeNull());
      expect(log).toHaveBeenCalledWith('[TagPartnershipRound] Error loading cards:', error);
      expect(screen.getByText('No eligible completed scorecards found.')).toBeTruthy();
    } finally {
      log.mockRestore();
    }
  });

  it.each<PartnershipFormat>(['combined_stroke', 'scramble'])('never offers early-ended cards in %s', async (format) => {
    mockFormat = format;
    wire({ data: [
      cardRow('mine-full', 'user-1', 'Full Course'),
      cardRow('mine-ended', 'user-1', 'Ended Course', 6),
      cardRow('partner-full', 'user-2', 'Partner Course'),
      cardRow('partner-ended', 'user-2', 'Partner Ended Course', 9),
    ], error: null });
    const screen = render(<TagPartnershipRoundScreen />);
    await waitFor(() => expect(screen.getByText('Full Course')).toBeTruthy());
    expect(partnershipApi.getPartnershipEligibleCards).toHaveBeenCalledWith(
      format === 'scramble' ? ['user-1'] : ['user-1', 'user-2']
    );
    expect(screen.queryByText('Ended Course')).toBeNull();
    expect(screen.queryByText('Partner Ended Course')).toBeNull();
    expect(screen.queryByText('Partner Course') != null).toBe(format !== 'scramble');
  });
});
