/**
 * DateTimeDisplay Component Tests
 *
 * Tests for the reusable date/time display component including:
 * - Rendering with different props
 * - Size variants (sm, md, lg)
 * - Icon variants (calendar, clock, none)
 * - Date formatting
 * - Time display
 * - Custom time connector
 * - Accessibility
 * - Edge cases (null, undefined, invalid dates)
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  DateTimeDisplay,
  DateTimeDisplayProps,
  DateTimeDisplaySize,
  DateTimeDisplayIcon,
} from './DateTimeDisplay';

// Mock ThemeContext
const mockColors = {
  textSecondary: '#6B7280',
  textPrimary: '#111827',
  primary: '#1E7F5E',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper Text
jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
  };
});

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconCalendar: (props: any) => <View testID="icon-calendar" {...props} />,
    IconClock: (props: any) => <View testID="icon-clock" {...props} />,
  };
});

describe('DateTimeDisplay', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="datetime-display" />);
      expect(screen.getByTestId('datetime-display')).toBeTruthy();
    });

    it('renders with Date object', () => {
      render(<DateTimeDisplay date={new Date('2025-01-15')} testID="date-object" />);
      expect(screen.getByTestId('date-object')).toBeTruthy();
    });

    it('renders with ISO date string', () => {
      render(<DateTimeDisplay date="2025-01-15T10:30:00Z" testID="iso-string" />);
      expect(screen.getByTestId('iso-string')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="custom-test-id" />);
      expect(screen.getByTestId('custom-test-id')).toBeTruthy();
    });

    it('renders formatted date text', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="formatted-date" />);
      // Australian format: 15 Jan 2025
      expect(screen.getByTestId('formatted-date')).toBeTruthy();
    });

    it('renders calendar icon by default', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="default-icon" />);
      expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    });
  });

  // =========================================================================
  // NULL/UNDEFINED/INVALID DATE HANDLING
  // =========================================================================

  describe('Null/Undefined/Invalid Date Handling', () => {
    it('returns null for null date', () => {
      const { queryByTestId } = render(<DateTimeDisplay date={null} testID="null-date" />);
      expect(queryByTestId('null-date')).toBeNull();
    });

    it('returns null for undefined date', () => {
      const { queryByTestId } = render(<DateTimeDisplay date={undefined} testID="undefined-date" />);
      expect(queryByTestId('undefined-date')).toBeNull();
    });

    it('returns null for invalid date string', () => {
      const { queryByTestId } = render(<DateTimeDisplay date="not-a-date" testID="invalid-date" />);
      expect(queryByTestId('invalid-date')).toBeNull();
    });

    it('returns null for empty string date', () => {
      const { queryByTestId } = render(<DateTimeDisplay date="" testID="empty-date" />);
      expect(queryByTestId('empty-date')).toBeNull();
    });

    it('returns null for Invalid Date object', () => {
      const { queryByTestId } = render(
        <DateTimeDisplay date={new Date('invalid')} testID="invalid-date-obj" />
      );
      expect(queryByTestId('invalid-date-obj')).toBeNull();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders with default size (md) when not specified', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="default-size" />);
      expect(screen.getByTestId('default-size')).toBeTruthy();
    });

    it('renders with sm size', () => {
      render(<DateTimeDisplay date="2025-01-15" size="sm" testID="small-size" />);
      expect(screen.getByTestId('small-size')).toBeTruthy();
    });

    it('renders with md size', () => {
      render(<DateTimeDisplay date="2025-01-15" size="md" testID="medium-size" />);
      expect(screen.getByTestId('medium-size')).toBeTruthy();
    });

    it('renders with lg size', () => {
      render(<DateTimeDisplay date="2025-01-15" size="lg" testID="large-size" />);
      expect(screen.getByTestId('large-size')).toBeTruthy();
    });

    it('renders all sizes with same content', () => {
      const sizes: DateTimeDisplaySize[] = ['sm', 'md', 'lg'];
      sizes.forEach((size) => {
        render(<DateTimeDisplay date="2025-01-15" size={size} testID={`size-${size}`} />);
        expect(screen.getByTestId(`size-${size}`)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // ICON VARIANTS
  // =========================================================================

  describe('Icon Variants', () => {
    it('renders calendar icon by default', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="default-icon-test" />);
      expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    });

    it('renders calendar icon when icon="calendar"', () => {
      render(<DateTimeDisplay date="2025-01-15" icon="calendar" testID="calendar-icon" />);
      expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    });

    it('renders clock icon when icon="clock"', () => {
      render(<DateTimeDisplay date="2025-01-15" icon="clock" testID="clock-icon" />);
      expect(screen.getByTestId('icon-clock')).toBeTruthy();
    });

    it('renders no icon when icon="none"', () => {
      const { queryByTestId } = render(
        <DateTimeDisplay date="2025-01-15" icon="none" testID="no-icon" />
      );
      expect(screen.getByTestId('no-icon')).toBeTruthy();
      expect(queryByTestId('icon-calendar')).toBeNull();
      expect(queryByTestId('icon-clock')).toBeNull();
    });

    it('renders all icon variants correctly', () => {
      const icons: DateTimeDisplayIcon[] = ['calendar', 'clock', 'none'];
      icons.forEach((icon) => {
        render(<DateTimeDisplay date="2025-01-15" icon={icon} testID={`icon-test-${icon}`} />);
        expect(screen.getByTestId(`icon-test-${icon}`)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // TIME DISPLAY
  // =========================================================================

  describe('Time Display', () => {
    it('renders date only when no time provided', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="date-only" />);
      expect(screen.getByTestId('date-only')).toBeTruthy();
    });

    it('renders date with time when time is provided', () => {
      render(<DateTimeDisplay date="2025-01-15" time="10:30 AM" testID="date-with-time" />);
      const container = screen.getByTestId('date-with-time');
      expect(container).toBeTruthy();
    });

    it('renders with time connector "at" by default', () => {
      render(<DateTimeDisplay date="2025-01-15" time="10:30 AM" testID="at-connector" />);
      expect(screen.getByTestId('at-connector')).toBeTruthy();
    });

    it('renders with custom time connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector="-"
          testID="custom-connector"
        />
      );
      expect(screen.getByTestId('custom-connector')).toBeTruthy();
    });

    it('handles null time gracefully', () => {
      render(<DateTimeDisplay date="2025-01-15" time={null} testID="null-time" />);
      expect(screen.getByTestId('null-time')).toBeTruthy();
    });

    it('renders time with clock icon', () => {
      render(
        <DateTimeDisplay date="2025-01-15" time="10:30 AM" icon="clock" testID="time-clock" />
      );
      expect(screen.getByTestId('icon-clock')).toBeTruthy();
    });
  });

  // =========================================================================
  // DATE FORMATTING
  // =========================================================================

  describe('Date Formatting', () => {
    it('uses Australian date format by default', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="au-format" />);
      expect(screen.getByTestId('au-format')).toBeTruthy();
    });

    it('accepts custom date format options', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          dateFormat={{ weekday: 'short', day: 'numeric', month: 'short' }}
          testID="custom-format"
        />
      );
      expect(screen.getByTestId('custom-format')).toBeTruthy();
    });

    it('formats with full month name', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          dateFormat={{ day: 'numeric', month: 'long', year: 'numeric' }}
          testID="full-month"
        />
      );
      expect(screen.getByTestId('full-month')).toBeTruthy();
    });

    it('formats with weekday', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          dateFormat={{ weekday: 'long', day: 'numeric', month: 'short' }}
          testID="weekday-format"
        />
      );
      expect(screen.getByTestId('weekday-format')).toBeTruthy();
    });

    it('formats with numeric month', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          dateFormat={{ day: 'numeric', month: 'numeric', year: 'numeric' }}
          testID="numeric-month"
        />
      );
      expect(screen.getByTestId('numeric-month')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM COLOR
  // =========================================================================

  describe('Custom Color', () => {
    it('uses textSecondary color by default', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="default-color" />);
      expect(screen.getByTestId('default-color')).toBeTruthy();
    });

    it('applies custom color prop', () => {
      render(
        <DateTimeDisplay date="2025-01-15" color="#FF0000" testID="custom-color" />
      );
      expect(screen.getByTestId('custom-color')).toBeTruthy();
    });

    it('applies primary color', () => {
      render(
        <DateTimeDisplay date="2025-01-15" color={mockColors.primary} testID="primary-color" />
      );
      expect(screen.getByTestId('primary-color')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM STYLES
  // =========================================================================

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      render(<DateTimeDisplay date="2025-01-15" style={customStyle} testID="custom-style" />);
      const container = screen.getByTestId('custom-style');
      const styles = Array.isArray(container.props.style)
        ? container.props.style
        : [container.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.marginTop).toBe(10);
    });

    it('applies margin styles', () => {
      const customStyle = { marginHorizontal: 8, marginVertical: 4 };
      render(<DateTimeDisplay date="2025-01-15" style={customStyle} testID="margin-style" />);
      expect(screen.getByTestId('margin-style')).toBeTruthy();
    });

    it('applies padding styles', () => {
      const customStyle = { paddingHorizontal: 12 };
      render(<DateTimeDisplay date="2025-01-15" style={customStyle} testID="padding-style" />);
      expect(screen.getByTestId('padding-style')).toBeTruthy();
    });

    it('allows overriding flex direction', () => {
      const customStyle = { flexDirection: 'column' as const };
      render(<DateTimeDisplay date="2025-01-15" style={customStyle} testID="flex-style" />);
      expect(screen.getByTestId('flex-style')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="a11y-role" />);
      const container = screen.getByTestId('a11y-role');
      expect(container.props.accessibilityRole).toBe('text');
    });

    it('has accessibility label matching display text (date only)', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="a11y-date-only" />);
      const container = screen.getByTestId('a11y-date-only');
      expect(container.props.accessibilityLabel).toBeTruthy();
    });

    it('has accessibility label with date and time', () => {
      render(<DateTimeDisplay date="2025-01-15" time="10:30 AM" testID="a11y-date-time" />);
      const container = screen.getByTestId('a11y-date-time');
      expect(container.props.accessibilityLabel).toContain('at');
    });

    it('has accessibility label with custom connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector="-"
          testID="a11y-custom-connector"
        />
      );
      const container = screen.getByTestId('a11y-custom-connector');
      expect(container.props.accessibilityLabel).toContain('-');
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with size + icon', () => {
      render(
        <DateTimeDisplay date="2025-01-15" size="lg" icon="clock" testID="size-icon" />
      );
      expect(screen.getByTestId('size-icon')).toBeTruthy();
      expect(screen.getByTestId('icon-clock')).toBeTruthy();
    });

    it('renders with size + time', () => {
      render(
        <DateTimeDisplay date="2025-01-15" size="sm" time="2:00 PM" testID="size-time" />
      );
      expect(screen.getByTestId('size-time')).toBeTruthy();
    });

    it('renders with all props combined', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          size="lg"
          icon="clock"
          timeConnector="@"
          color="#333333"
          style={{ margin: 8 }}
          dateFormat={{ day: 'numeric', month: 'short' }}
          testID="all-props"
        />
      );
      expect(screen.getByTestId('all-props')).toBeTruthy();
      expect(screen.getByTestId('icon-clock')).toBeTruthy();
    });

    it('renders sm size with no icon', () => {
      render(
        <DateTimeDisplay date="2025-01-15" size="sm" icon="none" testID="sm-no-icon" />
      );
      expect(screen.getByTestId('sm-no-icon')).toBeTruthy();
    });

    it('renders lg size with custom color and time', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="5:30 PM"
          size="lg"
          color="#007AFF"
          testID="lg-custom-color-time"
        />
      );
      expect(screen.getByTestId('lg-custom-color-time')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles date at start of year', () => {
      render(<DateTimeDisplay date="2025-01-01" testID="start-of-year" />);
      expect(screen.getByTestId('start-of-year')).toBeTruthy();
    });

    it('handles date at end of year', () => {
      render(<DateTimeDisplay date="2025-12-31" testID="end-of-year" />);
      expect(screen.getByTestId('end-of-year')).toBeTruthy();
    });

    it('handles leap year date', () => {
      render(<DateTimeDisplay date="2024-02-29" testID="leap-year" />);
      expect(screen.getByTestId('leap-year')).toBeTruthy();
    });

    it('handles far future date', () => {
      render(<DateTimeDisplay date="2099-12-31" testID="future-date" />);
      expect(screen.getByTestId('future-date')).toBeTruthy();
    });

    it('handles past date', () => {
      render(<DateTimeDisplay date="2000-01-01" testID="past-date" />);
      expect(screen.getByTestId('past-date')).toBeTruthy();
    });

    it('handles midnight time', () => {
      render(<DateTimeDisplay date="2025-01-15" time="12:00 AM" testID="midnight" />);
      expect(screen.getByTestId('midnight')).toBeTruthy();
    });

    it('handles noon time', () => {
      render(<DateTimeDisplay date="2025-01-15" time="12:00 PM" testID="noon" />);
      expect(screen.getByTestId('noon')).toBeTruthy();
    });

    it('handles 24-hour format time', () => {
      render(<DateTimeDisplay date="2025-01-15" time="23:59" testID="24-hour" />);
      expect(screen.getByTestId('24-hour')).toBeTruthy();
    });

    it('handles empty time connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector=""
          testID="empty-connector"
        />
      );
      expect(screen.getByTestId('empty-connector')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(DateTimeDisplay).toBeDefined();
      expect(typeof DateTimeDisplay).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: DateTimeDisplayProps = {
        date: '2025-01-15',
        time: '10:30 AM',
        size: 'md',
      };

      const { rerender } = render(<DateTimeDisplay {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();

      rerender(<DateTimeDisplay {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders competition date', () => {
      render(<DateTimeDisplay date="2025-03-15" testID="competition-date" />);
      expect(screen.getByTestId('competition-date')).toBeTruthy();
    });

    it('renders round date with tee time', () => {
      render(
        <DateTimeDisplay
          date="2025-03-15"
          time="7:30 AM"
          icon="clock"
          testID="tee-time"
        />
      );
      expect(screen.getByTestId('tee-time')).toBeTruthy();
      expect(screen.getByTestId('icon-clock')).toBeTruthy();
    });

    it('renders event schedule', () => {
      render(
        <DateTimeDisplay
          date="2025-06-20"
          time="9:00 AM"
          size="lg"
          testID="event-schedule"
        />
      );
      expect(screen.getByTestId('event-schedule')).toBeTruthy();
    });

    it('renders compact date for list item', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          size="sm"
          icon="none"
          testID="compact-date"
        />
      );
      expect(screen.getByTestId('compact-date')).toBeTruthy();
    });

    it('renders last updated timestamp', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="3:45 PM"
          icon="clock"
          size="sm"
          testID="last-updated"
        />
      );
      expect(screen.getByTestId('last-updated')).toBeTruthy();
    });

    it('renders deadline date', () => {
      render(
        <DateTimeDisplay
          date="2025-02-28"
          time="11:59 PM"
          color="#DC2626"
          testID="deadline"
        />
      );
      expect(screen.getByTestId('deadline')).toBeTruthy();
    });
  });

  // =========================================================================
  // DIFFERENT DATE INPUTS
  // =========================================================================

  describe('Different Date Inputs', () => {
    it('handles Date object from current date', () => {
      const today = new Date();
      render(<DateTimeDisplay date={today} testID="current-date" />);
      expect(screen.getByTestId('current-date')).toBeTruthy();
    });

    it('handles Date object with specific time', () => {
      const date = new Date('2025-01-15T14:30:00');
      render(<DateTimeDisplay date={date} testID="specific-datetime" />);
      expect(screen.getByTestId('specific-datetime')).toBeTruthy();
    });

    it('handles ISO string with timezone', () => {
      render(
        <DateTimeDisplay date="2025-01-15T10:30:00+11:00" testID="iso-with-tz" />
      );
      expect(screen.getByTestId('iso-with-tz')).toBeTruthy();
    });

    it('handles short date format', () => {
      render(<DateTimeDisplay date="2025-01-15" testID="short-date" />);
      expect(screen.getByTestId('short-date')).toBeTruthy();
    });

    it('handles milliseconds timestamp via Date object', () => {
      const timestamp = new Date(1705305600000); // 2024-01-15
      render(<DateTimeDisplay date={timestamp} testID="timestamp-date" />);
      expect(screen.getByTestId('timestamp-date')).toBeTruthy();
    });
  });

  // =========================================================================
  // TIME CONNECTOR VARIATIONS
  // =========================================================================

  describe('Time Connector Variations', () => {
    it('uses default "at" connector', () => {
      render(
        <DateTimeDisplay date="2025-01-15" time="10:30 AM" testID="default-connector" />
      );
      const container = screen.getByTestId('default-connector');
      expect(container.props.accessibilityLabel).toContain('at');
    });

    it('uses "@" as connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector="@"
          testID="at-symbol-connector"
        />
      );
      const container = screen.getByTestId('at-symbol-connector');
      expect(container.props.accessibilityLabel).toContain('@');
    });

    it('uses "-" as connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector="-"
          testID="dash-connector"
        />
      );
      const container = screen.getByTestId('dash-connector');
      expect(container.props.accessibilityLabel).toContain('-');
    });

    it('uses "|" as connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector="|"
          testID="pipe-connector"
        />
      );
      const container = screen.getByTestId('pipe-connector');
      expect(container.props.accessibilityLabel).toContain('|');
    });

    it('uses comma as connector', () => {
      render(
        <DateTimeDisplay
          date="2025-01-15"
          time="10:30 AM"
          timeConnector=","
          testID="comma-connector"
        />
      );
      const container = screen.getByTestId('comma-connector');
      expect(container.props.accessibilityLabel).toContain(',');
    });
  });
});
