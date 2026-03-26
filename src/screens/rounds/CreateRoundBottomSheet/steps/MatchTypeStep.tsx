/**
 * MatchTypeStep - Third step in the create round wizard
 *
 * Features:
 * - Display selected course/tee info
 * - Select match type using RoundGameTypeSelector
 * - Show tier restrictions with locked state for unavailable types
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { IconGolf } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';
import type { TeeBox, GameType } from '@/types/database.types';
import type { SelectedCourse } from '../types';

interface MatchTypeStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType | null;
  onSelectMatchType: (matchType: GameType) => void;
  /** Optional callback when upgrade is requested */
  onUpgradePress?: () => void;
}

export const MatchTypeStep = memo(function MatchTypeStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  onSelectMatchType,
  onUpgradePress,
}: MatchTypeStepProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Selected Course Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
        <IconGolf size={20} color={colors.primary} />
        <View style={styles.selectedBannerText}>
          <Text style={[styles.selectedBannerName, { color: colors.textPrimary }]}>
            {selectedCourse?.courseName}
            {selectedTee && (
              <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
            )}
          </Text>
          {selectedCourse?.venue && (
            <Text style={[styles.selectedBannerLocation, { color: colors.textSecondary }]}>
              {selectedCourse.venue.name}
              {(selectedCourse.venue.city || selectedCourse.venue.state) &&
                ` · ${[selectedCourse.venue.city, selectedCourse.venue.state]
                  .filter(Boolean)
                  .join(', ')}`}
            </Text>
          )}
        </View>
      </View>

      {/* Match Type Options */}
      <View style={styles.matchTypeContainer}>
        <Text style={[styles.matchTypeTitle, { color: colors.textSecondary }]}>
          How would you like to score?
        </Text>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.matchTypeList}
          showsVerticalScrollIndicator={false}
        >
          <RoundGameTypeSelector
            value={selectedMatchType ?? 'stableford'}
            onChange={onSelectMatchType}
            onUpgradePress={onUpgradePress}
            showTeamFormats={true}
          />
        </ScrollView>
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
  matchTypeContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  matchTypeTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  matchTypeList: {
    paddingBottom: spacing.lg,
  },
});
