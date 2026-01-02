/**
 * CompetitionRoundCard - Individual round card for competition detail view
 *
 * Displays round information including course, date, status, and game type.
 * Includes action buttons for viewing and scoring rounds.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { IconMapPin, IconCheck, IconAlertTriangle } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import { StatusBadge, Pill, DateTimeDisplay } from '@/components/common';
import type { StatusVariant } from '@/components/common';
import { type RoundWithCourse, GAME_TYPE_LABELS } from './types';

export interface CompetitionRoundCardProps {
  round: RoundWithCourse;
  roundNumber: number;
  isOrganizer: boolean;
  onScoreRound: (roundId: string) => void;
  onViewRound: (roundId: string) => void;
  onManageScoringPairs?: (roundId: string) => void;
  /** Whether scoring pairs are configured for this round */
  hasScoringPairs?: boolean;
  colors: ColorPalette;
}

/**
 * Maps round status to StatusBadge variant
 */
const getStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'in-progress':
      return 'in-progress';
    case 'completed':
      return 'completed';
    case 'upcoming':
    default:
      return 'upcoming';
  }
};

export const CompetitionRoundCard = React.memo(function CompetitionRoundCard({
  round,
  roundNumber,
  isOrganizer,
  onScoreRound,
  onViewRound,
  onManageScoringPairs,
  hasScoringPairs,
  colors,
}: CompetitionRoundCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.content}>
        {/* Top Row: Status Badge + Game Type Badge + Round Pill */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <StatusBadge status={getStatusVariant(round.status)} />
            <StatusBadge
              status="custom"
              label={GAME_TYPE_LABELS[round.game_type]}
              size="md"
              backgroundColor={colors.gray100}
            />
          </View>
          <Pill label={`Round ${roundNumber}`} size="md" />
        </View>

        {/* Course Name */}
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {round.course?.name || 'Course TBD'}
        </Text>

        {/* Location */}
        {(round.course?.venues?.city || round.course?.venues?.state) && (
          <View style={styles.locationRow}>
            <IconMapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {[round.course?.venues?.city, round.course?.venues?.state].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* Date and Time */}
        <View style={styles.detailsRow}>
          <DateTimeDisplay date={round.date} time={round.tee_time} size="md" />
        </View>

        {/* Scoring Pairs Row - Organizer Only */}
        {isOrganizer && round.scoring_pairs_required && onManageScoringPairs && (
          <TouchableOpacity
            style={[styles.scoringPairsRow, { borderTopColor: colors.borderLight }]}
            onPress={() => onManageScoringPairs(round.id)}
            accessibilityLabel={`Manage scoring pairs for round ${roundNumber}`}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <View style={styles.scoringPairsLabelRow}>
              <Icon source="account-switch" size={18} color={colors.textSecondary} />
              <Text style={[styles.scoringPairsLabel, { color: colors.textPrimary }]}>
                Scoring Pairs
              </Text>
            </View>
            <View style={styles.scoringPairsStatusRow}>
              {hasScoringPairs ? (
                <>
                  <IconCheck size={16} color={colors.success} />
                  <Text style={[styles.scoringPairsStatusText, { color: colors.success }]}>
                    Configured
                  </Text>
                </>
              ) : (
                <>
                  <IconAlertTriangle size={16} color={colors.warning} />
                  <Text style={[styles.scoringPairsStatusText, { color: colors.warning }]}>
                    Not configured
                  </Text>
                </>
              )}
              <Icon source="chevron-right" size={18} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Divider */}
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primaryLighter }]}
          onPress={() => onViewRound(round.id)}
          accessibilityLabel={`View round ${roundNumber}`}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonLabel, { color: colors.primary }]}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: round.status === 'completed' ? colors.gray300 : colors.primary },
          ]}
          onPress={() => onScoreRound(round.id)}
          accessibilityLabel={`Score round ${roundNumber}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: round.status === 'completed' }}
          activeOpacity={0.7}
          disabled={round.status === 'completed'}
        >
          <Text style={[styles.actionButtonLabelPrimary, { color: colors.white }]}>Score</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.sm,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    ...typography.small,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoringPairsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  scoringPairsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoringPairsLabel: {
    ...typography.small,
  },
  scoringPairsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoringPairsStatusText: {
    ...typography.smallBold,
  },
  divider: {
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonLabel: {
    ...typography.smallBold,
  },
  actionButtonLabelPrimary: {
    ...typography.smallBold,
  },
});

export default CompetitionRoundCard;
