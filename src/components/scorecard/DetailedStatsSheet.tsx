/**
 * DetailedStatsSheet - Bottom sheet for advanced stats entry
 *
 * Shows fairway miss direction, green miss direction, bunker count,
 * and hazard type selection. Sections conditionally shown based on
 * current hole state and user settings.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type {
  HoleScore,
  FairwayMissDirection,
  GreenMissDirection,
  HazardType,
  HazardEntry,
} from '@/types/database/base';

const MAX_BUNKER_SHOTS = 5;

const HAZARD_OPTIONS: { type: HazardType; label: string; icon: string }[] = [
  { type: 'water', label: 'Water', icon: '\u{1F4A7}' },
  { type: 'ob', label: 'OB', icon: '\u{1F6AB}' },
  { type: 'lateral', label: 'Lateral', icon: '\u{1F534}' },
  { type: 'lost_ball', label: 'Lost Ball', icon: '\u{2753}' },
];

interface DetailedStatsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Current hole number for display */
  holeNumber: number;
  /** Player name for display */
  playerName: string;
  /** Current hole score data */
  score: HoleScore | undefined;
  /** Callback with updated stats */
  onStatsUpdate: (updates: Partial<HoleScore>) => void;
  /** Visibility settings */
  showFairwayMissDirection: boolean;
  showGreenMissDirection: boolean;
  showBunkerShots: boolean;
  showHazards: boolean;
}

export function DetailedStatsSheet({
  visible,
  onClose,
  holeNumber,
  playerName,
  score,
  onStatsUpdate,
  showFairwayMissDirection,
  showGreenMissDirection,
  showBunkerShots,
  showHazards,
}: DetailedStatsSheetProps) {
  const colors = useThemeColors();

  // Local state mirrors score data for editing
  const [fairwayDir, setFairwayDir] = useState<FairwayMissDirection | undefined>(
    score?.fairwayMissDirection
  );
  const [greenDir, setGreenDir] = useState<GreenMissDirection | undefined>(
    score?.greenMissDirection
  );
  const [bunkers, setBunkers] = useState(score?.bunkerShots ?? 0);
  const [hazards, setHazards] = useState<HazardEntry[]>(score?.hazards ?? []);

  // Sync local state when score changes (e.g. navigating holes)
  useEffect(() => {
    setFairwayDir(score?.fairwayMissDirection);
    setGreenDir(score?.greenMissDirection);
    setBunkers(score?.bunkerShots ?? 0);
    setHazards(score?.hazards ?? []);
  }, [score]);

  const handleDone = useCallback(() => {
    onStatsUpdate({
      fairwayMissDirection: fairwayDir,
      greenMissDirection: greenDir,
      bunkerShots: bunkers,
      hazards: hazards.length > 0 ? hazards : undefined,
    });
    onClose();
  }, [fairwayDir, greenDir, bunkers, hazards, onStatsUpdate, onClose]);

  const toggleHazard = useCallback((type: HazardType) => {
    setHazards((prev) => {
      const exists = prev.some((h) => h.type === type);
      if (exists) {
        return prev.filter((h) => h.type !== type);
      }
      return [...prev, { type }];
    });
  }, []);

  const toggleFairwayDir = useCallback((dir: FairwayMissDirection) => {
    setFairwayDir((prev) => (prev === dir ? undefined : dir));
  }, []);

  const toggleGreenDir = useCallback((dir: GreenMissDirection) => {
    setGreenDir((prev) => (prev === dir ? undefined : dir));
  }, []);

  // Determine which sections to show
  const showFairwaySection = showFairwayMissDirection && score?.fairwayHit !== true;
  const showGreenSection = showGreenMissDirection && score?.greenInRegulation !== true;
  const hasAnySections = showFairwaySection || showGreenSection || showBunkerShots || showHazards;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Hole ${holeNumber} \u2014 Advanced Stats`}
      height={0.6}
      showHandle
      showCloseButton
    >
      <View style={styles.content}>
        {!hasAnySections && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No detailed stats to track for this hole
            </Text>
          </View>
        )}

        {/* Fairway Miss Direction */}
        {showFairwaySection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              FAIRWAY MISS DIRECTION
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.border },
                  fairwayDir === 'left' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => toggleFairwayDir('left')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.toggleText,
                  { color: fairwayDir === 'left' ? colors.primary : colors.textSecondary },
                ]}>
                  {'\u2B05'} Left
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { borderColor: colors.border },
                  fairwayDir === 'right' && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                ]}
                onPress={() => toggleFairwayDir('right')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.toggleText,
                  { color: fairwayDir === 'right' ? colors.primary : colors.textSecondary },
                ]}>
                  Right {'\u27A1'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Green Miss Direction */}
        {showGreenSection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              GREEN MISS DIRECTION
            </Text>
            <View style={styles.toggleRow}>
              {(['left', 'right', 'long', 'short'] as GreenMissDirection[]).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonSmall,
                    { borderColor: colors.border },
                    greenDir === dir && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                  ]}
                  onPress={() => toggleGreenDir(dir)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: greenDir === dir ? colors.primary : colors.textSecondary },
                  ]}>
                    {dir.charAt(0).toUpperCase() + dir.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bunker Shots */}
        {showBunkerShots && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              BUNKER SHOTS
            </Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  bunkers <= 0 && styles.disabled,
                ]}
                onPress={() => setBunkers((prev) => Math.max(0, prev - 1))}
                disabled={bunkers <= 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'\u2212'}</Text>
              </TouchableOpacity>
              <View style={styles.stepperDisplay}>
                <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>{bunkers}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  bunkers >= MAX_BUNKER_SHOTS && styles.disabled,
                ]}
                onPress={() => setBunkers((prev) => Math.min(MAX_BUNKER_SHOTS, prev + 1))}
                disabled={bunkers >= MAX_BUNKER_SHOTS}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hazards */}
        {showHazards && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              HAZARDS
            </Text>
            <View style={styles.toggleRow}>
              {HAZARD_OPTIONS.map((option) => {
                const isSelected = hazards.some((h) => h.type === option.type);
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.hazardChip,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.error + '20', borderColor: colors.error },
                    ]}
                    onPress={() => toggleHazard(option.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: isSelected ? colors.error : colors.textSecondary },
                    ]}>
                      {option.icon} {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.helperText, { color: colors.textDisabled }]}>
              Tap multiple if more than one hazard on this hole
            </Text>
          </View>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneButtonText, { color: colors.textInverse }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonSmall: {
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.body,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '400',
  },
  stepperDisplay: {
    width: 40,
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  hazardChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  doneButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
  disabled: {
    opacity: 0.4,
  },
});
