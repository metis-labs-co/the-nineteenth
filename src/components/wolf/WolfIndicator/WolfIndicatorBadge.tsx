/**
 * WolfIndicatorBadge - Touchable icon badge for Wolf game status
 *
 * Displays a dog icon with optional decision badge (Lone Wolf / Blind Wolf).
 * Shows a loading spinner while the Wolf game data is loading.
 * Thin wrapper over the shared GameIndicatorBadge.
 */

import React from 'react';
import { useThemeColors } from '@/context/ThemeContext';
import { wolfColor } from '@/constants/theme';
import { GameIndicatorBadge } from '@/components/common/GameIndicatorBadge';

// ============================================================================
// TYPES
// ============================================================================

interface WolfIndicatorBadgeProps {
  /** Whether the Wolf game data is still loading */
  isLoading: boolean;
  /** Whether the Wolf game exists */
  hasWolfGame: boolean;
  /** Current Wolf player name (for accessibility) */
  currentWolfName?: string;
  /** Whether current hole has a decision */
  hasDecision: boolean;
  /** Whether current decision is lone wolf or blind wolf */
  isLoneOrBlind: boolean;
  /** Whether current decision is blind wolf specifically */
  isBlindWolf: boolean;
  /** Size variant */
  size: 'sm' | 'md';
  /** Visual variant */
  variant: 'default' | 'minimal';
  /** Press handler */
  onPress: () => void;
  /** Test ID */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfIndicatorBadge = React.memo(function WolfIndicatorBadge({
  isLoading,
  hasWolfGame,
  currentWolfName,
  hasDecision,
  isLoneOrBlind,
  isBlindWolf,
  size,
  variant,
  onPress,
  testID,
}: WolfIndicatorBadgeProps) {
  const colors = useThemeColors();

  return (
    <GameIndicatorBadge
      isLoading={isLoading}
      hidden={!hasWolfGame}
      color={wolfColor}
      icon="dog-side"
      size={size}
      variant={variant}
      onPress={onPress}
      accessibilityLabel={`Wolf game active${currentWolfName ? `, ${currentWolfName} is Wolf` : ''}`}
      accessibilityHint="Tap to view Wolf game summary"
      badge={
        hasDecision && isLoneOrBlind
          ? {
              backgroundColor: isBlindWolf ? colors.warning : wolfColor,
              content: isBlindWolf ? '🔥' : 'L',
            }
          : null
      }
      testID={testID}
    />
  );
});
