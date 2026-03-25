/**
 * EditTeeBottomSheet - Super admin modal for editing tee data
 *
 * Allows super admins to edit:
 * - Tee name and color
 * - Slope and course rating (men's)
 * - Slope and course rating (women's)
 *
 * These ratings are critical for handicap differential calculation.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useEditTeeForm } from './hooks/useEditTeeForm';
import type { EditTeeUpdates } from './hooks/useEditTeeForm';
import type { Tee } from '@/types/database.types';

const TEE_COLOR_OPTIONS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Silver', hex: '#9ca3af' },
  { name: 'Orange', hex: '#ea580c' },
];

export interface EditTeeBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  tee: Tee;
  onSave: (teeId: string, updates: EditTeeUpdates) => void;
  loading?: boolean;
}

export const EditTeeBottomSheet = React.memo(function EditTeeBottomSheet({
  visible,
  onClose,
  tee,
  onSave,
  loading = false,
}: EditTeeBottomSheetProps) {
  const colors = useThemeColors();

  const { formState, errors, isDirty, isValid, setField, getUpdates, reset } = useEditTeeForm({ tee });

  // Reset form when modal opens or tee changes
  useEffect(() => {
    if (visible) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tee.id]);

  const handleSave = useCallback(() => {
    if (!isValid || loading) return;
    onSave(tee.id, getUpdates());
  }, [isValid, loading, tee.id, getUpdates, onSave]);

  const isSaveDisabled = useMemo(() => !isDirty || !isValid || loading, [isDirty, isValid, loading]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Edit ${tee.name} Tees`}
      height={0.65}
      testID="edit-tee-bottom-sheet"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tee Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Tee Name</Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.name ? colors.error : colors.border },
            ]}
            value={formState.name}
            onChangeText={(v) => setField('name', v)}
            placeholder="e.g. Blue, Championship"
            placeholderTextColor={colors.gray400}
            maxLength={50}
            autoCapitalize="words"
          />
          {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
        </View>

        {/* Color Picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
          <View style={styles.colorRow}>
            {TEE_COLOR_OPTIONS.map((opt) => {
              const isSelected = formState.color.toLowerCase() === opt.hex.toLowerCase() ||
                formState.color.toLowerCase() === opt.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={opt.hex}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: opt.hex, borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && styles.colorCircleSelected,
                    opt.hex === '#f5f5f5' && { borderColor: isSelected ? colors.primary : colors.gray400 },
                  ]}
                  onPress={() => setField('color', opt.hex)}
                  accessibilityLabel={`${opt.name} tee color`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                />
              );
            })}
          </View>
        </View>

        {/* Men's Ratings */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Men&apos;s Ratings</Text>
        <View style={styles.ratingsRow}>
          <View style={styles.ratingField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Slope</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.slope ? colors.error : colors.border },
              ]}
              value={formState.slope}
              onChangeText={(v) => setField('slope', v)}
              placeholder="e.g. 125"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              maxLength={3}
            />
            {errors.slope && <Text style={[styles.errorText, { color: colors.error }]}>{errors.slope}</Text>}
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

        {/* Women's Ratings */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Women&apos;s Ratings</Text>
        <View style={styles.ratingsRow}>
          <View style={styles.ratingField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Slope</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.slope_women ? colors.error : colors.border },
              ]}
              value={formState.slope_women}
              onChangeText={(v) => setField('slope_women', v)}
              placeholder="e.g. 130"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              maxLength={3}
            />
            {errors.slope_women && <Text style={[styles.errorText, { color: colors.error }]}>{errors.slope_women}</Text>}
          </View>

          <View style={styles.ratingField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Course Rating</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, backgroundColor: colors.surfaceVariant, borderColor: errors.course_rating_women ? colors.error : colors.border },
              ]}
              value={formState.course_rating_women}
              onChangeText={(v) => setField('course_rating_women', v)}
              placeholder="e.g. 72.5"
              placeholderTextColor={colors.gray400}
              keyboardType="decimal-pad"
              maxLength={4}
            />
            {errors.course_rating_women && <Text style={[styles.errorText, { color: colors.error }]}>{errors.course_rating_women}</Text>}
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
          accessibilityLabel="Save tee changes"
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
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  input: {
    ...typography.body,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  colorCircleSelected: {
    borderWidth: 3,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
