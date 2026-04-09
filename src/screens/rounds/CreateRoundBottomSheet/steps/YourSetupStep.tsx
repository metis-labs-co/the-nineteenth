/**
 * YourSetupStep - Solo round setup combining tee selection and ball count
 *
 * Shown for solo rounds (no partners). Combines:
 * - Tee picker pills (if course has tees)
 * - Ball count selector (1-4, Social tier+)
 * - Handicap source selection
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { IconGolf, IconCircle, IconCircleCheck, IconPencil } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { Pill } from '@/components/common';
import { HandicapEditSheet } from '@/components/rounds';
import { useAuth } from '@/hooks/useAuth';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { TeeBox, GameType } from '@/types/database.types';
import type { HandicapSource } from '@/types/database';
import type { BallCount } from '@/types/multiball.types';
import { BALL_COUNT_OPTIONS } from '@/types/multiball.types';
import type { SelectedCourse } from '../types';
import { MATCH_TYPES, getTeeColor } from '../types';

interface YourSetupStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  availableTees: TeeBox[];
  onTeeChange: (tee: TeeBox) => void;
  ballCount: BallCount;
  onBallCountChange: (ballCount: BallCount) => void;
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  onStartRound: () => void;
  isSocialOrHigher: boolean;
  /**
   * In-wizard handicap override (applied on Start Round). Null = use profile
   * value as-is. When set, the round start flow writes it back to
   * `players.handicap`.
   */
  currentUserHandicapOverride: number | null;
  onCurrentUserHandicapChange: (value: number) => void;
}

// Format handicap display value
const formatHC = (value: number | null | undefined): string => {
  if (value == null) return 'N/A';
  return value >= 0 ? value.toFixed(1) : `+${Math.abs(value).toFixed(1)}`;
};

