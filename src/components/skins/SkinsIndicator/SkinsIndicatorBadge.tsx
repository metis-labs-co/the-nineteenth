/**
 * SkinsIndicatorBadge - Touchable icon with carryover badge
 *
 * Displays a dice icon that indicates an active skins game.
 * Shows a badge with the number of carryover holes when applicable.
 * Thin wrapper over the shared GameIndicatorBadge.
 */

import React from 'react';
import { useThemeColors } from '@/context/ThemeContext';
import { skinsColor } from '@/constants/theme';
import { GameIndicatorBadge } from '@/components/common/GameIndicatorBadge';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsIndicatorBadgeProps {
  /** Whether the skins game data is loading */
  isLoading: boolean;
  /** Number of consecutive carryover holes */
  carryoverHoles: number;
  /** Size variant */
  size: 'sm' | 'md';
  /** Visual variant */
  variant: 'default' | 'minimal';
  /** Callback when the indicator is pressed */
  onPress: () => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsIndicatorBadge = React.memo(function SkinsIndicatorBadge({
  isLoading,
  carryoverHoles,
  size,
  variant,
  onPress,
  testID,
}: SkinsIndicatorBadgeProps) {
  const colors = useThemeColors();

  return (
    <GameIndicatorBadge
      isLoading={isLoading}
      color={skinsColor}
      icon="dice-multiple"
      size={size}
      variant={variant}
      onPress={onPress}
      accessibilityLabel={`Skins game active${carryoverHoles > 0 ? `, ${carryoverHoles} holes carried over` : ''}`}
      accessibilityHint="Tap to view skins game summary"
      badge={
        carryoverHoles > 0
          ? { backgroundColor: colors.error, content: carryoverHoles }
          : null
      }
      testID={testID}
    />
  );
});
