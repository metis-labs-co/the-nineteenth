/**
 * LeagueCard - Card component for league list items
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronRight } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { CardContainer } from '@/components/common/CardContainer';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pill } from '@/components/common/Pill';
import type { League, LeagueType } from '@/types/database';

interface LeagueCardProps {
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

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'active' as const;
    case 'archived':
      return 'completed' as const;
    default:
      return 'active' as const;
  }
};

export default React.memo(function LeagueCard({ league, onPress, onDelete, swipeEnabled = false }: LeagueCardProps) {
  const colors = useThemeColors();

  const typeLabel = LEAGUE_TYPE_LABELS[league.league_type] ?? 'Ongoing';

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
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          {/* Top Row: Status + League Type */}
          <View style={styles.topRow}>
            <StatusBadge
              status={getStatusVariant(league.status)}
              label={league.status === 'archived' ? 'Archived' : 'Active'}
            />
            <Pill label={typeLabel} variant="default" size="md" />
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
        </View>

        {/* Arrow */}
        <View style={styles.arrow}>
          <IconChevronRight size={20} color={colors.gray400} />
        </View>
      </View>
    </CardContainer>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.small,
  },
  arrow: {
    marginLeft: spacing.md,
  },
});
