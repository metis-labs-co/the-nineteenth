import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSubmittedElsewhereRedirect } from '@/hooks/scorecard/useSubmittedElsewhereRedirect';
import { useScorecardStore } from '@/store/scorecardStore';

const mockReset = jest.fn();
let mockFocused = true;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ reset: mockReset }),
  useIsFocused: () => mockFocused,
}));

describe('useSubmittedElsewhereRedirect', () => {
  beforeEach(() => {
    mockReset.mockClear();
    mockFocused = true;
    useScorecardStore.setState({ submittedElsewhereRoundId: null });
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('alerts once and resets to ViewRound when another phone submits', () => {
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    act(() => { useScorecardStore.setState({ submittedElsewhereRoundId: 'r-1' }); });
    act(() => { useScorecardStore.setState({ submittedElsewhereRoundId: 'r-1' }); });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({
      routes: expect.arrayContaining([expect.objectContaining({ name: 'ViewRound' })]),
    }));
  });

  it('clears the flag when the alert is shown', () => {
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    act(() => { useScorecardStore.setState({ submittedElsewhereRoundId: 'r-1' }); });
    expect(useScorecardStore.getState().submittedElsewhereRoundId).toBeNull();
  });

  it('ignores a flag left by a different round', () => {
    useScorecardStore.setState({ submittedElsewhereRoundId: 'r-1' });
    renderHook(() => useSubmittedElsewhereRedirect('r-2', null));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('alerts once when two scoring screens are mounted together', () => {
    // Entry stays mounted beneath Review; only the focused one alerts.
    mockFocused = false;
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    mockFocused = true;
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    act(() => { useScorecardStore.setState({ submittedElsewhereRoundId: 'r-1' }); });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('two focused mounts still alert only once (flag cleared on show)', () => {
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    act(() => { useScorecardStore.setState({ submittedElsewhereRoundId: 'r-1' }); });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });
});
