import React from 'react';
import { render, fireEvent } from '@/__tests__/utils/renderHelpers';
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

const mockUseUserLocationReturn = {
  location: { latitude: -37.81, longitude: 144.96 } as { latitude: number; longitude: number } | null,
  accuracy: 5 as number | null,
  permissionStatus: 'granted' as 'granted' | 'denied' | 'undetermined',
  isLoading: false,
  isWatching: true,
  hasBeenAsked: true,
  requestPermission: jest.fn(),
  startWatching: jest.fn(),
  stopWatching: jest.fn(),
  error: null,
};

jest.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => mockUseUserLocationReturn,
}));

const buildCoord = (poi_type: string, lat: number, lng: number) => ({
  id: poi_type,
  course_id: 'c1',
  hole_number: 7,
  poi_type,
  latitude: lat,
  longitude: lng,
  side_of_fairway: null,
  created_at: '2026-01-01T00:00:00Z',
});

const PIN_ONLY_SET = {
  hole_number: 7,
  green_center: buildCoord('green_center', -37.82, 144.97),
};

// Greens clustered within ~25m of green_center to clear the
// MAX_GREEN_POI_DISTANCE_FROM_CENTER_M=50 sanity filter.
const FULL_SET = {
  hole_number: 7,
  tee_back: buildCoord('tee_back', -37.81, 144.96),
  tee_front: buildCoord('tee_front', -37.811, 144.961),
  green_front: buildCoord('green_front', -37.8208, 144.9708),
  green_center: buildCoord('green_center', -37.821, 144.971),
  green_back: buildCoord('green_back', -37.8212, 144.9712),
};

