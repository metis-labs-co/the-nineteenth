/**
 * WolfIndicatorBadge - Touchable icon badge for Wolf game status
 *
 * Displays a dog icon with optional decision badge (Lone Wolf / Blind Wolf).
 * Shows a loading spinner while the Wolf game data is loading.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, typography, wolfColor } from '@/constants/theme';

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

  const iconSize = size === 'sm' ? 18 : 24;
  const containerSize = size === 'sm' ? 32 : 40;

  // Don't render if no active Wolf game and not loading
  if (!hasWolfGame && !isLoading) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { width: containerSize, height: containerSize },
        ]}
        testID={testID}
      >
        <ActivityIndicator size="small" color={wolfColor} />
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
          backgroundColor: variant === 'default' ? `${wolfColor}15` : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Wolf game active${currentWolfName ? `, ${currentWolfName} is Wolf` : ''}`}
      accessibilityHint="Tap to view Wolf game summary"
      testID={testID}
    >
      <Icon source="dog-side" size={iconSize} color={wolfColor} />

      {/* Badge showing decision status */}
      {hasDecision && isLoneOrBlind && (
        <View
          style={[
            styles.badge,
            { backgroundColor: isBlindWolf ? colors.warning : wolfColor },
          ]}
        >
          <Text style={styles.badgeText}>
            {isBlindWolf ? '🔥' : 'L'}
          </Text>
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
