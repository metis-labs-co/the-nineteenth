import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DistanceToPin } from '@/components/scorecard/HoleHeader/DistanceToPin';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    success: '#22c55e',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    gray400: '#9ca3af',
  }),
}));

let mockSettings = {
  showGpsDistance: true,
  enableHoleMap: true,
  distanceUnit: 'metres' as const,
};

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: jest.fn((selector: (s: typeof mockSettings) => unknown) =>
    selector(mockSettings)
  ),
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${Math.round(yards)}m`,
    unit: 'metres',
    unitLabel: 'm',
  }),
}));

jest.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    location: { latitude: 1, longitude: 2 },
    permissionStatus: 'granted',
    isLoading: false,
    isWatching: true,
    hasBeenAsked: true,
    requestPermission: jest.fn(),
    startWatching: jest.fn(),
  }),
}));

jest.mock('@/hooks/useHoleCoordinates', () => ({
  useHasCoordinates: () => ({ data: true, isLoading: false }),
  useDistanceToGreen: () => ({ data: { yards: 100, meters: 91 }, isLoading: false }),
}));

jest.mock('@/hooks/useCoordinateBackfill', () => ({
  useCoordinateBackfill: () => undefined,
}));

describe('DistanceToPin — open map on press', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSettings = {
      showGpsDistance: true,
      enableHoleMap: true,
      distanceUnit: 'metres',
    };
  });

  it('navigates to HoleMap when active badge pressed and flag is on', () => {
    const { getByLabelText } = render(
      <DistanceToPin courseId="c1" holeNumber={7} roundId="r1" />
    );
    fireEvent.press(getByLabelText(/distance to pin/i));
    expect(mockNavigate).toHaveBeenCalledWith('HoleMap', {
      courseId: 'c1',
      holeNumber: 7,
      roundId: 'r1',
    });
  });

  it('does not navigate when enableHoleMap is off', () => {
    mockSettings = { ...mockSettings, enableHoleMap: false };
    const { getByLabelText } = render(
      <DistanceToPin courseId="c1" holeNumber={7} roundId="r1" />
    );
    fireEvent.press(getByLabelText(/distance to pin/i));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when roundId is missing', () => {
    const { getByLabelText } = render(<DistanceToPin courseId="c1" holeNumber={7} />);
    fireEvent.press(getByLabelText(/distance to pin/i));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
