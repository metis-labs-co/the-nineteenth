import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/services/supabase/client';
import { authKeys, subscriptionKeys, roundKeys, scorecardKeys } from '@/hooks/queryKeys';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database/base';
import { EditStatsModal } from './EditStatsModal';
import ViewRoundScreen from './index';
import { createMockNavigation } from '@/__tests__/utils/renderHelpers';

jest.unmock('@/context/ThemeContext');

const update = jest.fn();
let readRound: unknown = null;
let readCards: unknown[] = [];
const user = { id: 'player-1' };
const session = { user, access_token: 'test-token' };
const holes = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  strokeIndex: i + 1,
})) as Hole[];
const card = {
  id: 'card-1',
  round_id: 'round-1',
  player_id: user.id,
  status: 'confirmed',
  total_gross: 10,
  total_net: 8,
  revision: 7,
  scores: { '1': { strokes: 4, putts: 2 }, '2': { strokes: 6, putts: 1 } },
  player: null,
} as unknown as ScorecardWithPlayer;

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  queryClient.setQueryData(authKeys.session(), session);
  queryClient.setQueryData(authKeys.user(), user);
  queryClient.setQueryData(authKeys.player(user.id), {
    id: user.id,
    name: 'Ann',
    age_status: 'eligible',
  });
  queryClient.setQueryData(subscriptionKeys.current(), { tier: 'premium' });
  queryClient.setQueryData(subscriptionKeys.allTierLimits(), {});
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ToastProvider>{children}</ToastProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  readRound = null;
  readCards = [];
  update.mockResolvedValue({ error: null });
  useSettingsStore.setState({
    showPutts: true,
    showFairwayHit: false,
    showGreenInRegulation: false,
    showBunkerShots: false,
    showHazards: false,
  });
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session }, error: null });
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user }, error: null });
  const channel = { on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() };
  Object.assign(supabase, { channel: jest.fn(() => channel), removeChannel: jest.fn() });
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const name of ['select', 'eq', 'is', 'in', 'order', 'limit'])
      chain[name] = jest.fn(() => chain);
    chain.update = jest.fn((payload: unknown) => {
      update(payload);
      return { eq: () => update.mock.results.at(-1)?.value };
    });
    chain.single = jest.fn(async () => ({
      data: table === 'rounds' ? readRound : null,
      error: null,
    }));
    chain.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    chain.then = (resolve: (value: unknown) => unknown) =>
      resolve({ data: table === 'scorecards' ? readCards : [], error: null });
    return chain;
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

it('edits putts on an ordinary submitted card without changing its strokes', async () => {
  const { wrapper } = setup();
  const onClose = jest.fn();
  const ui = render(
    <EditStatsModal
      visible
      onClose={onClose}
      scorecard={card}
      holes={holes}
      courseName="Test Course"
      roundShape={{ nine_type: 'full', holes_played: null }}
    />,
    { wrapper }
  );
  expect(ui.getByText('Hole 1')).toBeTruthy();
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][0].scores).toEqual({
    '1': { strokes: 4, putts: 3 },
    '2': { strokes: 6, putts: 1 },
  });
});

it('navigates existing retained physical back-nine holes and preserves unsupported JSON in the actual payload', async () => {
  const { wrapper } = setup();
  const originalScores = {
    '10': { strokes: 4, putts: 2, penalties: 1, custom: { keep: true } },
    '11': { balls: [{ strokes: 5, putts: 1 }] },
    '12': { strokes: 6, putts: 99 },
    metadata: [null, 'keep'],
    '12-note': { strokes: 4 },
  };
  const scorecard = { ...card, scores: originalScores } as unknown as ScorecardWithPlayer;
  const onClose = jest.fn();
  const ui = render(
    <EditStatsModal
      visible
      onClose={onClose}
      scorecard={scorecard}
      holes={holes}
      courseName="Test Course"
      initialHole={11}
      roundShape={{ nine_type: 'back9', holes_played: 3 }}
    />,
    { wrapper }
  );
  expect(ui.getByText('Hole 10')).toBeTruthy();
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByLabelText('Next hole'));
  expect(ui.getByText('Hole 12')).toBeTruthy();
  expect(ui.getByLabelText('Next hole')).toBeDisabled();
  expect(ui.queryByLabelText('Edit stats for hole 11')).toBeNull();
  expect(ui.queryByLabelText('Edit stats for hole 13')).toBeNull();
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][0]).toEqual({
    scores: { ...originalScores, '10': { ...originalScores['10'], putts: 3 } },
    updated_at: expect.any(String),
  });
});

