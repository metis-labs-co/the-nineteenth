/**
 * CourseScheduleStep - Step 1: Course, Tee, Date, Time
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { TeeSelector } from '@/components/common';
import { DateTimeFields } from '../components';
import type { TeeBox } from '@/types/database.types';
import type { CourseWithFavorite } from '@/hooks/useCourses';
import type { RoundFormData, FormErrors } from '../types';

interface CourseScheduleStepProps {
  formData: RoundFormData;
  errors: FormErrors;
  disabled: boolean;
  onOpenCourseModal: () => void;
  onTeeSelect: (tee: TeeBox) => void;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
  onClearTime: () => void;
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
}

export function CourseScheduleStep({
  formData,
  errors,
  disabled,
  onOpenCourseModal,
  onTeeSelect,
  onDateChange,
  onTimeChange,
  onClearTime,
  getSelectedDate,
  getSelectedTime,
}: CourseScheduleStepProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Course Selection */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Course *</Text>
        <TouchableOpacity
          onPress={onOpenCourseModal}
          activeOpacity={0.7}
          accessibilityLabel="Select course"
          accessibilityHint={
            formData.courseName
              ? `Currently selected: ${formData.courseName}`
              : 'Opens course selection'
          }
          accessibilityRole="button"
        >
          <TextInput
            mode="outlined"
            value={formData.courseName}
            placeholder="Select a course"
            editable={false}
            pointerEvents="none"
            error={!!errors.course}
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={errors.course ? colors.error : colors.gray300}
            activeOutlineColor={errors.course ? colors.error : colors.primary}
            right={
              <TextInput.Icon
                icon="chevron-down"
                onPress={onOpenCourseModal}
                color={colors.gray400}
              />
            }
          />
        </TouchableOpacity>
        {errors.course && (
          <Text style={[styles.errorText, { color: colors.error }]}>{errors.course}</Text>
        )}
      </View>

      {/* Tee Selection - Only show when course has tees */}
      {formData.courseId && formData.courseTees.length > 0 && (
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee Box</Text>
          <TeeSelector
            tees={formData.courseTees}
            selectedTee={formData.selectedTee}
            onSelectTee={onTeeSelect}
            variant="cards"
            disabled={disabled}
          />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Select a tee for daily handicap calculation
          </Text>
        </View>
      )}

      {/* Date and Time Fields */}
      <DateTimeFields
        date={formData.date}
        teeTime={formData.teeTime}
        dateError={errors.date}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        onClearTime={onClearTime}
        getSelectedDate={getSelectedDate}
        getSelectedTime={getSelectedTime}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.smallBold,
  },
  input: {},
  errorText: {
    ...typography.caption,
  },
  hintText: {
    ...typography.caption,
  },
});
