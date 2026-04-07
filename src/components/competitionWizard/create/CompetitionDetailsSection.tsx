/**
 * CompetitionDetailsSection - Displays competition details in the review step
 *
 * Shows name, description, type, dates, handicap system, invite code, and team setting.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ReviewItem, ReviewItemWithBadge } from './ReviewItem';
import type {
  CompetitionDetailsFormData,
  CompetitionType,
} from '@/schemas/competition';

// Competition type labels for display
const competitionTypeLabels: Record<CompetitionType, string> = {
  event: 'Event',
  knockout: 'Knockout',
};

export interface CompetitionDetailsSectionProps {
  competitionData: CompetitionDetailsFormData;
  formatDate: (dateString?: string) => string;
  formatHandicapSystem: (system: string) => string;
}

export function CompetitionDetailsSection({
  competitionData,
  formatDate,
  formatHandicapSystem,
}: CompetitionDetailsSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Competition Details
      </Text>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      <View style={styles.itemsContainer}>
        <ReviewItem label="Name" value={competitionData.name} colors={colors} />
        {competitionData.description && (
          <ReviewItem
            label="Description"
            value={competitionData.description}
            colors={colors}
          />
        )}
        <ReviewItemWithBadge
          label="Type"
          value={competitionTypeLabels[competitionData.competitionType]}
          colors={colors}
        />
        <ReviewItem
          label="Start Date"
          value={formatDate(competitionData.startDate)}
          colors={colors}
        />
        {competitionData.competitionType === 'event' && competitionData.endDate && (
          <ReviewItem
            label="End Date"
            value={formatDate(competitionData.endDate)}
            colors={colors}
          />
        )}
        <ReviewItem
          label="Handicap System"
          value={formatHandicapSystem(competitionData.handicapSystem)}
          colors={colors}
        />
        {competitionData.inviteCode && (
          <ReviewItem
            label="Invite Code"
            value={competitionData.inviteCode}
            colors={colors}
          />
        )}
        <ReviewItemWithBadge
          label="Teams"
          value={competitionData.enableTeams ? 'Team Competition' : 'Individual'}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  divider: {
    marginVertical: spacing.md,
  },
  itemsContainer: {
    gap: spacing.md,
  },
});
