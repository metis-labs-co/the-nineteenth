/**
 * DetailedStatsBadges - Summary pills showing entered detailed stats inline on StatsRow
 *
 * Displays compact badges for: fairway miss direction, green miss direction,
 * bunker count, and hazard types. Only shows badges for stats that have data.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { HoleScore } from '@/types/database/base';

const HAZARD_LABELS: Record<string, string> = {
  water: '\u{1F4A7}',
  ob: 'OB',
  lateral: '\u{1F534}',
  lost_ball: '?',
};

interface DetailedStatsBadgesProps {
  score: HoleScore | undefined;
  /** Whether to show fairway miss direction badge */
  showFairwayMissDirection: boolean;
  /** Whether to show green miss direction badge */
  showGreenMissDirection: boolean;
  /** Whether to show bunker badge */
  showBunkerShots: boolean;
  /** Whether to show hazard badges */
  showHazards: boolean;
}

export const DetailedStatsBadges = React.memo(function DetailedStatsBadges({
  score,
  showFairwayMissDirection,
  showGreenMissDirection,
  showBunkerShots,
  showHazards,
}: DetailedStatsBadgesProps) {
  const colors = useThemeColors();

  if (!score) return null;

  const badges: { label: string; color: string; bgColor: string }[] = [];

  // Fairway miss direction
  if (showFairwayMissDirection && score.fairwayHit === false && score.fairwayMissDirection) {
    const dir = score.fairwayMissDirection === 'left' ? '\u2B05 L' : 'R \u27A1';
    badges.push({ label: dir, color: colors.warning, bgColor: colors.warning + '20' });
  }

  // Green miss direction
  if (showGreenMissDirection && score.greenInRegulation === false && score.greenMissDirection) {
    const dirMap = { left: 'L', right: 'R', long: 'Lo', short: 'Sh' };
    badges.push({
      label: dirMap[score.greenMissDirection],
      color: colors.warning,
      bgColor: colors.warning + '20',
    });
  }

  // Bunker shots
  if (showBunkerShots && score.bunkerShots && score.bunkerShots > 0) {
    badges.push({
      label: `${score.bunkerShots}\u{1F3D6}`,
      color: colors.warning,
      bgColor: colors.warning + '20',
    });
  }

  // Hazards
  if (showHazards && score.hazards && score.hazards.length > 0) {
    for (const hazard of score.hazards) {
      badges.push({
        label: HAZARD_LABELS[hazard.type] || hazard.type,
        color: colors.error,
        bgColor: colors.error + '20',
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      {badges.map((badge, index) => (
        <View
          key={index}
          style={[styles.badge, { backgroundColor: badge.bgColor }]}
        >
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
});