it('a new open resets the always-mounted draft, hole selection, and unsaved state from fresh card data', async () => {
  const { wrapper } = setup();
  const onClose = jest.fn();
  const props = {
    onClose,
    scorecard: card,
    holes,
    courseName: 'Test Course',
    roundShape: { nine_type: 'full' as const, holes_played: null },
  };
  const ui = render(<EditStatsModal {...props} visible />, { wrapper });
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByLabelText('Next hole'));
  ui.rerender(<EditStatsModal {...props} visible={false} />);
  const fresh = {
    ...card,
    scores: { '1': { strokes: 5, putts: 4 }, '2': { strokes: 7, putts: 3 } },
  };
  ui.rerender(<EditStatsModal {...props} scorecard={fresh} visible />);
  expect(ui.getByText('Hole 1')).toBeTruthy();
  expect(ui.getByText(/Score: 5/)).toBeTruthy();
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][0].scores).toEqual(fresh.scores);
});

it('a changed cutoff while open discards the previous draft and reselects a retained hole from current data', async () => {
  const { wrapper } = setup();
  const onClose = jest.fn();
  const before = {
    ...card,
    scores: { '10': { strokes: 4, putts: 2 }, '11': { strokes: 5 }, '12': { strokes: 6 } },
  };
  const props = { visible: true, onClose, holes, courseName: 'Test Course', initialHole: 12 };
  const ui = render(
    <EditStatsModal
      {...props}
      scorecard={before}
      roundShape={{ nine_type: 'back9', holes_played: 3 }}
    />,
    { wrapper }
  );
  fireEvent.press(ui.getByText('+'));
  const fresh = {
    ...card,
    scores: { '10': { strokes: 7, putts: 4 }, '11': { strokes: 8, putts: 3 } },
  };
  ui.rerender(
    <EditStatsModal
      {...props}
      scorecard={fresh}
      roundShape={{ nine_type: 'back9', holes_played: 2 }}
    />
  );
  expect(ui.getByText('Hole 10')).toBeTruthy();
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][0].scores).toEqual(fresh.scores);
});

it('a server guard rejection closes the stale editor after refresh and requires user review on a new open', async () => {
  const { wrapper, queryClient } = setup();
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  update.mockResolvedValueOnce({
    error: { code: '22023', hint: 'round_shape_changed', message: 'Shape changed' },
  });
  const onClose = jest.fn();
  const ui = render(
    <EditStatsModal
      visible
      onClose={onClose}
      scorecard={card}
      holes={holes}
      courseName="Test Course"
      roundShape={{ nine_type: 'full', holes_played: null }}
    />,
    { wrapper }
  );
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Stats need review',
    expect.stringMatching(/reopen.*review.*re-enter/i)
  );
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['rounds', 'detail', 'round-1'] });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['scorecards', 'list', { roundId: 'round-1' }],
  });
  expect(update).toHaveBeenCalledTimes(1);
});

