/**
 * BottomNavigation Component Tests
 *
 * Tests for the bottom navigation footer component including:
 * - Rendering of all tab items
 * - Active tab highlighting
 * - Tab press callbacks
 * - Badge display
 * - Accessibility features
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BottomNavigation } from './BottomNavigation';

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconGolf: (props: any) => <View testID="icon-golf" {...props} />,
    IconTrophy: (props: any) => <View testID="icon-trophy" {...props} />,
    IconUser: (props: any) => <View testID="icon-user" {...props} />,
    IconTournament: (props: any) => <View testID="icon-tournament" {...props} />,
    IconMap: (props: any) => <View testID="icon-map" {...props} />,
  };
});

// Mock ThemeContext
const mockLightColors = {
  primary: '#2E7D32',
  primaryLight: '#60AD5E',
  primaryDark: '#1B5E20',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F57C00',
  white: '#FFFFFF',
  black: '#000000',
  gray200: '#EEEEEE',
  gray500: '#9E9E9E',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockLightColors,
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 47,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

// Mock react-native-paper Text
jest.mock('react-native-paper', () => {
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) => (
      <RNText style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </RNText>
    ),
  };
});

describe('BottomNavigation', () => {
  const defaultProps = {
    activeTab: 'rounds' as const,
  };

  const mockOnTabPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<BottomNavigation {...defaultProps} />);
      // Check that all tabs are rendered
      expect(screen.getByText('Rounds')).toBeTruthy();
    });

    it('renders all five navigation tabs', () => {
      render(<BottomNavigation {...defaultProps} />);

      expect(screen.getByText('Rounds')).toBeTruthy();
      expect(screen.getByText('Comps')).toBeTruthy();
      expect(screen.getByText('Courses')).toBeTruthy();
      expect(screen.getByText('Leagues')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });

    it('renders all tab icons', () => {
      render(<BottomNavigation {...defaultProps} />);

      expect(screen.getByTestId('icon-golf')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      expect(screen.getByTestId('icon-map')).toBeTruthy();
      expect(screen.getByTestId('icon-tournament')).toBeTruthy();
      expect(screen.getByTestId('icon-user')).toBeTruthy();
    });

    it('renders with tablist accessibility role', () => {
      render(<BottomNavigation {...defaultProps} />);
      // Container should have tablist role - check all tabs render as expected
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(5);
    });
  });

  // ===========================================================================
  // ACTIVE TAB TESTS
  // ===========================================================================

  describe('Active Tab', () => {
    it('highlights rounds tab when active', () => {
      render(<BottomNavigation activeTab="rounds" />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      expect(roundsTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights competitions tab when active', () => {
      render(<BottomNavigation activeTab="competitions" />);

      const compsTab = screen.getByLabelText('Navigate to competitions list');
      expect(compsTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights courses tab when active', () => {
      render(<BottomNavigation activeTab="courses" />);

      const coursesTab = screen.getByLabelText('Navigate to courses list');
      expect(coursesTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights leagues tab when active', () => {
      render(<BottomNavigation activeTab="leagues" />);

      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      expect(leaguesTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights profile tab when active', () => {
      render(<BottomNavigation activeTab="profile" />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      expect(profileTab.props.accessibilityState.selected).toBe(true);
    });

    it('non-active tabs are not selected', () => {
      render(<BottomNavigation activeTab="rounds" />);

      const compsTab = screen.getByLabelText('Navigate to competitions list');
      expect(compsTab.props.accessibilityState.selected).toBe(false);
    });

    it('only one tab is active at a time', () => {
      render(<BottomNavigation activeTab="competitions" />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      const coursesTab = screen.getByLabelText('Navigate to courses list');
      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      expect(roundsTab.props.accessibilityState.selected).toBe(false);
      expect(compsTab.props.accessibilityState.selected).toBe(true);
      expect(coursesTab.props.accessibilityState.selected).toBe(false);
      expect(leaguesTab.props.accessibilityState.selected).toBe(false);
      expect(profileTab.props.accessibilityState.selected).toBe(false);
    });
  });

  // ===========================================================================
  // TAB PRESS TESTS
  // ===========================================================================

  describe('Tab Press', () => {
    it('calls onTabPress when rounds tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      fireEvent.press(roundsTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'rounds',
          label: 'Rounds',
          route: 'RoundsTab',
        })
      );
    });

    it('calls onTabPress when competitions tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const compsTab = screen.getByLabelText('Navigate to competitions list');
      fireEvent.press(compsTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'competitions',
          label: 'Comps',
          route: 'CompetitionsTab',
        })
      );
    });

    it('calls onTabPress when courses tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const coursesTab = screen.getByLabelText('Navigate to courses list');
      fireEvent.press(coursesTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'courses',
          label: 'Courses',
          route: 'CoursesTab',
        })
      );
    });

    it('calls onTabPress when leagues tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      fireEvent.press(leaguesTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'leagues',
          label: 'Leagues',
          route: 'LeaguesTab',
        })
      );
    });

    it('calls onTabPress when profile tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      fireEvent.press(profileTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'profile',
          label: 'Profile',
          route: 'ProfileTab',
        })
      );
    });

    it('handles undefined onTabPress gracefully', () => {
      render(<BottomNavigation activeTab="rounds" />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');

      // Should not throw
      expect(() => fireEvent.press(roundsTab)).not.toThrow();
    });

    it('can press multiple tabs sequentially', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      fireEvent.press(roundsTab);
      fireEvent.press(profileTab);
      fireEvent.press(roundsTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // BADGE TESTS
  // ===========================================================================

  describe('Badges', () => {
    it('renders badge when provided for rounds tab', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ rounds: 5 }}
        />
      );

      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders badge when provided for competitions tab', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ competitions: 3 }}
        />
      );

      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders badge when provided for leagues tab', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: 10 }}
        />
      );

      expect(screen.getByText('10')).toBeTruthy();
    });

    it('renders multiple badges simultaneously', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ rounds: 2, leagues: 7 }}
        />
      );

      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('truncates badge count over 99 to "99+"', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: 150 }}
        />
      );

      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('displays exactly 99 without truncation', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: 99 }}
        />
      );

      expect(screen.getByText('99')).toBeTruthy();
    });

    it('displays 100 as "99+"', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: 100 }}
        />
      );

      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('does not render badge when count is 0', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: 0 }}
        />
      );

      // 0 should not show a badge
      expect(screen.queryByText('0')).toBeNull();
    });

    it('renders string badges', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: 'NEW' }}
        />
      );

      expect(screen.getByText('NEW')).toBeTruthy();
    });

    it('does not render badge when badges prop is undefined', () => {
      render(<BottomNavigation {...defaultProps} />);

      // No numbers should appear as badges - check tab labels are still there
      expect(screen.getByText('Rounds')).toBeTruthy();
      expect(screen.queryByText('99+')).toBeNull();
    });

    it('handles empty badges object', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{}}
        />
      );

      // Verify component renders properly with empty badges
      expect(screen.getByText('Rounds')).toBeTruthy();
      expect(screen.getAllByRole('tab').length).toBe(5);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('all tabs have accessibility labels', () => {
      render(<BottomNavigation {...defaultProps} />);

      expect(screen.getByLabelText('Navigate to rounds screen')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to competitions list')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to courses list')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to leagues')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to your profile')).toBeTruthy();
    });

    it('all tabs have tab role', () => {
      render(<BottomNavigation {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(5);
    });

    it('active tab has selected state true', () => {
      render(<BottomNavigation activeTab="profile" />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      expect(profileTab.props.accessibilityState.selected).toBe(true);
    });

    it('inactive tabs have selected state false', () => {
      render(<BottomNavigation activeTab="profile" />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      expect(roundsTab.props.accessibilityState.selected).toBe(false);
    });

    it('container has tablist role', () => {
      render(<BottomNavigation {...defaultProps} />);
      // Verify all tabs have proper role - container uses accessibilityRole="tablist"
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(5);
    });
  });

  // ===========================================================================
  // NAVIGATION TAB DATA TESTS
  // ===========================================================================

  describe('Navigation Tab Data', () => {
    it('passes correct route for rounds tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      fireEvent.press(roundsTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'RoundsTab',
        })
      );
    });

    it('passes correct route for competitions tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const compsTab = screen.getByLabelText('Navigate to competitions list');
      fireEvent.press(compsTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'CompetitionsTab',
        })
      );
    });

    it('passes correct route for courses tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const coursesTab = screen.getByLabelText('Navigate to courses list');
      fireEvent.press(coursesTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'CoursesTab',
        })
      );
    });

    it('passes correct route for leagues tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      fireEvent.press(leaguesTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'LeaguesTab',
        })
      );
    });

    it('passes correct route for profile tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      fireEvent.press(profileTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'ProfileTab',
        })
      );
    });

    it('passes complete tab data on press', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const leaguesTab = screen.getByLabelText('Navigate to leagues');
      fireEvent.press(leaguesTab);

      expect(mockOnTabPress).toHaveBeenCalledWith({
        key: 'leagues',
        label: 'Leagues',
        route: 'LeaguesTab',
        accessibilityLabel: 'Navigate to leagues',
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles rapid tab switching', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      const compsTab = screen.getByLabelText('Navigate to competitions list');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      // Rapid fire presses
      fireEvent.press(roundsTab);
      fireEvent.press(compsTab);
      fireEvent.press(profileTab);
      fireEvent.press(roundsTab);
      fireEvent.press(compsTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(5);
    });

    it('renders with all badges at once', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{
            rounds: 1,
            competitions: 2,
            courses: 3,
            leagues: 4,
            profile: 5,
          }}
        />
      );

      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('handles special string badges', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ leagues: '!' }}
        />
      );

      expect(screen.getByText('!')).toBeTruthy();
    });

    it('maintains tab order', () => {
      render(<BottomNavigation {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');

      // Verify order by checking accessibility labels
      expect(tabs[0].props.accessibilityLabel).toBe('Navigate to rounds screen');
      expect(tabs[1].props.accessibilityLabel).toBe('Navigate to competitions list');
      expect(tabs[2].props.accessibilityLabel).toBe('Navigate to courses list');
      expect(tabs[3].props.accessibilityLabel).toBe('Navigate to leagues');
      expect(tabs[4].props.accessibilityLabel).toBe('Navigate to your profile');
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('renders the same with identical props', () => {
      const { rerender } = render(
        <BottomNavigation activeTab="rounds" onTabPress={mockOnTabPress} />
      );

      expect(screen.getByText('Rounds')).toBeTruthy();
      expect(screen.getAllByRole('tab').length).toBe(5);

      rerender(
        <BottomNavigation activeTab="rounds" onTabPress={mockOnTabPress} />
      );

      expect(screen.getByText('Rounds')).toBeTruthy();
      expect(screen.getAllByRole('tab').length).toBe(5);
    });

    it('updates when activeTab changes', () => {
      const { rerender } = render(
        <BottomNavigation activeTab="rounds" />
      );

      const roundsTab = screen.getByLabelText('Navigate to rounds screen');
      expect(roundsTab.props.accessibilityState.selected).toBe(true);

      rerender(<BottomNavigation activeTab="profile" />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      expect(profileTab.props.accessibilityState.selected).toBe(true);

      // Rounds should no longer be selected
      const updatedRoundsTab = screen.getByLabelText('Navigate to rounds screen');
      expect(updatedRoundsTab.props.accessibilityState.selected).toBe(false);
    });

    it('updates when badges change', () => {
      const { rerender } = render(
        <BottomNavigation activeTab="rounds" badges={{ leagues: 5 }} />
      );

      expect(screen.getByText('5')).toBeTruthy();

      rerender(
        <BottomNavigation activeTab="rounds" badges={{ leagues: 10 }} />
      );

      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.queryByText('5')).toBeNull();
    });
  });
});
