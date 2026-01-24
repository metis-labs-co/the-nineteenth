/**
 * HoleHeader Component
 *
 * Displays current hole information with navigation:
 * - Chevron arrows to navigate between holes
 * - Hole number (compact display)
 * - Par value
 * - Stroke Index
 * - Optional yardage
 *
 * Super admins can tap on the details section to edit hole data.
 *
 * This component composes several sub-components:
 * - HoleNavigationButton: Navigation chevrons
 * - HoleNumberDisplay: Hole label and number
 * - HoleDetailsSection: Par, stroke index, and distance display
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFormattedDistance } from '@/store/settingsStore';
import { resolveTeeYardageKey } from '@/utils/holeTransformers';
import { HoleNavigationButton } from './HoleNavigationButton';
import { HoleNumberDisplay } from './HoleNumberDisplay';
import { HoleDetailsSection } from './HoleDetailsSection';
import type { Hole } from '@/types';

export interface HoleHeaderProps {
  hole: Hole;
  selectedTee?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onHolePress?: () => void;
  /** Whether the user is a super admin (enables edit functionality) */
  isSuperAdmin?: boolean;
  /** Callback when super admin taps to edit hole data */
  onEditHole?: () => void;
}

export const HoleHeader = React.memo(function HoleHeader({
  hole,
  selectedTee = 'white',
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  onHolePress,
  isSuperAdmin = false,
  onEditHole,
}: HoleHeaderProps) {
  const colors = useThemeColors();
  const { formatDistance } = useFormattedDistance();

  // Resolve the tee key - handles hex colors (e.g., "#00ccff" → "blue") and normalizes names
  const resolvedTeeKey = useMemo(() => resolveTeeYardageKey(selectedTee), [selectedTee]);

  // Look up yardage using resolved key, with fallback to original selectedTee for backwards compatibility
  const yardage = hole.yardages?.[resolvedTeeKey] ?? hole.yardages?.[selectedTee];
  const formattedDistance = yardage ? formatDistance(yardage) : undefined;
  const canEditHole = isSuperAdmin && !!onEditHole;

  // Debug logging in development
  if (__DEV__ && hole.number === 1) {
    console.log('[HoleHeader] Yardage lookup:', {
      holeNumber: hole.number,
      selectedTee,
      resolvedTeeKey,
      availableYardageKeys: hole.yardages ? Object.keys(hole.yardages) : [],
      yardage,
      formattedDistance,
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <HoleNavigationButton
        direction="previous"
        onPress={onPrevious}
        disabled={!canGoPrevious}
      />

      <HoleNumberDisplay
        holeNumber={hole.number}
        onPress={onHolePress}
      />

      <HoleNavigationButton
        direction="next"
        onPress={onNext}
        disabled={!canGoNext}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <HoleDetailsSection
        hole={hole}
        formattedDistance={formattedDistance}
        canEdit={canEditHole}
        onEditHole={onEditHole}
      />
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
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.md,
  },
});
