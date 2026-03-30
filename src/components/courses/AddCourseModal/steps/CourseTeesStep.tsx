/**
 * CourseTeesStep - Step 2 of AddCourseModal wizard
 *
 * Collects course information:
 * - Course name (required)
 * - Tee box configuration (at least one required)
 *
 * Uses FormInput for consistent text input styling.
 */

import React from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FormInput } from '@/components/common/FormInput';
import { TEE_COLORS, getTeeColorHex, type TeeFormData, type TeeColor } from '../types';

interface CourseTeesStepProps {
  courseName: string;
  tees: TeeFormData[];
  editingTeeId: string | null;
  newTeeName: string;
  newTeeColor: TeeColor;
  newSlopeRating: string;
  newCourseRating: string;
  numHoles: 9 | 18;
  showNumHolesToggle: boolean;
  onCourseNameChange: (text: string) => void;
  onNumHolesChange: (numHoles: 9 | 18) => void;
  onAddTee: () => void;
  onEditTee: (tee: TeeFormData) => void;
  onSaveTee: () => void;
  onCancelEdit: (tee: TeeFormData | undefined) => void;
  onDeleteTee: (teeId: string) => void;
  onTeeNameChange: (name: string) => void;
  onTeeColorChange: (color: TeeColor) => void;
  onSlopeRatingChange: (rating: string) => void;
  onCourseRatingChange: (rating: string) => void;
}

