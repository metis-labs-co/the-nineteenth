/**
 * CourseTeesStep - Step 2 of AddCourseModal wizard
 *
 * Collects course information:
 * - Course name (required)
 * - Tee box configuration (at least one required)
 */

import React from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { TEE_COLORS, getTeeColorHex, type TeeFormData, type TeeColor } from '../types';

interface CourseTeesStepProps {
  courseName: string;
  tees: TeeFormData[];
  editingTeeId: string | null;
  newTeeName: string;
  newTeeColor: TeeColor;
  onCourseNameChange: (text: string) => void;
  onAddTee: () => void;
  onEditTee: (tee: TeeFormData) => void;
  onSaveTee: () => void;
  onCancelEdit: (tee: TeeFormData | undefined) => void;
  onDeleteTee: (teeId: string) => void;
  onTeeNameChange: (name: string) => void;
  onTeeColorChange: (color: TeeColor) => void;
}

export const CourseTeesStep = React.memo(function CourseTeesStep({
  courseName,
  tees,
  editingTeeId,
  newTeeName,
  newTeeColor,
  onCourseNameChange,
  onAddTee,
  onEditTee,
  onSaveTee,
  onCancelEdit,
  onDeleteTee,
  onTeeNameChange,
  onTeeColorChange,
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
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Course Name *</Text>
        <View style={[styles.textInputWrapper, { backgroundColor: colors.gray50 }]}>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            placeholder="e.g., Championship Course"
            placeholderTextColor={colors.gray400}
            value={courseName}
            onChangeText={onCourseNameChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Course name"
          />
        </View>
      </View>

      {/* Tees Section */}
      <View style={styles.inputGroup}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tee Boxes *</Text>
          <TouchableOpacity
            onPress={onAddTee}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Icon source="plus" size={18} color={colors.white} />
            <Text style={[styles.addButtonText, { color: colors.white }]}>Add Tee</Text>
          </TouchableOpacity>
        </View>

        {tees.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.gray50 }]}>
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
              { backgroundColor: colors.surface, borderColor: colors.gray200 },
            ]}
          >
            {editingTeeId === tee.id ? (
              // Editing mode
              <View style={styles.teeEditContainer}>
                <View style={styles.teeNameRow}>
                  <View
                    style={[styles.teeColorDot, { backgroundColor: getTeeColorHex(newTeeColor), borderColor: colors.borderLight }]}
                  />
                  <TextInput
                    style={[
                      styles.teeNameInput,
                      { color: colors.textPrimary, backgroundColor: colors.gray50 },
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
                    />
                  ))}
                </View>
                <View style={styles.teeEditActions}>
                  <TouchableOpacity
                    onPress={() => onCancelEdit(findTeeById(tee.id))}
                    style={[styles.teeActionButton, { backgroundColor: colors.gray100 }]}
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
                    style={[styles.teeColorDot, { backgroundColor: getTeeColorHex(tee.color), borderColor: colors.borderLight }]}
                  />
                  <Text style={[styles.teeName, { color: colors.textPrimary }]}>
                    {tee.name || 'Unnamed Tee'}
                  </Text>
                </View>
                <View style={styles.teeActions}>
                  <TouchableOpacity onPress={() => onEditTee(tee)} style={styles.teeIconButton}>
                    <Icon source="pencil" size={20} color={colors.gray500} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDeleteTee(tee.id)}
                    style={styles.teeIconButton}
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
  textInputWrapper: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    justifyContent: 'center',
  },
  textInput: {
    ...typography.body,
    paddingVertical: 0,
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
});
