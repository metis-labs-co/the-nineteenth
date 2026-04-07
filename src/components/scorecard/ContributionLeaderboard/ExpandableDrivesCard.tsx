/**
 * ExpandableDrivesCard Component
 *
 * Renders the drives leaderboard for Shamble format with expandable rows
 * that show which hole numbers each player's drive was used on.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { DriveEntryWithHoles } from './useContributionData';

interface ExpandableDrivesCardProps {
  entries: DriveEntryWithHoles[];
  expandedPlayers: Set<string>;
  onToggleExpand: (playerId: string) => void;
}

export const ExpandableDrivesCard = React.memo(function ExpandableDrivesCard({
  entries,
  expandedPlayers,
  onToggleExpand,
}: ExpandableDrivesCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Icon source="golf-tee" size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Best Drives</Text>
      </View>
      {entries.length > 0 ? (
        entries.map((entry, index) => {
          const isExpanded = expandedPlayers.has(entry.playerId);
          const isFirst = index === 0;

          return (
            <View key={entry.playerId}>
              <TouchableOpacity
                style={styles.entryRow}
                onPress={() => onToggleExpand(entry.playerId)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${entry.playerName}, ${entry.count} drives. Tap to ${isExpanded ? 'collapse' : 'expand'} and see hole numbers.`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={styles.entryRank}>
                  <Text
                    style={[
                      styles.rankText,
                      { color: isFirst ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {entry.playerName}
                  </Text>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.gray200 },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${entry.percentage}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.entryCount}>
                  <Text style={[styles.countText, { color: colors.textPrimary }]}>
                    {entry.count}
                  </Text>
                  <Text style={[styles.percentText, { color: colors.textSecondary }]}>
                    {entry.percentage.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.expandIcon}>
                  <Icon
                    source={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded hole numbers */}
              {isExpanded && entry.holeNumbers.length > 0 && (
                <View style={[styles.expandedContent, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.holesUsedLabel, { color: colors.textSecondary }]}>
                    Holes used:
                  </Text>
                  <View style={styles.holeChipsContainer}>
                    {entry.holeNumbers.map((holeNum) => (
                      <View
                        key={holeNum}
                        style={[styles.holeChip, { backgroundColor: colors.primary + '20' }]}
                      >
                        <Text style={[styles.holeChipText, { color: colors.primary }]}>
                          {holeNum}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No drives recorded yet
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  entryRank: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    ...typography.bodyBold,
  },
  entryInfo: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  entryName: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  entryCount: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  countText: {
    ...typography.bodyBold,
  },
  percentText: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  expandIcon: {
    width: 28,
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  expandedContent: {
    marginLeft: 24 + spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  holesUsedLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  holeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  holeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  holeChipText: {
    ...typography.smallBold,
  },
});
