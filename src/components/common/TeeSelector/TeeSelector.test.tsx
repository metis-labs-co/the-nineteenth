/**
 * TeeSelector Component Tests
 *
 * Tests for the unified tee selection component including:
 * - Pills variant rendering and interaction
 * - Cards variant rendering and interaction
 * - List variant rendering and interaction
 * - Selection state management
 * - Accessibility
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TeeSelector, getTeeColor } from './index';
import type { TeeSelectorProps } from './types';
import type { TeeBox, Venue } from '@/types/database.types';

// ===========================================================================
// MOCKS
// ===========================================================================

const mockColors = {
  primary: '#1E7F5E',
  primaryLighter: '#E6F5F0',
  primaryDark: '#145740',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${yards} yds`,
  }),
}));

jest.mock('react-native-paper', () => {
  const { Text, View } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, _color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }} />
    ),
  };
});

jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconGolf: ({ size, _color }: any) => (
      <View testID="icon-golf" style={{ width: size, height: size }} />
    ),
    IconCheck: ({ size, _color }: any) => (
      <View testID="icon-check" style={{ width: size, height: size }} />
    ),
  };
});

// ===========================================================================
// MOCK DATA
// ===========================================================================

const mockTees: TeeBox[] = [
  {
    name: 'Championship',
    color: 'black',
    totalYardage: 6850,
    courseRating: 73.5,
    slopeRating: 138,
  },
  {
    name: 'Blue',
    color: 'blue',
    totalYardage: 6450,
    courseRating: 71.2,
    slopeRating: 130,
  },
  {
    name: 'White',
    color: 'white',
    totalYardage: 6050,
    courseRating: 69.5,
    slopeRating: 125,
  },
];

const mockVenue: Venue = {
  id: '1',
  source: 'manual',
  golfapi_club_id: null,
  name: 'The Eastern Golf Club',
  state: 'VIC',
  city: 'Doncaster',
  address: '123 Golf Club Road',
  postal_code: null,
  country: 'Australia',
  continent: null,
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  website: null,
  location: null,
  total_holes: 18,
  is_featured: false,
  last_synced: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

const defaultProps: TeeSelectorProps = {
  tees: mockTees,
  selectedTee: null,
  onSelectTee: jest.fn(),
};

// ===========================================================================
// getTeeColor UTILITY TESTS
// ===========================================================================

describe('getTeeColor', () => {
  it('returns correct color for known tee colors', () => {
    expect(getTeeColor('black', '#000')).toBe('#1a1a1a');
    expect(getTeeColor('blue', '#000')).toBe('#2563eb');
    expect(getTeeColor('white', '#000')).toBe('#f5f5f5');
    expect(getTeeColor('red', '#000')).toBe('#dc2626');
    expect(getTeeColor('yellow', '#000')).toBe('#facc15');
    expect(getTeeColor('gold', '#000')).toBe('#eab308');
    expect(getTeeColor('green', '#000')).toBe('#16a34a');
    expect(getTeeColor('silver', '#000')).toBe('#9ca3af');
    expect(getTeeColor('orange', '#000')).toBe('#ea580c');
  });

  it('is case-insensitive', () => {
    expect(getTeeColor('BLUE', '#000')).toBe('#2563eb');
    expect(getTeeColor('Blue', '#000')).toBe('#2563eb');
    expect(getTeeColor('bLuE', '#000')).toBe('#2563eb');
  });

  it('returns fallback for unknown colors', () => {
    expect(getTeeColor('purple', '#fallback')).toBe('#fallback');
    expect(getTeeColor('unknown', '#default')).toBe('#default');
  });

  it('handles null/undefined color gracefully', () => {
    expect(getTeeColor(undefined as any, '#fallback')).toBe('#fallback');
    expect(getTeeColor(null as any, '#fallback')).toBe('#fallback');
  });
});

// ===========================================================================
// PILLS VARIANT TESTS
// ===========================================================================

describe('TeeSelector - Pills Variant', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TeeSelector {...defaultProps} variant="pills" testID="tee-selector" />);
      expect(screen.getByTestId('tee-selector')).toBeTruthy();
    });

    it('renders all tees as pills', () => {
      render(<TeeSelector {...defaultProps} variant="pills" testID="tee-selector" />);
      expect(screen.getByText('Championship')).toBeTruthy();
      expect(screen.getByText('Blue')).toBeTruthy();
      expect(screen.getByText('White')).toBeTruthy();
    });

    it('renders default label', () => {
      render(<TeeSelector {...defaultProps} variant="pills" />);
      expect(screen.getByText('Select Tee:')).toBeTruthy();
    });

    it('renders custom label', () => {
      render(
        <TeeSelector {...defaultProps} variant="pills" label="Choose Tee Box:" />
      );
      expect(screen.getByText('Choose Tee Box:')).toBeTruthy();
    });

    it('returns null when tees array is empty', () => {
      render(
        <TeeSelector {...defaultProps} tees={[]} variant="pills" testID="empty" />
      );
      expect(screen.queryByTestId('empty')).toBeNull();
    });

    it('renders yardage when showYardage is true', () => {
      render(<TeeSelector {...defaultProps} variant="pills" showYardage />);
      expect(screen.getByText('6850 yds')).toBeTruthy();
      expect(screen.getByText('6450 yds')).toBeTruthy();
    });

    it('does not render yardage when showYardage is false', () => {
      render(<TeeSelector {...defaultProps} variant="pills" showYardage={false} />);
      expect(screen.queryByText('6850 yds')).toBeNull();
    });
  });

  describe('Selection', () => {
    it('calls onSelectTee when a pill is pressed', () => {
      const onSelectTee = jest.fn();
      render(
        <TeeSelector
          {...defaultProps}
          onSelectTee={onSelectTee}
          variant="pills"
          testID="tee-selector"
        />
      );
      fireEvent.press(screen.getByText('Blue'));
      expect(onSelectTee).toHaveBeenCalledWith(mockTees[1]);
    });

    it('shows selected state for selected tee (by string)', () => {
      render(
        <TeeSelector
          {...defaultProps}
          selectedTee="Blue"
          variant="pills"
          testID="tee-selector"
        />
      );
      // Verify component renders with selection
      expect(screen.getByText('Blue')).toBeTruthy();
    });

    it('shows selected state for selected tee (by object)', () => {
      render(
        <TeeSelector
          {...defaultProps}
          selectedTee={mockTees[1]}
          variant="pills"
          testID="tee-selector"
        />
      );
      expect(screen.getByText('Blue')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has button role on each pill', () => {
      render(
        <TeeSelector {...defaultProps} variant="pills" testID="tee-selector" />
      );
      const pill = screen.getByTestId('tee-selector-pill-0');
      expect(pill.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility state for selected pill', () => {
      render(
        <TeeSelector
          {...defaultProps}
          selectedTee="Championship"
          variant="pills"
          testID="tee-selector"
        />
      );
      const selectedPill = screen.getByTestId('tee-selector-pill-0');
      expect(selectedPill.props.accessibilityState.selected).toBe(true);
    });

    it('has correct accessibility label with yardage', () => {
      render(
        <TeeSelector
          {...defaultProps}
          variant="pills"
          showYardage
          testID="tee-selector"
        />
      );
      const pill = screen.getByTestId('tee-selector-pill-0');
      expect(pill.props.accessibilityLabel).toContain('Championship tee');
      expect(pill.props.accessibilityLabel).toContain('6850 yds');
    });
  });
});

// ===========================================================================
// CARDS VARIANT TESTS
// ===========================================================================

describe('TeeSelector - Cards Variant', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TeeSelector {...defaultProps} variant="cards" testID="tee-selector" />);
      expect(screen.getByTestId('tee-selector')).toBeTruthy();
    });

    it('renders all tees as cards', () => {
      render(<TeeSelector {...defaultProps} variant="cards" />);
      expect(screen.getByText('Championship')).toBeTruthy();
      expect(screen.getByText('Blue')).toBeTruthy();
      expect(screen.getByText('White')).toBeTruthy();
    });

    it('renders course rating when available', () => {
      render(<TeeSelector {...defaultProps} variant="cards" />);
      expect(screen.getByText('CR: 73.5')).toBeTruthy();
      expect(screen.getByText('CR: 71.2')).toBeTruthy();
    });

    it('renders empty state when no tees', () => {
      render(
        <TeeSelector {...defaultProps} tees={[]} variant="cards" testID="tee-selector" />
      );
      expect(screen.getByText('No tees configured for this course')).toBeTruthy();
    });

    it('does not render course rating when not available', () => {
      const teesWithoutRating: TeeBox[] = [
        { name: 'Test', color: 'blue', totalYardage: 6000 },
      ];
      render(<TeeSelector {...defaultProps} tees={teesWithoutRating} variant="cards" />);
      expect(screen.queryByText(/CR:/)).toBeNull();
    });
  });

  describe('Selection', () => {
    it('calls onSelectTee when a card is pressed', () => {
      const onSelectTee = jest.fn();
      render(
        <TeeSelector
          {...defaultProps}
          onSelectTee={onSelectTee}
          variant="cards"
          testID="tee-selector"
        />
      );
      fireEvent.press(screen.getByTestId('tee-selector-card-1'));
      expect(onSelectTee).toHaveBeenCalledWith(mockTees[1]);
    });

    it('does not call onSelectTee when disabled', () => {
      const onSelectTee = jest.fn();
      render(
        <TeeSelector
          {...defaultProps}
          onSelectTee={onSelectTee}
          variant="cards"
          disabled
          testID="tee-selector"
        />
      );
      fireEvent.press(screen.getByTestId('tee-selector-card-0'));
      expect(onSelectTee).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has button role on each card', () => {
      render(
        <TeeSelector {...defaultProps} variant="cards" testID="tee-selector" />
      );
      const card = screen.getByTestId('tee-selector-card-0');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label with course rating', () => {
      render(
        <TeeSelector {...defaultProps} variant="cards" testID="tee-selector" />
      );
      const card = screen.getByTestId('tee-selector-card-0');
      expect(card.props.accessibilityLabel).toContain('Championship tee');
      expect(card.props.accessibilityLabel).toContain('course rating 73.5');
    });
  });
});

// ===========================================================================
// LIST VARIANT TESTS
// ===========================================================================

describe('TeeSelector - List Variant', () => {
  const listProps: TeeSelectorProps = {
    ...defaultProps,
    variant: 'list',
    courseInfo: {
      courseName: 'East/West Course',
      venue: mockVenue,
    },
    onSkip: jest.fn(),
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TeeSelector {...listProps} testID="tee-selector" />);
      expect(screen.getByTestId('tee-selector')).toBeTruthy();
    });

    it('renders all tees in the list', () => {
      render(<TeeSelector {...listProps} />);
      expect(screen.getByText('Championship')).toBeTruthy();
      expect(screen.getByText('Blue')).toBeTruthy();
      expect(screen.getByText('White')).toBeTruthy();
    });

    it('renders course banner when showBanner is true', () => {
      render(<TeeSelector {...listProps} testID="tee-selector" />);
      expect(screen.getByTestId('tee-selector-banner')).toBeTruthy();
      expect(screen.getByText('East/West Course')).toBeTruthy();
    });

    it('renders venue info in banner', () => {
      render(<TeeSelector {...listProps} />);
      expect(screen.getByText(/The Eastern Golf Club/)).toBeTruthy();
      expect(screen.getByText(/Doncaster, VIC/)).toBeTruthy();
    });

    it('does not render banner when showBanner is false', () => {
      render(
        <TeeSelector {...listProps} showBanner={false} testID="tee-selector" />
      );
      expect(screen.queryByTestId('tee-selector-banner')).toBeNull();
    });

    it('renders skip button when onSkip is provided', () => {
      render(<TeeSelector {...listProps} testID="tee-selector" />);
      expect(screen.getByText('Skip tee selection')).toBeTruthy();
    });

    it('does not render skip button when onSkip is not provided', () => {
      render(<TeeSelector {...listProps} onSkip={undefined} />);
      expect(screen.queryByText('Skip tee selection')).toBeNull();
    });

    it('renders tee details with yardage and ratings', () => {
      render(<TeeSelector {...listProps} />);
      expect(screen.getByText(/6850 yds/)).toBeTruthy();
      expect(screen.getByText(/CR 73.5 \/ Slope 138/)).toBeTruthy();
    });

    it('renders list title', () => {
      render(<TeeSelector {...listProps} />);
      expect(screen.getByText('Choose your tees')).toBeTruthy();
    });
  });

  describe('Selection', () => {
    it('calls onSelectTee when a list item is pressed', () => {
      const onSelectTee = jest.fn();
      render(
        <TeeSelector
          {...listProps}
          onSelectTee={onSelectTee}
          testID="tee-selector"
        />
      );
      fireEvent.press(screen.getByTestId('tee-selector-list-item-1'));
      expect(onSelectTee).toHaveBeenCalledWith(mockTees[1]);
    });

    it('shows check icon for selected tee', () => {
      render(
        <TeeSelector
          {...listProps}
          selectedTee={mockTees[0]}
          testID="tee-selector"
        />
      );
      expect(screen.getByTestId('icon-check')).toBeTruthy();
    });
  });

  describe('Skip Button', () => {
    it('calls onSkip when skip button is pressed', () => {
      const onSkip = jest.fn();
      render(<TeeSelector {...listProps} onSkip={onSkip} testID="tee-selector" />);
      fireEvent.press(screen.getByTestId('tee-selector-skip'));
      expect(onSkip).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has button role on each list item', () => {
      render(<TeeSelector {...listProps} testID="tee-selector" />);
      const item = screen.getByTestId('tee-selector-list-item-0');
      expect(item.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label with full details', () => {
      render(<TeeSelector {...listProps} testID="tee-selector" />);
      const item = screen.getByTestId('tee-selector-list-item-0');
      expect(item.props.accessibilityLabel).toContain('Championship tee');
      expect(item.props.accessibilityLabel).toContain('6850 yds');
      expect(item.props.accessibilityLabel).toContain('course rating 73.5');
      expect(item.props.accessibilityLabel).toContain('slope 138');
    });

    it('skip button has correct accessibility label', () => {
      render(<TeeSelector {...listProps} testID="tee-selector" />);
      const skipButton = screen.getByTestId('tee-selector-skip');
      expect(skipButton.props.accessibilityLabel).toBe('Skip tee selection');
    });
  });
});

// ===========================================================================
// VARIANT SWITCHING
// ===========================================================================

describe('TeeSelector - Variant Switching', () => {
  it('defaults to pills variant', () => {
    render(<TeeSelector {...defaultProps} testID="tee-selector" />);
    // Pills variant has scrollable content
    expect(screen.getByText('Select Tee:')).toBeTruthy();
  });

  it('renders pills variant when specified', () => {
    render(<TeeSelector {...defaultProps} variant="pills" />);
    expect(screen.getByText('Select Tee:')).toBeTruthy();
  });

  it('renders cards variant when specified', () => {
    render(<TeeSelector {...defaultProps} variant="cards" tees={[]} />);
    expect(screen.getByText('No tees configured for this course')).toBeTruthy();
  });

  it('renders list variant when specified', () => {
    render(
      <TeeSelector
        {...defaultProps}
        variant="list"
        courseInfo={{ courseName: 'Test' }}
      />
    );
    expect(screen.getByText('Choose your tees')).toBeTruthy();
  });
});

// ===========================================================================
// EDGE CASES
// ===========================================================================

describe('TeeSelector - Edge Cases', () => {
  it('handles single tee', () => {
    const singleTee: TeeBox[] = [mockTees[0]];
    render(<TeeSelector {...defaultProps} tees={singleTee} variant="cards" />);
    expect(screen.getByText('Championship')).toBeTruthy();
  });

  it('handles tees with missing optional fields', () => {
    const minimalTees: TeeBox[] = [
      { name: 'Basic', color: 'white', totalYardage: 6000 },
    ];
    render(<TeeSelector {...defaultProps} tees={minimalTees} variant="list" />);
    expect(screen.getByText('Basic')).toBeTruthy();
    expect(screen.getByText('6000 yds')).toBeTruthy();
  });

  it('handles unknown tee color', () => {
    const unknownColorTee: TeeBox[] = [
      { name: 'Custom', color: 'purple', totalYardage: 6000 },
    ];
    render(<TeeSelector {...defaultProps} tees={unknownColorTee} variant="pills" />);
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('handles course info without venue', () => {
    render(
      <TeeSelector
        {...defaultProps}
        variant="list"
        courseInfo={{ courseName: 'Just Course Name' }}
      />
    );
    expect(screen.getByText('Just Course Name')).toBeTruthy();
  });

  it('handles venue without city/state', () => {
    const venueWithoutLocation: Venue = {
      ...mockVenue,
      city: null,
      state: null,
    };
    render(
      <TeeSelector
        {...defaultProps}
        variant="list"
        courseInfo={{
          courseName: 'Test Course',
          venue: venueWithoutLocation,
        }}
      />
    );
    expect(screen.getByText('The Eastern Golf Club')).toBeTruthy();
  });

  it('handles tee with only courseRating', () => {
    const teeWithOnlyCR: TeeBox[] = [
      { name: 'CR Only', color: 'blue', totalYardage: 6000, courseRating: 70.0 },
    ];
    render(<TeeSelector {...defaultProps} tees={teeWithOnlyCR} variant="list" />);
    expect(screen.getByText(/CR 70/)).toBeTruthy();
  });

  it('handles tee with only slopeRating', () => {
    const teeWithOnlySlope: TeeBox[] = [
      { name: 'Slope Only', color: 'red', totalYardage: 5500, slopeRating: 120 },
    ];
    render(<TeeSelector {...defaultProps} tees={teeWithOnlySlope} variant="list" />);
    expect(screen.getByText(/Slope 120/)).toBeTruthy();
  });
});

// ===========================================================================
// MEMOIZATION
// ===========================================================================

describe('TeeSelector - Memoization', () => {
  it('is wrapped with React.memo', () => {
    expect(TeeSelector).toBeDefined();
    expect(typeof TeeSelector).toBe('object'); // React.memo returns an object
  });

  it('renders consistently with same props', () => {
    const { rerender } = render(
      <TeeSelector {...defaultProps} variant="pills" testID="memo-test" />
    );
    expect(screen.getByTestId('memo-test')).toBeTruthy();

    rerender(<TeeSelector {...defaultProps} variant="pills" testID="memo-test" />);
    expect(screen.getByTestId('memo-test')).toBeTruthy();
  });
});
