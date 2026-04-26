/**
 * EditDateTimeSheet - Edit a round's date and tee time in a focused bottom sheet.
 *
 * Opened from either the Date or Tee Time row on the Round Details card.
 * Saves both fields together because they live on the same `rounds` row and
 * the shared `DateTimeFieldGroup` already presents them as a pair.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { BottomSheet } from '@/components/common/BottomSheet';
import { DateTimeFieldGroup } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { roundKeys } from '@/hooks/queryKeys';
import { parseLocalDateString, parseTime, formatTimeHHMM } from '@/utils/formatting';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';

export interface EditDateTimeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  /** DB-format date string (`yyyy-MM-dd`) or `null` if unset. */
  initialDate: string | null;
  /** DB-format time (`HH:mm` or `HH:mm:ss`) or `null` if unset. */
  initialTeeTime: string | null;
}

function parseDbDate(value: string | null): Date {
  if (!value) return new Date();
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseLocalDateString(value) || new Date()
    : new Date(value);
}

function parseDbTime(value: string | null): Date | undefined {
  if (!value) return undefined;
  return parseTime(value) || undefined;
}

export function EditDateTimeSheet({
  visible,
  onDismiss,
  roundId,
  initialDate,
  initialTeeTime,
}: EditDateTimeSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(() => parseDbDate(initialDate));
  const [time, setTime] = useState<Date | undefined>(() => parseDbTime(initialTeeTime));

  // Reset local state each time the sheet is opened so stale edits don't leak
  // between opens if the user cancels mid-flow.
  useEffect(() => {
    if (visible) {
      setDate(parseDbDate(initialDate));
      setTime(parseDbTime(initialTeeTime));
    }
  }, [visible, initialDate, initialTeeTime]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await updateRound(roundId, {
        date: format(date, 'yyyy-MM-dd'),
        tee_time: time ? formatTimeHHMM(time) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      onDismiss();
    },
  });

  const handleSave = useCallback(() => mutate(), [mutate]);
  const handleClearTime = useCallback(() => setTime(undefined), []);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Date & Tee Time"
      height={0.55}
      useModal
      testID="edit-datetime-sheet"
    >
      <View style={styles.body}>
        <DateTimeFieldGroup
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          showTime
          timeLabel="Tee Time (Optional)"
          onTimeClear={handleClearTime}
          showTimeClear
          minuteInterval={1}
          disabled={isPending}
          testID="edit-datetime"
        />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.button, styles.cancelButton, { borderColor: colors.gray300 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.button, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>
            {isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default EditDateTimeSheet;
