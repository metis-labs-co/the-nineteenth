/**
 * EditStatsModal - Full-screen modal for editing detailed stats post-submission
 *
 * Uses hole navigation (prev/next) to step through each hole.
 * Pre-populates with existing stats from the scorecard.
 * Saves all changes in a single batch via Supabase mutation.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common';
import { spacing, borderRadius, typography } from '@/constants/theme';
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

const HAZARD_OPTIONS: { type: HazardType; label: string; icon: string }[] = [
  { type: 'water', label: 'Water', icon: '\u{1F4A7}' },
  { type: 'ob', label: 'OB', icon: '\u{1F6AB}' },
  { type: 'lateral', label: 'Lateral', icon: '\u{1F534}' },
  { type: 'lost_ball', label: 'Lost Ball', icon: '\u{2753}' },
];

interface EditStatsModalProps {
  visible: boolean;
  onClose: () => void;
  scorecard: ScorecardWithPlayer;
  holes: Hole[];
  courseName: string;
}

export function EditStatsModal({
  visible,
  onClose,
  scorecard,
  holes,
  courseName,
}: EditStatsModalProps) {
  const colors = useThemeColors();
  const statsVisibility = useStatsVisibilityWithTier();
  const mutation = useUpdateScorecardStats();

  const [currentHole, setCurrentHole] = useState(1);
  const totalHoles = holes.length || 18;

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

  const toggleFairwayDir = useCallback(
    (dir: FairwayMissDirection) => {
      const current = currentScore?.fairwayMissDirection;
      updateCurrentHoleStats({ fairwayMissDirection: current === dir ? undefined : dir });
    },
    [currentScore, updateCurrentHoleStats]
  );

  const toggleGreenDir = useCallback(
    (dir: GreenMissDirection) => {
      const current = currentScore?.greenMissDirection;
      updateCurrentHoleStats({ greenMissDirection: current === dir ? undefined : dir });
    },
    [currentScore, updateCurrentHoleStats]
  );

  const toggleHazard = useCallback(
    (type: HazardType) => {
      const existing = currentScore?.hazards ?? [];
      const hasIt = existing.some((h: HazardEntry) => h.type === type);
      const updated = hasIt ? existing.filter((h: HazardEntry) => h.type !== type) : [...existing, { type }];
      updateCurrentHoleStats({ hazards: updated.length > 0 ? updated : undefined });
    },
    [currentScore, updateCurrentHoleStats]
  );

  const showFairwaySection =
    statsVisibility.showFairwayMissDirection && currentScore?.fairwayHit === false && par >= 4;
  const showGreenSection =
    statsVisibility.showGreenMissDirection && currentScore?.greenInRegulation === false;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={`Edit Stats \u2014 ${courseName}`}
      height="full"
      showCloseButton
      headerRight={
        <TouchableOpacity onPress={handleSaveAll} disabled={mutation.isPending}>
          <Text style={[styles.saveText, { color: colors.primary }]}>
            {mutation.isPending ? 'Saving...' : 'Save All'}
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* Hole Navigator */}
        <View style={[styles.holeNav, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => setCurrentHole((h) => Math.max(1, h - 1))}
            disabled={currentHole <= 1}
            style={[styles.navButton, currentHole <= 1 && styles.disabled]}
          >
            <Icon source="chevron-left" size={24} color={colors.textPrimary} />
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
            <Icon source="chevron-right" size={24} color={colors.textPrimary} />
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

        {/* Stats Form */}
        <View style={styles.form}>
          {/* Fairway Miss Direction */}
          {showFairwaySection && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                FAIRWAY MISS DIRECTION
              </Text>
              <View style={styles.toggleRow}>
                {(['left', 'right'] as FairwayMissDirection[]).map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[
                      styles.toggleButton,
                      { borderColor: colors.border },
                      currentScore?.fairwayMissDirection === dir && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleFairwayDir(dir)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color:
                            currentScore?.fairwayMissDirection === dir
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {dir === 'left' ? '\u2B05 Left' : 'Right \u27A1'}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                      styles.toggleButtonSmall,
                      { borderColor: colors.border },
                      currentScore?.greenMissDirection === dir && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => toggleGreenDir(dir)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        {
                          color:
                            currentScore?.greenMissDirection === dir
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {dir.charAt(0).toUpperCase() + dir.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                      <Text
                        style={[
                          styles.toggleText,
                          { color: isSelected ? colors.error : colors.textSecondary },
                        ]}
                      >
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
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  saveText: {
    ...typography.bodyBold,
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
  form: {
    padding: spacing.lg,
    gap: spacing.xl,
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
  },
  toggleButtonSmall: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
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
  helperText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  disabled: {
    opacity: 0.4,
  },
});
