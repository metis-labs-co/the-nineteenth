/**
 * DetailedStatsBadges - Summary pills showing entered detailed stats inline on StatsRow
 *
 * Displays compact badges for bunker count and hazard types.
 * Fairway/green miss directions are shown inside the FIR/GIR buttons instead.
 * Only shows badges for stats that have data.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconShovel, IconDroplet, IconBan, IconCircleOff, IconQuestionMark } from '@tabler/icons-react-native';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { HoleScore } from '@/types/database/base';

const HAZARD_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  water: IconDroplet,
  ob: IconBan,
  lateral: IconCircleOff,
  lost_ball: IconQuestionMark,
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
  showBunkerShots,
  showHazards,
}: DetailedStatsBadgesProps) {
  const colors = useThemeColors();

  if (!score) return null;

  const hasBunkers = showBunkerShots && score.bunkerShots && score.bunkerShots > 0;
  const hasHazards = showHazards && score.hazards && score.hazards.length > 0;

  if (!hasBunkers && !hasHazards) return null;

  return (
    <View style={styles.container}>
      {/* Bunker shots */}
      {hasBunkers && (
        <View style={[styles.badge, { backgroundColor: colors.warning + '20' }]}>
          <IconShovel size={10} color={colors.warning} />
          <Text style={[styles.badgeText, { color: colors.warning }]}>
            {score.bunkerShots}
          </Text>
        </View>
      )}

      {/* Hazards */}
      {hasHazards && score.hazards!.map((hazard, index) => {
        const HazardIcon = HAZARD_ICONS[hazard.type];
        return (
          <View
            key={index}
            style={[styles.badge, { backgroundColor: colors.error + '20' }]}
          >
            {HazardIcon && <HazardIcon size={10} color={colors.error} />}
          </View>
        );
      })}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
