/**
 * LeagueHeader - Description, invite code, player count, type-specific info
 *
 * Shows:
 * - Season: date range + countdown
 * - Round Limit: progress indicator
 * - All types: archived banner
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import type { League } from '@/types/database';

const LEAGUE_TYPE_LABELS: Record<string, string> = {
  ongoing: 'Ongoing',
  season: 'Season',
  round_limit: 'Round Limit',
  ladder: 'Ladder',
  eclectic: 'Eclectic',
};

interface SeasonInfo {
  status: 'upcoming' | 'active' | 'ended';
  label: string;
}

interface RoundLimitInfo {
  used: number;
  max: number;
  counting: number | null;
  remaining: number;
}

interface Props {
  league: League;
  playerCount: number;
  isArchived: boolean;
  onShare: () => void;
  seasonInfo?: SeasonInfo | null;
  roundLimitInfo?: RoundLimitInfo | null;
}

export default React.memo(function LeagueHeader({
  league,
  playerCount,
  isArchived,
  onShare,
  seasonInfo,
  roundLimitInfo,
}: Props) {
  const colors = useThemeColors();
  const typeLabel = LEAGUE_TYPE_LABELS[league.league_type] ?? 'League';

  return (
    <View style={styles.header}>
      {/* Type Pill */}
      <View style={styles.typePillRow}>
        <Pill label={typeLabel} variant="default" size="md" />
      </View>

      {league.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {league.description}
        </Text>
      ) : null}

      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={onShare}
          style={[styles.shareButton, { backgroundColor: colors.primaryBackground }]}
          accessibilityLabel="Share invite code"
        >
          <Icon source="share-variant-outline" size={18} color={colors.primary} />
          <Text style={[styles.shareButtonText, { color: colors.primary }]}>
            {league.invite_code}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.playerCount, { color: colors.textSecondary }]}>
          {playerCount} {playerCount === 1 ? 'player' : 'players'}
        </Text>
      </View>

      {/* Season Info */}
      {seasonInfo && (
        <View style={[
          styles.infoBanner,
          {
            backgroundColor: seasonInfo.status === 'ended'
              ? colors.warningLight
              : seasonInfo.status === 'upcoming'
                ? colors.primaryBackground
                : colors.successLight,
          },
        ]}>
          <Icon
            source={
              seasonInfo.status === 'ended'
                ? 'flag-checkered'
                : seasonInfo.status === 'upcoming'
                  ? 'calendar-clock'
                  : 'timer-outline'
            }
            size={16}
            color={
              seasonInfo.status === 'ended'
                ? colors.warning
                : seasonInfo.status === 'upcoming'
                  ? colors.primary
                  : colors.success
            }
          />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, {
              color: seasonInfo.status === 'ended'
                ? colors.warning
                : seasonInfo.status === 'upcoming'
                  ? colors.primary
                  : colors.success,
            }]}>
              {seasonInfo.label}
            </Text>
            <Text style={[styles.infoDetail, { color: colors.textSecondary }]}>
              {formatDateRange(league.start_date, league.end_date)}
            </Text>
          </View>
        </View>
      )}

      {/* Round Limit Progress */}
      {roundLimitInfo && (
        <View style={[styles.infoBanner, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="counter" size={16} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoLabel, { color: colors.primary }]}>
              {roundLimitInfo.used} of {roundLimitInfo.max} rounds tagged
            </Text>
            {roundLimitInfo.counting && (
              <Text style={[styles.infoDetail, { color: colors.textSecondary }]}>
                Best {roundLimitInfo.counting} count for leaderboard
              </Text>
            )}
          </View>
          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.min(100, (roundLimitInfo.used / roundLimitInfo.max) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {isArchived && (
        <View style={[styles.archivedBanner, { backgroundColor: colors.warningLight }]}>
          <Icon source="archive-outline" size={16} color={colors.warning} />
          <Text style={[styles.archivedText, { color: colors.warning }]}>
            This league is archived (read-only)
          </Text>
        </View>
      )}
    </View>
  );
});

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '';
  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  };
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  typePillRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  shareButtonText: {
    ...typography.smallBold,
  },
  playerCount: {
    ...typography.small,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    ...typography.smallBold,
  },
  infoDetail: {
    ...typography.small,
    marginTop: 2,
  },
  progressBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  archivedText: {
    ...typography.small,
    fontWeight: '600',
  },
});
