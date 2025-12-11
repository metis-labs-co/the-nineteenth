/**
 * DateTimeFields - Date and time picker fields
 */

import React, { memo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface DateTimeFieldsProps {
  date: string;
  teeTime: string;
  dateError?: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
  onClearTime: () => void;
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
  disabled?: boolean;
}

export const DateTimeFields = memo(function DateTimeFields({
  date,
  teeTime,
  dateError,
  onDateChange,
  onTimeChange,
  onClearTime,
  getSelectedDate,
  getSelectedTime,
  disabled,
}: DateTimeFieldsProps) {
  const colors = useThemeColors();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Handle date change
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      onDateChange(selectedDate);
    }
  };

  const handleDatePickerDismiss = () => {
    setShowDatePicker(false);
  };

  // Handle time change
  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      onTimeChange(selectedTime);
    }
  };

  const handleTimePickerDismiss = () => {
    setShowTimePicker(false);
  };

  return (
    <>
      {/* Date Selection */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Date *</Text>
        <Pressable onPress={() => !disabled && setShowDatePicker(true)}>
          <TextInput
            mode="outlined"
            value={date}
            placeholder="Select a date"
            editable={false}
            pointerEvents="none"
            error={!!dateError}
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={dateError ? colors.error : colors.gray300}
            activeOutlineColor={dateError ? colors.error : colors.primary}
            right={
              <TextInput.Icon
                icon="calendar"
                onPress={() => !disabled && setShowDatePicker(true)}
                color={colors.primary}
              />
            }
          />
        </Pressable>
        {dateError && (
          <Text style={[styles.errorText, { color: colors.error }]}>{dateError}</Text>
        )}

        {/* Date Picker */}
        {showDatePicker &&
          (Platform.OS === 'ios' ? (
            <Surface style={[styles.datePickerContainer, { backgroundColor: colors.white }]} elevation={2}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.gray200 }]}>
                <Button onPress={handleDatePickerDismiss} textColor={colors.primary}>
                  Done
                </Button>
              </View>
              <DateTimePicker
                value={getSelectedDate()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
            </Surface>
          ) : (
            <DateTimePicker
              value={getSelectedDate()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          ))}
      </View>

      {/* Tee Time (Optional) */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee Time (Optional)</Text>
        <Pressable onPress={() => !disabled && setShowTimePicker(true)}>
          <TextInput
            mode="outlined"
            value={teeTime}
            placeholder="Select tee time"
            editable={false}
            pointerEvents="none"
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={colors.gray300}
            activeOutlineColor={colors.primary}
            right={
              teeTime ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => !disabled && onClearTime()}
                  color={colors.gray400}
                />
              ) : (
                <TextInput.Icon
                  icon="clock-outline"
                  onPress={() => !disabled && setShowTimePicker(true)}
                  color={colors.primary}
                />
              )
            }
          />
        </Pressable>

        {/* Time Picker */}
        {showTimePicker &&
          (Platform.OS === 'ios' ? (
            <Surface style={[styles.datePickerContainer, { backgroundColor: colors.white }]} elevation={2}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.gray200 }]}>
                <Button onPress={handleTimePickerDismiss} textColor={colors.primary}>
                  Done
                </Button>
              </View>
              <DateTimePicker
                value={getSelectedTime()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={5}
              />
            </Surface>
          ) : (
            <DateTimePicker
              value={getSelectedTime()}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              minuteInterval={5}
            />
          ))}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
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
  datePickerContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
  },
});
