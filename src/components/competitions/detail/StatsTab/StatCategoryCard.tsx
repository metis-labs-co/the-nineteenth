/**
 * StatCategoryCard - "best of" leader card for a single stat category.
 *
 * Design (competition-details redesign, Stats tab):
 * - header row: bold muted category label left, faint unit right
 * - leader row: tinted initials circle, bold name, big value on the right
 * - divider, then compact runner-up rows (pos · dot · name · value)
 *
 * When there are more runner-ups than the collapsed preview shows, the
 * card is pressable and expands to the full ranked list.
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
import { Text } from 'react-native-paper';
import { shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Category } from '@/hooks/competitionStatistics';
import { RankedPlayerRow } from './RankedPlayerRow';
import { formatRank, formatTiedNames, initialsFor, unitForCategory } from './formatters';

// Enable LayoutAnimation on Android.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Runner-up rows shown before the card expands. */
const COLLAPSED_ROWS = 3;

export interface StatCategoryCardProps {
  category: Category;
}

interface RestRow {
  key: string;
  rankLabel: string;
  showRank: boolean;
  playerName: string;
  displayValue: string;
}

export const StatCategoryCard = React.memo(function StatCategoryCard({
  category,
}: StatCategoryCardProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const leaderRank = category.ranks[0];

  const restRows = useMemo<RestRow[]>(
    () =>
      category.ranks.slice(1).flatMap((rank) => {
        const tied = rank.players.length > 1;
        return rank.players.map((player, idx) => ({
          key: `${rank.rank}-${player.playerId}`,
          rankLabel: formatRank(rank.rank, tied),
          showRank: idx === 0,
          playerName: player.playerName,
          displayValue: player.displayValue,
        }));
      }),
    [category.ranks]
  );

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  if (!leaderRank) {
    return null;
  }

  const leaderName = formatTiedNames(leaderRank.players);
  const initials = initialsFor(leaderRank.players[0]?.playerName ?? '');
  const unit = unitForCategory(category.key);
  const hasMore = restRows.length > COLLAPSED_ROWS;
  const visibleRows = expanded ? restRows : restRows.slice(0, COLLAPSED_ROWS);
  const hiddenCount = restRows.length - visibleRows.length;

  const body = (
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {category.label}
        </Text>
        <Text style={[styles.unit, { color: colors.textTertiary }]}>
          {unit}
        </Text>
      </View>

      <View style={styles.leaderRow}>
        <View style={[styles.initialsCircle, { backgroundColor: colors.primary }]}>
          <Text style={[styles.initials, { color: colors.white }]}>
            {initials}
          </Text>
        </View>
        <Text
          style={[styles.leaderName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {leaderName}
        </Text>
        <Text style={[styles.leaderValue, { color: colors.primaryDark }]}>
          {leaderRank.displayValue}
        </Text>
      </View>

      {restRows.length > 0 && (
        <View style={[styles.restList, { borderTopColor: colors.borderLight }]}>
          {visibleRows.map((row) => (
            <RankedPlayerRow
              key={row.key}
              rankLabel={row.rankLabel}
              showRank={row.showRank}
              playerName={row.playerName}
              displayValue={row.displayValue}
            />
          ))}
          {hasMore && (
            <Text style={[styles.moreHint, { color: colors.textTertiary }]}>
              {expanded ? 'Show less' : `+${hiddenCount} more`}
            </Text>
          )}
        </View>
      )}
    </>
  );

  const cardStyle = [
    styles.card,
    shadows.sm,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];

  if (!hasMore) {
    return (
      <View
        style={cardStyle}
        accessibilityLabel={`${category.label}. Leader ${leaderName} with ${leaderRank.displayValue}.`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="button"
      accessibilityLabel={`${category.label}. Leader ${leaderName} with ${leaderRank.displayValue}. Tap to ${expanded ? 'collapse' : 'expand'} the full list.`}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  unit: {
    fontSize: 11,
    marginLeft: 8,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  initialsCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 10,
    fontWeight: '800',
  },
  leaderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  leaderValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  restList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 3,
  },
  moreHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 26,
  },
});

export default StatCategoryCard;
