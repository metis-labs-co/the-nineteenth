import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HoleMapScreen from '@/screens/scoring/HoleMapScreen';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    background: '#0b0f0a',
    surface: '#ffffff',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    primary: '#16a34a',
    white: '#ffffff',
    info: '#3b82f6',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
  }),
}));

jest.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    location: { latitude: -37.81, longitude: 144.96 },
    accuracy: 5,
    permissionStatus: 'granted',
    isLoading: false,
    isWatching: true,
    hasBeenAsked: true,
    requestPermission: jest.fn(),
    startWatching: jest.fn(),
  }),
}));

jest.mock('@/hooks/useHoleCoordinates', () => ({
  useHoleCoordinatesByHole: () => ({
    data: {
      hole_number: 7,
      green_center: {
        id: 'gc',
        course_id: 'c1',
        hole_number: 7,
        poi_type: 'green_center',
        latitude: -37.82,
        longitude: 144.97,
        side_of_fairway: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    },
    isLoading: false,
  }),
  useHasCoordinates: jest.fn(() => ({ data: true, isLoading: false })),
  useDistanceToGreen: () => ({ data: { yards: 100, meters: 91 }, isLoading: false }),
}));

const mockTriggerBackfill = jest.fn();
jest.mock('@/hooks/useCoordinateBackfill', () => ({
  useCoordinateBackfill: () => ({
    isBackfilling: false,
    wasAttempted: false,
    triggerBackfill: mockTriggerBackfill,
  }),
}));

jest.mock('@/hooks/useMapTier', () => ({ useMapTier: () => 'free' }));

jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${Math.round(yards)}yd`,
    unit: 'yards' as const,
    unitLabel: 'yd',
  }),
}));

const mockGoBack = jest.fn();

const makeProps = () =>
  ({
    route: {
      key: 'HoleMap-test',
      name: 'HoleMap',
      params: { courseId: 'c1', holeNumber: 7, roundId: 'r1' },
    },
    navigation: {
      goBack: mockGoBack,
      navigate: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => () => {}),
    },
  } as any);

describe('HoleMapScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockTriggerBackfill.mockClear();
  });

  it('renders header, map, user marker, and pin marker', () => {
    const { getByTestId, getByText } = render(<HoleMapScreen {...makeProps()} />);
    expect(getByText('Hole 7')).toBeTruthy();
    expect(getByTestId('hole-map-view')).toBeTruthy();
    expect(getByTestId('user-marker')).toBeTruthy();
    expect(getByTestId('pin-marker')).toBeTruthy();
  });

  it('close button calls navigation.goBack', () => {
    const { getByLabelText } = render(<HoleMapScreen {...makeProps()} />);
    fireEvent.press(getByLabelText(/close map/i));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows fallback overlay when course has no coordinates', () => {
    const { useHasCoordinates } = require('@/hooks/useHoleCoordinates');
    (useHasCoordinates as jest.Mock).mockReturnValueOnce({ data: false, isLoading: false });
    const { getByText } = render(<HoleMapScreen {...makeProps()} />);
    expect(getByText(/no map data/i)).toBeTruthy();
  });
});
