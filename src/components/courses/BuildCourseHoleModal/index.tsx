/**
 * BuildCourseHoleModal - Bottom sheet for configuring a hole during build-as-you-play
 *
 * Shown before scoring each unconfigured hole. Collects par, stroke index,
 * and optional yardage. On hole 1, also collects tee color selection.
 *
 * NOT dismissible by backdrop tap — user must save to proceed.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import { ParSelector } from '@/components/courses/EditHoleBottomSheet/components/ParSelector';
import { StrokeIndexSelector } from '@/components/courses/EditHoleBottomSheet/components/StrokeIndexSelector';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { TeeColorSelector } from './TeeColorSelector';
import type { Hole } from '@/types/database/base';
import type { ParValue } from '@/components/courses/EditHoleBottomSheet/types';

interface BuildCourseHoleModalProps {
  visible: boolean;
  holeNumber: number;
  /** Whether tee selection is needed (null = not yet chosen) */
  selectedTeeName: string | null;
  /** Stroke indexes already used by configured holes */
  usedStrokeIndexes: Set<number>;
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Error message from a failed save attempt */
  saveError?: string | null;
  /** Called when user saves the hole configuration */
  onSave: (updatedHole: Hole, teeName?: string) => void;
  /** Called when tee is selected (hole 1 only) */
  onSelectTee: (teeName: string) => void;
}

export function BuildCourseHoleModal({
  visible,
  holeNumber,
  selectedTeeName,
  usedStrokeIndexes,
  isSaving,
  saveError,
  onSave,
  onSelectTee,
}: BuildCourseHoleModalProps) {
  const colors = useThemeColors();
  const needsTeeSelection = selectedTeeName === null;

  // Form state
  const [par, setPar] = useState<ParValue>(4);
  const [strokeIndex, setStrokeIndex] = useState(1);
  const [yardage, setYardage] = useState('');
  const [localTeeName, setLocalTeeName] = useState<string | null>(null);

  // Find next available SI when modal opens
  useEffect(() => {
    if (visible) {
      // Reset form
      setPar(4);
      setYardage('');
      setLocalTeeName(null);

      // Find next unused SI value
      let nextSI = 1;
      while (usedStrokeIndexes.has(nextSI) && nextSI <= 18) {
        nextSI++;
      }
      setStrokeIndex(nextSI > 18 ? 1 : nextSI);
    }
  }, [visible, usedStrokeIndexes]);

  // SI validation - check against configured holes only
  const siError = useMemo(() => {
    if (usedStrokeIndexes.has(strokeIndex)) {
      return `SI ${strokeIndex} is already used`;
    }
    return undefined;
  }, [strokeIndex, usedStrokeIndexes]);

  // Can save when: valid SI, and tee selected if needed
  const canSave = !siError && (!needsTeeSelection || localTeeName !== null) && !isSaving;

  const handleTeeSelect = useCallback((teeName: string) => {
    setLocalTeeName(teeName);
  }, []);

  const handleSave = useCallback(() => {
    if (!canSave) return;

    const teeName = localTeeName ?? selectedTeeName;

    // Build yardages object
    const yardages: Record<string, number> = {};
    const parsedYardage = parseInt(yardage, 10);
    if (teeName && !isNaN(parsedYardage) && parsedYardage > 0) {
      yardages[teeName] = parsedYardage;
    }

    const updatedHole: Hole = {
      number: holeNumber as Hole['number'],
      par,
      strokeIndex,
      yardages: Object.keys(yardages).length > 0 ? yardages : undefined,
    };

    // If tee was selected on this hole, notify parent
    if (localTeeName) {
      onSelectTee(localTeeName);
    }

    onSave(updatedHole, localTeeName ?? undefined);
  }, [canSave, holeNumber, par, strokeIndex, yardage, localTeeName, selectedTeeName, onSave, onSelectTee]);

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {}} // Not dismissible
      height={needsTeeSelection ? 0.65 : 0.55}
      title={`Set Up Hole ${holeNumber}`}
      closeOnBackdropPress={false}
      enableSwipeToDismiss={false}
      showCloseButton={false}
      testID="build-course-hole-modal"
    >
      <View style={styles.content}>
        {/* Tee Color Selector (first hole only) */}
        {needsTeeSelection && (
          <TeeColorSelector
            selectedTee={localTeeName}
            onSelect={handleTeeSelect}
          />
        )}

        {/* Par Selector */}
        <ParSelector value={par} onSelect={setPar} />

        {/* Stroke Index Selector */}
        <StrokeIndexSelector
          value={strokeIndex}
          onIncrement={() => setStrokeIndex((prev) => Math.min(prev + 1, 18))}
          onDecrement={() => setStrokeIndex((prev) => Math.max(prev - 1, 1))}
          error={siError}
        />

        {/* Yardage Input (optional) */}
        <View style={styles.yardageContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Yardage{' '}
            <Text style={[styles.optionalLabel, { color: colors.textDisabled }]}>
              (optional)
            </Text>
          </Text>
          <TextInput
            style={[
              styles.yardageInput,
              {
                backgroundColor: colors.surfaceVariant,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={yardage}
            onChangeText={setYardage}
            placeholder="e.g. 385"
            placeholderTextColor={colors.textDisabled}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={4}
          />
        </View>

        {/* Save Error */}
        {saveError && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {saveError}. Tap to retry.
          </Text>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? colors.primary : colors.gray300 },
            shadows.sm,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save hole setup and start scoring"
        >
          <Icon source="check" size={20} color={colors.white} />
          <Text style={[styles.saveButtonText, { color: colors.white }]}>
            {isSaving ? 'Saving...' : 'Save & Score'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  yardageContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  optionalLabel: {
    ...typography.small,
    fontWeight: '400',
  },
  yardageInput: {
    height: 52,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    ...typography.h3,
    borderWidth: 1,
    textAlign: 'center',
  },
  errorText: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 52,
    gap: spacing.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
});
