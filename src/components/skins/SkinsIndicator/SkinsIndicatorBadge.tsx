/**
 * SkinsIndicatorBadge - Touchable icon with carryover badge
 *
 * Displays a dice icon that indicates an active skins game.
 * Shows a badge with the number of carryover holes when applicable.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { borderRadius, typography, skinsColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

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

  const iconSize = size === 'sm' ? 18 : 24;
  const containerSize = size === 'sm' ? 32 : 40;

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { width: containerSize, height: containerSize },
        ]}
        testID={testID}
      >
        <ActivityIndicator size="small" color={skinsColor} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: variant === 'default' ? `${skinsColor}15` : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Skins game active${carryoverHoles > 0 ? `, ${carryoverHoles} holes carried over` : ''}`}
      accessibilityHint="Tap to view skins game summary"
      testID={testID}
    >
      <Icon source="dice-multiple" size={iconSize} color={skinsColor} />

      {/* Carryover Badge */}
      {carryoverHoles > 0 && (
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.error },
          ]}
        >
          <Text style={styles.badgeText}>{carryoverHoles}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.captionBold,
    color: '#fff',
    fontSize: 10,
  },
});
