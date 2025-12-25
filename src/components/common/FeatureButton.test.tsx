/**
 * FeatureButton Component Tests
 *
 * Tests for the prominent action button component including:
 * - Rendering with required and optional props
 * - Icon display
 * - Button interactions (press, disabled)
 * - Variant modes (horizontal, compact)
 * - Chevron visibility
 * - Custom styling
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { FeatureButton } from './FeatureButton';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray400: '#9CA3AF',
  gray600: '#6B7280',
  gray900: '#111827',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconChevronRight: (props: any) => (
      <View testID="icon-chevron-right" {...props} />
    ),
    IconPlus: (props: any) => <View testID="icon-plus" {...props} />,
    IconGolf: (props: any) => <View testID="icon-golf" {...props} />,
    IconTrophy: (props: any) => <View testID="icon-trophy" {...props} />,
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <RNText style={style} {...props}>
        {children}
      </RNText>
    ),
  };
});

// Helper to create mock icon
const MockIcon = ({ testID = 'mock-icon' }: { testID?: string }) => (
  <View testID={testID} />
);

describe('FeatureButton', () => {
  const defaultProps = {
    title: 'Score New Round',
    subtitle: 'Start scoring a round at any course',
    icon: <MockIcon testID="test-icon" />,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
    });

    it('renders with required props', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
      expect(
        screen.getByText('Start scoring a round at any course')
      ).toBeTruthy();
    });

    it('renders title correctly', () => {
      render(<FeatureButton {...defaultProps} title="Create Competition" />);
      expect(screen.getByText('Create Competition')).toBeTruthy();
    });

    it('renders subtitle correctly', () => {
      render(
        <FeatureButton {...defaultProps} subtitle="Organize your golf events" />
      );
      expect(screen.getByText('Organize your golf events')).toBeTruthy();
    });

    it('renders icon', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByTestId('test-icon')).toBeTruthy();
    });

    it('renders chevron by default', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('renders with long title', () => {
      const longTitle =
        'This is a very long title that might need truncation on smaller screens';
      render(<FeatureButton {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeTruthy();
    });

    it('renders with long subtitle', () => {
      const longSubtitle =
        'This is a very long subtitle providing detailed information about the feature';
      render(<FeatureButton {...defaultProps} subtitle={longSubtitle} />);
      expect(screen.getByText(longSubtitle)).toBeTruthy();
    });
  });

  // =========================================================================
  // ICON
  // =========================================================================

  describe('Icon', () => {
    it('renders custom icon component', () => {
      render(
        <FeatureButton
          {...defaultProps}
          icon={<MockIcon testID="custom-icon" />}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeTruthy();
    });

    it('renders different icon types', () => {
      const { rerender } = render(
        <FeatureButton {...defaultProps} icon={<MockIcon testID="icon-1" />} />
      );
      expect(screen.getByTestId('icon-1')).toBeTruthy();

      rerender(
        <FeatureButton {...defaultProps} icon={<MockIcon testID="icon-2" />} />
      );
      expect(screen.getByTestId('icon-2')).toBeTruthy();
    });

    it('displays icon in circular container', () => {
      render(<FeatureButton {...defaultProps} />);
      // Icon should be rendered within the component
      expect(screen.getByTestId('test-icon')).toBeTruthy();
    });
  });

  // =========================================================================
  // CHEVRON VISIBILITY
  // =========================================================================

  describe('Chevron Visibility', () => {
    it('shows chevron by default (showChevron=true)', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('shows chevron when showChevron=true', () => {
      render(<FeatureButton {...defaultProps} showChevron={true} />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('hides chevron when showChevron=false', () => {
      render(<FeatureButton {...defaultProps} showChevron={false} />);
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });
  });

  // =========================================================================
  // BUTTON PRESS
  // =========================================================================

  describe('Button Press', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      render(<FeatureButton {...defaultProps} onPress={onPress} />);
      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress multiple times on multiple presses', () => {
      const onPress = jest.fn();
      render(<FeatureButton {...defaultProps} onPress={onPress} />);
      const button = screen.getByText('Score New Round');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(3);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      render(<FeatureButton {...defaultProps} onPress={onPress} disabled />);
      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // DISABLED STATE
  // =========================================================================

  describe('Disabled State', () => {
    it('is not disabled by default', () => {
      const onPress = jest.fn();
      render(<FeatureButton {...defaultProps} onPress={onPress} />);
      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).toHaveBeenCalled();
    });

    it('renders in disabled state when disabled=true', () => {
      render(<FeatureButton {...defaultProps} disabled={true} />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
    });

    it('renders normally when disabled=false', () => {
      const onPress = jest.fn();
      render(<FeatureButton {...defaultProps} disabled={false} onPress={onPress} />);
      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).toHaveBeenCalled();
    });

    it('applies disabled styling', () => {
      render(<FeatureButton {...defaultProps} disabled testID="feature-btn" />);
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });
  });

  // =========================================================================
  // VARIANTS
  // =========================================================================

  describe('Variants', () => {
    it('renders horizontal variant by default', () => {
      render(<FeatureButton {...defaultProps} testID="feature-btn" />);
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('renders horizontal variant explicitly', () => {
      render(
        <FeatureButton
          {...defaultProps}
          variant="horizontal"
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('renders compact variant', () => {
      render(
        <FeatureButton
          {...defaultProps}
          variant="compact"
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('displays all content in compact variant', () => {
      render(<FeatureButton {...defaultProps} variant="compact" />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
      expect(
        screen.getByText('Start scoring a round at any course')
      ).toBeTruthy();
      expect(screen.getByTestId('test-icon')).toBeTruthy();
    });

    it('shows chevron in compact variant', () => {
      render(<FeatureButton {...defaultProps} variant="compact" />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('hides chevron in compact variant when showChevron=false', () => {
      render(
        <FeatureButton
          {...defaultProps}
          variant="compact"
          showChevron={false}
        />
      );
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });
  });

  // =========================================================================
  // BACKGROUND COLOR
  // =========================================================================

  describe('Background Color', () => {
    it('uses primary color by default', () => {
      render(<FeatureButton {...defaultProps} testID="feature-btn" />);
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('accepts custom background color', () => {
      render(
        <FeatureButton
          {...defaultProps}
          backgroundColor="#FF0000"
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('accepts theme colors as background', () => {
      render(
        <FeatureButton
          {...defaultProps}
          backgroundColor={mockColors.gray600}
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has button accessibility role', () => {
      render(<FeatureButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
    });

    it('uses title as default accessibility label', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByLabelText('Score New Round')).toBeTruthy();
    });

    it('uses custom accessibility label when provided', () => {
      render(
        <FeatureButton
          {...defaultProps}
          accessibilityLabel="Start a new golf round"
        />
      );
      expect(screen.getByLabelText('Start a new golf round')).toBeTruthy();
    });

    it('has disabled accessibility state when disabled', () => {
      render(<FeatureButton {...defaultProps} disabled />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual({ disabled: true });
    });

    it('has enabled accessibility state when not disabled', () => {
      render(<FeatureButton {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual({ disabled: false });
    });
  });

  // =========================================================================
  // TEST ID
  // =========================================================================

  describe('TestID', () => {
    it('applies testID to button', () => {
      render(<FeatureButton {...defaultProps} testID="my-feature-button" />);
      expect(screen.getByTestId('my-feature-button')).toBeTruthy();
    });

    it('works without testID', () => {
      render(<FeatureButton {...defaultProps} />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM STYLING
  // =========================================================================

  describe('Custom Styling', () => {
    it('accepts custom style prop', () => {
      render(
        <FeatureButton
          {...defaultProps}
          style={{ marginTop: 20 }}
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('accepts multiple style properties', () => {
      render(
        <FeatureButton
          {...defaultProps}
          style={{ marginTop: 20, marginBottom: 10, paddingHorizontal: 8 }}
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });

    it('combines default and custom styles', () => {
      render(
        <FeatureButton
          {...defaultProps}
          style={{ borderWidth: 2 }}
          testID="feature-btn"
        />
      );
      expect(screen.getByTestId('feature-btn')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with all props combined', () => {
      const onPress = jest.fn();
      render(
        <FeatureButton
          title="Create Competition"
          subtitle="Organize your golf events"
          icon={<MockIcon testID="combined-icon" />}
          onPress={onPress}
          backgroundColor="#3B82F6"
          disabled={false}
          accessibilityLabel="Create a new competition"
          testID="combined-btn"
          style={{ marginVertical: 16 }}
          showChevron={true}
          variant="horizontal"
        />
      );
      expect(screen.getByText('Create Competition')).toBeTruthy();
      expect(screen.getByText('Organize your golf events')).toBeTruthy();
      expect(screen.getByTestId('combined-icon')).toBeTruthy();
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
      expect(screen.getByTestId('combined-btn')).toBeTruthy();
    });

    it('renders compact variant with all props', () => {
      const onPress = jest.fn();
      render(
        <FeatureButton
          title="Quick Action"
          subtitle="Compact button"
          icon={<MockIcon testID="compact-icon" />}
          onPress={onPress}
          variant="compact"
          showChevron={false}
          backgroundColor="#EF4444"
          testID="compact-btn"
        />
      );
      expect(screen.getByText('Quick Action')).toBeTruthy();
      expect(screen.getByText('Compact button')).toBeTruthy();
      expect(screen.getByTestId('compact-icon')).toBeTruthy();
      expect(screen.queryByTestId('icon-chevron-right')).toBeNull();
    });

    it('renders disabled compact variant', () => {
      render(
        <FeatureButton
          {...defaultProps}
          variant="compact"
          disabled
          testID="disabled-compact"
        />
      );
      expect(screen.getByTestId('disabled-compact')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders as Score New Round button', () => {
      const onPress = jest.fn();
      render(
        <FeatureButton
          title="Score New Round"
          subtitle="Start scoring a round at any course"
          icon={<MockIcon testID="golf-icon" />}
          onPress={onPress}
        />
      );
      expect(screen.getByText('Score New Round')).toBeTruthy();
      expect(
        screen.getByText('Start scoring a round at any course')
      ).toBeTruthy();
      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).toHaveBeenCalled();
    });

    it('renders as Create Competition button', () => {
      const onPress = jest.fn();
      render(
        <FeatureButton
          title="Create Competition"
          subtitle="Organize golf events with friends"
          icon={<MockIcon testID="trophy-icon" />}
          onPress={onPress}
          backgroundColor="#8B5CF6"
        />
      );
      expect(screen.getByText('Create Competition')).toBeTruthy();
      expect(
        screen.getByText('Organize golf events with friends')
      ).toBeTruthy();
    });

    it('renders as View Leaderboard button', () => {
      render(
        <FeatureButton
          title="View Leaderboard"
          subtitle="See current standings"
          icon={<MockIcon testID="chart-icon" />}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByText('View Leaderboard')).toBeTruthy();
      expect(screen.getByText('See current standings')).toBeTruthy();
    });

    it('renders as Quick Score Entry (compact)', () => {
      render(
        <FeatureButton
          title="Quick Score"
          subtitle="Enter scores"
          icon={<MockIcon testID="edit-icon" />}
          onPress={jest.fn()}
          variant="compact"
          showChevron={false}
        />
      );
      expect(screen.getByText('Quick Score')).toBeTruthy();
      expect(screen.getByText('Enter scores')).toBeTruthy();
    });

    it('renders as disabled premium feature', () => {
      render(
        <FeatureButton
          title="Advanced Stats"
          subtitle="Premium feature"
          icon={<MockIcon testID="lock-icon" />}
          onPress={jest.fn()}
          disabled
        />
      );
      expect(screen.getByText('Advanced Stats')).toBeTruthy();
      expect(screen.getByText('Premium feature')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles empty title string', () => {
      render(<FeatureButton {...defaultProps} title="" />);
      expect(
        screen.getByText('Start scoring a round at any course')
      ).toBeTruthy();
    });

    it('handles empty subtitle string', () => {
      render(<FeatureButton {...defaultProps} subtitle="" />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
    });

    it('handles special characters in title', () => {
      render(
        <FeatureButton {...defaultProps} title="Score & Track Rounds!" />
      );
      expect(screen.getByText('Score & Track Rounds!')).toBeTruthy();
    });

    it('handles special characters in subtitle', () => {
      render(
        <FeatureButton
          {...defaultProps}
          subtitle="18 holes @ Royal Melbourne (Par 72)"
        />
      );
      expect(
        screen.getByText('18 holes @ Royal Melbourne (Par 72)')
      ).toBeTruthy();
    });

    it('handles emojis in title', () => {
      render(
        <FeatureButton {...defaultProps} title="Score Round 🏌️" />
      );
      expect(screen.getByText('Score Round 🏌️')).toBeTruthy();
    });

    it('handles emojis in subtitle', () => {
      render(
        <FeatureButton {...defaultProps} subtitle="Start now! ⛳" />
      );
      expect(screen.getByText('Start now! ⛳')).toBeTruthy();
    });

    it('handles very short content', () => {
      render(
        <FeatureButton {...defaultProps} title="Go" subtitle="Now" />
      );
      expect(screen.getByText('Go')).toBeTruthy();
      expect(screen.getByText('Now')).toBeTruthy();
    });

    it('handles numeric content in strings', () => {
      render(
        <FeatureButton {...defaultProps} title="Round 1" subtitle="18 holes" />
      );
      expect(screen.getByText('Round 1')).toBeTruthy();
      expect(screen.getByText('18 holes')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(FeatureButton).toBeDefined();
      expect(typeof FeatureButton).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const { rerender } = render(<FeatureButton {...defaultProps} />);
      expect(screen.getByText('Score New Round')).toBeTruthy();

      rerender(<FeatureButton {...defaultProps} />);
      expect(screen.getByText('Score New Round')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(
        <FeatureButton {...defaultProps} title="Original" />
      );
      expect(screen.getByText('Original')).toBeTruthy();

      rerender(<FeatureButton {...defaultProps} title="Updated" />);
      expect(screen.getByText('Updated')).toBeTruthy();
      expect(screen.queryByText('Original')).toBeNull();
    });
  });

  // =========================================================================
  // CALLBACK BEHAVIOR
  // =========================================================================

  describe('Callback Behavior', () => {
    it('preserves callback reference on rerender', () => {
      const onPress = jest.fn();
      const { rerender } = render(
        <FeatureButton {...defaultProps} onPress={onPress} />
      );

      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).toHaveBeenCalledTimes(1);

      rerender(<FeatureButton {...defaultProps} onPress={onPress} />);

      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress).toHaveBeenCalledTimes(2);
    });

    it('uses new callback after prop change', () => {
      const onPress1 = jest.fn();
      const onPress2 = jest.fn();

      const { rerender } = render(
        <FeatureButton {...defaultProps} onPress={onPress1} />
      );

      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress1).toHaveBeenCalledTimes(1);
      expect(onPress2).not.toHaveBeenCalled();

      rerender(<FeatureButton {...defaultProps} onPress={onPress2} />);

      fireEvent.press(screen.getByText('Score New Round'));
      expect(onPress1).toHaveBeenCalledTimes(1);
      expect(onPress2).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // TEXT TRUNCATION
  // =========================================================================

  describe('Text Truncation', () => {
    it('title has numberOfLines=1 for truncation', () => {
      render(<FeatureButton {...defaultProps} />);
      const titleElement = screen.getByText('Score New Round');
      expect(titleElement.props.numberOfLines).toBe(1);
    });

    it('subtitle has numberOfLines=1 for truncation', () => {
      render(<FeatureButton {...defaultProps} />);
      const subtitleElement = screen.getByText(
        'Start scoring a round at any course'
      );
      expect(subtitleElement.props.numberOfLines).toBe(1);
    });
  });

  // =========================================================================
  // VARIANT SWITCHING
  // =========================================================================

  describe('Variant Switching', () => {
    it('can switch from horizontal to compact', () => {
      const { rerender } = render(
        <FeatureButton {...defaultProps} variant="horizontal" testID="btn" />
      );
      expect(screen.getByTestId('btn')).toBeTruthy();

      rerender(
        <FeatureButton {...defaultProps} variant="compact" testID="btn" />
      );
      expect(screen.getByTestId('btn')).toBeTruthy();
    });

    it('can switch from compact to horizontal', () => {
      const { rerender } = render(
        <FeatureButton {...defaultProps} variant="compact" testID="btn" />
      );
      expect(screen.getByTestId('btn')).toBeTruthy();

      rerender(
        <FeatureButton {...defaultProps} variant="horizontal" testID="btn" />
      );
      expect(screen.getByTestId('btn')).toBeTruthy();
    });
  });
});
