/**
 * useBuildAsYouPlay Hook Tests
 *
 * Tests for the build-as-you-play hook that manages:
 * - Placeholder hole detection and configuration tracking
 * - Navigation blocking for unconfigured holes
 * - Hole setup save flow (persist + store update)
 * - Tee name recovery from existing hole data
 * - Used stroke index tracking
 * - Modal state management
 */

import { renderHook, act } from '@testing-library/react-native';
import { useBuildAsYouPlay } from './useBuildAsYouPlay';
import { useScorecardStore } from '@/store/scorecardStore';
import { useUpdateCourseHoles } from '@/hooks/useUpdateCourseHoles';
import type { Hole } from '@/types/database/base';

// ============================================================================
// MOCKS
// ============================================================================

const mockMutateAsync = jest.fn();
const mockReset = jest.fn();
const mockUpdateHoles = jest.fn();

jest.mock('@/hooks/useUpdateCourseHoles', () => ({
  useUpdateCourseHoles: jest.fn(),
}));

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: {
    getState: jest.fn(),
  },
}));

const mockedUseUpdateCourseHoles = useUpdateCourseHoles as jest.MockedFunction<
  typeof useUpdateCourseHoles
>;

const mockedUseScorecardStore = useScorecardStore as unknown as {
  getState: jest.MockedFunction<() => { updateHoles: jest.Mock }>;
};

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Create a placeholder hole: par=4, strokeIndex=holeNumber, no yardages */
function makePlaceholderHole(num: number): Hole {
  return {
    number: num as Hole['number'],
    par: 4,
    strokeIndex: num,
  };
}

/** Create a configured hole with non-default values and yardages */
function makeConfiguredHole(
  num: number,
  opts?: { par?: 3 | 4 | 5; strokeIndex?: number; yardages?: Record<string, number> }
): Hole {
  return {
    number: num as Hole['number'],
    par: opts?.par ?? 3,
    strokeIndex: opts?.strokeIndex ?? 5,
    yardages: opts?.yardages ?? { white: 150 },
  };
}

/** Create 18 placeholder holes */
function make18PlaceholderHoles(): Hole[] {
  const holes: Hole[] = [];
  for (let i = 1; i <= 18; i++) {
    holes.push(makePlaceholderHole(i));
  }
  return holes;
}

function setupMocks(isPending = false) {
  mockMutateAsync.mockResolvedValue({});
  mockedUseUpdateCourseHoles.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending,
    reset: mockReset,
    error: null,
  } as any);

  mockedUseScorecardStore.getState.mockReturnValue({
    updateHoles: mockUpdateHoles,
  });
}

