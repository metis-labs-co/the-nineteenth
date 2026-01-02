/**
 * HoleDetailsSection Component
 *
 * Displays hole details: par badge, stroke index, and distance.
 * For super admins, this section is tappable to edit hole data.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole } from '@/types';

interface ParBadgeProps {
  par: number;
}

const ParBadge = React.memo(function ParBadge({ par }: ParBadgeProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.parBadge, { backgroundColor: colors.par }]}>
      <Text style={[styles.parText, { color: colors.white }]}>{par}</Text>
    </View>
  );
});

interface StrokeIndexDisplayProps {
  strokeIndex: number;
}

const StrokeIndexDisplay = React.memo(function StrokeIndexDisplay({
  strokeIndex,
}: StrokeIndexDisplayProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.siContainer}>
      <Text style={[styles.siPrefix, { color: colors.textSecondary }]}>SI </Text>
      <Text style={[styles.siValue, { color: colors.textPrimary }]}>{strokeIndex}</Text>
    </View>
  );
});

interface DistanceDisplayProps {
  /** Formatted distance string (already includes unit, e.g., "502m" or "450yd") */
  distance?: string;
  showEditIndicator?: boolean;
  showAddButton?: boolean;
}

const DistanceDisplay = React.memo(function DistanceDisplay({
  distance,
  showEditIndicator = false,
  showAddButton = false,
}: DistanceDisplayProps) {
  const colors = useThemeColors();

  if (showAddButton) {
    return (
      <View style={styles.addContainer}>
        <View style={[styles.addDistanceBadge, { backgroundColor: colors.surfaceVariant }]}>
          <Icon source="plus" size={16} color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!distance) {
    return null;
  }

  if (showEditIndicator) {
    return (
      <View style={styles.distanceWithEdit}>
        <Text style={[styles.distanceValue, { color: colors.textPrimary }]}>
          {distance}
        </Text>
        <Icon source="pencil" size={12} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Text style={[styles.distanceValue, { color: colors.textPrimary }]}>
      {distance}
    </Text>
  );
});

export interface HoleDetailsSectionProps {
  hole: Hole;
  /** Formatted distance string (already includes unit, e.g., "502m" or "450yd") */
  formattedDistance?: string;
  canEdit?: boolean;
  onEditHole?: () => void;
}

export const HoleDetailsSection = React.memo(function HoleDetailsSection({
  hole,
  formattedDistance,
  canEdit = false,
  onEditHole,
}: HoleDetailsSectionProps) {
  const colors = useThemeColors();

  const content = (
    <>
      <ParBadge par={hole.par} />
      <StrokeIndexDisplay strokeIndex={hole.strokeIndex} />
      <DistanceDisplay
        distance={formattedDistance}
        showEditIndicator={canEdit && !!formattedDistance}
        showAddButton={canEdit && !formattedDistance}
      />
    </>
  );

  if (canEdit && onEditHole) {
    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface }]}
        onPress={onEditHole}
        activeOpacity={0.7}
        accessibilityLabel={`Edit hole ${hole.number} data`}
        accessibilityRole="button"
        accessibilityHint="Opens editor for par, stroke index, and yardage"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  parBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parText: {
    fontSize: 16,
    fontWeight: '700',
  },
  siContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  siPrefix: {
    fontSize: 14,
    fontWeight: '500',
  },
  siValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  distanceWithEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addContainer: {
    alignItems: 'center',
  },
  addDistanceBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
