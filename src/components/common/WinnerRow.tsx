// src/components/common/WinnerRow.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconCrown, IconTrophy } from '@tabler/icons-react-native';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

/**
 * Winner information to display
 */
export interface WinnerInfo {
  /** Winner's name (player name or team name) */
  name: string;
  /** Total points/score the winner accumulated */
  points: number;
  /** Whether the winner is a team */
  isTeam: boolean;
}

export interface WinnerRowProps {
  /**
   * Winner information to display
   */
  winner: WinnerInfo;
  /**
   * Label for the points display (default: "pts")
   */
  pointsLabel?: string;
  /**
   * Size variant (default: "md")
   */
  size?: 'sm' | 'md';
  /**
   * Optional test ID for testing
   */
  testID?: string;
}

// Gold/orange colors for winner display
const WINNER_COLORS = {
  text: '#b45309', // Amber 700 - dark amber/gold for excellent readability
  textDark: '#fbbf24', // Amber 400 - bright gold for dark mode
  background: '#fef3c7', // Amber 100 - very light cream/gold background
  backgroundDark: '#451a03', // Amber 950 - dark amber for dark mode
  icon: '#d97706', // Amber 600 - slightly brighter for icon
  iconDark: '#f59e0b', // Amber 500 - bright for dark mode
} as const;

/**
 * WinnerRow - Displays competition or round winner with trophy styling
 *
 * Shows the winner's name and points/score in a gold-themed row.
 * Can display either individual player or team winners.
 *
 * @example
 * ```tsx
 * // Competition card usage
 * <WinnerRow
 *   winner={{ name: "John Smith", points: 156, isTeam: false }}
 *   pointsLabel="pts"
 * />
 *
 * // Round card with different scoring
 * <WinnerRow
 *   winner={{ name: "Team Alpha", points: 42, isTeam: true }}
 *   pointsLabel="stableford"
 *   size="sm"
 * />
 * ```
 */
export const WinnerRow = React.memo(function WinnerRow({
  winner,
  pointsLabel = 'pts',
  size = 'md',
  testID,
}: WinnerRowProps) {
  const _colors = useThemeColors();
  const isDark = useIsDark();

  const textColor = isDark ? WINNER_COLORS.textDark : WINNER_COLORS.text;
  const backgroundColor = isDark ? WINNER_COLORS.backgroundDark : WINNER_COLORS.background;
  const iconColor = isDark ? WINNER_COLORS.iconDark : WINNER_COLORS.icon;

  const IconComponent = winner.isTeam ? IconTrophy : IconCrown;
  const iconSize = size === 'sm' ? 14 : 16;
  const textStyle = size === 'sm' ? styles.winnerTextSm : styles.winnerText;
  const pointsStyle = size === 'sm' ? styles.winnerPointsSm : styles.winnerPoints;
  const containerStyle = size === 'sm' ? styles.containerSm : styles.container;

  return (
    <View
      style={[containerStyle, { backgroundColor }]}
      testID={testID}
      accessibilityLabel={`Winner: ${winner.name} with ${winner.points} ${pointsLabel}`}
      accessibilityRole="text"
    >
      <IconComponent size={iconSize} color={iconColor} />
      <Text style={[textStyle, { color: textColor }]} numberOfLines={1}>
        {winner.name}
      </Text>
      <Text style={[pointsStyle, { color: textColor }]}>
        {winner.points} {pointsLabel}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  containerSm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  winnerText: {
    ...typography.small,
    fontWeight: '600',
    flex: 1,
  },
  winnerTextSm: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  winnerPoints: {
    ...typography.small,
    fontWeight: '700',
  },
  winnerPointsSm: {
    ...typography.caption,
    fontWeight: '700',
  },
});

export default WinnerRow;