it('the actual ViewRound caller opens stats with the round back-nine cutoff and follows a live cutoff change', async () => {
  const { wrapper, queryClient } = setup();
  const scorecard = {
    ...card,
    scores: {
      '10': { strokes: 4, putts: 2 },
      '11': { strokes: 5, putts: 1 },
      '12': { strokes: 6, putts: 2 },
    },
    player: { id: user.id, name: 'Ann', handicap: 12 },
  };
  const round = {
    id: 'round-1',
    user_id: user.id,
    status: 'completed',
    game_type: 'stableford',
    nine_type: 'back9',
    holes_played: 3,
    competition_id: null,
    course: { id: 'course-1', name: 'Test Course', holes, tees: [], club: null },
    competition: null,
  };
  queryClient.setQueryData(roundKeys.detail('round-1'), round);
  queryClient.setQueryData(scorecardKeys.list({ roundId: 'round-1' }), [scorecard]);
  queryClient.setQueryData([...roundKeys.detail('round-1'), 'players'], [scorecard.player]);
  const props = {
    route: { key: 'round', name: 'ViewRound', params: { roundId: 'round-1', initialTab: 'stats' } },
    navigation: createMockNavigation(),
  } as unknown as React.ComponentProps<typeof ViewRoundScreen>;
  const ui = render(<ViewRoundScreen {...props} />, { wrapper });
  await waitFor(() => expect(ui.getByLabelText('Edit detailed stats')).toBeTruthy());
  fireEvent.press(ui.getByLabelText('Edit detailed stats'));
  expect(ui.getByText('Hole 10')).toBeTruthy();
  fireEvent.press(ui.getByText('+'));
  const fresh = {
    ...scorecard,
    scores: { '10': { strokes: 7, putts: 4 }, '11': { strokes: 8, putts: 3 } },
  };
  await act(async () => {
    queryClient.setQueryData(roundKeys.detail('round-1'), { ...round, holes_played: 2 });
    queryClient.setQueryData(scorecardKeys.list({ roundId: 'round-1' }), [fresh]);
  });
  await waitFor(() => expect(ui.getByText(/Score: 7/)).toBeTruthy());
  expect(ui.queryByLabelText('Edit stats for hole 12')).toBeNull();
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][0].scores).toEqual(fresh.scores);
});

it('editing putts preserves unchanged unsupported legacy stats without crashing the hazard controls', async () => {
  useSettingsStore.setState({ showHazards: true });
  const { wrapper } = setup();
  const scores = {
    '1': { strokes: 4, putts: 2, hazards: 'legacy-incident', bunkerShots: 88 },
    metadata: { version: 2 },
  };
  const scorecard = { ...card, scores } as unknown as ScorecardWithPlayer;
  const onClose = jest.fn();
  const ui = render(
    <EditStatsModal
      visible
      onClose={onClose}
      scorecard={scorecard}
      holes={holes}
      courseName="Test Course"
      roundShape={{ nine_type: 'full', holes_played: null }}
    />,
    { wrapper }
  );
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][0].scores).toEqual({ ...scores, '1': { ...scores['1'], putts: 3 } });
});

it('an empty or unsupported card offers no editable holes and cannot create an absent score', () => {
  const { wrapper } = setup();
  const scores = {
    '1': null,
    '2': 7,
    '3': { unsupported: true },
    '4': { balls: [{ strokes: 4 }] },
    metadata: { strokes: 8 },
  };
  const scorecard = { ...card, scores } as unknown as ScorecardWithPlayer;
  const ui = render(
    <EditStatsModal
      visible
      onClose={jest.fn()}
      scorecard={scorecard}
      holes={holes}
      courseName="Test Course"
      roundShape={{ nine_type: 'full', holes_played: null }}
    />,
    { wrapper }
  );
  expect(ui.getByText('No scored holes available to edit.')).toBeTruthy();
  expect(ui.getByText('Save All')).toBeDisabled();
  expect(ui.queryByText('+')).toBeNull();
  expect(update).not.toHaveBeenCalled();
});

