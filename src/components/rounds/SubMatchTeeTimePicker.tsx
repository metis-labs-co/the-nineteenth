/**
 * Cross-platform tee-time picker for a sub-match.
 *
 * Extracted from `SubMatchesTab` so the same picker UI can be reused on
 * `SubMatchDetailScreen`. iOS renders an inline spinner inside a modal
 * with a Done button; Android delegates to the system dialog.
 */

import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useIsDark, useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';

export interface SubMatchTeeTimePickerProps {
  visible: boolean;
  initialTime: Date;
  onCommit: (selectedDate: Date) => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Parse an HH:MM(:SS) string into today's `Date` for the picker.
 * Defaults to 07:00 when the input is empty / unparseable.
 */
export function parseTeeTimeToDate(teeTime: string | null): Date {
  const date = new Date();
  if (!teeTime) {
    date.setHours(7, 0, 0, 0);
    return date;
  }
  const [h, m] = teeTime.split(':').map(Number);
  date.setHours(
    Number.isFinite(h) ? h : 7,
    Number.isFinite(m) ? m : 0,
    0,
    0
  );
  return date;
}

/** Format a `Date` as `HH:MM:SS` for persistence. */
export function formatDateToTeeTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

export function SubMatchTeeTimePicker({
  visible,
  initialTime,
  onCommit,
  onCancel,
  testID,
}: SubMatchTeeTimePickerProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const [draft, setDraft] = useState<Date>(initialTime);

  // Reset draft on each open so a previous edit doesn't leak through a cancel.
  useEffect(() => {
    if (visible) setDraft(initialTime);
    // initialTime is a fresh Date per parent render — depend on its time value
    // to avoid the picker resetting on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTime.getTime()]);

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        testID={testID}
        value={initialTime}
        mode="time"
        is24Hour={false}
        display="default"
        onChange={(event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            onCommit(selectedDate);
          } else {
            onCancel();
          }
        }}
      />
    );
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            shadows.lg,
            { backgroundColor: colors.surfaceElevated },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel time selection"
            >
              <Text style={[styles.headerText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onCommit(draft)}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Confirm tee time"
              testID={testID ? `${testID}-done` : undefined}
            >
              <Text style={[styles.headerTextBold, { color: colors.primary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            testID={testID}
            value={draft}
            mode="time"
            is24Hour={false}
            display="spinner"
            minuteInterval={1}
            onChange={(_event, selectedDate) => {
              if (selectedDate) setDraft(selectedDate);
            }}
            textColor={isDark ? '#ffffff' : colors.textPrimary}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingBottom: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    paddingVertical: spacing.xs,
  },
  headerText: {
    ...typography.body,
  },
  headerTextBold: {
    ...typography.bodyBold,
  },
});
