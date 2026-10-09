import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import RoundSettingsScreen from './RoundSettingsScreen';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';

const mockRound = { current: {} as RoundWithCourse };
const mockPlayers = { current: [{ id: 'p1' }] };
const mockRoute = {
  params: { roundId: 'r1', competitionId: undefined as string | undefined },
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => mockRoute,
}));
jest.mock('@/context/SubscriptionContext', () => ({
  ...jest.requireActual('@/context/SubscriptionContext'),
  useIsSuperAdmin: () => false,
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'p1' } }),
}));
jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundDetails: () => ({ data: mockRound.current, refetch: jest.fn() }),
  useRoundScorecards: () => ({ data: [] }),
  useRoundPlayers: () => ({ data: mockPlayers.current }),
}));
jest.mock('@/hooks/rounds', () => ({
  useRoundPlayerTees: () => ({ data: [] }),
  useRecalculateRoundResults: () => ({}),
  useForceSyncRoundScorecards: () => ({}),
  useForceFinalizeRound: () => ({}),
  useReopenRound: () => ({}),
}));
jest.mock('@/hooks', () => ({
  useCompetitionInfo: () => ({ data: { organizer_id: 'p1' } }),
}));
jest.mock('@/hooks/useTeams', () => ({ useTeams: () => ({ data: [] }) }));
jest.mock('@/hooks/useDeleteRound', () => ({ useDeleteRound: () => ({}) }));
jest.mock('@/hooks/useSkins', () => ({
  useSkinsGamesByRound: () => ({ data: [] }),
  useCreateSkinsGame: () => ({}),
}));
jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('@/components/rounds/ViewRound', () => ({
  RoundGameSetupTab: () => null,
  EditTeesSheet: () => null,
}));
jest.mock('@/components/rounds/PairingSourceSummary', () => ({
  PairingSourceSummary: () => null,
}));
jest.mock('@/components/rounds/EditPairingConfigSheet', () => ({
  EditPairingConfigSheet: () => null,
}));
jest.mock('@/components/skins', () => ({ SkinsConfigBottomSheet: () => null }));
jest.mock('@/components/rounds/ForceSubmitRoundDialog', () => () => null);
jest.mock('../admin/AddRoundScreen/components', () => ({
  CourseSelectionModal: () => null,
}));
jest.mock('@/components/rounds/EditRoundNameSheet', () => {
  const { Text } = require('react-native');
  return {
    EditRoundNameSheet: ({
      visible,
      derivedTitle,
    }: {
      visible: boolean;
      derivedTitle: string;
    }) =>
      visible ? <Text testID="name-placeholder">{derivedTitle}</Text> : null,
  };
});

function setRound(overrides: Partial<RoundWithCourse> = {}) {
  mockRound.current = {
    id: 'r1',
    user_id: 'p1',
    name: null,
    status: 'completed',
    handicap_source: 'profile',
    holes_played: null,
    round_number: 2,
    ...overrides,
  } as RoundWithCourse;
}

beforeEach(() => {
  setRound();
  mockPlayers.current = [{ id: 'p1' }];
  mockRoute.params.competitionId = undefined;
});

describe('RoundSettings actual name fallback and sheet placeholder', () => {
  it.each(['profile', 'calculated', 'none', null, undefined] as const)(
    'preserves ordinary source %s',
    (source) => {
      setRound({ handicap_source: source });
      render(<RoundSettingsScreen />);
      const title =
        source && source !== 'none' ? 'Handicap Round' : 'Practice Round';
      expect(screen.getByText(title)).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Edit round name'));
      expect(screen.getByTestId('name-placeholder').props.children).toBe(title);
    }
  );
  it.each([0, -1, 1.5, NaN])('keeps invalid marker %s ordinary', (marker) => {
    setRound({ holes_played: marker });
    render(<RoundSettingsScreen />);
    expect(screen.getByText('Handicap Round')).toBeTruthy();
  });
  it('keeps a custom name and multiplayer Match title', () => {
    setRound({ name: 'Sunday golf', holes_played: 6 });
    const ui = render(<RoundSettingsScreen />);
    expect(screen.getByText('Sunday golf')).toBeTruthy();
    setRound({ holes_played: 6 });
    mockPlayers.current = [{ id: 'p1' }, { id: 'p2' }];
    ui.rerender(<RoundSettingsScreen />);
    expect(screen.getByText('Match')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Edit round name'));
    expect(screen.getByTestId('name-placeholder').props.children).toBe('Match');
  });
  it('keeps competition title', () => {
    mockRoute.params.competitionId = 'comp-1';
    setRound({ holes_played: 6 });
    render(<RoundSettingsScreen />);
    expect(screen.getByText('Round 2')).toBeTruthy();
  });
});

describe('ended settings title wiring', () => {
  it.each(['profile', 'calculated', 'none', null, undefined] as const)(
    'routes valid ended source %s to fallback and name placeholder',
    (source) => {
      setRound({ handicap_source: source });
      const ui = render(<RoundSettingsScreen />);
      fireEvent.press(screen.getByLabelText('Edit round name'));
      setRound({ handicap_source: source, holes_played: 6 });
      ui.rerender(<RoundSettingsScreen />);
      expect(screen.queryByText('Handicap Round')).toBeNull();
      expect(screen.getByTestId('name-placeholder').props.children).toBe(
        'Practice Round'
      );
      expect(screen.getAllByText('Practice Round')).toHaveLength(2);
    }
  );
});
