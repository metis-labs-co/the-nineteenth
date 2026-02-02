/**
 * TeeTimeConfigCard - Configure tee time slots for player groups
 *
 * Allows setting:
 * - Start time for first group
 * - Interval between groups (7-10 minutes)
 * - Shows computed info about number of groups
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  TEE_TIME_INTERVALS,
  type TeeTimeSlotConfig,
  type TeeTimeInterval,
} from '@/types';
import {
  formatTeeTimeForDisplay,
  calculateRecommendedGroupCount,
} from '@/utils';

export interface TeeTimeConfigCardProps {
  /**
   * Current tee time configuration
   */
  config: TeeTimeSlotConfig;
  /**
   * Callback when configuration changes
   */
  onChange: (config: TeeTimeSlotConfig) => void;
  /**
   * Total number of players to group
   */
  playerCount: number;
  /**
   * Preferred group size (for calculating slots)
   */
  groupSize?: 2 | 3 | 4;
  /**
   * Whether the card is disabled/read-only
   */
  disabled?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Parse HH:MM string to Date object
 */
function parseTimeToDate(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format Date to HH:MM string
 */
function formatDateToTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export const TeeTimeConfigCard = React.memo(function TeeTimeConfigCard({
  config,
  onChange,
  playerCount,
  groupSize = 4,
  disabled = false,
  testID,
}: TeeTimeConfigCardProps) {
  const colors = useThemeColors();
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Calculate recommended number of groups
  const recommendedGroups = useMemo(
    () => calculateRecommendedGroupCount(playerCount, groupSize),
    [playerCount, groupSize]
  );

  // Calculate last tee time
  const lastTeeTime = useMemo(() => {
    if (recommendedGroups <= 1) return config.startTime;
    const [hours, minutes] = config.startTime.split(':').map(Number);
    const totalMinutes =
      hours * 60 + minutes + (recommendedGroups - 1) * config.intervalMinutes;
    const lastHours = Math.floor(totalMinutes / 60) % 24;
    const lastMins = totalMinutes % 60;
    return `${String(lastHours).padStart(2, '0')}:${String(lastMins).padStart(2, '0')}`;
  }, [config.startTime, config.intervalMinutes, recommendedGroups]);

  const handleTimeChange = useCallback(
    (_: unknown, selectedDate: Date | undefined) => {
      setShowTimePicker(false);
      if (selectedDate) {
        onChange({
          ...config,
          startTime: formatDateToTime(selectedDate),
        });
      }
    },
    [config, onChange]
  );

  const handleIntervalChange = useCallback(
    (interval: TeeTimeInterval) => {
      if (disabled) return;
      onChange({
        ...config,
        intervalMinutes: interval,
      });
    },
    [config, disabled, onChange]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        <Icon source="clock-outline" size={20} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>
          Tee Time Configuration
        </Text>
      </View>

      {/* Start Time */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          First Tee Time
        </Text>
        <TouchableOpacity
          style={[
            styles.timeButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
            disabled && styles.disabledButton,
          ]}
          onPress={() => !disabled && setShowTimePicker(true)}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`First tee time: ${formatTeeTimeForDisplay(config.startTime)}`}
        >
          <Icon source="clock-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.timeText, { color: colors.textPrimary }]}>
            {formatTeeTimeForDisplay(config.startTime)}
          </Text>
          {!disabled && (
            <Icon source="chevron-down" size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Interval Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Interval Between Groups
        </Text>
        <View style={styles.intervalContainer}>
          {TEE_TIME_INTERVALS.map((interval) => (
            <TouchableOpacity
              key={interval}
              style={[
                styles.intervalChip,
                {
                  backgroundColor:
                    config.intervalMinutes === interval
                      ? colors.primary
                      : colors.background,
                  borderColor:
                    config.intervalMinutes === interval
                      ? colors.primary
                      : colors.border,
                },
                disabled && styles.disabledButton,
              ]}
              onPress={() => handleIntervalChange(interval)}
              disabled={disabled}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: config.intervalMinutes === interval }}
              accessibilityLabel={`${interval} minutes between groups`}
            >
              <Text
                style={[
                  styles.intervalText,
                  {
                    color:
                      config.intervalMinutes === interval
                        ? colors.white
                        : colors.textPrimary,
                  },
                ]}
              >
                {interval} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary */}
      <View
        style={[
          styles.summaryContainer,
          { backgroundColor: colors.primaryBackground },
        ]}
      >
        <Icon source="information-outline" size={16} color={colors.primary} />
        <Text style={[styles.summaryText, { color: colors.primary }]}>
          {playerCount === 0
            ? 'Add players to create groups'
            : playerCount < 2
              ? 'Need at least 2 players'
              : `${recommendedGroups} group${recommendedGroups !== 1 ? 's' : ''} • ${formatTeeTimeForDisplay(config.startTime)} - ${formatTeeTimeForDisplay(lastTeeTime)}`}
        </Text>
      </View>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={parseTimeToDate(config.startTime)}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={handleTimeChange}
          minuteInterval={1}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  section: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  timeText: {
    ...typography.body,
    flex: 1,
  },
  intervalContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  intervalChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  summaryText: {
    ...typography.caption,
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default TeeTimeConfigCard;
