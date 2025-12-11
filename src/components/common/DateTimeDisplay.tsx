// src/components/common/DateTimeDisplay.tsx
import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCalendar, IconClock } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

/**
 * Size variants for the DateTimeDisplay component
 */
export type DateTimeDisplaySize = 'sm' | 'md' | 'lg';

/**
 * Icon to display alongside the date/time
 */
export type DateTimeDisplayIcon = 'calendar' | 'clock' | 'none';

export interface DateTimeDisplayProps {
  /**
   * Date to display (ISO string or Date object)
   */
  date: string | Date | null | undefined;
  /**
   * Optional time string to display (e.g., "10:30 AM")
   * When provided, displays as "date at time"
   */
  time?: string | null;
  /**
   * Size variant for the component
   * @default 'md'
   */
  size?: DateTimeDisplaySize;
  /**
   * Icon to display before the date/time
   * @default 'calendar'
   */
  icon?: DateTimeDisplayIcon;
  /**
   * Custom date format options
   * @default { day: 'numeric', month: 'short', year: 'numeric' }
   */
  dateFormat?: Intl.DateTimeFormatOptions;
  /**
   * Connector text between date and time
   * @default 'at'
   */
  timeConnector?: string;
  /**
   * Custom text color (overrides theme)
   */
  color?: string;
  /**
   * Additional styles for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Formats a date to Australian format (DD Mon YYYY by default)
 */
const formatDate = (
  date: string | Date | null | undefined,
  format: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', format);
};

/**
 * Size configuration for icon and text
 */
const sizeConfig: Record<DateTimeDisplaySize, { iconSize: number; textStyle: keyof typeof typography }> = {
  sm: { iconSize: 12, textStyle: 'caption' },
  md: { iconSize: 14, textStyle: 'caption' },
  lg: { iconSize: 16, textStyle: 'small' },
};

/**
 * DateTimeDisplay - A reusable component for displaying dates and times
 *
 * Displays a formatted date with an optional time, using Australian date format
 * by default. Supports different sizes and icon options.
 *
 * @example
 * ```tsx
 * // Basic usage with date only
 * <DateTimeDisplay date="2025-01-15" />
 *
 * // With time
 * <DateTimeDisplay date="2025-01-15" time="10:30 AM" />
 *
 * // Different size
 * <DateTimeDisplay date="2025-01-15" size="lg" />
 *
 * // Clock icon instead of calendar
 * <DateTimeDisplay date="2025-01-15" time="10:30 AM" icon="clock" />
 *
 * // No icon
 * <DateTimeDisplay date="2025-01-15" icon="none" />
 *
 * // Custom date format
 * <DateTimeDisplay
 *   date="2025-01-15"
 *   dateFormat={{ weekday: 'short', day: 'numeric', month: 'short' }}
 * />
 * ```
 */
export const DateTimeDisplay = React.memo(function DateTimeDisplay({
  date,
  time,
  size = 'md',
  icon = 'calendar',
  dateFormat,
  timeConnector = 'at',
  color,
  style,
  testID,
}: DateTimeDisplayProps) {
  const colors = useThemeColors();
  const config = sizeConfig[size];
  const textColor = color || colors.textSecondary;

  const formattedDate = formatDate(date, dateFormat);

  // Don't render anything if there's no date
  if (!formattedDate) {
    return null;
  }

  // Build the display text
  const displayText = time ? `${formattedDate} ${timeConnector} ${time}` : formattedDate;

  // Get the icon component
  const renderIcon = () => {
    if (icon === 'none') return null;

    const IconComponent = icon === 'clock' ? IconClock : IconCalendar;
    return <IconComponent size={config.iconSize} color={textColor} />;
  };

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={displayText}
      accessibilityRole="text"
      testID={testID}
    >
      {renderIcon()}
      <Text style={[styles.text, typography[config.textStyle], { color: textColor }]}>
        {displayText}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    // Typography applied via inline style
  },
});
