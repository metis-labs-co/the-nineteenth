/**
 * League type-specific configuration sections for the CreateLeagueScreen wizard.
 *
 * Each component handles the Step 2 configuration for a specific league type:
 * - SeasonConfig: Start/end date pickers
 * - RoundLimitConfig: Max rounds stepper + best-of toggle
 * - LadderConfig: Challenge range + seeding method
 * - EclecticConfig: Course, tee, scoring selectors
 * - PartnershipConfig: Format selection cards
 * - OngoingConfig: Info-only display
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { FormInput, FormSection } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { LadderSeeding, EclecticScoring, PartnershipFormat } from '@/types/database';

// =====================================================
// SEASON CONFIG
// =====================================================

interface SeasonConfigProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function SeasonConfig({ startDate, endDate, onStartDateChange, onEndDateChange }: SeasonConfigProps) {
  return (
    <FormSection noCard title="Season Dates" description="Only rounds played within these dates can be tagged.">
      <FormInput
        label="Start Date"
        floatingLabel
        placeholder="DD/MM/YYYY"
        value={startDate}
        onChangeText={onStartDateChange}
        keyboardType="default"
        accessibilityHint="Enter start date in DD/MM/YYYY format"
      />
      <FormInput
        label="End Date"
        floatingLabel
        placeholder="DD/MM/YYYY"
        value={endDate}
        onChangeText={onEndDateChange}
        keyboardType="default"
        accessibilityHint="Enter end date in DD/MM/YYYY format"
      />
    </FormSection>
  );
}

// =====================================================
// ROUND LIMIT CONFIG
// =====================================================

interface RoundLimitConfigProps {
  maxRounds: number;
  countingRounds: number;
  useBestOf: boolean;
  onMaxRoundsChange: (value: number) => void;
  onCountingRoundsChange: (value: number) => void;
  onUseBestOfChange: (value: boolean) => void;
}

export function RoundLimitConfig({
  maxRounds, countingRounds, useBestOf,
  onMaxRoundsChange, onCountingRoundsChange, onUseBestOfChange,
}: RoundLimitConfigProps) {
  const colors = useThemeColors();
  const roundOptions = [5, 8, 10, 12, 15, 20];

  return (
    <FormSection noCard title="Total Rounds" description="Maximum rounds each player can tag.">
      <View style={styles.stepperRow}>
        {roundOptions.map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => {
              onMaxRoundsChange(value);
              if (countingRounds > value) onCountingRoundsChange(value);
            }}
            style={[
              styles.stepperButton,
              {
                backgroundColor: maxRounds === value ? colors.primary : colors.surface,
                borderColor: maxRounds === value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.stepperText,
              { color: maxRounds === value ? colors.white : colors.textPrimary },
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => onUseBestOfChange(!useBestOf)}
        style={[styles.toggleRow, { borderColor: colors.border }]}
      >
        <View style={styles.toggleTextContainer}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
            Best N of {maxRounds}
          </Text>
          <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
            Only count the best rounds for the leaderboard
          </Text>
        </View>
        <Icon
          source={useBestOf ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={useBestOf ? colors.primary : colors.gray300}
        />
      </TouchableOpacity>

      {useBestOf && (
        <View style={styles.countingSection}>
          <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
            Best {countingRounds} of {maxRounds} rounds count
          </Text>
          <View style={styles.stepperRow}>
            {Array.from({ length: maxRounds - 1 }, (_, i) => i + 1)
              .filter((v) => v <= maxRounds && v >= Math.max(1, maxRounds - 6))
              .map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => onCountingRoundsChange(value)}
                  style={[
                    styles.stepperButton,
                    {
                      backgroundColor: countingRounds === value ? colors.primary : colors.surface,
                      borderColor: countingRounds === value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.stepperText,
                    { color: countingRounds === value ? colors.white : colors.textPrimary },
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}
    </FormSection>
  );
}

// =====================================================
// LADDER CONFIG
// =====================================================

interface LadderConfigProps {
  challengeRange: number;
  seeding: LadderSeeding;
  onChallengeRangeChange: (value: number) => void;
  onSeedingChange: (value: LadderSeeding) => void;
}

export function LadderConfig({ challengeRange, seeding, onChallengeRangeChange, onSeedingChange }: LadderConfigProps) {
  const colors = useThemeColors();
  const rangeOptions = [1, 2, 3, 4, 5];
  const seedingOptions: { value: LadderSeeding; label: string }[] = [
    { value: 'join_order', label: 'Join Order' },
    { value: 'handicap', label: 'By Handicap' },
    { value: 'random', label: 'Random' },
  ];

  return (
    <FormSection noCard title="Challenge Range" description="How many positions above can a player challenge?">
      <View style={styles.stepperRow}>
        {rangeOptions.map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => onChallengeRangeChange(value)}
            style={[
              styles.stepperButton,
              {
                backgroundColor: challengeRange === value ? colors.primary : colors.surface,
                borderColor: challengeRange === value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.stepperText,
              { color: challengeRange === value ? colors.white : colors.textPrimary },
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.configTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
        Initial Seeding
      </Text>
      <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
        How players are initially ranked on the ladder.
      </Text>
      <View style={styles.stepperRow}>
        {seedingOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSeedingChange(option.value)}
            style={[
              styles.seedingButton,
              {
                backgroundColor: seeding === option.value ? colors.primary : colors.surface,
                borderColor: seeding === option.value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.seedingText,
              { color: seeding === option.value ? colors.white : colors.textPrimary },
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </FormSection>
  );
}

// =====================================================
// ECLECTIC CONFIG
// =====================================================

interface EclecticConfigProps {
  courseName: string | null;
  teeName: string | null;
  scoring: EclecticScoring;
  onCoursePress: () => void;
  onTeePress: () => void;
  onScoringChange: (value: EclecticScoring) => void;
}

export function EclecticConfig({ courseName, teeName, scoring, onCoursePress, onTeePress, onScoringChange }: EclecticConfigProps) {
  const colors = useThemeColors();

  return (
    <FormSection noCard title="Course" description="All tagged rounds must be from this course.">
      <TouchableOpacity
        onPress={onCoursePress}
        style={[styles.selectorButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Icon source="golf" size={20} color={courseName ? colors.primary : colors.gray400} />
        <Text style={[
          styles.selectorText,
          { color: courseName ? colors.textPrimary : colors.textSecondary },
        ]}>
          {courseName ?? 'Select a course...'}
        </Text>
        <Icon source="chevron-right" size={20} color={colors.gray400} />
      </TouchableOpacity>

      <Text style={[styles.configTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
        Scoring
      </Text>
      <View style={styles.stepperRow}>
        {(['gross', 'net'] as EclecticScoring[]).map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onScoringChange(option)}
            style={[
              styles.seedingButton,
              {
                backgroundColor: scoring === option ? colors.primary : colors.surface,
                borderColor: scoring === option ? colors.primary : colors.border,
                flex: 1,
              },
            ]}
          >
            <Text style={[
              styles.seedingText,
              { color: scoring === option ? colors.white : colors.textPrimary },
            ]}>
              {option === 'gross' ? 'Gross' : 'Net'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {scoring === 'net' && (
        <>
          <Text style={[styles.configTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Tee
          </Text>
          <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
            Required for net scoring. Used to calculate strokes received.
          </Text>
          <TouchableOpacity
            onPress={onTeePress}
            style={[styles.selectorButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Icon source="flag-variant" size={20} color={teeName ? colors.primary : colors.gray400} />
            <Text style={[
              styles.selectorText,
              { color: teeName ? colors.textPrimary : colors.textSecondary },
            ]}>
              {teeName ?? 'Select a tee...'}
            </Text>
            <Icon source="chevron-right" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </>
      )}
    </FormSection>
  );
}

// =====================================================
// PARTNERSHIP CONFIG
// =====================================================

interface PartnershipConfigProps {
  format: PartnershipFormat;
  onFormatChange: (value: PartnershipFormat) => void;
}

export function PartnershipConfig({ format, onFormatChange }: PartnershipConfigProps) {
  const colors = useThemeColors();

  const formatOptions: { value: PartnershipFormat; label: string; description: string }[] = [
    { value: 'combined_stroke', label: 'Combined Stroke', description: 'Both play own ball. Scores added together.' },
    { value: 'scramble', label: 'Scramble', description: 'One team ball. Pick the best shot each time.' },
    { value: 'shamble', label: 'Shamble', description: 'Best drive, then each plays own ball.' },
    { value: 'best_ball', label: 'Best Ball', description: 'Both play own ball. Best net score counts.' },
  ];

  return (
    <>
      <FormSection noCard title="Format" description="How the partnership plays each round.">
        <View style={styles.formatOptions}>
          {formatOptions.map((option) => {
            const isSelected = format === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onFormatChange(option.value)}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: isSelected ? colors.primaryBackground : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel={`${option.label} format`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.formatTextRow}>
                  <Text style={[styles.formatLabel, { color: colors.textPrimary }]}>
                    {option.label}
                  </Text>
                  {isSelected && <Icon source="check-circle" size={18} color={colors.primary} />}
                </View>
                <Text style={[styles.formatDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormSection>

      <View style={[styles.infoBox, { backgroundColor: colors.primaryBackground }]}>
        <Icon source="information-outline" size={20} color={colors.primary} />
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            How It Works
          </Text>
          <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
            Pairs form partnerships and tag rounds together. Target scores are calculated from combined handicaps. Leaderboard ranks by average target differential &mdash; lower is better.
          </Text>
        </View>
      </View>
    </>
  );
}

// =====================================================
// ONGOING CONFIG
// =====================================================

export function OngoingConfig() {
  const colors = useThemeColors();

  return (
    <View style={[styles.infoBox, { backgroundColor: colors.primaryBackground }]}>
      <Icon source="information-outline" size={20} color={colors.primary} />
      <View style={styles.infoTextContainer}>
        <Text style={[styles.infoTitle, { color: colors.primary }]}>
          How Scoring Works
        </Text>
        <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
          Players tag completed 18-hole rounds to the league. Leaderboard ranks by the average of each player&apos;s best 8 handicap differentials from their last 20 rounds.
        </Text>
      </View>
    </View>
  );
}

// =====================================================
// SHARED STYLES
// =====================================================

const styles = StyleSheet.create({
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepperText: {
    ...typography.bodyBold,
  },
  seedingButton: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  seedingText: {
    ...typography.smallBold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  countingSection: {
    marginTop: spacing.sm,
  },
  configTitle: {
    ...typography.bodyBold,
  },
  configDescription: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  selectorText: {
    ...typography.body,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    ...typography.small,
    lineHeight: 20,
  },
  formatOptions: {
    gap: spacing.sm,
  },
  formatCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  formatTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  formatLabel: {
    ...typography.bodyBold,
  },
  formatDescription: {
    ...typography.small,
  },
});
