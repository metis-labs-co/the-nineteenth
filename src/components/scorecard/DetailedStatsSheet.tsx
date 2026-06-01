/**
 * DetailedStatsSheet - Bottom sheet for advanced stats entry
 *
 * Shows fairway miss direction, green miss direction, bunker count,
 * and hazard type selection. Sections conditionally shown based on
 * current hole state and user settings.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconCheck,
  IconDroplet,
  IconBan,
  IconCircleOff,
  IconQuestionMark,
} from '@tabler/icons-react-native';
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

const HAZARD_OPTIONS: { type: HazardType; label: string; IconComponent: React.ComponentType<{ size: number; color: string }> }[] = [
  { type: 'water', label: 'Water', IconComponent: IconDroplet },
  { type: 'ob', label: 'OB', IconComponent: IconBan },
  { type: 'lateral', label: 'Lateral', IconComponent: IconCircleOff },
  { type: 'lost_ball', label: 'Lost Ball', IconComponent: IconQuestionMark },
];

interface DetailedStatsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Current hole number for display */
  holeNumber: number;
  /** Par for the current hole (FIR is hidden on par 3s) */
  holePar?: number;
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
  holePar,
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
  const [fairwayHit, setFairwayHit] = useState<boolean | undefined>(score?.fairwayHit);
  const [fairwayDir, setFairwayDir] = useState<FairwayMissDirection | undefined>(
    score?.fairwayMissDirection
  );
  const [greenHit, setGreenHit] = useState<boolean | undefined>(score?.greenInRegulation);
  const [greenDir, setGreenDir] = useState<GreenMissDirection | undefined>(
    score?.greenMissDirection
  );
  const [bunkers, setBunkers] = useState(score?.bunkerShots ?? 0);
  const [hazards, setHazards] = useState<HazardEntry[]>(score?.hazards ?? []);

  // Sync local state when score changes (e.g. navigating holes)
  useEffect(() => {
    setFairwayHit(score?.fairwayHit);
    setFairwayDir(score?.fairwayMissDirection);
    setGreenHit(score?.greenInRegulation);
    setGreenDir(score?.greenMissDirection);
    setBunkers(score?.bunkerShots ?? 0);
    setHazards(score?.hazards ?? []);
  }, [score]);

  const handleDone = useCallback(() => {
    onStatsUpdate({
      fairwayHit,
      fairwayMissDirection: fairwayDir,
      greenInRegulation: greenHit,
      greenMissDirection: greenDir,
      bunkerShots: bunkers,
      hazards: hazards.length > 0 ? hazards : undefined,
    });
    onClose();
  }, [fairwayHit, fairwayDir, greenHit, greenDir, bunkers, hazards, onStatsUpdate, onClose]);

  const toggleHazard = useCallback((type: HazardType) => {
    setHazards((prev) => {
      const exists = prev.some((h) => h.type === type);
      if (exists) {
        return prev.filter((h) => h.type !== type);
      }
      return [...prev, { type }];
    });
  }, []);

  const handleFairwaySelect = useCallback(
    (option: 'hit' | FairwayMissDirection) => {
      if (option === 'hit') {
        // Toggle: if already hit, deselect everything
        if (fairwayHit === true) {
          setFairwayHit(undefined);
        } else {
          setFairwayHit(true);
          setFairwayDir(undefined);
        }
      } else {
        // Toggle miss direction: if same direction, deselect
        if (fairwayHit === false && fairwayDir === option) {
          setFairwayHit(undefined);
          setFairwayDir(undefined);
        } else {
          setFairwayHit(false);
          setFairwayDir(option);
        }
      }
    },
    [fairwayHit, fairwayDir]
  );

  const handleGreenSelect = useCallback(
    (option: 'hit' | GreenMissDirection) => {
      if (option === 'hit') {
        if (greenHit === true) {
          setGreenHit(undefined);
        } else {
          setGreenHit(true);
          setGreenDir(undefined);
        }
      } else {
        if (greenHit === false && greenDir === option) {
          setGreenHit(undefined);
          setGreenDir(undefined);
        } else {
          setGreenHit(false);
          setGreenDir(option);
        }
      }
    },
    [greenHit, greenDir]
  );

  // Active state for inline toggles
  const firActive: 'hit' | FairwayMissDirection | null =
    fairwayHit === true
      ? 'hit'
      : fairwayHit === false && fairwayDir
        ? fairwayDir
        : null;

  const girActive: 'hit' | GreenMissDirection | null =
    greenHit === true
      ? 'hit'
      : greenHit === false && greenDir
        ? greenDir
        : null;

  // Determine which sections to show.
  // FIR doesn't apply to par 3s — hide it when par is known to be < 4.
  const showFairwaySection = showFairwayMissDirection && (holePar == null || holePar >= 4);
  const showGreenSection = showGreenMissDirection;
  const hasAnySections = showFairwaySection || showGreenSection || showBunkerShots || showHazards;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Hole ${holeNumber} \u2014 Advanced Stats`}
      height={0.7}
      showHandle
      showCloseButton
    >
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!hasAnySections && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No detailed stats to track for this hole
            </Text>
          </View>
        )}

        {/* Fairway In Regulation */}
        {showFairwaySection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              FAIRWAY IN REGULATION
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonSmall,
                  { borderColor: colors.border },
                  firActive === 'hit' && { backgroundColor: colors.success + '20', borderColor: colors.success },
                ]}
                onPress={() => handleFairwaySelect('hit')}
                activeOpacity={0.7}
              >
                <View style={styles.directionButtonContent}>
                  <IconCheck size={16} color={firActive === 'hit' ? colors.success : colors.textSecondary} />
                  <Text style={[
                    styles.toggleText,
                    { color: firActive === 'hit' ? colors.success : colors.textSecondary },
                  ]}>
                    Hit
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonSmall,
                  { borderColor: colors.border },
                  firActive === 'left' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                ]}
                onPress={() => handleFairwaySelect('left')}
                activeOpacity={0.7}
              >
                <View style={styles.directionButtonContent}>
                  <IconArrowLeft size={16} color={firActive === 'left' ? colors.error : colors.textSecondary} />
                  <Text style={[
                    styles.toggleText,
                    { color: firActive === 'left' ? colors.error : colors.textSecondary },
                  ]}>
                    Left
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonSmall,
                  { borderColor: colors.border },
                  firActive === 'right' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                ]}
                onPress={() => handleFairwaySelect('right')}
                activeOpacity={0.7}
              >
                <View style={styles.directionButtonContent}>
                  <Text style={[
                    styles.toggleText,
                    { color: firActive === 'right' ? colors.error : colors.textSecondary },
                  ]}>
                    Right
                  </Text>
                  <IconArrowRight size={16} color={firActive === 'right' ? colors.error : colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonSmall,
                  { borderColor: colors.border },
                  firActive === 'long' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                ]}
                onPress={() => handleFairwaySelect('long')}
                activeOpacity={0.7}
              >
                <View style={styles.directionButtonContent}>
                  <IconArrowUp size={16} color={firActive === 'long' ? colors.error : colors.textSecondary} />
                  <Text style={[
                    styles.toggleText,
                    { color: firActive === 'long' ? colors.error : colors.textSecondary },
                  ]}>
                    Long
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonSmall,
                  { borderColor: colors.border },
                  firActive === 'short' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                ]}
                onPress={() => handleFairwaySelect('short')}
                activeOpacity={0.7}
              >
                <View style={styles.directionButtonContent}>
                  <IconArrowDown size={16} color={firActive === 'short' ? colors.error : colors.textSecondary} />
                  <Text style={[
                    styles.toggleText,
                    { color: firActive === 'short' ? colors.error : colors.textSecondary },
                  ]}>
                    Short
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Green In Regulation */}
        {showGreenSection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              GREEN IN REGULATION
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  styles.toggleButtonSmall,
                  { borderColor: colors.border },
                  girActive === 'hit' && { backgroundColor: colors.success + '20', borderColor: colors.success },
                ]}
                onPress={() => handleGreenSelect('hit')}
                activeOpacity={0.7}
              >
                <View style={styles.directionButtonContent}>
                  <IconCheck size={16} color={girActive === 'hit' ? colors.success : colors.textSecondary} />
                  <Text style={[
                    styles.toggleText,
                    { color: girActive === 'hit' ? colors.success : colors.textSecondary },
                  ]}>
                    Hit
                  </Text>
                </View>
              </TouchableOpacity>
              {(['left', 'right', 'long', 'short'] as GreenMissDirection[]).map((dir) => (
                <TouchableOpacity
                  key={dir}
                  style={[
                    styles.toggleButton,
                    styles.toggleButtonSmall,
                    { borderColor: colors.border },
                    girActive === dir && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleGreenSelect(dir)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleText,
                    { color: girActive === dir ? colors.error : colors.textSecondary },
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hazardScrollContent}>
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
                    <View style={styles.hazardChipContent}>
                      <option.IconComponent size={14} color={isSelected ? colors.error : colors.textSecondary} />
                      <Text style={[
                        styles.toggleText,
                        { color: isSelected ? colors.error : colors.textSecondary },
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
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
    gap: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonSmall: {
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.caption,
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
  hazardScrollContent: {
    gap: spacing.sm,
  },
  hazardChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  directionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
