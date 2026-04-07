/**
 * DateTimeFieldGroup - Reusable date and time picker group
 *
 * Encapsulates iOS/Android date picker differences and provides a consistent
 * interface for date and optional time selection.
 *
 * @example
 * // Date only
 * <DateTimeFieldGroup
 *   date={selectedDate}
 *   onDateChange={setSelectedDate}
 *   label="Round Date"
 * />
 *
 * @example
 * // Date and time
 * <DateTimeFieldGroup
 *   date={selectedDate}
 *   onDateChange={setSelectedDate}
 *   time={selectedTime}
 *   onTimeChange={setSelectedTime}
 *   showTime
 *   label="Round"
 * />
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, startOfDay } from 'date-fns';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';

// ============================================================================
// Types
// ============================================================================

export interface DateTimeFieldGroupProps {
  /** Current date value */
  date: Date;
  /** Callback when date changes */
  onDateChange: (date: Date) => void;
  /** Current time value (optional, only used when showTime is true) */
  time?: Date;
  /** Callback when time changes (optional, only used when showTime is true) */
  onTimeChange?: (time: Date) => void;
  /** Label for the field group */
  label?: string;
  /** Whether to show the time picker */
  showTime?: boolean;
  /** Minimum selectable date */
  minimumDate?: Date;
  /** Maximum selectable date */
  maximumDate?: Date;
  /** Date field error message */
  dateError?: string;
  /** Time field error message */
  timeError?: string;
  /** Whether the fields are disabled */
  disabled?: boolean;
  /** Whether the date field is required */
  required?: boolean;
  /** Time label (defaults to "Time (Optional)") */
  timeLabel?: string;
  /** Minute interval for time picker (defaults to 5) */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  /** Whether to show clear button on time field */
  showTimeClear?: boolean;
  /** Callback when time is cleared */
  onTimeClear?: () => void;
  /** Test ID prefix for testing */
  testID?: string;
}

// ============================================================================
// Helpers
// ============================================================================

// Internal format for form state (DD/MM/YYYY) — displayed via locale-aware DatePicker
const formatDateInput = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};

const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

// ============================================================================
// Component
// ============================================================================

