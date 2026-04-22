import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { DateTimeFieldGroup } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { getLocalDateString, parseLocalDateString } from '@/utils/formatting';
import type { CompetitionType } from '@/types/database.types';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditDatesSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  /** DB date (`yyyy-MM-dd`). */
  initialStartDate: string;
  /** DB date (`yyyy-MM-dd`) or null. */
  initialEndDate: string | null;
  competitionType: CompetitionType;
}

function parseDbDate(value: string | null): Date {
  if (!value) return new Date();
  return parseLocalDateString(value) ?? new Date();
}

export function EditDatesSheet({
  visible,
  onDismiss,
  competitionId,
  initialStartDate,
  initialEndDate,
  competitionType,
}: EditDatesSheetProps) {
  const colors = useThemeColors();
  const requiresEndDate = competitionType === 'event';

  const [startDate, setStartDate] = useState<Date>(() => parseDbDate(initialStartDate));
  const [endDate, setEndDate] = useState<Date | null>(() =>
    initialEndDate ? parseDbDate(initialEndDate) : null
  );
  const [error, setError] = useState<string | null>(null);

  // Reset when the sheet is reopened so cancelled edits don't leak.
  useEffect(() => {
    if (visible) {
      setStartDate(parseDbDate(initialStartDate));
      setEndDate(initialEndDate ? parseDbDate(initialEndDate) : null);
      setError(null);
    }
  }, [visible, initialStartDate, initialEndDate]);

  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const validationError = useMemo(() => {
    if (requiresEndDate && !endDate) {
      return 'End date is required for event competitions';
    }
    if (endDate && endDate < startDate) {
      return 'End date must be on or after start date';
    }
    return null;
  }, [requiresEndDate, startDate, endDate]);

  const handleSave = useCallback(() => {
    if (validationError) {
      setError(validationError);
      return;
    }
    mutate({
      start_date: getLocalDateString(startDate),
      end_date: endDate ? getLocalDateString(endDate) : null,
    });
  }, [validationError, mutate, startDate, endDate]);

  const handleClearEndDate = useCallback(() => {
    setEndDate(null);
  }, []);

  const handleEndDateChange = useCallback((date: Date) => {
    setEndDate(date);
    setError(null);
  }, []);

  const handleStartDateChange = useCallback((date: Date) => {
    setStartDate(date);
    setError(null);
  }, []);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Dates"
      height={0.6}
      useModal
      testID="edit-dates-sheet"
    >
      <View style={styles.body}>
        <DateTimeFieldGroup
          date={startDate}
          onDateChange={handleStartDateChange}
          label="Start Date"
          showTime={false}
          disabled={isPending}
          testID="edit-dates-start"
        />
        <DateTimeFieldGroup
          date={endDate ?? startDate}
          onDateChange={handleEndDateChange}
          label={requiresEndDate ? 'End Date' : 'End Date (Optional)'}
          showTime={false}
          required={requiresEndDate}
          disabled={isPending}
          minimumDate={startDate}
          testID="edit-dates-end"
        />
        {!requiresEndDate && endDate && (
          <TouchableOpacity
            onPress={handleClearEndDate}
            disabled={isPending}
            style={styles.clearEndButton}
            accessibilityRole="button"
            accessibilityLabel="Clear end date"
          >
            <Text style={[styles.clearEndText, { color: colors.primary }]}>
              Clear end date
            </Text>
          </TouchableOpacity>
        )}
        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.button, styles.cancelButton, { borderColor: colors.gray300 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
            Cancel
          </Text>
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
  clearEndButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  clearEndText: {
    ...typography.small,
  },
  errorText: {
    ...typography.small,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
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

export default EditDatesSheet;
