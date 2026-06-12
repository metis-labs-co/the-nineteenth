/**
 * WhenStep - Choose between playing now or scheduling for a future date/time.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { getLocalDateString } from '@/utils/formatting';
import { DateTimeFieldGroup } from '@/components/common/DateTimeFieldGroup';

// ============================================================================
// Types
// ============================================================================

export interface WhenStepProps {
  scheduledDate: string | null;
  scheduledTeeTime: string | null;
  onPlayNow: () => void;
  onSchedule: (date: string, teeTime: string | null) => void;
}

type WhenMode = 'now' | 'later';

// ============================================================================
// Helpers
// ============================================================================

/** Returns a Date object for tomorrow at 08:00 local time */
function getDefaultScheduledDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  return tomorrow;
}

/** Format YYYY-MM-DD + HH:MM:SS strings back into Date objects for the picker */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 8, 0, 0, 0);
}

function parseTeeTimeString(teeTimeStr: string): Date {
  const [hours, minutes] = teeTimeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ============================================================================
// Component
// ============================================================================

export default function WhenStep({
  scheduledDate,
  scheduledTeeTime,
  onPlayNow,
  onSchedule,
}: WhenStepProps) {
  const colors = useThemeColors();

  // Derive initial mode from existing state
  const [mode, setMode] = useState<WhenMode>(scheduledDate ? 'later' : 'now');

  // Use existing scheduled values if available, otherwise default to tomorrow 08:00
  const defaultDate = scheduledDate ? parseDateString(scheduledDate) : getDefaultScheduledDate();
  const defaultTime = scheduledTeeTime ? parseTeeTimeString(scheduledTeeTime) : getDefaultScheduledDate();

  const [pickedDate, setPickedDate] = useState<Date>(defaultDate);
  const [pickedTime, setPickedTime] = useState<Date | undefined>(defaultTime);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleContinue = useCallback(() => {
    if (mode === 'now') {
      onPlayNow();
    } else {
      const dateStr = getLocalDateString(pickedDate);
      const h = String(pickedTime?.getHours() ?? 8).padStart(2, '0');
      const m = String(pickedTime?.getMinutes() ?? 0).padStart(2, '0');
      const teeTimeStr = `${h}:${m}:00`;
      onSchedule(dateStr, teeTimeStr);
    }
  }, [mode, pickedDate, pickedTime, onPlayNow, onSchedule]);

  const handleTimeClear = useCallback(() => {
    setPickedTime(undefined);
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Are you heading out now or planning ahead?
      </Text>

      {/* Option cards */}
      <View style={styles.options}>
        {/* Play now */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: mode === 'now' ? colors.primary : colors.border,
              borderWidth: mode === 'now' ? 2 : 1,
            },
          ]}
          onPress={() => setMode('now')}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ checked: mode === 'now' }}
          accessibilityLabel="Play now"
          accessibilityHint="Start scoring immediately"
        >
          <View style={styles.cardIconRow}>
            <Icon
              source="play-circle-outline"
              size={32}
              color={mode === 'now' ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.cardLabel,
              { color: mode === 'now' ? colors.primary : colors.textPrimary },
            ]}
          >
            Play now
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Head straight to scoring
          </Text>
        </TouchableOpacity>

        {/* Schedule for later */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: mode === 'later' ? colors.primary : colors.border,
              borderWidth: mode === 'later' ? 2 : 1,
            },
          ]}
          onPress={() => setMode('later')}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ checked: mode === 'later' }}
          accessibilityLabel="Schedule for later"
          accessibilityHint="Pick a date and tee time"
        >
          <View style={styles.cardIconRow}>
            <Icon
              source="calendar-clock"
              size={32}
              color={mode === 'later' ? colors.primary : colors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.cardLabel,
              { color: mode === 'later' ? colors.primary : colors.textPrimary },
            ]}
          >
            Schedule for later
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Pick a date and tee time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date + time pickers (shown only when "Schedule for later" is selected) */}
      {mode === 'later' && (
        <View style={styles.pickers}>
          <DateTimeFieldGroup
            date={pickedDate}
            onDateChange={setPickedDate}
            time={pickedTime}
            onTimeChange={setPickedTime}
            showTime
            label="Date"
            timeLabel="Tee Time (Optional)"
            minimumDate={today}
            minuteInterval={5}
            showTimeClear
            onTimeClear={handleTimeClear}
            required
            testID="when-step-datetime"
          />
        </View>
      )}

      {/* Continue button */}
      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }, shadows.sm]}
        onPress={handleContinue}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue"
      >
        <Text style={[styles.continueButtonText, { color: colors.white }]}>
          Continue
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  cardIconRow: {
    marginBottom: spacing.sm,
  },
  cardLabel: {
    ...typography.bodyBold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.caption,
    textAlign: 'center',
  },
  pickers: {
    marginBottom: spacing.lg,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    marginTop: spacing.md,
  },
  continueButtonText: {
    ...typography.bodyBold,
  },
});
