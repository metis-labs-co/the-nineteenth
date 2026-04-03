/**
 * EditStatsModal - Full-screen modal for editing detailed stats post-submission
 *
 * Uses hole navigation (prev/next) to step through each hole.
 * Pre-populates with existing stats from the scorecard.
 * Saves all changes in a single batch via Supabase mutation.
 *
 * Sections (visibility controlled by user settings + tier):
 * - FIR toggle (par 4+ only)
 * - Fairway miss direction (when FIR is missed)
 * - GIR toggle
 * - Green miss direction (when GIR is missed)
 * - Putts stepper
 * - Bunker shots stepper
 * - Hazard chips
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import {
  IconChevronLeft,
  IconChevronRight,
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
import { useStatsVisibilityWithTier } from '@/hooks/useStatsVisibilityWithTier';
import { useUpdateScorecardStats } from '@/hooks/scorecard/useUpdateScorecardStats';
import { isSingleBallScore } from '@/types/database/base';
import type {
  HoleScore,
  FairwayMissDirection,
  GreenMissDirection,
  HazardType,
  HazardEntry,
  Hole,
} from '@/types/database/base';
import type { ScorecardWithPlayer } from '@/hooks/useRoundDetails';

const MAX_PUTTS = 6;

const HAZARD_OPTIONS: { type: HazardType; label: string; IconComponent: React.ComponentType<{ size: number; color: string }> }[] = [
  { type: 'water', label: 'Water', IconComponent: IconDroplet },
  { type: 'ob', label: 'OB', IconComponent: IconBan },
  { type: 'lateral', label: 'Lateral', IconComponent: IconCircleOff },
  { type: 'lost_ball', label: 'Lost Ball', IconComponent: IconQuestionMark },
];

interface EditStatsModalProps {
  visible: boolean;
  onClose: () => void;
  scorecard: ScorecardWithPlayer;
  holes: Hole[];
  courseName: string;
  initialHole?: number;
}

export function EditStatsModal({
  visible,
  onClose,
  scorecard,
  holes,
  courseName,
  initialHole,
}: EditStatsModalProps) {
  const colors = useThemeColors();
  const statsVisibility = useStatsVisibilityWithTier();
  const mutation = useUpdateScorecardStats();

  const [currentHole, setCurrentHole] = useState(initialHole ?? 1);
  const totalHoles = holes.length || 18;

  // Reset to initialHole when modal opens with a new hole
  useEffect(() => {
    if (visible && initialHole) {
      setCurrentHole(initialHole);
    }
  }, [visible, initialHole]);

  // Deep clone scores into local state for editing
  const [editedScores, setEditedScores] = useState<Record<string, HoleScore>>(() => {
    const initial: Record<string, HoleScore> = {};
    for (const [key, value] of Object.entries(scorecard.scores || {})) {
      if (value && isSingleBallScore(value)) {
        initial[key] = { ...value };
      }
    }
    return initial;
  });

  // Track if any changes were made
  const hasChanges = useRef(false);

  const currentScore = editedScores[String(currentHole)];
  const currentHoleData = holes.find((h) => h.number === currentHole);
  const par = currentHoleData?.par ?? 4;

  const updateCurrentHoleStats = useCallback(
    (updates: Partial<HoleScore>) => {
      hasChanges.current = true;
      setEditedScores((prev) => ({
        ...prev,
        [String(currentHole)]: {
          ...prev[String(currentHole)],
          ...updates,
        },
      }));
    },
    [currentHole]
  );

  const handleSaveAll = useCallback(async () => {
    try {
      await mutation.mutateAsync({
        scorecardId: scorecard.id,
        scores: editedScores,
      });
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to save stats. Please try again.');
    }
  }, [editedScores, scorecard.id, mutation, onClose]);

  const handleClose = useCallback(() => {
    if (hasChanges.current) {
      Alert.alert('Unsaved Changes', 'You have unsaved changes. Discard them?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
    } else {
      onClose();
    }
  }, [onClose]);

  // --- FIR inline toggle (hit / left / right) ---

  const handleFairwaySelect = useCallback(
    (option: 'hit' | FairwayMissDirection) => {
      if (option === 'hit') {
        // Toggle: if already hit, deselect all
        const isAlreadyHit = currentScore?.fairwayHit === true;
        updateCurrentHoleStats({
          fairwayHit: isAlreadyHit ? undefined : true,
          fairwayMissDirection: undefined,
        });
      } else {
        // Toggle miss direction: if same direction, deselect
        const isSameDir = currentScore?.fairwayHit === false && currentScore?.fairwayMissDirection === option;
        updateCurrentHoleStats({
          fairwayHit: isSameDir ? undefined : false,
          fairwayMissDirection: isSameDir ? undefined : option,
        });
      }
    },
    [currentScore, updateCurrentHoleStats]
  );

  // --- GIR inline toggle (hit / left / right / long / short) ---

  const handleGreenSelect = useCallback(
    (option: 'hit' | GreenMissDirection) => {
      if (option === 'hit') {
        const isAlreadyHit = currentScore?.greenInRegulation === true;
        updateCurrentHoleStats({
          greenInRegulation: isAlreadyHit ? undefined : true,
          greenMissDirection: undefined,
        });
      } else {
        const isSameDir = currentScore?.greenInRegulation === false && currentScore?.greenMissDirection === option;
        updateCurrentHoleStats({
          greenInRegulation: isSameDir ? undefined : false,
          greenMissDirection: isSameDir ? undefined : option,
        });
      }
    },
    [currentScore, updateCurrentHoleStats]
  );

  // --- Putts ---

  const handlePuttsDecrement = useCallback(() => {
    const current = currentScore?.putts ?? 0;
    if (current > 0) {
      updateCurrentHoleStats({ putts: current - 1 });
    }
  }, [currentScore, updateCurrentHoleStats]);

  const handlePuttsIncrement = useCallback(() => {
    const current = currentScore?.putts ?? 0;
    if (current < MAX_PUTTS) {
      updateCurrentHoleStats({ putts: current + 1 });
    }
  }, [currentScore, updateCurrentHoleStats]);

  // --- Hazards ---

  const toggleHazard = useCallback(
    (type: HazardType) => {
      const existing = currentScore?.hazards ?? [];
      const hasIt = existing.some((h: HazardEntry) => h.type === type);
      const updated = hasIt ? existing.filter((h: HazardEntry) => h.type !== type) : [...existing, { type }];
      updateCurrentHoleStats({ hazards: updated.length > 0 ? updated : undefined });
    },
    [currentScore, updateCurrentHoleStats]
  );

  // --- Section visibility ---

  const showFIRSection = (statsVisibility.showFairwayHit || statsVisibility.showFairwayMissDirection) && par >= 4;
  const showGIRSection = statsVisibility.showGreenInRegulation || statsVisibility.showGreenMissDirection;
  const showPuttsSection = statsVisibility.showPutts;

  // Active states for inline toggles
  const firActive = currentScore?.fairwayHit === true
    ? 'hit'
    : currentScore?.fairwayHit === false && currentScore?.fairwayMissDirection
      ? currentScore.fairwayMissDirection
      : null;

  const girActive = currentScore?.greenInRegulation === true
    ? 'hit'
    : currentScore?.greenInRegulation === false && currentScore?.greenMissDirection
      ? currentScore.greenMissDirection
      : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={`Edit Stats \u2014 ${courseName}`}
      height="full"
      showCloseButton
    >
      <View style={styles.container}>
        {/* Hole Navigator */}
        <View style={[styles.holeNav, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => setCurrentHole((h) => Math.max(1, h - 1))}
            disabled={currentHole <= 1}
            style={[styles.navButton, currentHole <= 1 && styles.disabled]}
          >
            <IconChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.holeInfo}>
            <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>
              Hole {currentHole}
            </Text>
            <Text style={[styles.holeMeta, { color: colors.textSecondary }]}>
              Par {par} {'\u2022'} Score: {currentScore?.strokes ?? '-'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setCurrentHole((h) => Math.min(totalHoles, h + 1))}
            disabled={currentHole >= totalHoles}
            style={[styles.navButton, currentHole >= totalHoles && styles.disabled]}
          >
            <IconChevronRight size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Hole dots indicator */}
        <View style={styles.dotsRow}>
          {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => (
            <TouchableOpacity
              key={hole}
              onPress={() => setCurrentHole(hole)}
              style={[
                styles.dot,
                { backgroundColor: hole === currentHole ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>

        {/* Scrollable Stats Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* FIR — inline: Left / Right / Hit */}
          {showFIRSection && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                FAIRWAY IN REGULATION
              </Text>
              <View style={styles.inlineRow}>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    firActive === 'left' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleFairwaySelect('left')}
                  activeOpacity={0.7}
                >
                  <IconArrowLeft size={18} color={firActive === 'left' ? colors.error : colors.textSecondary} />
                  <Text style={[styles.inlineButtonText, { color: firActive === 'left' ? colors.error : colors.textSecondary }]}>
                    Left
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    firActive === 'right' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleFairwaySelect('right')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.inlineButtonText, { color: firActive === 'right' ? colors.error : colors.textSecondary }]}>
                    Right
                  </Text>
                  <IconArrowRight size={18} color={firActive === 'right' ? colors.error : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    firActive === 'hit' && { backgroundColor: colors.success + '15', borderColor: colors.success },
                  ]}
                  onPress={() => handleFairwaySelect('hit')}
                  activeOpacity={0.7}
                >
                  <IconCheck size={18} color={firActive === 'hit' ? colors.success : colors.textSecondary} />
                  <Text style={[styles.inlineButtonText, { color: firActive === 'hit' ? colors.success : colors.textSecondary }]}>
                    Hit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* GIR — inline: Hit / Left / Right / Long / Short */}
          {showGIRSection && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                GREEN IN REGULATION
              </Text>
              <View style={styles.inlineRow}>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    girActive === 'hit' && { backgroundColor: colors.success + '15', borderColor: colors.success },
                  ]}
                  onPress={() => handleGreenSelect('hit')}
                  activeOpacity={0.7}
                >
                  <IconCheck size={18} color={girActive === 'hit' ? colors.success : colors.textSecondary} />
                  <Text style={[styles.inlineButtonText, { color: girActive === 'hit' ? colors.success : colors.textSecondary }]}>
                    Hit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    girActive === 'left' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleGreenSelect('left')}
                  activeOpacity={0.7}
                >
                  <IconArrowLeft size={16} color={girActive === 'left' ? colors.error : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    girActive === 'right' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleGreenSelect('right')}
                  activeOpacity={0.7}
                >
                  <IconArrowRight size={16} color={girActive === 'right' ? colors.error : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    girActive === 'long' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleGreenSelect('long')}
                  activeOpacity={0.7}
                >
                  <IconArrowUp size={16} color={girActive === 'long' ? colors.error : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { borderColor: colors.border },
                    girActive === 'short' && { backgroundColor: colors.error + '15', borderColor: colors.error },
                  ]}
                  onPress={() => handleGreenSelect('short')}
                  activeOpacity={0.7}
                >
                  <IconArrowDown size={16} color={girActive === 'short' ? colors.error : colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Putts Stepper */}
          {showPuttsSection && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PUTTS</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    (currentScore?.putts ?? 0) <= 0 && styles.disabled,
                  ]}
                  onPress={handlePuttsDecrement}
                  disabled={(currentScore?.putts ?? 0) <= 0}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>{'\u2212'}</Text>
                </TouchableOpacity>
                <View style={styles.stepperDisplay}>
                  <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                    {currentScore?.putts !== undefined ? currentScore.putts : '-'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    (currentScore?.putts ?? 0) >= MAX_PUTTS && styles.disabled,
                  ]}
                  onPress={handlePuttsIncrement}
                  disabled={(currentScore?.putts ?? 0) >= MAX_PUTTS}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bunker Shots */}
          {statsVisibility.showBunkerShots && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                BUNKER SHOTS
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    (currentScore?.bunkerShots ?? 0) <= 0 && styles.disabled,
                  ]}
                  onPress={() =>
                    updateCurrentHoleStats({
                      bunkerShots: Math.max(0, (currentScore?.bunkerShots ?? 0) - 1),
                    })
                  }
                  disabled={(currentScore?.bunkerShots ?? 0) <= 0}
                >
                  <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>
                    {'\u2212'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.stepperDisplay}>
                  <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                    {currentScore?.bunkerShots ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    (currentScore?.bunkerShots ?? 0) >= 5 && styles.disabled,
                  ]}
                  onPress={() =>
                    updateCurrentHoleStats({
                      bunkerShots: Math.min(5, (currentScore?.bunkerShots ?? 0) + 1),
                    })
                  }
                  disabled={(currentScore?.bunkerShots ?? 0) >= 5}
                >
                  <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Hazards */}
          {statsVisibility.showHazards && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HAZARDS</Text>
              <View style={styles.hazardRow}>
                {HAZARD_OPTIONS.map((option) => {
                  const isSelected = (currentScore?.hazards ?? []).some(
                    (h: HazardEntry) => h.type === option.type
                  );
                  return (
                    <TouchableOpacity
                      key={option.type}
                      style={[
                        styles.hazardChip,
                        { borderColor: colors.border },
                        isSelected && {
                          backgroundColor: colors.error + '20',
                          borderColor: colors.error,
                        },
                      ]}
                      onPress={() => toggleHazard(option.type)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.hazardChipContent}>
                        <option.IconComponent size={14} color={isSelected ? colors.error : colors.textSecondary} />
                        <Text
                          style={[
                            styles.hazardChipText,
                            { color: isSelected ? colors.error : colors.textSecondary },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.helperText, { color: colors.textDisabled }]}>
                Tap multiple if more than one hazard on this hole
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Sticky Save Button */}
        <View style={[styles.saveFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              mutation.isPending && styles.disabled,
            ]}
            onPress={handleSaveAll}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveButtonText, { color: colors.white }]}>
              {mutation.isPending ? 'Saving...' : 'Save All'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  navButton: {
    padding: spacing.sm,
  },
  holeInfo: {
    alignItems: 'center',
  },
  holeNumber: {
    ...typography.h3,
  },
  holeMeta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // Inline toggle row (FIR / GIR)
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  inlineButtonText: {
    ...typography.small,
    fontWeight: '600',
  },

  // Sections
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
  hazardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hazardChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  hazardChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hazardChipText: {
    ...typography.body,
    fontWeight: '600',
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },

  // Sticky footer
  saveFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },

  disabled: {
    opacity: 0.4,
  },
});