export const CourseTeesStep = React.memo(function CourseTeesStep({
  courseName,
  tees,
  editingTeeId,
  newTeeName,
  newTeeColor,
  newSlopeRating,
  newCourseRating,
  numHoles,
  showNumHolesToggle,
  onCourseNameChange,
  onNumHolesChange,
  onAddTee,
  onEditTee,
  onSaveTee,
  onCancelEdit,
  onDeleteTee,
  onTeeNameChange,
  onTeeColorChange,
  onSlopeRatingChange,
  onCourseRatingChange,
}: CourseTeesStepProps) {
  const colors = useThemeColors();

  const findTeeById = (id: string) => tees.find((t) => t.id === id);

  return (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepContentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Course Name Input */}
      <FormInput
        label="Course Name"
        value={courseName}
        onChangeText={onCourseNameChange}
        placeholder="e.g., Championship Course"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        required
        accessibilityLabel="Course name"
      />

      {/* 9/18 Holes Toggle (Super Admin only) */}
      {showNumHolesToggle && (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Number of Holes</Text>
          <View style={styles.numHolesToggle}>
            <TouchableOpacity
              onPress={() => onNumHolesChange(9)}
              style={[
                styles.numHolesPill,
                { borderColor: colors.primary },
                numHoles === 9
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.numHolesPillText,
                  { color: numHoles === 9 ? colors.white : colors.primary },
                ]}
              >
                9 Holes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onNumHolesChange(18)}
              style={[
                styles.numHolesPill,
                { borderColor: colors.primary },
                numHoles === 18
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surface },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.numHolesPillText,
                  { color: numHoles === 18 ? colors.white : colors.primary },
                ]}
              >
                18 Holes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tees Section */}
      <View style={styles.inputGroup}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Tee Boxes *</Text>
          <TouchableOpacity
            onPress={onAddTee}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Icon source="plus" size={18} color={colors.white} />
            <Text style={[styles.addButtonText, { color: colors.white }]}>Add Tee</Text>
          </TouchableOpacity>
        </View>

        {tees.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.gray100 }]}>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              Add at least one tee box to continue
            </Text>
          </View>
        )}

        {/* Tee List */}
        {tees.map((tee) => (
          <View
            key={tee.id}
            style={[
              styles.teeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {editingTeeId === tee.id ? (
              // Editing mode
              <View style={styles.teeEditContainer}>
                <View style={styles.teeNameRow}>
                  <View
                    style={[
                      styles.teeColorDot,
                      { backgroundColor: getTeeColorHex(newTeeColor), borderColor: colors.border },
                    ]}
                  />
                  <TextInput
                    style={[
                      styles.teeNameInput,
                      { color: colors.textPrimary, backgroundColor: colors.gray100 },
                    ]}
                    placeholder="Tee name (e.g., Men's)"
                    placeholderTextColor={colors.gray400}
                    value={newTeeName}
                    onChangeText={onTeeNameChange}
                    autoFocus
                    autoCapitalize="words"
                  />
                </View>
                <Text style={[styles.colorPickerLabel, { color: colors.textSecondary }]}>
                  Select Color:
                </Text>
                <View style={styles.colorPickerContainer}>
                  {TEE_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color.value}
                      onPress={() => onTeeColorChange(color.value)}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color.hex, borderColor: colors.gray300 },
                        color.value === 'white' && { borderWidth: 1 },
                        newTeeColor === color.value && {
                          borderWidth: 3,
                          borderColor: colors.primary,
                        },
                      ]}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>

                {/* Slope and Course Rating Inputs */}
                <View style={styles.ratingInputsContainer}>
                  <View style={styles.ratingInputGroup}>
                    <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                      Slope Rating
                    </Text>
                    <TextInput
                      style={[
                        styles.ratingInput,
                        { color: colors.textPrimary, backgroundColor: colors.gray100 },
                      ]}
                      placeholder="113"
                      placeholderTextColor={colors.gray400}
                      value={newSlopeRating}
                      onChangeText={onSlopeRatingChange}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <View style={styles.ratingInputGroup}>
                    <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                      Course Rating
                    </Text>
                    <TextInput
                      style={[
                        styles.ratingInput,
                        { color: colors.textPrimary, backgroundColor: colors.gray100 },
                      ]}
                      placeholder="72.0"
                      placeholderTextColor={colors.gray400}
                      value={newCourseRating}
                      onChangeText={onCourseRatingChange}
                      keyboardType="decimal-pad"
                      maxLength={5}
                    />
                  </View>
                </View>
                <Text style={[styles.ratingHint, { color: colors.textSecondary }]}>
                  Optional - used for daily handicap calculation
                </Text>

                <View style={styles.teeEditActions}>
                  <TouchableOpacity
                    onPress={() => onCancelEdit(findTeeById(tee.id))}
                    style={[styles.teeActionButton, { backgroundColor: colors.gray100 }]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onSaveTee}
                    disabled={!newTeeName.trim()}
                    style={[
                      styles.teeActionButton,
                      { backgroundColor: newTeeName.trim() ? colors.primary : colors.gray200 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: newTeeName.trim() ? colors.white : colors.gray400 }}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Display mode
              <View style={styles.teeDisplayContainer}>
                <View style={styles.teeInfo}>
                  <View
                    style={[
                      styles.teeColorDot,
                      { backgroundColor: getTeeColorHex(tee.color), borderColor: colors.border },
                    ]}
                  />
                  <Text style={[styles.teeName, { color: colors.textPrimary }]}>
                    {tee.name || 'Unnamed Tee'}
                  </Text>
                </View>
                <View style={styles.teeActions}>
                  <TouchableOpacity
                    onPress={() => onEditTee(tee)}
                    style={styles.teeIconButton}
                    activeOpacity={0.7}
                  >
                    <Icon source="pencil" size={20} color={colors.gray500} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDeleteTee(tee.id)}
                    style={styles.teeIconButton}
                    activeOpacity={0.7}
                  >
                    <Icon source="delete" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  numHolesToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numHolesPill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numHolesPillText: {
    ...typography.bodyBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.smallBold,
  },
  emptyState: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyStateText: {
    ...typography.body,
  },
  teeCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  teeEditContainer: {
    padding: spacing.md,
  },
  teeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  teeColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  teeNameInput: {
    flex: 1,
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  colorPickerLabel: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  teeEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  teeActionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  teeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  teeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teeName: {
    ...typography.body,
  },
  teeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teeIconButton: {
    padding: spacing.xs,
  },
  ratingInputsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  ratingInputGroup: {
    flex: 1,
  },
  ratingLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  ratingInput: {
    ...typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  ratingHint: {
    ...typography.caption,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