export const DateTimeFieldGroup = memo(function DateTimeFieldGroup({
  date,
  onDateChange,
  time,
  onTimeChange,
  label,
  showTime = false,
  minimumDate,
  maximumDate,
  dateError,
  timeError,
  disabled = false,
  required = true,
  timeLabel = 'Time (Optional)',
  minuteInterval = 5,
  showTimeClear = true,
  onTimeClear,
  testID,
}: DateTimeFieldGroupProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Format displayed values
  const displayDate = formatDateInput(date);
  const displayTime = time ? formatTime(time) : '';

  // ============================================================================
  // Date Picker Handlers
  // ============================================================================

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }

      if (event.type === 'set' && selectedDate) {
        onDateChange(selectedDate);
      }
    },
    [onDateChange]
  );

  const handleDatePickerDismiss = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const openDatePicker = useCallback(() => {
    if (!disabled) {
      setShowDatePicker(true);
    }
  }, [disabled]);

  // ============================================================================
  // Time Picker Handlers
  // ============================================================================

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedTime?: Date) => {
      if (Platform.OS === 'android') {
        setShowTimePicker(false);
      }

      if (event.type === 'set' && selectedTime && onTimeChange) {
        onTimeChange(selectedTime);
      }
    },
    [onTimeChange]
  );

  const handleTimePickerDismiss = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const openTimePicker = useCallback(() => {
    if (!disabled && showTime) {
      setShowTimePicker(true);
    }
  }, [disabled, showTime]);

  const handleTimeClear = useCallback(() => {
    if (onTimeClear) {
      onTimeClear();
    }
  }, [onTimeClear]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View style={styles.container} testID={testID}>
      {/* Date Field */}
      <View style={styles.fieldContainer}>
        {label && (
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            {label} {required && '*'}
          </Text>
        )}
        {!label && (
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            Date {required && '*'}
          </Text>
        )}
        <TouchableOpacity
          onPress={openDatePicker}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Select ${label || 'date'}`}
          accessibilityHint="Opens date picker"
          testID={testID ? `${testID}-date-button` : undefined}
        >
          <TextInput
            mode="outlined"
            value={displayDate}
            placeholder="Select a date"
            editable={false}
            pointerEvents="none"
            error={!!dateError}
            style={[styles.input, { backgroundColor: colors.surface }]}
            outlineColor={dateError ? colors.error : colors.border}
            activeOutlineColor={dateError ? colors.error : colors.primary}
            textColor={colors.textPrimary}
            placeholderTextColor={colors.textTertiary}
            disabled={disabled}
            right={
              <TextInput.Icon
                icon="calendar"
                onPress={openDatePicker}
                color={disabled ? colors.textTertiary : colors.primary}
              />
            }
            testID={testID ? `${testID}-date-input` : undefined}
          />
        </TouchableOpacity>
        {dateError && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {dateError}
          </Text>
        )}

        {/* Date Picker - iOS Modal */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" visible={showDatePicker}>
            <View
              style={[styles.pickerModalOverlay, { backgroundColor: colors.overlay }]}
            >
              <View
                style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}
              >
                <View
                  style={[styles.pickerHeader, { borderBottomColor: colors.border }]}
                >
                  <TouchableOpacity
                    onPress={handleDatePickerDismiss}
                    style={styles.doneButton}
                    accessibilityRole="button"
                    accessibilityLabel="Done selecting date"
                  >
                    <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minimumDate ? startOfDay(minimumDate) : undefined}
                  maximumDate={maximumDate}
                  textColor={isDark ? '#ffffff' : colors.textPrimary}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Picker - Android */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={minimumDate ? startOfDay(minimumDate) : undefined}
            maximumDate={maximumDate}
          />
        )}
      </View>

      {/* Time Field (Optional) */}
      {showTime && (
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
            {timeLabel}
          </Text>
          <TouchableOpacity
            onPress={openTimePicker}
            activeOpacity={0.7}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Select time"
            accessibilityHint="Opens time picker"
            testID={testID ? `${testID}-time-button` : undefined}
          >
            <TextInput
              mode="outlined"
              value={displayTime}
              placeholder="Select time"
              editable={false}
              pointerEvents="none"
              error={!!timeError}
              style={[styles.input, { backgroundColor: colors.surface }]}
              outlineColor={timeError ? colors.error : colors.border}
              activeOutlineColor={timeError ? colors.error : colors.primary}
              textColor={colors.textPrimary}
              placeholderTextColor={colors.textTertiary}
              disabled={disabled}
              right={
                showTimeClear && displayTime ? (
                  <TextInput.Icon
                    icon="close"
                    onPress={handleTimeClear}
                    color={colors.textTertiary}
                  />
                ) : (
                  <TextInput.Icon
                    icon="clock-outline"
                    onPress={openTimePicker}
                    color={disabled ? colors.textTertiary : colors.primary}
                  />
                )
              }
              testID={testID ? `${testID}-time-input` : undefined}
            />
          </TouchableOpacity>
          {timeError && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {timeError}
            </Text>
          )}

          {/* Time Picker - iOS Modal */}
          {showTimePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="fade" visible={showTimePicker}>
              <View
                style={[styles.pickerModalOverlay, { backgroundColor: colors.overlay }]}
              >
                <View
                  style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}
                >
                  <View
                    style={[styles.pickerHeader, { borderBottomColor: colors.border }]}
                  >
                    <TouchableOpacity
                      onPress={handleTimePickerDismiss}
                      style={styles.doneButton}
                      accessibilityRole="button"
                      accessibilityLabel="Done selecting time"
                    >
                      <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={time || new Date()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    minuteInterval={minuteInterval}
                    is24Hour
                    textColor={isDark ? '#ffffff' : colors.textPrimary}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Time Picker - Android */}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={time || new Date()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              minuteInterval={minuteInterval}
              is24Hour
            />
          )}
        </View>
      )}
    </View>
  );
});

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {},
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
  },
  doneButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
});

export default DateTimeFieldGroup;
