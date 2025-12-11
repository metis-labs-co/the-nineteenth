/**
 * HoleHeader Component
 *
 * Displays current hole information with navigation:
 * - Chevron arrows to navigate between holes
 * - Hole number (compact display)
 * - Par value
 * - Stroke Index
 * - Optional yardage
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFormattedDistance } from '@/store/settingsStore';
import type { Hole } from '@/types';

interface HoleHeaderProps {
  hole: Hole;
  selectedTee?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onHolePress?: () => void;
}

export const HoleHeader = React.memo(function HoleHeader({
  hole,
  selectedTee = 'white',
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  onHolePress,
}: HoleHeaderProps) {
  const colors = useThemeColors();
  const { formatDistance, unit } = useFormattedDistance();
  const yardage = hole.yardages?.[selectedTee];
  const formattedDistance = yardage ? formatDistance(yardage) : undefined;
  const distanceLabel = unit === 'metres' ? 'm' : 'y';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Left Chevron */}
      <TouchableOpacity
        onPress={onPrevious}
        disabled={!canGoPrevious || !onPrevious}
        style={[styles.chevronButton, (!canGoPrevious || !onPrevious) && styles.chevronDisabled]}
        accessibilityLabel="Previous hole"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoPrevious }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconChevronLeft
          size={28}
          color={colors.textPrimary}
          style={(!canGoPrevious || !onPrevious) ? { opacity: 0.3 } : undefined}
        />
      </TouchableOpacity>

      {/* Hole Number Section */}
      <TouchableOpacity
        style={styles.holeSection}
        onPress={onHolePress}
        disabled={!onHolePress}
        accessibilityLabel={`Hole ${hole.number}, tap to view full scorecard`}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.holeLabel, { color: colors.textSecondary }]}>HOLE</Text>
        <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>{hole.number}</Text>
      </TouchableOpacity>

      {/* Right Chevron */}
      <TouchableOpacity
        onPress={onNext}
        disabled={!canGoNext || !onNext}
        style={[styles.chevronButton, (!canGoNext || !onNext) && styles.chevronDisabled]}
        accessibilityLabel="Next hole"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoNext }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconChevronRight
          size={28}
          color={colors.textPrimary}
          style={(!canGoNext || !onNext) ? { opacity: 0.3 } : undefined}
        />
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Details Section */}
      <View style={styles.detailsContainer}>
        {/* Par */}
        <View style={styles.detailItem}>
          <View style={[styles.parBadge, { backgroundColor: colors.par }]}>
            <Text style={[styles.parText, { color: colors.white }]}>{hole.par}</Text>
          </View>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>PAR</Text>
        </View>

        {/* Stroke Index */}
        <View style={styles.detailItem}>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{hole.strokeIndex}</Text>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>SI</Text>
        </View>

        {/* Distance (if available) */}
        {formattedDistance && (
          <View style={styles.detailItem}>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formattedDistance}</Text>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{distanceLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  chevronButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronDisabled: {
    opacity: 0.4,
  },
  holeSection: {
    alignItems: 'center',
    minWidth: 56,
  },
  holeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  holeNumber: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.md,
  },
  detailsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  detailItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...typography.h4,
    fontWeight: '700',
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
});

export default HoleHeader;
