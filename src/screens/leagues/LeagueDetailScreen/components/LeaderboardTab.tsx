/**
 * LeaderboardTab - Leaderboard table with rankings by avg handicap differential
 * Supports Gross/Net sort mode toggle
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ScaledText } from '@/components/common/ScaledText';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { LeagueLeaderboardEntry, LeagueSortMode } from '@/types/database';
import { LeagueLeaderboardRow } from '@/components/leagues';

interface Props {
  leaderboard: { entry: LeagueLeaderboardEntry; isTied: boolean }[];
  currentUserId?: string;
  onRowPress: (entry: LeagueLeaderboardEntry) => void;
  sortMode: LeagueSortMode;
  onSortModeChange: (mode: LeagueSortMode) => void;
}

export default React.memo(function LeaderboardTab({
  leaderboard,
  currentUserId,
  onRowPress,
  sortMode,
  onSortModeChange,
}: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      {/* Sort Mode Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            sortMode === 'gross' && [
              styles.toggleButtonActive,
              { backgroundColor: colors.surface },
            ],
          ]}
          onPress={() => onSortModeChange('gross')}
          accessibilityRole="tab"
          accessibilityState={{ selected: sortMode === 'gross' }}
          accessibilityLabel="Gross differential rankings"
        >
          <ScaledText
            category="caption"
            style={[
              styles.toggleButtonText,
              { color: sortMode === 'gross' ? colors.primary : colors.textSecondary },
              sortMode === 'gross' && styles.toggleButtonTextActive,
            ]}
          >
            Gross
          </ScaledText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            sortMode === 'net' && [
              styles.toggleButtonActive,
              { backgroundColor: colors.surface },
            ],
          ]}
          onPress={() => onSortModeChange('net')}
          accessibilityRole="tab"
          accessibilityState={{ selected: sortMode === 'net' }}
          accessibilityLabel="Net differential rankings"
        >
          <ScaledText
            category="caption"
            style={[
              styles.toggleButtonText,
              { color: sortMode === 'net' ? colors.primary : colors.textSecondary },
              sortMode === 'net' && styles.toggleButtonTextActive,
            ]}
          >
            Net
          </ScaledText>
        </TouchableOpacity>
      </View>

      {leaderboard.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No rounds tagged yet"
          message="Tag a round to appear on the leaderboard."
          compact
        />
      ) : (
        <View style={[styles.leaderboardCard, { backgroundColor: colors.surface }]}>
          {/* Table Header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.positionCol}>
              <ScaledText category="caption" style={[styles.tableHeaderCell, { color: colors.textSecondary }]}>
                #
              </ScaledText>
            </View>
            <View style={styles.playerCol}>
              <ScaledText category="caption" style={[styles.tableHeaderCell, { color: colors.textSecondary }]}>
                Player
              </ScaledText>
            </View>
            <View style={styles.hcCol}>
              <ScaledText category="caption" style={[styles.tableHeaderCell, { color: colors.textSecondary }]}>
                HC
              </ScaledText>
            </View>
            <View style={styles.avgCol}>
              <ScaledText category="caption" style={[styles.tableHeaderCell, { color: colors.textSecondary }]}>
                Avg
              </ScaledText>
            </View>
            <View style={styles.bestCol}>
              <ScaledText category="caption" style={[styles.tableHeaderCell, { color: colors.textSecondary }]}>
                Best
              </ScaledText>
            </View>
            {/* Spacer matching row chevron column */}
            <View style={styles.chevronSpacer} />
          </View>

          {/* Rows */}
          {leaderboard.map(({ entry, isTied }, index) => (
            <LeagueLeaderboardRow
              key={entry.player_id}
              entry={entry}
              currentUserId={currentUserId}
              isTied={isTied}
              onPress={onRowPress}
              isLast={index === leaderboard.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  toggleButtonActive: {
    ...shadows.sm,
  },
  toggleButtonText: {
    ...typography.small,
  },
  toggleButtonTextActive: {
    fontWeight: '600',
  },
  // Leaderboard card
  leaderboardCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  // Shared column widths (used by both header and rows)
  positionCol: {
    minWidth: 32,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  hcCol: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  avgCol: {
    minWidth: 46,
    alignItems: 'flex-end',
  },
  bestCol: {
    minWidth: 46,
    alignItems: 'flex-end',
  },
  chevronSpacer: {
    width: 20,
    marginLeft: spacing.xs,
  },
});
