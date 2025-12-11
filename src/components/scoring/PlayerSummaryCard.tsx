// src/components/scoring/PlayerSummaryCard.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';
import { spacing, borderRadius, shadows, typography } from '@constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getScoreColor } from '@/utils/scoring';
import { formatRelativeToPar, formatPosition } from '@/utils/formatting';

export interface PlayerSummaryData {
  playerId: string;
  playerName: string;
  handicap?: number;
  photoUrl?: string;
  grossTotal: number;
  netTotal: number;
  stablefordPoints: number;
  coursePar: number; // Total par for played holes (e.g., 72 for 18 holes)
  holesPlayed: number;
}

interface PlayerSummaryCardProps {
  data: PlayerSummaryData;
  position?: number; // Leaderboard position (1st, 2nd, etc.)
  isCurrentUser?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Get position suffix (1st, 2nd, 3rd, 4th, etc.)
 */
function getPositionSuffix(position: number): string {
  if (position >= 11 && position <= 13) return 'th';
  switch (position % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * PlayerSummaryCard - Displays per-player scoring summary
 *
 * Shows gross total, net total, Stableford points, and position relative to par.
 * Uses golf-specific colors from design tokens.
 */
export default function PlayerSummaryCard({
  data,
  position,
  isCurrentUser = false,
  onPress,
  style,
}: PlayerSummaryCardProps) {
  const colors = useThemeColors();

  const {
    playerName,
    handicap,
    photoUrl,
    grossTotal,
    netTotal,
    stablefordPoints,
    coursePar,
    holesPlayed,
  } = data;

  const scoreColor = getScoreColor(grossTotal, coursePar);
  const netScoreColor = getScoreColor(netTotal, coursePar);
  const relativeToPar = formatRelativeToPar(grossTotal - coursePar);

  // Get initials for avatar fallback
  const initials = playerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        isCurrentUser && {
          borderWidth: 2,
          borderColor: colors.primary,
          backgroundColor: colors.primaryLighter + '10', // 10% opacity
        },
        style,
      ]}
      onPress={onPress}
      accessibilityLabel={`${playerName} score summary. Gross ${grossTotal}, Net ${netTotal}, ${stablefordPoints} Stableford points`}
      accessibilityRole="button"
      accessibilityHint={onPress ? 'Tap to view detailed scorecard' : undefined}
    >
      <Card.Content style={styles.content}>
        {/* Left: Position + Avatar + Name */}
        <View style={styles.leftSection}>
          {position !== undefined && (
            <View style={styles.positionContainer}>
              <Text style={[styles.positionNumber, { color: colors.textPrimary }]}>
                {position}
              </Text>
              <Text style={[styles.positionSuffix, { color: colors.textSecondary }]}>
                {getPositionSuffix(position)}
              </Text>
            </View>
          )}

          {photoUrl ? (
            <Avatar.Image
              size={44}
              source={{ uri: photoUrl }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={44}
              label={initials}
              style={styles.avatar}
              labelStyle={[styles.avatarLabel, { color: colors.textInverse }]}
            />
          )}

          <View style={styles.playerInfo}>
            <Text
              style={[
                styles.playerName,
                { color: isCurrentUser ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {playerName}
              {isCurrentUser && ' (You)'}
            </Text>
            {handicap !== undefined && (
              <Text style={[styles.handicap, { color: colors.textSecondary }]}>
                HC: {handicap}
              </Text>
            )}
            <Text style={[styles.holesPlayed, { color: colors.textDisabled }]}>
              {holesPlayed} holes
            </Text>
          </View>
        </View>

        {/* Right: Score Summary */}
        <View style={styles.rightSection}>
          {/* Stableford Points - Primary metric */}
          <View style={[styles.stablefordContainer, { backgroundColor: colors.primary }]}>
            <Text style={[styles.stablefordPoints, { color: colors.textInverse }]}>
              {stablefordPoints}
            </Text>
            <Text style={[styles.stablefordLabel, { color: colors.textInverse }]}>
              pts
            </Text>
          </View>

          {/* Score Grid */}
          <View style={styles.scoreGrid}>
            {/* Gross Score */}
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                Gross
              </Text>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>
                {grossTotal}
              </Text>
            </View>

            {/* Net Score */}
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                Net
              </Text>
              <Text style={[styles.scoreValue, { color: netScoreColor }]}>
                {netTotal}
              </Text>
            </View>

            {/* Relative to Par */}
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                vs Par
              </Text>
              <Text style={[styles.relativeScore, { color: scoreColor }]}>
                {relativeToPar}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    ...shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },

  // Left section
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: spacing.sm,
    minWidth: 32,
  },
  positionNumber: {
    ...typography.h3,
  },
  positionSuffix: {
    ...typography.caption,
  },
  avatar: {
    marginRight: spacing.sm,
  },
  avatarLabel: {
    ...typography.smallBold,
  },
  playerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playerName: {
    ...typography.bodyBold,
  },
  handicap: {
    ...typography.caption,
  },
  holesPlayed: {
    ...typography.caption,
  },

  // Right section
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stablefordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    minWidth: 56,
  },
  stablefordPoints: {
    ...typography.h2,
    fontWeight: '700',
  },
  stablefordLabel: {
    ...typography.caption,
    opacity: 0.8,
  },

  // Score grid
  scoreGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreItem: {
    alignItems: 'center',
    minWidth: 44,
  },
  scoreLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  scoreValue: {
    ...typography.bodyBold,
  },
  relativeScore: {
    ...typography.smallBold,
  },
});

// Export types for external use
export type { PlayerSummaryCardProps };
