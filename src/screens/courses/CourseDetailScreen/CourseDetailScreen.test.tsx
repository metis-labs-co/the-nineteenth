/**
 * CourseDetailScreen — "Score a Round" wiring
 *
 * The Course screen opens the shared CreateRoundBottomSheet wizard. Every
 * choice the wizard collects (round type / handicap source, nine type, scoring
 * pairs, skins, wolf, teams, build-as-you-play, handicap override) must reach
 * the same start path the Rounds tab uses (useStartNewRound) — not a reduced
 * path that drops them.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CourseDetailScreen from '@/screens/courses/CourseDetailScreen';

// ---------------------------------------------------------------------------
// Start-round path + wizard (captured)
// ---------------------------------------------------------------------------
const mockHandleStartNewRound = jest.fn();
let mockOnStarted: (() => void) | undefined;
jest.mock('@/screens/rounds/RoundListScreen/hooks/useStartNewRound', () => ({
  useStartNewRound: (onStarted?: () => void) => {
    mockOnStarted = onStarted;
    return {
      handleStartNewRound: mockHandleStartNewRound,
      isStartingRound: false,
      dialogConfig: { visible: false, title: '', message: '' },
      dismissDialog: jest.fn(),
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- captured props of a mocked component
let mockSheetProps: any = null;
jest.mock('@/screens/rounds/CreateRoundBottomSheet', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    mockSheetProps = props;
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Screen data + leaf components
// ---------------------------------------------------------------------------
const mockCourse = {
  id: 'course-1',
  name: 'Settlers Run',
  is_favorite: false,
  club: null,
  holes: [],
  tees: [],
  teesFromTable: [],
  description: null,
  slope_rating: null,
  course_rating: null,
  golfapi_course_id: null,
};

jest.mock('@/hooks/useCourseDetails', () => ({
  useCourseDetails: () => ({
    data: mockCourse,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isRefetching: false,
  }),
}));
jest.mock('@/hooks/useClubs', () => ({
  useAddCourseFavorite: () => ({ mutateAsync: jest.fn() }),
  useRemoveCourseFavorite: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, player: { id: 'user-1', name: 'Sam', handicap: 8 } }),
}));
jest.mock('@/hooks/useHomeClub', () => ({ useHomeClub: () => ({ data: null }) }));
jest.mock('@/hooks/useCoordinateBackfill', () => ({ useCoordinateBackfill: jest.fn() }));
jest.mock('@/hooks', () => ({
  useConfirmationDialog: () => ({
    dialogConfig: { visible: false, title: '', message: '' },
    showDialog: jest.fn(),
    showAlert: jest.fn(),
    dismissDialog: jest.fn(),
  }),
  useCoordinateSummary: () => ({ data: null, refetch: jest.fn() }),
}));
jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({ formatDistance: (v: number) => `${v}` }),
}));
jest.mock('@/store/subscriptionStore', () => ({ useIsSocial: () => true }));
jest.mock('@/context/ThemeContext', () =>
  require('@/__tests__/mocks/contexts/ThemeContext.mock').createThemeContextMock()
);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('./hooks/useCourseAdminActions', () => ({
  useCourseAdminActions: () => ({
    isSuperAdmin: false,
    editingHole: null,
    setEditingHole: jest.fn(),
    handleHolePress: jest.fn(),
    handleSaveHole: jest.fn(),
    updateCourseHolesMutation: { isPending: false },
    isEditingCourse: false,
    setIsEditingCourse: jest.fn(),
    handleSaveCourse: jest.fn(),
    updateCourseMutation: { isPending: false },
    editingTee: null,
    setEditingTee: jest.fn(),
    handleSaveTee: jest.fn(),
    handleTeeEditPress: jest.fn(),
    updateTeeMutation: { isPending: false },
    isRefreshingFromApi: false,
    handleRefreshFromApi: jest.fn(),
    handleDeleteCourse: jest.fn(),
  }),
}));
jest.mock('./components', () => ({ HoleTable: () => null }));
jest.mock('@/components/courses', () => ({
  EditHoleBottomSheet: () => null,
  EditCourseBottomSheet: () => null,
  EditTeeBottomSheet: () => null,
}));

const navigation = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
const renderScreen = () =>
  render(
    <CourseDetailScreen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal navigation/route doubles
      navigation={navigation as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      route={{ key: 'Course', name: 'Course', params: { courseId: 'course-1' } } as any}
    />
  );

describe('CourseDetailScreen — Score a Round', () => {
  beforeEach(() => {
    mockSheetProps = null;
    mockOnStarted = undefined;
    mockHandleStartNewRound.mockClear();
  });

  it('labels the start button "Score a Round"', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Score a Round')).toBeTruthy();
    expect(queryByText('Score a Social Round')).toBeNull();
  });

  it('opens the round wizard when the button is pressed', () => {
    const { getByText } = renderScreen();
    expect(mockSheetProps.visible).toBe(false);
    fireEvent.press(getByText('Score a Round'));
    expect(mockSheetProps.visible).toBe(true);
  });

  it('passes every wizard choice to the shared start path', () => {
    renderScreen();
    const args = [
      'course-1',
      'Settlers Run',
      [],
      undefined,
      'stroke',
      { enabled: false },
      1,
      undefined,
      undefined,
      undefined,
      false,
      'none', // practice round — handicap source the old path dropped
      'front9', // nine type the old path dropped
      null,
    ];
    mockSheetProps.onStartRound(...args);
    expect(mockHandleStartNewRound).toHaveBeenCalledWith(...args);
  });

  it('closes the wizard once the round has started', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Score a Round'));
    expect(mockSheetProps.visible).toBe(true);
    act(() => mockOnStarted?.());
    expect(mockSheetProps.visible).toBe(false);
  });
});
