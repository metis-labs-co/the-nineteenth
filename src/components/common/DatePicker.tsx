import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, parse, isValid, startOfDay } from 'date-fns';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

// Format Date to DD/MM/YYYY string
const formatAustralianDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};

// Parse HH:MM string to Date object
const parseTime = (timeString: string): Date | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Format time for display (HH:MM)
const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

export interface DatePickerProps {
  /** Current value in DD/MM/YYYY format (for date mode) or HH:MM format (for time mode) */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Picker mode: 'date' or 'time' */
  mode?: 'date' | 'time';
  /** Placeholder text */
  placeholder?: string;
  /** Label for the field */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Hint text to display below the input */
  hint?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Minimum date (only for date mode) */
  minimumDate?: Date;
  /** Maximum date (only for date mode) */
  maximumDate?: Date;
  /** Whether to show the clear button */
  showClear?: boolean;
  /** Icon to display */
  icon?: string;
}

export function DatePicker({
  value,
  onChange,
  mode = 'date',
  placeholder,
  label,
  error,
  hint,
  disabled = false,
  minimumDate,
  maximumDate,
  showClear = false,
  icon,
}: DatePickerProps) {
  const colors = useThemeColors();
  const isDark = useIsDark(); // Needed for native DateTimePicker component
  const [showPicker, setShowPicker] = useState(false);

  // Get the current Date value for the picker
  const getPickerValue = useCallback((): Date => {
    if (mode === 'date') {
      const parsed = parseAustralianDate(value);
      return parsed || new Date();
    } else {
      const parsed = parseTime(value);
      return parsed || new Date();
    }
  }, [value, mode]);

  // Handle picker value change
  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }

      if (event.type === 'set' && selectedDate) {
        if (mode === 'date') {
          onChange(formatAustralianDate(selectedDate));
        } else {
          onChange(formatTime(selectedDate));
        }
      }
    },
    [mode, onChange]
  );

  // Handle picker dismiss (iOS) - save the current value when Done is pressed
  const handleDismiss = useCallback(() => {
    const currentValue = getPickerValue();
    if (mode === 'date') {
      onChange(formatAustralianDate(currentValue));
    } else {
      onChange(formatTime(currentValue));
    }
    setShowPicker(false);
  }, [getPickerValue, mode, onChange]);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  // Open picker
  const openPicker = useCallback(() => {
    if (!disabled) {
      setShowPicker(true);
    }
  }, [disabled]);

  // Default icons based on mode
  const defaultIcon = mode === 'date' ? 'calendar' : 'clock-outline';
  const displayIcon = icon || defaultIcon;

  // Default placeholders based on mode
  const defaultPlaceholder =
    mode === 'date' ? 'Select a date' : 'Select a time';
  const displayPlaceholder = placeholder || defaultPlaceholder;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      )}

      <TouchableOpacity onPress={openPicker} disabled={disabled} activeOpacity={0.7}>
        <TextInput
          placeholder={displayPlaceholder}
          value={value}
          mode="outlined"
          error={!!error}
          editable={false}
          pointerEvents="none"
          style={[styles.input, { backgroundColor: colors.surface }]}
          outlineColor={error ? colors.error : colors.border}
          activeOutlineColor={error ? colors.error : colors.primary}
          textColor={colors.textPrimary}
          disabled={disabled}
          right={
            showClear && value ? (
              <TextInput.Icon
                icon="close"
                onPress={handleClear}
                color={colors.textSecondary}
              />
            ) : (
              <TextInput.Icon
                icon={displayIcon}
                onPress={openPicker}
                color={disabled ? colors.textDisabled : colors.primary}
              />
            )
          }
        />
      </TouchableOpacity>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {hint}
        </Text>
      ) : null}

      {/* Date/Time Picker */}
      {showPicker &&
        (Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={showPicker}>
            <View style={[styles.pickerModalOverlay, { backgroundColor: colors.overlay }]}>
              <View
                style={[
                  styles.pickerModalContent,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View
                  style={[
                    styles.pickerHeader,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <TouchableOpacity
                    onPress={handleDismiss}
                    style={styles.doneButton}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                  >
                    <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={getPickerValue()}
                  mode={mode}
                  display="spinner"
                  onChange={handleChange}
                  minimumDate={mode === 'date' && minimumDate ? startOfDay(minimumDate) : undefined}
                  maximumDate={mode === 'date' ? maximumDate : undefined}
                  is24Hour={mode === 'time'}
                  textColor={isDark ? colors.white : colors.textPrimary}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={getPickerValue()}
            mode={mode}
            display="default"
            onChange={handleChange}
            minimumDate={mode === 'date' && minimumDate ? startOfDay(minimumDate) : undefined}
            maximumDate={mode === 'date' ? maximumDate : undefined}
            is24Hour={mode === 'time'}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  hint: {
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
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
});

export default DatePicker;