it('a changed card while open resets the draft and the unsaved-change flag', () => {
  const { wrapper } = setup();
  const onClose = jest.fn();
  const props = {
    visible: true,
    onClose,
    holes,
    courseName: 'Test Course',
    roundShape: { nine_type: 'full' as const, holes_played: null },
  };
  const ui = render(<EditStatsModal {...props} scorecard={card} />, { wrapper });
  fireEvent.press(ui.getByText('+'));
  const fresh = { ...card, id: 'card-2', scores: { '2': { strokes: 8, putts: 4 } } };
  ui.rerender(<EditStatsModal {...props} scorecard={fresh} />);
  expect(ui.getByText('Hole 2')).toBeTruthy();
  expect(ui.getByText(/Score: 8/)).toBeTruthy();
  fireEvent.press(ui.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('an ordinary database failure keeps the edited stats available for a user retry', async () => {
  const { wrapper } = setup();
  update.mockResolvedValueOnce({ error: { message: 'Write failed' } });
  const onClose = jest.fn();
  const ui = render(
    <EditStatsModal
      visible
      onClose={onClose}
      scorecard={card}
      holes={holes}
      courseName="Test Course"
      roundShape={{ nine_type: 'full', holes_played: null }}
    />,
    { wrapper }
  );
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to save stats. Please try again.')
  );
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(update).toHaveBeenCalledTimes(2);
  expect(update.mock.calls[1][0].scores['1']).toEqual({ strokes: 4, putts: 3 });
});

it('an actual ViewRound guard refreshes active round/card queries and reopening requires a new edit of fresh scores', async () => {
  const { wrapper, queryClient } = setup();
  const player = { id: user.id, name: 'Ann', handicap: 12 };
  const scorecard = {
    ...card,
    player,
    scores: { '10': { strokes: 4, putts: 2 }, '11': { strokes: 5 }, '12': { strokes: 6 } },
  };
  const round = {
    id: 'round-1',
    user_id: user.id,
    status: 'completed',
    game_type: 'stableford',
    nine_type: 'back9',
    holes_played: 3,
    competition_id: null,
    course: { id: 'course-1', name: 'Test Course', holes, tees: [], club: null },
    competition: null,
  };
  queryClient.setQueryData(roundKeys.detail('round-1'), round);
  queryClient.setQueryData(scorecardKeys.list({ roundId: 'round-1' }), [scorecard]);
  queryClient.setQueryData([...roundKeys.detail('round-1'), 'players'], [player]);
  const props = {
    route: { key: 'round', name: 'ViewRound', params: { roundId: 'round-1', initialTab: 'stats' } },
    navigation: createMockNavigation(),
  } as unknown as React.ComponentProps<typeof ViewRoundScreen>;
  const ui = render(<ViewRoundScreen {...props} />, { wrapper });
  fireEvent.press(await ui.findByLabelText('Edit detailed stats'));
  fireEvent.press(ui.getByText('+'));
  const freshScores = { '10': { strokes: 7, putts: 4 }, '11': { strokes: 8, putts: 3 } };
  readRound = {
    ...round,
    holes_played: 2,
    courses: { ...round.course, clubs: null },
    competitions: null,
  };
  readCards = [{ ...scorecard, scores: freshScores, players: player }];
  update.mockResolvedValueOnce({
    error: { code: '22023', hint: 'round_score_out_of_play', message: 'Round changed' },
  });
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith('Stats need review', expect.any(String))
  );
  expect(queryClient.getQueryData(roundKeys.detail('round-1'))).toMatchObject({ holes_played: 2 });
  expect(queryClient.getQueryData(scorecardKeys.list({ roundId: 'round-1' }))).toMatchObject([
    { scores: freshScores },
  ]);
  expect(update).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(ui.queryByText('Save All')).toBeNull());
  fireEvent.press(ui.getByLabelText('Edit detailed stats'));
  expect(ui.getByText(/Score: 7/)).toBeTruthy();
  expect(ui.queryByLabelText('Edit stats for hole 12')).toBeNull();
  fireEvent.press(ui.getByText('+'));
  fireEvent.press(ui.getByText('Save All'));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  expect(update.mock.calls[1][0].scores).toEqual({
    ...freshScores,
    '10': { strokes: 7, putts: 5 },
  });
});