jest.mock('@/hooks/useHoleCoordinates', () => ({
  useHoleCoordinatesByHole: jest.fn(() => ({ data: undefined, isLoading: false })),
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

jest.mock('@/hooks/useMapTier', () => ({ useMapTier: jest.fn(() => 'free') }));

jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${Math.round(yards)}yd`,
    unit: 'yards' as const,
    unitLabel: 'yd',
  }),
}));

// Phase C2: mock shot hooks so the screen doesn't pull in the broken
// skins-via-rounds transitive imports.
jest.mock('@/hooks/shots', () => ({
  useShotLog: jest.fn(() => ({ data: [], isLoading: false })),
  useShotLogByRound: jest.fn(() => ({ data: [], isLoading: false })),
  useLogShot: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateShot: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteShot: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useSetShotClub: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useShotTrackingEligibility: jest.fn(() => ({ eligible: false, reason: 'not-premium' })),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ player: null, user: null })),
}));

jest.mock('@/hooks/queries/useBag', () => ({
  useBag: jest.fn(() => ({ data: [], isLoading: false })),
  useUpdateBag: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

// Phase C1: mock the hazard hooks so the screen doesn't need a QueryClient.
jest.mock('@/hooks/hazards', () => ({
  useHoleHazards: jest.fn(() => ({ data: [], isLoading: false })),
  useHazardBackfill: jest.fn(() => ({ wasAttempted: false })),
}));

jest.mock('@/store/shotLoggingPrefStore', () => ({
  useShotLoggingPrefStore: jest.fn((selector: any) =>
    selector({ byRound: {}, isTracking: () => false })
  ),
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

describe('HoleMapScreen — Free tier', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockTriggerBackfill.mockClear();
    const { useMapTier } = require('@/hooks/useMapTier');
    (useMapTier as jest.Mock).mockReturnValue('free');
    const { useHoleCoordinatesByHole } = require('@/hooks/useHoleCoordinates');
    (useHoleCoordinatesByHole as jest.Mock).mockReturnValue({
      data: PIN_ONLY_SET,
      isLoading: false,
    });
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

  it('does not render any POI markers on free tier', () => {
    const { useHoleCoordinatesByHole } = require('@/hooks/useHoleCoordinates');
    (useHoleCoordinatesByHole as jest.Mock).mockReturnValue({
      data: FULL_SET,
      isLoading: false,
    });
    const { queryByTestId } = render(<HoleMapScreen {...makeProps()} />);
    expect(queryByTestId('tee-poi-tee_back')).toBeNull();
    expect(queryByTestId('green-poi-green_center')).toBeNull();
  });
});

describe('HoleMapScreen — Social/Premium tier (Phase B)', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    const { useMapTier } = require('@/hooks/useMapTier');
    (useMapTier as jest.Mock).mockReturnValue('social');
    const { useHoleCoordinatesByHole } = require('@/hooks/useHoleCoordinates');
    (useHoleCoordinatesByHole as jest.Mock).mockReturnValue({
      data: FULL_SET,
      isLoading: false,
    });
  });

  it('renders green POI markers and never renders tee POI markers', () => {
    const { getByTestId, queryByTestId } = render(<HoleMapScreen {...makeProps()} />);
    expect(getByTestId('green-poi-green_front')).toBeTruthy();
    expect(getByTestId('green-poi-green_center-selected')).toBeTruthy();
    expect(getByTestId('green-poi-green_back')).toBeTruthy();
    expect(queryByTestId('tee-poi-tee_back')).toBeNull();
    expect(queryByTestId('tee-poi-tee_front')).toBeNull();
  });

  it('selecting a different green POI moves the selected indicator', () => {
    const { getByTestId, queryByTestId } = render(<HoleMapScreen {...makeProps()} />);
    fireEvent.press(getByTestId('green-poi-green_front'));
    expect(getByTestId('green-poi-green_front-selected')).toBeTruthy();
    expect(queryByTestId('green-poi-green_center-selected')).toBeNull();
  });

  it('reset button restores the default green target selection', () => {
    const { getByTestId, getByLabelText } = render(<HoleMapScreen {...makeProps()} />);
    fireEvent.press(getByTestId('green-poi-green_back'));
    fireEvent.press(getByLabelText(/reset marker/i));
    expect(getByTestId('green-poi-green_center-selected')).toBeTruthy();
  });
});

describe('HoleMapScreen — GPS header button', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockUseUserLocationReturn.requestPermission.mockClear();
    mockUseUserLocationReturn.startWatching.mockClear();
    mockUseUserLocationReturn.stopWatching.mockClear();
    const { useMapTier } = require('@/hooks/useMapTier');
    (useMapTier as jest.Mock).mockReturnValue('free');
    const { useHoleCoordinatesByHole } = require('@/hooks/useHoleCoordinates');
    (useHoleCoordinatesByHole as jest.Mock).mockReturnValue({
      data: PIN_ONLY_SET,
      isLoading: false,
    });
    // Reset to a known-good baseline; individual tests override.
    mockUseUserLocationReturn.permissionStatus = 'granted';
    mockUseUserLocationReturn.isWatching = true;
    mockUseUserLocationReturn.hasBeenAsked = true;
    mockUseUserLocationReturn.location = { latitude: -37.81, longitude: 144.96 };
  });

  it('shows the active GPS button when permission is granted and watching', () => {
    const { getByTestId } = render(<HoleMapScreen {...makeProps()} />);
    expect(getByTestId('gps-button-granted-active')).toBeTruthy();
  });

  it('tapping the GPS button while watching pauses the subscription', () => {
    const { getByTestId } = render(<HoleMapScreen {...makeProps()} />);
    fireEvent.press(getByTestId('gps-button-granted-active'));
    expect(mockUseUserLocationReturn.stopWatching).toHaveBeenCalledTimes(1);
  });

  it('tapping the GPS button while paused resumes the subscription', () => {
    mockUseUserLocationReturn.isWatching = false;
    const { getByTestId } = render(<HoleMapScreen {...makeProps()} />);
    fireEvent.press(getByTestId('gps-button-granted'));
    expect(mockUseUserLocationReturn.startWatching).toHaveBeenCalled();
  });

  it('shows the denied GPS button and prompts via Alert when permission is denied', () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    mockUseUserLocationReturn.permissionStatus = 'denied';
    mockUseUserLocationReturn.isWatching = false;
    mockUseUserLocationReturn.location = null;
    const { getByTestId } = render(<HoleMapScreen {...makeProps()} />);
    expect(getByTestId('gps-button-denied')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toMatch(/location is off/i);
    alertSpy.mockRestore();
  });

  it('tapping the denied GPS button opens device Settings', () => {
    const Linking = require('react-native').Linking;
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
    jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    mockUseUserLocationReturn.permissionStatus = 'denied';
    mockUseUserLocationReturn.isWatching = false;
    mockUseUserLocationReturn.location = null;
    const { getByTestId } = render(<HoleMapScreen {...makeProps()} />);
    fireEvent.press(getByTestId('gps-button-denied'));
    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    openSettingsSpy.mockRestore();
  });

  it('auto-requests permission when undetermined and not yet asked', () => {
    mockUseUserLocationReturn.permissionStatus = 'undetermined';
    mockUseUserLocationReturn.isWatching = false;
    mockUseUserLocationReturn.hasBeenAsked = false;
    mockUseUserLocationReturn.location = null;
    render(<HoleMapScreen {...makeProps()} />);
    expect(mockUseUserLocationReturn.requestPermission).toHaveBeenCalledTimes(1);
  });
});

describe('HoleMapScreen — Recenter button', () => {
  beforeEach(() => {
    const { useMapTier } = require('@/hooks/useMapTier');
    (useMapTier as jest.Mock).mockReturnValue('free');
    const { useHoleCoordinatesByHole } = require('@/hooks/useHoleCoordinates');
    (useHoleCoordinatesByHole as jest.Mock).mockReturnValue({
      data: PIN_ONLY_SET,
      isLoading: false,
    });
    mockUseUserLocationReturn.permissionStatus = 'granted';
    mockUseUserLocationReturn.isWatching = true;
    mockUseUserLocationReturn.hasBeenAsked = true;
  });

  it('shows the recenter button when the user location is known', () => {
    mockUseUserLocationReturn.location = { latitude: -37.81, longitude: 144.96 };
    const { getByTestId } = render(<HoleMapScreen {...makeProps()} />);
    expect(getByTestId('recenter-button')).toBeTruthy();
  });

  it('hides the recenter button when there is no user location', () => {
    mockUseUserLocationReturn.location = null;
    const { queryByTestId } = render(<HoleMapScreen {...makeProps()} />);
    expect(queryByTestId('recenter-button')).toBeNull();
  });
});
