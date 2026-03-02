/**
 * ExpandablePlayerCard - PlayerCard with expandable quick stats and compare button
 *
 * Wraps the existing PlayerCard with an expandable section showing:
 * - Quick stat chips (rounds played, avg score, best score)
 * - Compare button (feature-gated to Premium for filtered comparison)
 *
 * Uses LayoutAnimation for smooth expand/collapse.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PlayerCard, type PlayerCardData, type BadgeConfig } from './PlayerCard';
import { FeatureLockButton } from '@/components/subscription/FeatureLockButton';
import type { UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface ExpandablePlayerCardStats {
  roundsPlayed: number;
  avgScore: number | null;
  bestScore: number | null;
  avgDifferential?: number | null;
}

export interface ExpandablePlayerCardProps {
  player: PlayerCardData;
  stats?: ExpandablePlayerCardStats;
  badge?: BadgeConfig;
  isCurrentUser?: boolean;
  onCompare?: () => void;
  variant?: 'card' | 'list-item';
}

const UPGRADE_CONFIG: UpgradePromptConfig = {
  feature: 'compare_stats_filtered',
  title: 'Filtered Stats Comparison',
  message: 'Upgrade to Premium to compare stats within a specific league or competition.',
  targetTier: 'premium',
  benefits: [
    'Compare stats within leagues',
    'Compare stats within competitions',
    'See head-to-head performance',
    'Detailed filtered breakdowns',
  ],
};

export const ExpandablePlayerCard = React.memo(function ExpandablePlayerCard({
  player,
  stats,
  badge,
  isCurrentUser = false,
  onCompare,
  variant = 'card',
}: ExpandablePlayerCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  // Current user doesn't get expand functionality
  if (isCurrentUser) {
    return (
      <PlayerCard
        player={player}
        badge={badge}
        variant={variant}
        showEmail={false}
        showHandicap={false}
      />
    );
  }

  return (
    <View>
      <PlayerCard
        player={player}
        badge={badge}
        variant={variant}
        showEmail={false}
        showHandicap={false}
        navigateToProfile={false}
        onPress={handleToggle}
        rightAction={
          <Icon
            source={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.gray400}
          />
        }
      />

      {expanded && (
        <View style={[styles.expandedSection, { backgroundColor: colors.surfaceVariant }]}>
          {/* Quick stat chips */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stats.roundsPlayed}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rounds</Text>
              </View>

              <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stats.avgScore != null ? stats.avgScore.toFixed(1) : '-'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {stats.avgDifferential !== undefined ? 'Avg Diff' : 'Avg Score'}
                </Text>
              </View>

              <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stats.bestScore != null ? stats.bestScore.toFixed(1) : '-'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {stats.avgDifferential !== undefined ? 'Best Diff' : 'Best'}
                </Text>
              </View>
            </View>
          )}

          {/* Compare button */}
          {onCompare && (
            <FeatureLockButton
              feature="compare_stats_filtered"
              onPress={onCompare}
              onUpgradePress={handleUpgrade}
              upgradeConfig={UPGRADE_CONFIG}
              showLockBadge={false}
              accessibilityLabel={`Compare stats with ${player.name}`}
            >
              <View style={[styles.compareButton, { backgroundColor: colors.primary }]}>
                <Icon source="chart-bar" size={16} color={colors.white} />
                <Text style={[styles.compareButtonText, { color: colors.white }]}>Compare</Text>
              </View>
            </FeatureLockButton>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  expandedSection: {
    marginTop: -spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statValue: {
    ...typography.bodyBold,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 36,
    borderRadius: borderRadius.md,
  },
  compareButtonText: {
    ...typography.smallBold,
  },
});

export default ExpandablePlayerCard;