export const YourSetupStep = memo(function YourSetupStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  availableTees,
  onTeeChange,
  ballCount,
  onBallCountChange,
  handicapSource,
  onHandicapSourceChange,
  onStartRound,
  isSocialOrHigher,
  currentUserHandicapOverride,
  onCurrentUserHandicapChange,
}: YourSetupStepProps) {
  const colors = useThemeColors();
  const { player } = useAuth();
  const isPremium = useIsPremium();

  const profileGaHandicap = player?.handicap ?? null;
  // Effective handicap used everywhere in this step — the override wins when
  // set so the DHC preview and stored scorecard reflect the edit immediately.
  const gaHandicap = currentUserHandicapOverride ?? profileGaHandicap;
  const socialIndex = player?.handicap_index ?? null;
  const handicapEdited = currentUserHandicapOverride != null;

  // Handicap edit sheet state
  const [isEditingHandicap, setIsEditingHandicap] = useState(false);

  const handleOpenHandicapEdit = useCallback(() => setIsEditingHandicap(true), []);
  const handleCloseHandicapEdit = useCallback(() => setIsEditingHandicap(false), []);
  const handleSaveHandicap = useCallback(
    (value: number) => {
      onCurrentUserHandicapChange(value);
    },
    [onCurrentUserHandicapChange]
  );

  // Calculate daily HC for each handicap source (best-effort)
  const dailyHC = useMemo(() => {
    if (!selectedTee?.slopeRating || !selectedTee?.courseRating) return { profile: null, calculated: null };
    const holes = selectedCourse?.holes;
    if (!holes?.length) return { profile: null, calculated: null };
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
    if (coursePar <= 0) return { profile: null, calculated: null };

    const calc = (baseHC: number) =>
      calculateGADailyHandicap({
        gaHandicap: baseHC,
        slopeRating: selectedTee.slopeRating!,
        courseRating: selectedTee.courseRating!,
        par: coursePar,
        gender: player?.gender,
      }).dailyHandicap;

    return {
      profile: gaHandicap != null ? calc(gaHandicap) : null,
      calculated: (socialIndex ?? gaHandicap) != null ? calc(socialIndex ?? gaHandicap ?? 0) : null,
    };
  }, [selectedTee, selectedCourse?.holes, gaHandicap, socialIndex, player?.gender]);

  const isPractice = handicapSource === 'none';
  const hasTees = availableTees.length > 0;

  // Round mode options
  const modeOptions: {
    value: HandicapSource;
    label: string;
    description: string;
    dailyHandicap: number | null;
    premium?: boolean;
  }[] = [
    {
      value: 'profile',
      label: 'Handicap',
      description: gaHandicap != null
        ? `HC: ${formatHC(gaHandicap)}  ·  DHC: ${dailyHC.profile ?? 'N/A'}  ·  Social: ${socialIndex != null ? formatHC(socialIndex) : 'N/A'}`
        : 'No handicap set in profile',
      dailyHandicap: dailyHC.profile,
    },
    {
      value: 'calculated',
      label: 'Social Index',
      description: socialIndex != null
        ? `Social: ${formatHC(socialIndex)}  ·  DHC: ${dailyHC.calculated ?? 'N/A'}  ·  HC: ${gaHandicap != null ? formatHC(gaHandicap) : 'N/A'}`
        : 'No rounds recorded yet',
      dailyHandicap: dailyHC.calculated,
      premium: !isPremium,
    },
    {
      value: 'none',
      label: 'Practice Round',
      description: 'No handicap applied',
      dailyHandicap: null,
    },
  ];

  const handleSelectMode = (source: HandicapSource) => {
    if (source === 'calculated' && !isPremium) return; // Premium-only
    onHandicapSourceChange(source);
    if (source !== 'none') {
      onBallCountChange(1 as BallCount);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Course & Match Type Banner */}
        <View style={[styles.selectedBanner, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <IconGolf size={20} color={colors.primary} />
          <View style={styles.selectedBannerText}>
            <Text style={[styles.selectedBannerName, { color: colors.textPrimary }]}>
              {selectedCourse?.courseName}
              {selectedTee && (
                <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
              )}
            </Text>
            <Text style={[styles.selectedBannerLocation, { color: colors.textSecondary }]}>
              {selectedCourse?.venue && (
                <>
                  {selectedCourse.venue.name}
                  {(selectedCourse.venue.city || selectedCourse.venue.state) &&
                    ` · ${[selectedCourse.venue.city, selectedCourse.venue.state]
                      .filter(Boolean)
                      .join(', ')}`}
                  {' · '}
                </>
              )}
              {MATCH_TYPES.find((m) => m.value === selectedMatchType)?.label}
            </Text>
          </View>
        </View>

        {/* Tee Selection Pills */}
        {hasTees && (
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Your Tee
            </Text>
            <View style={styles.teePills}>
              {availableTees.map((tee) => {
                const isSelected = selectedTee?.name === tee.name;
                const dotColor = getTeeColor(tee.color, colors.textSecondary);
                return (
                  <TouchableOpacity
                    key={tee.name}
                    style={[
                      styles.teePill,
                      {
                        backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => onTeeChange(tee)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.teeDot, { backgroundColor: dotColor, borderColor: colors.border }]} />
                    <Text
                      style={[
                        styles.teePillText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {tee.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Round Mode Selection */}
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.title, styles.titleInHeader, { color: colors.textPrimary }]}>
              Round Type
            </Text>
            {/* Edit HC pill — always visible, always editable for the current user */}
            <TouchableOpacity
              style={[
                styles.editHcPill,
                {
                  backgroundColor: handicapEdited ? colors.primary + '15' : colors.surface,
                  borderColor: handicapEdited ? colors.primary : colors.border,
                },
              ]}
              onPress={handleOpenHandicapEdit}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Edit your handicap, currently ${formatHC(gaHandicap)}`}
            >
              <IconPencil
                size={14}
                color={handicapEdited ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.editHcPillText,
                  { color: handicapEdited ? colors.primary : colors.textSecondary },
                ]}
              >
                HC: {formatHC(gaHandicap)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {modeOptions.map((option) => {
              const isSelected = handicapSource === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  disabled={option.premium}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                    option.premium && styles.optionDisabled,
                  ]}
                  onPress={() => handleSelectMode(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    {isSelected ? (
                      <IconCircleCheck size={24} color={colors.primary} />
                    ) : (
                      <IconCircle size={24} color={colors.textSecondary} />
                    )}
                    <View style={styles.optionText}>
                      <View style={styles.optionLabelRow}>
                        <Text
                          style={[
                            styles.optionLabel,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {option.label}
                        </Text>
                        {option.premium && (
                          <Pill label="Premium" variant="warning" size="sm" />
                        )}
                      </View>
                      <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ball Count Selection (Practice mode only, Social tier+) */}
        {isPractice && isSocialOrHigher && (
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              How many balls per hole?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Multi-ball scoring is great for practice rounds
            </Text>

            <View style={styles.optionsList}>
              {BALL_COUNT_OPTIONS.map((option) => {
                const isSelected = ballCount === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => onBallCountChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      {isSelected ? (
                        <IconCircleCheck size={24} color={colors.primary} />
                      ) : (
                        <IconCircle size={24} color={colors.textSecondary} />
                      )}
                      <View style={styles.optionText}>
                        <Text
                          style={[
                            styles.optionLabel,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                          {option.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Round Button */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={onStartRound}
          activeOpacity={0.8}
        >
          <Text style={[styles.startButtonText, { color: colors.white }]}>
            {isPractice ? 'Start Practice Round' : 'Start Handicap Round'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Handicap Edit Sheet */}
      <HandicapEditSheet
        visible={isEditingHandicap}
        playerName={player?.name ?? 'You'}
        initialHandicap={gaHandicap}
        onSave={handleSaveHandicap}
        onClose={handleCloseHandicapEdit}
      />
    </>
  );
});

const styles = StyleSheet.create({
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  titleInHeader: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  editHcPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  editHcPillText: {
    ...typography.caption,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  teePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  teeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  teePillText: {
    ...typography.bodyBold,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.bodyBold,
  },
  optionDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  startButtonText: {
    ...typography.bodyBold,
  },
});
