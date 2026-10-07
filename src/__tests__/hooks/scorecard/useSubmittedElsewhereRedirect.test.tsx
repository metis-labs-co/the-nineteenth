import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useSubmittedElsewhereRedirect } from '@/hooks/scorecard/useSubmittedElsewhereRedirect';
import { useScorecardStore } from '@/store/scorecardStore';

const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ reset: mockReset }) }));

describe('useSubmittedElsewhereRedirect', () => {
  beforeEach(() => {
    mockReset.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
  });

  it('alerts once and resets to ViewRound when another phone submits', () => {
    useScorecardStore.setState({ submittedElsewhere: false } as never);
    renderHook(() => useSubmittedElsewhereRedirect('r-1', null));
    act(() => { useScorecardStore.setState({ submittedElsewhere: true } as never); });
    act(() => { useScorecardStore.setState({ submittedElsewhere: true } as never); });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith(expect.objectContaining({
      routes: expect.arrayContaining([expect.objectContaining({ name: 'ViewRound' })]),
    }));
  });
});