const defaultParams = {
  enabled: true,
  courseId: 'course-123',
  holes: make18PlaceholderHoles(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('useBuildAsYouPlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // --------------------------------------------------------------------------
  // Disabled mode
  // --------------------------------------------------------------------------
  describe('disabled mode', () => {
    it('returns enabled: false and no-op functions when enabled is false', () => {
      const { result } = renderHook(() =>
        useBuildAsYouPlay({ ...defaultParams, enabled: false })
      );

      expect(result.current.enabled).toBe(false);
      expect(result.current.showHoleSetupModal).toBe(false);
      expect(result.current.pendingHoleNumber).toBeNull();
      expect(result.current.selectedTeeName).toBeNull();
      expect(result.current.isSaving).toBe(false);
      expect(result.current.usedStrokeIndexes.size).toBe(0);
    });

    it('isHoleConfigured returns true for any hole when disabled', () => {
      const { result } = renderHook(() =>
        useBuildAsYouPlay({ ...defaultParams, enabled: false })
      );

      expect(result.current.isHoleConfigured(1)).toBe(true);
      expect(result.current.isHoleConfigured(9)).toBe(true);
      expect(result.current.isHoleConfigured(18)).toBe(true);
    });

    it('checkHoleBeforeNavigation returns true for any hole when disabled', () => {
      const { result } = renderHook(() =>
        useBuildAsYouPlay({ ...defaultParams, enabled: false })
      );

      expect(result.current.checkHoleBeforeNavigation(1)).toBe(true);
      expect(result.current.checkHoleBeforeNavigation(5)).toBe(true);
      expect(result.current.checkHoleBeforeNavigation(18)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Placeholder detection
  // --------------------------------------------------------------------------
  describe('placeholder detection', () => {
    it('detects placeholder holes: par=4, strokeIndex=holeNumber, no yardages', () => {
      const holes = make18PlaceholderHoles();
      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      // All placeholder holes should be unconfigured
      expect(result.current.isHoleConfigured(1)).toBe(false);
      expect(result.current.isHoleConfigured(9)).toBe(false);
      expect(result.current.isHoleConfigured(18)).toBe(false);
    });

    it('non-placeholder: hole with different par (e.g., par 3) is configured', () => {
      const holes = make18PlaceholderHoles();
      holes[0] = makeConfiguredHole(1, { par: 3, strokeIndex: 1, yardages: {} });

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      expect(result.current.isHoleConfigured(1)).toBe(true);
    });

    it('non-placeholder: hole with yardages is configured', () => {
      const holes = make18PlaceholderHoles();
      holes[0] = { number: 1, par: 4, strokeIndex: 1, yardages: { white: 350 } };

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      expect(result.current.isHoleConfigured(1)).toBe(true);
    });

    it('non-placeholder: hole with different SI than holeNumber is configured', () => {
      const holes = make18PlaceholderHoles();
      // par=4, but strokeIndex differs from hole number
      holes[0] = { number: 1, par: 4, strokeIndex: 7 };

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      expect(result.current.isHoleConfigured(1)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Navigation blocking
  // --------------------------------------------------------------------------
  describe('navigation blocking', () => {
    it('checkHoleBeforeNavigation returns false for unconfigured holes and sets modal state', () => {
      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      let canNavigate: boolean;
      act(() => {
        canNavigate = result.current.checkHoleBeforeNavigation(5);
      });

      expect(canNavigate!).toBe(false);
      expect(result.current.showHoleSetupModal).toBe(true);
      expect(result.current.pendingHoleNumber).toBe(5);
    });

    it('checkHoleBeforeNavigation returns true for configured holes', () => {
      const holes = make18PlaceholderHoles();
      holes[2] = makeConfiguredHole(3);

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      let canNavigate: boolean;
      act(() => {
        canNavigate = result.current.checkHoleBeforeNavigation(3);
      });

      expect(canNavigate!).toBe(true);
      expect(result.current.showHoleSetupModal).toBe(false);
      expect(result.current.pendingHoleNumber).toBeNull();
    });

    it('sets pendingHoleNumber and showHoleSetupModal when blocking', () => {
      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      act(() => {
        result.current.checkHoleBeforeNavigation(12);
      });

      expect(result.current.pendingHoleNumber).toBe(12);
      expect(result.current.showHoleSetupModal).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Hole save flow
  // --------------------------------------------------------------------------
  describe('hole save flow', () => {
    it('handleSaveHoleSetup calls mutateAsync with courseId and updated holes array', async () => {
      const holes = make18PlaceholderHoles();
      const updatedHole = makeConfiguredHole(3, { par: 5, strokeIndex: 2, yardages: { blue: 520 } });

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      await act(async () => {
        await result.current.handleSaveHoleSetup(updatedHole);
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      const callArgs = mockMutateAsync.mock.calls[0][0];
      expect(callArgs.courseId).toBe('course-123');
      expect(callArgs.holes).toHaveLength(18);
      // The updated hole should be in the array
      expect(callArgs.holes[2]).toEqual(updatedHole);
      // Other holes should remain as placeholders
      expect(callArgs.holes[0]).toEqual(holes[0]);
    });

    it('handleSaveHoleSetup calls updateHoles on scorecard store', async () => {
      const holes = make18PlaceholderHoles();
      const updatedHole = makeConfiguredHole(1);

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      await act(async () => {
        await result.current.handleSaveHoleSetup(updatedHole);
      });

      expect(mockedUseScorecardStore.getState).toHaveBeenCalled();
      expect(mockUpdateHoles).toHaveBeenCalledTimes(1);
      const storeHoles = mockUpdateHoles.mock.calls[0][0];
      expect(storeHoles).toHaveLength(18);
      expect(storeHoles[0]).toEqual(updatedHole);
    });

    it('after save, hole is marked as configured', async () => {
      const holes = make18PlaceholderHoles();
      const updatedHole = makeConfiguredHole(7);

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      expect(result.current.isHoleConfigured(7)).toBe(false);

      await act(async () => {
        await result.current.handleSaveHoleSetup(updatedHole);
      });

      expect(result.current.isHoleConfigured(7)).toBe(true);
    });

    it('after save, modal is closed (showHoleSetupModal=false, pendingHoleNumber=null)', async () => {
      const holes = make18PlaceholderHoles();
      const updatedHole = makeConfiguredHole(4);

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      // First open the modal
      act(() => {
        result.current.checkHoleBeforeNavigation(4);
      });
      expect(result.current.showHoleSetupModal).toBe(true);
      expect(result.current.pendingHoleNumber).toBe(4);

      // Save the hole
      await act(async () => {
        await result.current.handleSaveHoleSetup(updatedHole);
      });

      expect(result.current.showHoleSetupModal).toBe(false);
      expect(result.current.pendingHoleNumber).toBeNull();
    });

    it('does nothing when courseId is null', async () => {
      const holes = make18PlaceholderHoles();
      const updatedHole = makeConfiguredHole(1);

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: null, holes })
      );

      await act(async () => {
        await result.current.handleSaveHoleSetup(updatedHole);
      });

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockUpdateHoles).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Used stroke indexes
  // --------------------------------------------------------------------------
  describe('used stroke indexes', () => {
    it('computes used SI values from configured holes only', () => {
      const holes = make18PlaceholderHoles();
      holes[0] = makeConfiguredHole(1, { strokeIndex: 3 });
      holes[4] = makeConfiguredHole(5, { strokeIndex: 11 });

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      expect(result.current.usedStrokeIndexes.has(3)).toBe(true);
      expect(result.current.usedStrokeIndexes.has(11)).toBe(true);
      expect(result.current.usedStrokeIndexes.size).toBe(2);
    });

    it('returns empty set when no holes configured', () => {
      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      expect(result.current.usedStrokeIndexes.size).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Tee name recovery
  // --------------------------------------------------------------------------
  describe('tee name recovery', () => {
    it('recovers tee name from first configured hole yardages on mount', () => {
      const holes = make18PlaceholderHoles();
      holes[2] = makeConfiguredHole(3, { yardages: { blue: 180 } });
      holes[5] = makeConfiguredHole(6, { yardages: { white: 400 } });

      const { result } = renderHook(() =>
        useBuildAsYouPlay({ enabled: true, courseId: 'course-123', holes })
      );

      // Should recover from the first configured hole (hole 3 -> 'blue')
      expect(result.current.selectedTeeName).toBe('blue');
    });

    it('does not recover when no configured holes exist', () => {
      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      expect(result.current.selectedTeeName).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Tee selection
  // --------------------------------------------------------------------------
  describe('tee selection', () => {
    it('handleSelectTee updates selectedTeeName', () => {
      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      expect(result.current.selectedTeeName).toBeNull();

      act(() => {
        result.current.handleSelectTee('red');
      });

      expect(result.current.selectedTeeName).toBe('red');
    });
  });

  // --------------------------------------------------------------------------
  // Modal dismiss
  // --------------------------------------------------------------------------
  describe('modal dismiss', () => {
    it('dismissModal clears showHoleSetupModal and pendingHoleNumber', () => {
      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      // Open the modal by navigating to an unconfigured hole
      act(() => {
        result.current.checkHoleBeforeNavigation(9);
      });

      expect(result.current.showHoleSetupModal).toBe(true);
      expect(result.current.pendingHoleNumber).toBe(9);

      // Dismiss
      act(() => {
        result.current.dismissModal();
      });

      expect(result.current.showHoleSetupModal).toBe(false);
      expect(result.current.pendingHoleNumber).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // isSaving
  // --------------------------------------------------------------------------
  describe('isSaving', () => {
    it('reflects mutation isPending state', () => {
      setupMocks(true);

      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      expect(result.current.isSaving).toBe(true);
    });

    it('is false when mutation is not pending', () => {
      setupMocks(false);

      const { result } = renderHook(() => useBuildAsYouPlay(defaultParams));

      expect(result.current.isSaving).toBe(false);
    });
  });
});
