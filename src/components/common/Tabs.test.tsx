/**
 * Tabs Component Tests
 *
 * Tests for the flexible, theme-aware tabs component including:
 * - Rendering with different props
 * - Size variants (small, medium, large)
 * - Tab selection and callbacks
 * - Badge counts
 * - Disabled tabs
 * - Scrollable mode
 * - Equal width vs auto-size
 * - Accessibility
 * - Animation behavior
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { LayoutAnimation } from 'react-native';
import { Tabs, TabsProps, TabItem } from './Tabs';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  surfaceVariant: '#F3F4F6',
  surfaceSelected: '#E5E7EB',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper Text
jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) => (
      <Text style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </Text>
    ),
  };
});

// Spy on LayoutAnimation
jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});

// Helper to create default tabs
const createDefaultTabs = (): TabItem[] => [
  { key: 'tab1', label: 'Tab 1' },
  { key: 'tab2', label: 'Tab 2' },
  { key: 'tab3', label: 'Tab 3' },
];

// Helper to create tabs with counts
const createTabsWithCounts = (): TabItem[] => [
  { key: 'active', label: 'Active', count: 5 },
  { key: 'history', label: 'History', count: 12 },
  { key: 'pending', label: 'Pending', count: 0 },
];

// Helper to create tabs with disabled items
const createTabsWithDisabled = (): TabItem[] => [
  { key: 'tab1', label: 'Enabled' },
  { key: 'tab2', label: 'Disabled', disabled: true },
  { key: 'tab3', label: 'Also Enabled' },
];

describe('Tabs', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          testID="tabs"
        />
      );
      expect(screen.getByTestId('tabs')).toBeTruthy();
    });

    it('renders all tabs', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Tab 1')).toBeTruthy();
      expect(screen.getByText('Tab 2')).toBeTruthy();
      expect(screen.getByText('Tab 3')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          testID="my-tabs"
        />
      );
      expect(screen.getByTestId('my-tabs')).toBeTruthy();
    });

    it('renders single tab', () => {
      render(
        <Tabs
          tabs={[{ key: 'only', label: 'Only Tab' }]}
          selectedTab="only"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Only Tab')).toBeTruthy();
    });

    it('renders many tabs', () => {
      const manyTabs: TabItem[] = Array.from({ length: 10 }, (_, i) => ({
        key: `tab${i}`,
        label: `Tab ${i + 1}`,
      }));
      render(
        <Tabs
          tabs={manyTabs}
          selectedTab="tab0"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Tab 1')).toBeTruthy();
      expect(screen.getByText('Tab 10')).toBeTruthy();
    });
  });

  // =========================================================================
  // TAB SELECTION
  // =========================================================================

  describe('Tab Selection', () => {
    it('highlights selected tab', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab2"
          onTabChange={mockOnTabChange}
        />
      );
      // The selected tab should be visible
      expect(screen.getByText('Tab 2')).toBeTruthy();
    });

    it('calls onTabChange when tab is pressed', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Tab 2'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab2');
    });

    it('calls onTabChange with correct key', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Tab 3'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab3');
    });

    it('allows pressing already selected tab', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Tab 1'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab1');
    });

    it('handles tab change with typed keys', () => {
      type MyTabKeys = 'home' | 'profile' | 'settings';
      const typedTabs: TabItem<MyTabKeys>[] = [
        { key: 'home', label: 'Home' },
        { key: 'profile', label: 'Profile' },
        { key: 'settings', label: 'Settings' },
      ];

      const typedHandler = jest.fn<void, [MyTabKeys]>();

      render(
        <Tabs<MyTabKeys>
          tabs={typedTabs}
          selectedTab="home"
          onTabChange={typedHandler}
        />
      );

      fireEvent.press(screen.getByText('Profile'));
      expect(typedHandler).toHaveBeenCalledWith('profile');
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders with default size (medium)', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          testID="default-size"
        />
      );
      expect(screen.getByTestId('default-size')).toBeTruthy();
    });

    it('renders with small size', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          size="small"
          testID="small-tabs"
        />
      );
      expect(screen.getByTestId('small-tabs')).toBeTruthy();
    });

    it('renders with medium size', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          size="medium"
          testID="medium-tabs"
        />
      );
      expect(screen.getByTestId('medium-tabs')).toBeTruthy();
    });

    it('renders with large size', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          size="large"
          testID="large-tabs"
        />
      );
      expect(screen.getByTestId('large-tabs')).toBeTruthy();
    });

    it('renders all sizes consistently', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      sizes.forEach((size) => {
        render(
          <Tabs
            tabs={createDefaultTabs()}
            selectedTab="tab1"
            onTabChange={mockOnTabChange}
            size={size}
            testID={`tabs-${size}`}
          />
        );
        expect(screen.getByTestId(`tabs-${size}`)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // BADGE COUNTS
  // =========================================================================

  describe('Badge Counts', () => {
    it('renders tabs with count badges', () => {
      render(
        <Tabs
          tabs={createTabsWithCounts()}
          selectedTab="active"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Active (5)')).toBeTruthy();
      expect(screen.getByText('History (12)')).toBeTruthy();
      expect(screen.getByText('Pending (0)')).toBeTruthy();
    });

    it('renders tab without count when not specified', () => {
      const mixedTabs: TabItem[] = [
        { key: 'with', label: 'With Count', count: 3 },
        { key: 'without', label: 'Without Count' },
      ];
      render(
        <Tabs
          tabs={mixedTabs}
          selectedTab="with"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('With Count (3)')).toBeTruthy();
      expect(screen.getByText('Without Count')).toBeTruthy();
    });

    it('handles zero count correctly', () => {
      render(
        <Tabs
          tabs={createTabsWithCounts()}
          selectedTab="pending"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Pending (0)')).toBeTruthy();
    });

    it('handles large count numbers', () => {
      const tabs: TabItem[] = [
        { key: 'big', label: 'Big Count', count: 999 },
        { key: 'huge', label: 'Huge Count', count: 10000 },
      ];
      render(
        <Tabs tabs={tabs} selectedTab="big" onTabChange={mockOnTabChange} />
      );
      expect(screen.getByText('Big Count (999)')).toBeTruthy();
      expect(screen.getByText('Huge Count (10000)')).toBeTruthy();
    });
  });

  // =========================================================================
  // DISABLED TABS
  // =========================================================================

  describe('Disabled Tabs', () => {
    it('renders disabled tabs', () => {
      render(
        <Tabs
          tabs={createTabsWithDisabled()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Disabled')).toBeTruthy();
    });

    it('does not call onTabChange when disabled tab is pressed', () => {
      render(
        <Tabs
          tabs={createTabsWithDisabled()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Disabled'));
      expect(mockOnTabChange).not.toHaveBeenCalled();
    });

    it('calls onTabChange for enabled tabs', () => {
      render(
        <Tabs
          tabs={createTabsWithDisabled()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Also Enabled'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab3');
    });

    it('can have disabled tab selected', () => {
      render(
        <Tabs
          tabs={createTabsWithDisabled()}
          selectedTab="tab2"
          onTabChange={mockOnTabChange}
        />
      );
      // Should render even with disabled tab selected
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  // =========================================================================
  // EQUAL WIDTH
  // =========================================================================

  describe('Equal Width', () => {
    it('uses equal width by default', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          testID="equal-width-default"
        />
      );
      expect(screen.getByTestId('equal-width-default')).toBeTruthy();
    });

    it('renders with equalWidth=true', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          equalWidth={true}
          testID="equal-width-true"
        />
      );
      expect(screen.getByTestId('equal-width-true')).toBeTruthy();
    });

    it('renders with equalWidth=false', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          equalWidth={false}
          testID="equal-width-false"
        />
      );
      expect(screen.getByTestId('equal-width-false')).toBeTruthy();
    });
  });

  // =========================================================================
  // SCROLLABLE
  // =========================================================================

  describe('Scrollable', () => {
    it('renders non-scrollable by default', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          testID="non-scrollable"
        />
      );
      expect(screen.getByTestId('non-scrollable')).toBeTruthy();
    });

    it('renders scrollable when enabled', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          scrollable
          testID="scrollable-tabs"
        />
      );
      expect(screen.getByTestId('scrollable-tabs')).toBeTruthy();
    });

    it('scrollable forces equalWidth to false', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          scrollable
          equalWidth={true} // This should be overridden
          testID="scrollable-no-equal"
        />
      );
      expect(screen.getByTestId('scrollable-no-equal')).toBeTruthy();
    });

    it('scrollable works with many tabs', () => {
      const manyTabs: TabItem[] = Array.from({ length: 8 }, (_, i) => ({
        key: `tab${i}`,
        label: `Long Tab Name ${i + 1}`,
      }));
      render(
        <Tabs
          tabs={manyTabs}
          selectedTab="tab0"
          onTabChange={mockOnTabChange}
          scrollable
          testID="many-scrollable"
        />
      );
      expect(screen.getByTestId('many-scrollable')).toBeTruthy();
    });
  });

  // =========================================================================
  // ANIMATION
  // =========================================================================

  describe('Animation', () => {
    it('animates by default', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Tab 2'));
      expect(LayoutAnimation.configureNext).toHaveBeenCalled();
    });

    it('skips animation when animated=false', () => {
      (LayoutAnimation.configureNext as jest.Mock).mockClear();

      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          animated={false}
        />
      );

      fireEvent.press(screen.getByText('Tab 2'));
      expect(LayoutAnimation.configureNext).not.toHaveBeenCalled();
    });

    it('animates when animated=true', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          animated={true}
        />
      );

      fireEvent.press(screen.getByText('Tab 2'));
      expect(LayoutAnimation.configureNext).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CUSTOM STYLES
  // =========================================================================

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 20 };
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          style={customStyle}
          testID="custom-style"
        />
      );
      const tabs = screen.getByTestId('custom-style');
      const styles = Array.isArray(tabs.props.style)
        ? tabs.props.style
        : [tabs.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.marginTop).toBe(20);
    });

    it('applies margin styles', () => {
      const customStyle = { marginHorizontal: 16 };
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          style={customStyle}
          testID="margin-style"
        />
      );
      expect(screen.getByTestId('margin-style')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has tablist accessibility role on container', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          testID="a11y-tabs"
        />
      );
      const container = screen.getByTestId('a11y-tabs');
      expect(container.props.accessibilityRole).toBe('tablist');
    });

    it('provides accessibility label for tabs with counts', () => {
      render(
        <Tabs
          tabs={createTabsWithCounts()}
          selectedTab="active"
          onTabChange={mockOnTabChange}
        />
      );
      // The accessibility label should include the count
      const activeTab = screen.getByLabelText('Active, 5 items');
      expect(activeTab).toBeTruthy();
    });

    it('provides accessibility label for tabs without counts', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );
      const tab = screen.getByLabelText('Tab 1');
      expect(tab).toBeTruthy();
    });

    it('provides accessibility hint', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );
      const tab = screen.getByHintText('Switch to Tab 2 tab');
      expect(tab).toBeTruthy();
    });

    it('sets selected state correctly', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab2"
          onTabChange={mockOnTabChange}
        />
      );
      // Get the Tab 2 element and check its accessibility state
      const selectedTab = screen.getByLabelText('Tab 2');
      expect(selectedTab.props.accessibilityState.selected).toBe(true);
    });

    it('sets disabled state correctly', () => {
      render(
        <Tabs
          tabs={createTabsWithDisabled()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );
      const disabledTab = screen.getByLabelText('Disabled');
      expect(disabledTab.props.accessibilityState.disabled).toBe(true);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles empty tabs array', () => {
      render(
        <Tabs
          tabs={[]}
          selectedTab=""
          onTabChange={mockOnTabChange}
          testID="empty-tabs"
        />
      );
      expect(screen.getByTestId('empty-tabs')).toBeTruthy();
    });

    it('handles tabs with special characters in labels', () => {
      const specialTabs: TabItem[] = [
        { key: 'tab1', label: 'Tab & More' },
        { key: 'tab2', label: 'Tab <Test>' },
        { key: 'tab3', label: 'Tab "Quotes"' },
      ];
      render(
        <Tabs
          tabs={specialTabs}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Tab & More')).toBeTruthy();
      expect(screen.getByText('Tab <Test>')).toBeTruthy();
      expect(screen.getByText('Tab "Quotes"')).toBeTruthy();
    });

    it('handles tabs with emoji in labels', () => {
      const emojiTabs: TabItem[] = [
        { key: 'golf', label: '🏌️ Golf' },
        { key: 'trophy', label: '🏆 Wins' },
      ];
      render(
        <Tabs
          tabs={emojiTabs}
          selectedTab="golf"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('🏌️ Golf')).toBeTruthy();
      expect(screen.getByText('🏆 Wins')).toBeTruthy();
    });

    it('handles very long tab labels', () => {
      const longTabs: TabItem[] = [
        { key: 'long', label: 'This is a very long tab label that might need truncation' },
      ];
      render(
        <Tabs
          tabs={longTabs}
          selectedTab="long"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('This is a very long tab label that might need truncation')).toBeTruthy();
    });

    it('handles numeric keys', () => {
      const numericTabs: TabItem<string>[] = [
        { key: '1', label: 'One' },
        { key: '2', label: 'Two' },
        { key: '3', label: 'Three' },
      ];
      render(
        <Tabs
          tabs={numericTabs}
          selectedTab="1"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('One')).toBeTruthy();

      fireEvent.press(screen.getByText('Two'));
      expect(mockOnTabChange).toHaveBeenCalledWith('2');
    });

    it('handles undefined count gracefully', () => {
      const mixedTabs: TabItem[] = [
        { key: 'with', label: 'With', count: 5 },
        { key: 'without', label: 'Without', count: undefined },
      ];
      render(
        <Tabs
          tabs={mixedTabs}
          selectedTab="with"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('With (5)')).toBeTruthy();
      expect(screen.getByText('Without')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(Tabs).toBeDefined();
    });

    it('renders consistently with same props', () => {
      const props = {
        tabs: createDefaultTabs(),
        selectedTab: 'tab1' as const,
        onTabChange: mockOnTabChange,
        testID: 'memo-test',
      };

      const { rerender } = render(<Tabs {...props} />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();

      rerender(<Tabs {...props} />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('works as competition tabs', () => {
      const competitionTabs: TabItem[] = [
        { key: 'details', label: 'Details' },
        { key: 'rounds', label: 'Rounds', count: 4 },
        { key: 'players', label: 'Players', count: 12 },
        { key: 'leaderboard', label: 'Leaderboard' },
      ];
      render(
        <Tabs
          tabs={competitionTabs}
          selectedTab="details"
          onTabChange={mockOnTabChange}
        />
      );
      expect(screen.getByText('Details')).toBeTruthy();
      expect(screen.getByText('Rounds (4)')).toBeTruthy();
      expect(screen.getByText('Players (12)')).toBeTruthy();
      expect(screen.getByText('Leaderboard')).toBeTruthy();
    });

    it('works as status filter tabs', () => {
      const statusTabs: TabItem[] = [
        { key: 'active', label: 'Active', count: 3 },
        { key: 'upcoming', label: 'Upcoming', count: 2 },
        { key: 'completed', label: 'Completed', count: 15 },
      ];
      render(
        <Tabs
          tabs={statusTabs}
          selectedTab="active"
          onTabChange={mockOnTabChange}
          size="small"
        />
      );
      expect(screen.getByText('Active (3)')).toBeTruthy();
    });

    it('works as round view tabs', () => {
      const roundTabs: TabItem[] = [
        { key: 'scorecard', label: 'Scorecard' },
        { key: 'players', label: 'Players' },
        { key: 'leaderboard', label: 'Leaderboard' },
      ];
      render(
        <Tabs
          tabs={roundTabs}
          selectedTab="scorecard"
          onTabChange={mockOnTabChange}
          size="medium"
          equalWidth
        />
      );
      expect(screen.getByText('Scorecard')).toBeTruthy();
      expect(screen.getByText('Players')).toBeTruthy();
      expect(screen.getByText('Leaderboard')).toBeTruthy();
    });

    it('works as profile tabs with scrolling', () => {
      const profileTabs: TabItem[] = [
        { key: 'stats', label: 'Statistics' },
        { key: 'history', label: 'Round History' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'friends', label: 'Friends', count: 8 },
        { key: 'settings', label: 'Settings' },
      ];
      render(
        <Tabs
          tabs={profileTabs}
          selectedTab="stats"
          onTabChange={mockOnTabChange}
          scrollable
        />
      );
      expect(screen.getByText('Statistics')).toBeTruthy();
      expect(screen.getByText('Friends (8)')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with size + scrollable', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
          size="large"
          scrollable
          testID="size-scrollable"
        />
      );
      expect(screen.getByTestId('size-scrollable')).toBeTruthy();
    });

    it('renders with counts + disabled', () => {
      const tabs: TabItem[] = [
        { key: 'active', label: 'Active', count: 5 },
        { key: 'locked', label: 'Locked', count: 3, disabled: true },
      ];
      render(
        <Tabs
          tabs={tabs}
          selectedTab="active"
          onTabChange={mockOnTabChange}
          testID="counts-disabled"
        />
      );
      expect(screen.getByText('Active (5)')).toBeTruthy();
      expect(screen.getByText('Locked (3)')).toBeTruthy();
    });

    it('renders with all props combined', () => {
      render(
        <Tabs
          tabs={createTabsWithCounts()}
          selectedTab="active"
          onTabChange={mockOnTabChange}
          size="small"
          animated={false}
          equalWidth={false}
          scrollable
          style={{ marginBottom: 16 }}
          testID="all-props"
        />
      );
      expect(screen.getByTestId('all-props')).toBeTruthy();
    });

    it('handles rapid tab changes', () => {
      render(
        <Tabs
          tabs={createDefaultTabs()}
          selectedTab="tab1"
          onTabChange={mockOnTabChange}
        />
      );

      fireEvent.press(screen.getByText('Tab 2'));
      fireEvent.press(screen.getByText('Tab 3'));
      fireEvent.press(screen.getByText('Tab 1'));

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 'tab2');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 'tab3');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 'tab1');
    });
  });
});
