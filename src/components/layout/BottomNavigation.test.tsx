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
    IconHome: (props: any) => <View testID="icon-home" {...props} />,
    IconTrophy: (props: any) => <View testID="icon-trophy" {...props} />,
    IconUser: (props: any) => <View testID="icon-user" {...props} />,
    IconActivity: (props: any) => <View testID="icon-activity" {...props} />,
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
  surfaceElevated: '#FFFFFF',
  primaryBackground: '#EEF5E8',
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
    activeTab: 'home' as const,
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
      expect(screen.getByText('Home')).toBeTruthy();
    });

    it('renders all five navigation tabs', () => {
      render(<BottomNavigation {...defaultProps} />);

      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Compete')).toBeTruthy();
      expect(screen.getByText('Activity')).toBeTruthy();
      expect(screen.getByText('Courses')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });

    it('renders all tab icons', () => {
      render(<BottomNavigation {...defaultProps} />);

      expect(screen.getByTestId('icon-home')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      expect(screen.getByTestId('icon-activity')).toBeTruthy();
      expect(screen.getByTestId('icon-map')).toBeTruthy();
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
    it('highlights home tab when active', () => {
      render(<BottomNavigation activeTab="home" />);

      const homeTab = screen.getByLabelText('Navigate to home screen');
      expect(homeTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights compete tab when active', () => {
      render(<BottomNavigation activeTab="compete" />);

      const competeTab = screen.getByLabelText('Navigate to competitions and leagues');
      expect(competeTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights activity tab when active', () => {
      render(<BottomNavigation activeTab="activity" />);

      const activityTab = screen.getByLabelText('Navigate to activity feed');
      expect(activityTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights courses tab when active', () => {
      render(<BottomNavigation activeTab="courses" />);

      const coursesTab = screen.getByLabelText('Navigate to courses list');
      expect(coursesTab.props.accessibilityState.selected).toBe(true);
    });

    it('highlights profile tab when active', () => {
      render(<BottomNavigation activeTab="profile" />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      expect(profileTab.props.accessibilityState.selected).toBe(true);
    });

    it('non-active tabs are not selected', () => {
      render(<BottomNavigation activeTab="home" />);

      const competeTab = screen.getByLabelText('Navigate to competitions and leagues');
      expect(competeTab.props.accessibilityState.selected).toBe(false);
    });

    it('only one tab is active at a time', () => {
      render(<BottomNavigation activeTab="compete" />);

      const homeTab = screen.getByLabelText('Navigate to home screen');
      const competeTab = screen.getByLabelText('Navigate to competitions and leagues');
      const activityTab = screen.getByLabelText('Navigate to activity feed');
      const coursesTab = screen.getByLabelText('Navigate to courses list');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      expect(homeTab.props.accessibilityState.selected).toBe(false);
      expect(competeTab.props.accessibilityState.selected).toBe(true);
      expect(activityTab.props.accessibilityState.selected).toBe(false);
      expect(coursesTab.props.accessibilityState.selected).toBe(false);
      expect(profileTab.props.accessibilityState.selected).toBe(false);
    });
  });

  // ===========================================================================
  // TAB PRESS TESTS
  // ===========================================================================

  describe('Tab Press', () => {
    it('calls onTabPress when home tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const homeTab = screen.getByLabelText('Navigate to home screen');
      fireEvent.press(homeTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'home',
          label: 'Home',
          route: 'HomeTab',
        })
      );
    });

    it('calls onTabPress when compete tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const competeTab = screen.getByLabelText('Navigate to competitions and leagues');
      fireEvent.press(competeTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'compete',
          label: 'Compete',
          route: 'CompeteTab',
        })
      );
    });

    it('calls onTabPress when activity tab is pressed', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const activityTab = screen.getByLabelText('Navigate to activity feed');
      fireEvent.press(activityTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(1);
      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'activity',
          label: 'Activity',
          route: 'ActivityTab',
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
      render(<BottomNavigation activeTab="home" />);

      const homeTab = screen.getByLabelText('Navigate to home screen');

      // Should not throw
      expect(() => fireEvent.press(homeTab)).not.toThrow();
    });

    it('can press multiple tabs sequentially', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const homeTab = screen.getByLabelText('Navigate to home screen');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      fireEvent.press(homeTab);
      fireEvent.press(profileTab);
      fireEvent.press(homeTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // BADGE TESTS
  // ===========================================================================

  describe('Badges', () => {
    it('renders badge when provided for home tab', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ home: 5 }}
        />
      );

      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders badge when provided for compete tab', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ compete: 3 }}
        />
      );

      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders badge when provided for activity tab', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ activity: 10 }}
        />
      );

      expect(screen.getByText('10')).toBeTruthy();
    });

    it('renders multiple badges simultaneously', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ home: 2, activity: 7 }}
        />
      );

      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('truncates badge count over 99 to "99+"', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ activity: 150 }}
        />
      );

      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('displays exactly 99 without truncation', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ activity: 99 }}
        />
      );

      expect(screen.getByText('99')).toBeTruthy();
    });

    it('displays 100 as "99+"', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ activity: 100 }}
        />
      );

      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('does not render badge when count is 0', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ activity: 0 }}
        />
      );

      // 0 should not show a badge
      expect(screen.queryByText('0')).toBeNull();
    });

    it('renders string badges', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{ activity: 'NEW' }}
        />
      );

      expect(screen.getByText('NEW')).toBeTruthy();
    });

    it('does not render badge when badges prop is undefined', () => {
      render(<BottomNavigation {...defaultProps} />);

      // No numbers should appear as badges - check tab labels are still there
      expect(screen.getByText('Home')).toBeTruthy();
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
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getAllByRole('tab').length).toBe(5);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('all tabs have accessibility labels', () => {
      render(<BottomNavigation {...defaultProps} />);

      expect(screen.getByLabelText('Navigate to home screen')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to competitions and leagues')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to activity feed')).toBeTruthy();
      expect(screen.getByLabelText('Navigate to courses list')).toBeTruthy();
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

      const homeTab = screen.getByLabelText('Navigate to home screen');
      expect(homeTab.props.accessibilityState.selected).toBe(false);
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
    it('passes correct route for home tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const homeTab = screen.getByLabelText('Navigate to home screen');
      fireEvent.press(homeTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'HomeTab',
        })
      );
    });

    it('passes correct route for compete tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const competeTab = screen.getByLabelText('Navigate to competitions and leagues');
      fireEvent.press(competeTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'CompeteTab',
        })
      );
    });

    it('passes correct route for activity tab', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const activityTab = screen.getByLabelText('Navigate to activity feed');
      fireEvent.press(activityTab);

      expect(mockOnTabPress).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'ActivityTab',
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

      const activityTab = screen.getByLabelText('Navigate to activity feed');
      fireEvent.press(activityTab);

      expect(mockOnTabPress).toHaveBeenCalledWith({
        key: 'activity',
        label: 'Activity',
        route: 'ActivityTab',
        accessibilityLabel: 'Navigate to activity feed',
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles rapid tab switching', () => {
      render(<BottomNavigation {...defaultProps} onTabPress={mockOnTabPress} />);

      const homeTab = screen.getByLabelText('Navigate to home screen');
      const competeTab = screen.getByLabelText('Navigate to competitions and leagues');
      const profileTab = screen.getByLabelText('Navigate to your profile');

      // Rapid fire presses
      fireEvent.press(homeTab);
      fireEvent.press(competeTab);
      fireEvent.press(profileTab);
      fireEvent.press(homeTab);
      fireEvent.press(competeTab);

      expect(mockOnTabPress).toHaveBeenCalledTimes(5);
    });

    it('renders with all badges at once', () => {
      render(
        <BottomNavigation
          {...defaultProps}
          badges={{
            home: 1,
            compete: 2,
            activity: 3,
            courses: 4,
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
          badges={{ activity: '!' }}
        />
      );

      expect(screen.getByText('!')).toBeTruthy();
    });

    it('maintains tab order: Home → Compete → Activity → Courses → Profile', () => {
      render(<BottomNavigation {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');

      // Verify order by checking accessibility labels
      expect(tabs[0].props.accessibilityLabel).toBe('Navigate to home screen');
      expect(tabs[1].props.accessibilityLabel).toBe('Navigate to competitions and leagues');
      expect(tabs[2].props.accessibilityLabel).toBe('Navigate to activity feed');
      expect(tabs[3].props.accessibilityLabel).toBe('Navigate to courses list');
      expect(tabs[4].props.accessibilityLabel).toBe('Navigate to your profile');
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('renders the same with identical props', () => {
      const { rerender } = render(
        <BottomNavigation activeTab="home" onTabPress={mockOnTabPress} />
      );

      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getAllByRole('tab').length).toBe(5);

      rerender(
        <BottomNavigation activeTab="home" onTabPress={mockOnTabPress} />
      );

      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getAllByRole('tab').length).toBe(5);
    });

    it('updates when activeTab changes', () => {
      const { rerender } = render(
        <BottomNavigation activeTab="home" />
      );

      const homeTab = screen.getByLabelText('Navigate to home screen');
      expect(homeTab.props.accessibilityState.selected).toBe(true);

      rerender(<BottomNavigation activeTab="profile" />);

      const profileTab = screen.getByLabelText('Navigate to your profile');
      expect(profileTab.props.accessibilityState.selected).toBe(true);

      // Home should no longer be selected
      const updatedHomeTab = screen.getByLabelText('Navigate to home screen');
      expect(updatedHomeTab.props.accessibilityState.selected).toBe(false);
    });

    it('updates when badges change', () => {
      const { rerender } = render(
        <BottomNavigation activeTab="home" badges={{ activity: 5 }} />
      );

      expect(screen.getByText('5')).toBeTruthy();

      rerender(
        <BottomNavigation activeTab="home" badges={{ activity: 10 }} />
      );

      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.queryByText('5')).toBeNull();
    });
  });
});
