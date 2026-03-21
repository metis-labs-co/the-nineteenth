/**
 * EditCourseBottomSheet - Super admin modal for editing course metadata
 *
 * Allows super admins to edit:
 * - Course name
 * - Description
 * - Slope rating (legacy field shown in Quick Stats)
 * - Course rating (legacy field shown in Quick Stats)
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useEditCourseForm } from './hooks/useEditCourseForm';
import type { EditCourseFormState } from './hooks/useEditCourseForm';

export interface EditCourseBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  course: {
    id: string;
    name: string;
    description: string | null;
    slope_rating: number | null;
    course_rating: number | null;
  };
  onSave: (updates: EditCourseFormState) => void;
  loading?: boolean;
}

export const EditCourseBottomSheet = React.memo(function EditCourseBottomSheet({
  visible,
  onClose,
  course,
  onSave,
  loading = false,
}: EditCourseBottomSheetProps) {
  const colors = useThemeColors();

  const { formState, errors, isDirty, isValid, setField, reset } = useEditCourseForm({ course });

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = useCallback(() => {
    if (!isValid || loading) return;
    onSave(formState);
  }, [isValid, loading, formState, onSave]);

  const isSaveDisabled = useMemo(() => !isDirty || !isValid || loading, [isDirty, isValid, loading]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Edit Course"
      height={0.55}
      testID="edit-course-bottom-sheet"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Course Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.name ? colors.error : colors.border },
            ]}
            value={formState.name}
            onChangeText={(v) => setField('name', v)}
            placeholder="Course name"
            placeholderTextColor={colors.gray400}
            maxLength={100}
            autoCapitalize="words"
          />
          {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: colors.border },
            ]}
            value={formState.description}
            onChangeText={(v) => setField('description', v)}
            placeholder="Optional description"
            placeholderTextColor={colors.gray400}
            maxLength={500}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Ratings Row */}
        <View style={styles.ratingsRow}>
          <View style={styles.ratingField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Slope Rating</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.slope_rating ? colors.error : colors.border },
              ]}
              value={formState.slope_rating}
              onChangeText={(v) => setField('slope_rating', v)}
              placeholder="e.g. 125"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              maxLength={3}
            />
            {errors.slope_rating && <Text style={[styles.errorText, { color: colors.error }]}>{errors.slope_rating}</Text>}
          </View>

          <View style={styles.ratingField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Course Rating</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.course_rating ? colors.error : colors.border },
              ]}
              value={formState.course_rating}
              onChangeText={(v) => setField('course_rating', v)}
              placeholder="e.g. 70.2"
              placeholderTextColor={colors.gray400}
              keyboardType="decimal-pad"
              maxLength={4}
            />
            {errors.course_rating && <Text style={[styles.errorText, { color: colors.error }]}>{errors.course_rating}</Text>}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaveDisabled}
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            isSaveDisabled && styles.saveButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save course changes"
          accessibilityState={{ disabled: isSaveDisabled }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.white }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  multilineInput: {
    height: 80,
    paddingTop: spacing.sm,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ratingField: {
    flex: 1,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
});
