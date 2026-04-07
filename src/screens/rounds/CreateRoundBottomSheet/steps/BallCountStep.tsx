/**
 * BallCountStep - Solo round configuration
 *
 * Features:
 * - 3 radio card options: Handicap, Social Index, Practice Round
 * - Shows handicap values and daily HC inline on cards
 * - Practice mode: shows ball count selection (1-4, multi-ball requires Social tier)
 * - Display selected course/tee/match type info
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { IconGolf, IconCircle, IconCircleCheck } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { Pill } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { TeeBox, GameType } from '@/types/database.types';
import type { HandicapSource } from '@/types/database';
import type { BallCount } from '@/types/multiball.types';
import { BALL_COUNT_OPTIONS } from '@/types/multiball.types';
import type { SelectedCourse } from '../types';
import { MATCH_TYPES } from '../types';

interface BallCountStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  ballCount: BallCount;
  onBallCountChange: (ballCount: BallCount) => void;
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  onStartRound: () => void;
}

// Format handicap display value
const formatHC = (value: number | null | undefined): string => {
  if (value == null) return 'N/A';
  return value >= 0 ? value.toFixed(1) : `+${Math.abs(value).toFixed(1)}`;
};

export const BallCountStep = memo(function BallCountStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  ballCount,
  onBallCountChange,
  handicapSource,
  onHandicapSourceChange,
  onStartRound,
}: BallCountStepProps) {
  const colors = useThemeColors();
  const { player } = useAuth();
  const isPremium = useIsPremium();

  const gaHandicap = player?.handicap ?? null;
  const socialIndex = player?.handicap_index ?? null;

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

        {/* Round Mode Selection */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Round Type
          </Text>

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

        {/* Ball Count Selection (Practice mode only) */}
        {isPractice && (
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
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
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
