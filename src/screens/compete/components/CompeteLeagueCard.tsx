/**
 * CompeteLeagueCard - Polished league card for the Compete hub
 *
 * Restyled per the app-wide polish design (COMPETE leagues, L479-523): dot
 * status pill + type pill top row, 16/800 name, description, and the existing
 * top-3 mini leaderboard. All behaviour (press, swipe delete, mini
 * leaderboard) matches the shared LeagueCard it replaces here; strings and
 * accessibility are unchanged.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';
import { CardContainer } from '@/components/common/CardContainer';
import { LeagueMiniLeaderboard } from '@/components/leagues';
import type { League, LeagueType } from '@/types/database';
import { CompeteStatusPill } from './CompeteCardBits';

export interface CompeteLeagueCardProps {
  league: League;
  onPress: () => void;
  onDelete?: (league: League) => void;
  swipeEnabled?: boolean;
}

const LEAGUE_TYPE_LABELS: Record<LeagueType, string> = {
  ongoing: 'Ongoing',
  season: 'Season',
  round_limit: 'Round Limit',
  ladder: 'Ladder',
  eclectic: 'Eclectic',
  partnership: 'Partnership',
};

export const CompeteLeagueCard = React.memo(function CompeteLeagueCard({
  league,
  onPress,
  onDelete,
  swipeEnabled = false,
}: CompeteLeagueCardProps) {
  const colors = useThemeColors();

  const typeLabel = LEAGUE_TYPE_LABELS[league.league_type] ?? 'Ongoing';
  const isArchived = league.status === 'archived';

  const handleDelete = useCallback(() => {
    onDelete?.(league);
  }, [onDelete, league]);

  const deleteHint = swipeEnabled && onDelete ? ', swipe left to delete' : '';

  return (
    <CardContainer
      onPress={onPress}
      swipeable={swipeEnabled && !!onDelete}
      onDelete={handleDelete}
      deleteAccessibilityName={league.name}
      style={styles.card}
      accessibilityLabel={`${league.name} league, ${typeLabel}, ${league.status}${deleteHint}`}
    >
      <View style={styles.content}>
        {/* Top Row: status pill + league type pill */}
        <View style={styles.topRow}>
          <CompeteStatusPill
            status={isArchived ? 'completed' : 'active'}
            label={isArchived ? 'Archived' : 'Active'}
          />
          <View style={[styles.typePill, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.typePillText, { color: colors.textSecondary }]}>
              {typeLabel}
            </Text>
          </View>
        </View>

        {/* League Name */}
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {league.name}
        </Text>

        {/* Description */}
        {league.description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {league.description}
          </Text>
        ) : null}

        {/* Mini Leaderboard (top 3) */}
        {league.status === 'active' && <LeagueMiniLeaderboard league={league} />}
      </View>
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 3,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
