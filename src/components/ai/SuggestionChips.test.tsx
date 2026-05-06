/**
 * SuggestionChips Component Tests
 *
 * Tests for the AI prompt suggestion chips component including:
 * - Rendering all chips
 * - Label text display
 * - Chip selection behavior
 * - Disabled state
 * - Tier-based filtering
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SuggestionChips } from './SuggestionChips';

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, color: _color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
      </View>
    ),
  };
});

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#4A90D9',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textDisabled: '#AAAAAA',
  }),
}));

const FREE_LABELS = ['Stableford comp', 'Quick round'] as const;
const SOCIAL_ONLY_LABELS = ['Stroke play', 'Par round'] as const;
const PREMIUM_ONLY_LABELS = ['Team event', 'Multi-round'] as const;
const ALL_LABELS = [
  ...FREE_LABELS,
  ...SOCIAL_ONLY_LABELS,
  ...PREMIUM_ONLY_LABELS,
];

const PROMPT_BY_LABEL: Record<string, string> = {
  'Stableford comp':
    'Create a Stableford competition with my friends next Saturday morning',
  'Quick round': 'Set up a Stableford round for 4 players this weekend',
  'Stroke play': 'Create a Stroke Play competition for 6 players next weekend',
  'Par round': 'Set up a Par round for 4 friends next Saturday morning',
  'Team event':
    'Create a 2-round Best Ball competition with 2 teams of 4 starting this weekend',
  'Multi-round':
    'Create a 4-round competition over 4 weeks alternating Stableford, Stroke Play, Match Play, and Par',
};

describe('SuggestionChips', () => {
  const defaultProps = {
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Try a suggestion:')).toBeTruthy();
    });

    it('renders all chips when no tier is provided', () => {
      render(<SuggestionChips {...defaultProps} />);
      ALL_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
    });

    it('renders icons for each chip when no tier is provided', () => {
      render(<SuggestionChips {...defaultProps} />);
      const expectedIcons = [
        'golf',
        'clock-fast',
        'counter',
        'plus-minus',
        'account-group',
        'calendar-multiple',
      ];
      expectedIcons.forEach((icon) => {
        expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // TIER FILTERING
  // ===========================================================================

  describe('Tier Filtering', () => {
    it('shows only free-tier chips for free users', () => {
      render(<SuggestionChips {...defaultProps} tier="free" />);
      FREE_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
      [...SOCIAL_ONLY_LABELS, ...PREMIUM_ONLY_LABELS].forEach((label) => {
        expect(screen.queryByText(label)).toBeNull();
      });
    });

    it('shows free + social chips for social users', () => {
      render(<SuggestionChips {...defaultProps} tier="social" />);
      [...FREE_LABELS, ...SOCIAL_ONLY_LABELS].forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
      PREMIUM_ONLY_LABELS.forEach((label) => {
        expect(screen.queryByText(label)).toBeNull();
      });
    });

    it('shows all chips for premium users', () => {
      render(<SuggestionChips {...defaultProps} tier="premium" />);
      ALL_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
    });

    it('shows all chips for super_admin users', () => {
      render(<SuggestionChips {...defaultProps} tier="super_admin" />);
      ALL_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // CHIP SELECTION TESTS
  // ===========================================================================

  describe('Chip Selection', () => {
    it('calls onSelect with the matching prompt for each chip', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      ALL_LABELS.forEach((label) => {
        onSelect.mockClear();
        fireEvent.press(screen.getByText(label));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(PROMPT_BY_LABEL[label]);
      });
    });

    it('allows selecting multiple chips sequentially', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      fireEvent.press(screen.getByText('Team event'));
      fireEvent.press(screen.getByText('Multi-round'));

      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it('allows pressing the same chip multiple times', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Quick round'));
      fireEvent.press(screen.getByText('Quick round'));
      fireEvent.press(screen.getByText('Quick round'));

      expect(onSelect).toHaveBeenCalledTimes(3);
      expect(onSelect).toHaveBeenCalledWith(PROMPT_BY_LABEL['Quick round']);
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not call onSelect when disabled', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} disabled />);

      ALL_LABELS.forEach((label) => {
        fireEvent.press(screen.getByText(label));
      });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('still renders all chips when disabled', () => {
      render(<SuggestionChips {...defaultProps} disabled />);
      ALL_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeTruthy();
      });
    });

    it('renders normally when disabled is false', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} disabled={false} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalled();
    });

    it('renders normally when disabled is undefined', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Team event'));
      expect(onSelect).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CALLBACK TESTS
  // ===========================================================================

  describe('Callback Behavior', () => {
    it('does not call onSelect on initial render', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('handles toggling disabled state', () => {
      const onSelect = jest.fn();
      const { rerender } = render(
        <SuggestionChips onSelect={onSelect} disabled={true} />
      );

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).not.toHaveBeenCalled();

      rerender(<SuggestionChips onSelect={onSelect} disabled={false} />);
      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalledTimes(1);

      rerender(<SuggestionChips onSelect={onSelect} disabled={true} />);
      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });
});
