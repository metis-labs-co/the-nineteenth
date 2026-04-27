/**
 * ParLeaderboardFull Component
 *
 * Full-tab leaderboard for Par game rounds. Each hole is scored +1 / 0 / -1
 * vs net par. Players sorted by total points (descending).
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { EmptyState } from '@/components/common';
import {
  spacing,
  typography,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { calculateParScore, getStrokesOnHole } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';

export interface ParLeaderboardFullProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId?: string;
  testID?: string;
}

interface LeaderboardRow {
  playerId: string;
  playerName: string;
  handicap: number;
  position: number;
  points: number;
  holesCompleted: number;
  isCurrentUser: boolean;
}

const MEDAL_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

const formatPoints = (value: number): string => {
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
};

export const ParLeaderboardFull = React.memo(function ParLeaderboardFull({
  players,
  getPlayerScore,
  holes,
  currentUserId,
  testID,
}: ParLeaderboardFullProps) {
  const colors = useThemeColors();

  const leaderboardData = useMemo((): LeaderboardRow[] => {
    const rows = players.map((player) => {
      let points = 0;
      let holesCompleted = 0;

      for (const hole of holes) {
        const score = getPlayerScore(player.id, hole.number);
        if (!score) continue;
        if (!isSingleBallScore(score)) continue;

        // Pickup counts as a loss (-1) per Par-game convention.
        if (score.strokes === PICKUP_SCORE) {
          points += -1;
          holesCompleted++;
          continue;
        }

        const strokesReceived = getStrokesOnHole(player.handicap ?? 0, hole);
        points += calculateParScore(score.strokes, hole.par, strokesReceived);
        holesCompleted++;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: player.handicap ?? 0,
        position: 0,
        points,
        holesCompleted,
        isCurrentUser: player.id === currentUserId,
      };
    });

    // Higher points = better.
    rows.sort((a, b) => b.points - a.points);

    let currentPosition = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].points !== rows[i - 1].points) {
        currentPosition = i + 1;
      }
      rows[i].position = currentPosition;
    }

    return rows;
  }, [players, getPlayerScore, holes, currentUserId]);

  const maxCompletedHole = useMemo(() => {
    return Math.max(...leaderboardData.map((row) => row.holesCompleted), 0);
  }, [leaderboardData]);

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return MEDAL_COLORS.gold;
      case 2:
        return MEDAL_COLORS.silver;
      case 3:
        return MEDAL_COLORS.bronze;
      default:
        return colors.textSecondary;
    }
  };

  if (maxCompletedHole === 0 || players.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]} testID={testID}>
        <EmptyState
          title="No Scores Yet"
          message="Leaderboard standings will appear here as you complete each hole."
          icon="trophy-outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Icon source="trophy" size={24} color={colors.primary} />
          <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: spacing.sm }]}>
            Leaderboard
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
            (thru {maxCompletedHole})
          </Text>
        </View>
      </View>

      {/* Table header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.positionCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Pos</Text>
        </View>
        <View style={styles.playerCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Player</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Pts</Text>
        </View>
        <View style={styles.thruCol}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Thru</Text>
        </View>
      </View>

      {/* Rows */}
      {leaderboardData.map((row, index) => (
        <View
          key={row.playerId}
          style={[
            styles.row,
            { backgroundColor: row.isCurrentUser ? colors.primaryBackground : colors.surface },
            index < leaderboardData.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
          ]}
          accessibilityLabel={`${row.position} place: ${row.playerName}, ${formatPoints(row.points)}`}
        >
          <View style={styles.positionCol}>
            <View
              style={[
                styles.positionBadge,
                row.position <= 3 && { backgroundColor: getPositionColor(row.position) + '20' },
              ]}
            >
              <Text
                style={[
                  row.position <= 3 ? typography.bodyBold : typography.body,
                  { color: row.position <= 3 ? getPositionColor(row.position) : colors.textPrimary },
                ]}
              >
                {row.position}
              </Text>
            </View>
          </View>

          <View style={styles.playerCol}>
            <Text
              style={[
                typography.body,
                row.isCurrentUser && typography.bodyBold,
                { color: row.isCurrentUser ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {row.playerName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              HC {row.handicap}
            </Text>
          </View>

          <View style={styles.scoreCol}>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {formatPoints(row.points)}
            </Text>
          </View>

          <View style={styles.thruCol}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {row.holesCompleted}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  positionCol: {
    width: 40,
    alignItems: 'center',
  },
  playerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  scoreCol: {
    width: 60,
    alignItems: 'center',
  },
  thruCol: {
    width: 50,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
});

export default ParLeaderboardFull;
