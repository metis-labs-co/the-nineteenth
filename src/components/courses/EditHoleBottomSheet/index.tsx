/**
 * EditHoleBottomSheet - Super admin modal for editing hole data
 *
 * Allows super admins to edit:
 * - Par (3, 4, or 5)
 * - Stroke Index (1-18, must be unique)
 * - Yardages per tee box
 *
 * Used in both ScorecardEntryScreen and CourseDetailScreen.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useSettingsStore } from '@/store/settingsStore';
import { resolveTeeYardageKey } from '@/utils/holeTransformers';
import { useEditHoleForm } from './hooks/useEditHoleForm';
import { ParSelector, StrokeIndexSelector, YardageInputRow } from './components';
import type { EditHoleBottomSheetProps, ParValue } from './types';

// Conversion constants
const YARDS_TO_METRES = 0.9144;
const METRES_TO_YARDS = 1 / YARDS_TO_METRES; // ~1.0936

export const EditHoleBottomSheet = React.memo(function EditHoleBottomSheet({
  visible,
  onClose,
  hole,
  allHoles,
  courseTees,
  selectedTee,
  onSave,
  loading = false,
}: EditHoleBottomSheetProps) {
  const colors = useThemeColors();
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const isMetres = distanceUnit === 'metres';

  const {
    formState,
    errors,
    isDirty,
    isValid,
    setPar,
    incrementSI,
    decrementSI,
    setYardage,
    getUpdatedHole,
    reset,
  } = useEditHoleForm({ hole, allHoles });

  // Convert yards to display unit (metres or yards)
  const yardsToDisplayUnit = useCallback(
    (yards: number | undefined): string => {
      if (yards === undefined || yards === null) return '';
      if (isMetres) {
        return String(Math.round(yards * YARDS_TO_METRES));
      }
      return String(yards);
    },
    [isMetres]
  );

  // Convert display unit back to yards for storage
  const displayUnitToYards = useCallback(
    (value: string): number | undefined => {
      if (value === '') return undefined;
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) return undefined;
      if (isMetres) {
        return Math.round(numValue * METRES_TO_YARDS);
      }
      return numValue;
    },
    [isMetres]
  );

  // Create memoized distance change handlers for each tee
  const createDistanceHandler = useCallback(
    (teeName: string) => (value: string) => {
      const yardsValue = displayUnitToYards(value);
      setYardage(teeName, yardsValue !== undefined ? String(yardsValue) : '');
    },
    [displayUnitToYards, setYardage]
  );

  // Reset form when modal opens or hole number changes
  useEffect(() => {
    if (visible) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, hole.number]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!isValid || loading) return;
    const updatedHole = getUpdatedHole();
    onSave(updatedHole);
  }, [isValid, loading, getUpdatedHole, onSave]);

  // Handle par selection
  const handleParSelect = useCallback(
    (par: ParValue) => {
      setPar(par);
    },
    [setPar]
  );

  // Memoized save button disabled state
  const isSaveDisabled = useMemo(
    () => !isDirty || !isValid || loading,
    [isDirty, isValid, loading]
  );

  // Memoized yardage display values - resolve tee color to consistent key (hex → name)
  const yardageDisplayValues = useMemo(() => {
    const values: Record<string, string> = {};
    courseTees.forEach((tee) => {
      const teeKey = resolveTeeYardageKey(tee.color, tee.name);
      values[teeKey] = yardsToDisplayUnit(formState.yardages[teeKey]);
    });
    return values;
  }, [courseTees, formState.yardages, yardsToDisplayUnit]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Edit Hole ${hole.number}`}
      height={0.7}
      testID="edit-hole-bottom-sheet"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <ParSelector
          value={formState.par}
          onSelect={handleParSelect}
          error={errors.par}
        />

        <StrokeIndexSelector
          value={formState.strokeIndex}
          onIncrement={incrementSI}
          onDecrement={decrementSI}
          error={errors.strokeIndex}
        />

        {/* Distances per Tee */}
        {courseTees.length > 0 && (
          <View style={styles.distanceSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Distance ({isMetres ? 'metres' : 'yards'})
            </Text>
            {courseTees.map((tee) => {
              // Resolve tee color to consistent key (hex → name, e.g. "#00CCFF" → "blue")
              const teeKey = resolveTeeYardageKey(tee.color, tee.name);
              return (
                <YardageInputRow
                  key={tee.color}
                  tee={tee}
                  value={yardageDisplayValues[teeKey]}
                  onChangeText={createDistanceHandler(teeKey)}
                  isSelectedTee={resolveTeeYardageKey(selectedTee) === teeKey}
                  isMetres={isMetres}
                  error={errors.yardages?.[teeKey]}
                />
              );
            })}
          </View>
        )}

        {courseTees.length === 0 && (
          <View style={styles.noTeesContainer}>
            <Icon source="information-outline" size={24} color={colors.textSecondary} />
            <Text style={[styles.noTeesText, { color: colors.textSecondary }]}>
              No tees configured for this course. Yardages cannot be edited.
            </Text>
          </View>
        )}
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
          accessibilityLabel="Save hole changes"
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
  distanceSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  noTeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  noTeesText: {
    ...typography.small,
    flex: 1,
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

export type { EditHoleBottomSheetProps, ParValue } from './types';
