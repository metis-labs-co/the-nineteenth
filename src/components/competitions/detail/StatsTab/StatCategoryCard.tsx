/**
 * StatCategoryCard - expandable "best of" card for a single stat category.
 *
 * Collapsed: icon + uppercase label + leader value + "Alex & Jordan" subtitle.
 * Expanded: full ranked list with tied players grouped under shared ranks.
 *
 * Follows the visual pattern of `LeagueRecordsSection` but wraps each
 * record in a pressable container to allow expansion.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Category } from '@/hooks/competitionStatistics';
import { RankedPlayerRow } from './RankedPlayerRow';
import { formatRank, formatTiedNames } from './formatters';

// Enable LayoutAnimation on Android.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface StatCategoryCardProps {
  category: Category;
  /** Whether this is the last card in its group (hides the bottom divider) */
  isLast?: boolean;
}

type ToneKey = Category['tone'];

function resolveToneColor(
  tone: ToneKey,
  colors: ReturnType<typeof useThemeColors>
): string {
  switch (tone) {
    case 'birdie':
      return colors.birdie;
    case 'eagle':
      return colors.eagle;
    case 'par':
      return colors.par;
    case 'bogey':
      return colors.bogey;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'primary':
      return colors.primary;
    case 'neutral':
    default:
      return colors.textSecondary;
  }
}

export const StatCategoryCard = React.memo(function StatCategoryCard({
  category,
  isLast = false,
}: StatCategoryCardProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const toneColor = useMemo(
    () => resolveToneColor(category.tone, colors),
    [category.tone, colors]
  );

  const leaderRank = category.ranks[0];
  const leaderSubtitle = leaderRank ? formatTiedNames(leaderRank.players) : '';

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  if (!leaderRank) {
    return null;
  }

  return (
    <View>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`${category.label}. Leader ${leaderSubtitle} with ${leaderRank.displayValue}. Tap to ${expanded ? 'collapse' : 'expand'}.`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.row,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Icon source={category.icon} size={20} color={toneColor} />
        </View>
        <View style={styles.details}>
          <Text
            style={[styles.label, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {category.label}
          </Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {leaderRank.displayValue}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {leaderSubtitle}
          </Text>
        </View>
        <Icon
          source={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textSecondary}
        />
      </Pressable>

      {expanded && (
        <View style={styles.expandedList}>
          {category.ranks.flatMap((rank) => {
            const tied = rank.players.length > 1;
            return rank.players.map((player, idx) => (
              <RankedPlayerRow
                key={`${rank.rank}-${player.playerId}`}
                rankLabel={formatRank(rank.rank, tied)}
                showRank={idx === 0}
                playerName={player.playerName}
                displayValue={player.displayValue}
                highlight={rank.rank === 1}
              />
            ));
          })}
        </View>
      )}

      {!isLast && (
        <View
          style={[styles.divider, { backgroundColor: colors.border }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  details: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.h3,
    marginTop: 2,
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
  expandedList: {
    paddingLeft: 40 + spacing.md, // align with details column
    paddingBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: 40 + spacing.md,
  },
});

export default StatCategoryCard;
