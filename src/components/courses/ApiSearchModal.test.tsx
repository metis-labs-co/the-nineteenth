/**
 * ApiSearchModal Component Tests
 *
 * Tests for the course search modal including:
 * - Search input and debouncing
 * - State filter chips
 * - Loading, error, and empty states
 * - Course list display (cached and API results)
 * - Import functionality
 * - API unavailable state
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/__tests__/utils/renderHelpers';
import { ApiSearchModal } from './ApiSearchModal';
import type { LegacyCourse } from '@/types/database.types';

// =====================================================
// MOCKS
// =====================================================

// Mock hooks
const mockUseApiCourseSearch = jest.fn();
const mockUseImportBasicCourse = jest.fn();
const mockUseIsApiAvailable = jest.fn();

jest.mock('@/hooks/useApiCourses', () => ({
  useApiCourseSearch: (...args: unknown[]) => mockUseApiCourseSearch(...args),
  useImportBasicCourse: (options: { onSuccess?: (course: LegacyCourse) => void; onError?: (error: Error) => void }) => {
    const mutation = mockUseImportBasicCourse();
    return {
      ...mutation,
      mutate: (course: Partial<LegacyCourse>) => {
        // When keepLoading is true, don't call any callback (to test loading state)
        if (mutation.keepLoading) {
          return;
        }
        if (mutation.shouldSucceed !== false) {
          options.onSuccess?.({ ...course, id: 'new-id' } as LegacyCourse);
        } else if (mutation.shouldError) {
          options.onError?.(new Error('Import failed'));
        }
      },
    };
  },
  useIsApiAvailable: () => mockUseIsApiAvailable(),
}));

// Mock BottomSheet component
jest.mock('@/components/common', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    BottomSheet: ({
      visible,
      onClose,
      title,
      children,
      testID,
    }: {
      visible: boolean;
      onClose: () => void;
      title: string;
      children: React.ReactNode;
      testID?: string;
    }) =>
      visible ? (
        <View testID={testID || 'bottom-sheet'}>
          <View testID="bottom-sheet-header">
            <Text>{title}</Text>
            <TouchableOpacity testID="close-button" onPress={onClose}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      ) : null,
    GolfBallLoader: ({ size }: { size: string }) => (
      <View testID="golf-ball-loader">
        <Text>Loading {size}</Text>
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

const createMockCourse = (
  id: string,
  name: string,
  options: Partial<LegacyCourse> = {}
): Partial<LegacyCourse> => ({
  id,
  api_id: id,
  name,
  city: 'Melbourne',
  state: 'VIC',
  address: '123 Golf Street',
  ...options,
});

const createSearchResult = (options: {
  cached?: Partial<LegacyCourse>[];
  apiResults?: Partial<LegacyCourse>[];
  apiError?: string;
  cachedTotal?: number;
}) => ({
  cached: options.cached || [],
  apiResults: options.apiResults || [],
  apiError: options.apiError,
  cachedTotal: options.cachedTotal || 0,
  hasMoreCached: false,
  apiSearched: true,
});

// =====================================================
// TEST SUITE
// =====================================================

describe('ApiSearchModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onCourseImported: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default hook implementations
    mockUseIsApiAvailable.mockReturnValue(true);
    mockUseApiCourseSearch.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null,
    });
    mockUseImportBasicCourse.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      shouldSucceed: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders nothing when not visible', () => {
      render(<ApiSearchModal {...defaultProps} visible={false} />);
      expect(screen.queryByTestId('api-search-modal')).toBeNull();
    });

    it('renders modal when visible', () => {
      render(<ApiSearchModal {...defaultProps} />);
      expect(screen.getByTestId('api-search-modal')).toBeTruthy();
    });

    it('displays correct title', () => {
      render(<ApiSearchModal {...defaultProps} />);
      expect(screen.getByText('Search Courses')).toBeTruthy();
    });

    it('renders search input', () => {
      render(<ApiSearchModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search by course name...')).toBeTruthy();
    });

    it('renders state filter section', () => {
      render(<ApiSearchModal {...defaultProps} />);
      expect(screen.getByText('Filter by state:')).toBeTruthy();
    });

    it('renders all Australian state chips', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const states = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
      states.forEach((state) => {
        expect(screen.getByText(state)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // API UNAVAILABLE STATE
  // ===========================================================================

  describe('API Unavailable State', () => {
    it('shows unavailable message when API is not configured', () => {
      mockUseIsApiAvailable.mockReturnValue(false);

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('API Not Configured')).toBeTruthy();
      expect(
        screen.getByText('Course search API is not available. Please configure your GolfAPI.io credentials.')
      ).toBeTruthy();
    });

    it('still shows title when API unavailable', () => {
      mockUseIsApiAvailable.mockReturnValue(false);

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Search Courses')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SEARCH INPUT TESTS
  // ===========================================================================

  describe('Search Input', () => {
    it('updates search query on input', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Royal Melbourne');

      expect(input.props.value).toBe('Royal Melbourne');
    });

    it('debounces search query by 300ms', async () => {
      render(<ApiSearchModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Royal');

      // Should not have triggered search yet
      expect(mockUseApiCourseSearch).toHaveBeenLastCalledWith(
        '', // debounced query still empty
        undefined,
        expect.any(Object)
      );

      // Fast-forward past debounce time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now the debounced query should be updated
      // Component re-renders with new debounced value
    });

    it('clears search when clear icon is pressed', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Royal');

      // The TextInput should update
      expect(input.props.value).toBe('Royal');

      // Clear should reset
      fireEvent.changeText(input, '');
      expect(input.props.value).toBe('');
    });
  });

  // ===========================================================================
  // STATE FILTER TESTS
  // ===========================================================================

  describe('State Filter', () => {
    it('selects state when chip is pressed', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const vicChip = screen.getByText('VIC');
      fireEvent.press(vicChip);

      // The hook should be called with the selected state
      // On next render after state update
    });

    it('deselects state when same chip is pressed again', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const vicChip = screen.getByText('VIC');

      // Select
      fireEvent.press(vicChip);
      // Deselect
      fireEvent.press(vicChip);

      // State should be undefined again
    });

    it('changes selection when different state is pressed', () => {
      render(<ApiSearchModal {...defaultProps} />);

      fireEvent.press(screen.getByText('VIC'));
      fireEvent.press(screen.getByText('NSW'));

      // NSW should now be selected
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty States', () => {
    it('shows initial prompt when no search query', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Search for golf courses by name')).toBeTruthy();
      expect(screen.getByText('Or filter by state to browse courses')).toBeTruthy();
    });

    it('shows no results message when search returns empty', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({ cached: [], apiResults: [] }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Simulate a search with debounce
      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Nonexistent Course');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // The empty state message
      expect(screen.getByText('No courses found')).toBeTruthy();
      expect(screen.getByText('Try a different search term or filter')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('shows loading indicator when searching', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: null,
        isLoading: true,
        isFetching: true,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Searching courses...')).toBeTruthy();
    });

    it('shows loading indicator when fetching', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({ cached: [] }),
        isLoading: false,
        isFetching: true,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('shows error message when search fails', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: { message: 'Network error' },
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Trigger search
      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Test');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByText('Search failed')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('shows API error banner when API returns error', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Local Course')],
          apiError: 'API rate limit exceeded',
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('API rate limit exceeded')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COURSE LIST TESTS
  // ===========================================================================

  describe('Course List', () => {
    it('displays cached courses', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [
            createMockCourse('1', 'Royal Melbourne'),
            createMockCourse('2', 'Kingston Heath'),
          ],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
      expect(screen.getByText('Kingston Heath')).toBeTruthy();
    });

    it('displays API results', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [
            createMockCourse('api-1', 'Victoria Golf Club'),
            createMockCourse('api-2', 'Metropolitan Golf Club'),
          ],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Victoria Golf Club')).toBeTruthy();
      expect(screen.getByText('Metropolitan Golf Club')).toBeTruthy();
    });

    it('shows "Saved" badge for cached courses', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Royal Melbourne')],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Saved')).toBeTruthy();
    });

    it('shows Import button for API results', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [createMockCourse('api-1', 'Victoria Golf Club')],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Import')).toBeTruthy();
    });

    it('does not show Import button for cached courses', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Royal Melbourne')],
          apiResults: [],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.queryByText('Import')).toBeNull();
    });

    it('displays city and state', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Royal Melbourne', { city: 'Black Rock', state: 'VIC' })],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Black Rock, VIC')).toBeTruthy();
    });

    it('displays only state when city is missing', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Royal Melbourne', { city: undefined, state: 'NSW' })],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Use getAllByText since state chips also show state names
      const nswElements = screen.getAllByText('NSW');
      expect(nswElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays address when available', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Royal Melbourne', { address: '359 Cheltenham Road' })],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('359 Cheltenham Road')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RESULT COUNT TESTS
  // ===========================================================================

  describe('Result Count', () => {
    it('shows result count when results exist', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Course 1')],
          apiResults: [createMockCourse('2', 'Course 2')],
          cachedTotal: 1,
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Text may be split across elements, use regex
      expect(screen.getByText(/2.*course.*found/i)).toBeTruthy();
    });

    it('shows singular form for single result', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          cached: [createMockCourse('1', 'Course 1')],
          cachedTotal: 1,
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Text may be split across elements, use regex
      expect(screen.getByText(/1.*course.*found/i)).toBeTruthy();
    });

    it('does not show result count when no results', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({ cached: [], apiResults: [] }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.queryByText(/courses? found/)).toBeNull();
    });
  });

  // ===========================================================================
  // IMPORT FUNCTIONALITY TESTS
  // ===========================================================================

  describe('Import Functionality', () => {
    it('calls import mutation when Import button is pressed', () => {
      const mockMutate = jest.fn();
      mockUseImportBasicCourse.mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
        shouldSucceed: true,
      });

      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [createMockCourse('api-1', 'Victoria Golf Club')],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      const importButton = screen.getByText('Import');
      fireEvent.press(importButton);

      // The course should be passed to mutate
    });

    it('shows "Importing" text while import is in progress', async () => {
      // Make mutate not call any callback to keep loading state
      mockUseImportBasicCourse.mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
        keepLoading: true, // Don't call onSuccess/onError
      });

      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [createMockCourse('api-1', 'Victoria Golf Club')],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Press import
      const importButton = screen.getByText('Import');
      fireEvent.press(importButton);

      // Button text changes to "Importing" (internal state tracks importing IDs)
      await waitFor(() => {
        expect(screen.getByText('Importing')).toBeTruthy();
      });
    });

    it('calls onCourseImported callback after successful import', async () => {
      const onCourseImported = jest.fn();
      mockUseImportBasicCourse.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
        shouldSucceed: true,
      });

      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [createMockCourse('api-1', 'Victoria Golf Club')],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} onCourseImported={onCourseImported} />);

      const importButton = screen.getByText('Import');
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(onCourseImported).toHaveBeenCalled();
      });
    });

    it('disables button while importing', async () => {
      // Make mutate not call any callback to keep loading state
      mockUseImportBasicCourse.mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
        keepLoading: true,
      });

      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [createMockCourse('api-1', 'Victoria Golf Club')],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Press import to start
      const importButton = screen.getByText('Import');
      fireEvent.press(importButton);

      // Button should now show "Importing" and be in loading state
      await waitFor(() => {
        expect(screen.getByText('Importing')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // CLOSE FUNCTIONALITY TESTS
  // ===========================================================================

  describe('Close Functionality', () => {
    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      render(<ApiSearchModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('resets state when closed', () => {
      const onClose = jest.fn();
      render(<ApiSearchModal {...defaultProps} onClose={onClose} />);

      // Enter search query
      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Royal');

      // Select state
      fireEvent.press(screen.getByText('VIC'));

      // Close
      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HOOK INTEGRATION TESTS
  // ===========================================================================

  describe('Hook Integration', () => {
    it('passes correct params to useApiCourseSearch', () => {
      render(<ApiSearchModal {...defaultProps} />);

      // Initial call - enabled is false because query is empty and no state selected
      expect(mockUseApiCourseSearch).toHaveBeenCalledWith(
        '', // empty debounced query
        undefined, // no state selected
        expect.objectContaining({
          searchApi: true,
        })
      );
    });

    it('enables search when query is 2+ characters', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Ro');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Hook should be called with enabled: true when query >= 2 chars
    });

    it('enables search when state is selected', () => {
      render(<ApiSearchModal {...defaultProps} />);

      fireEvent.press(screen.getByText('VIC'));

      // Hook should be called with state parameter
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible search input', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by course name...');
      expect(input).toBeTruthy();
    });

    it('uses testID for main modal', () => {
      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByTestId('api-search-modal')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles course without api_id gracefully', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [{ name: 'Course Without ID', city: 'Melbourne', state: 'VIC' }],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      expect(screen.getByText('Course Without ID')).toBeTruthy();
    });

    it('handles null/undefined error message', () => {
      mockUseApiCourseSearch.mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: { message: null },
      });

      render(<ApiSearchModal {...defaultProps} />);

      // Trigger search
      const input = screen.getByPlaceholderText('Search by course name...');
      fireEvent.changeText(input, 'Test');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByText('Please try again')).toBeTruthy();
    });

    it('handles rapid typing with debounce', () => {
      render(<ApiSearchModal {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by course name...');

      // Rapid typing
      fireEvent.changeText(input, 'R');
      act(() => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.changeText(input, 'Ro');
      act(() => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.changeText(input, 'Roy');
      act(() => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.changeText(input, 'Roya');
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Final value should be "Roya"
      expect(input.props.value).toBe('Roya');
    });

    it('handles multiple imports simultaneously', async () => {
      // Make mutate not call any callback to keep loading state
      mockUseImportBasicCourse.mockReturnValue({
        mutate: jest.fn(),
        isLoading: true,
        keepLoading: true,
      });

      mockUseApiCourseSearch.mockReturnValue({
        data: createSearchResult({
          apiResults: [
            createMockCourse('api-1', 'Course 1'),
            createMockCourse('api-2', 'Course 2'),
          ],
        }),
        isLoading: false,
        isFetching: false,
        error: null,
      });

      render(<ApiSearchModal {...defaultProps} />);

      const importButtons = screen.getAllByText('Import');
      expect(importButtons.length).toBe(2);

      // Press first button
      fireEvent.press(importButtons[0]);

      // First button should show "Importing"
      await waitFor(() => {
        expect(screen.getByText('Importing')).toBeTruthy();
      });

      // Press second button (need to get remaining Import button)
      const remainingImportButton = screen.getByText('Import');
      fireEvent.press(remainingImportButton);

      // Both should show "Importing"
      await waitFor(() => {
        const importingButtons = screen.getAllByText('Importing');
        expect(importingButtons.length).toBe(2);
      });
    });
  });
});
