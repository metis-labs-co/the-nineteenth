/**
 * GameIndicatorBadge - shared touchable icon badge for side-game indicators
 * (Skins, Wolf). Renders a coloured icon in a rounded container with an
 * optional corner badge, plus a loading state. The Wolf/Skins indicators are
 * thin wrappers that supply the icon, colour, accessibility copy, and badge.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { borderRadius, typography } from '@/constants/theme';

export interface GameIndicatorBadgeProps {
  /** Whether the game data is still loading (shows a spinner). */
  isLoading: boolean;
  /** Theme colour for the icon / container tint / spinner. */
  color: string;
  /** react-native-paper Icon source name (e.g. 'dog-side', 'dice-multiple'). */
  icon: string;
  size: 'sm' | 'md';
  variant: 'default' | 'minimal';
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  /** Corner badge; omit/undefined to render no badge. */
  badge?: { backgroundColor: string; content: React.ReactNode } | null;
  /** When true and not loading, render nothing (e.g. no active game). */
  hidden?: boolean;
  testID?: string;
}

export const GameIndicatorBadge = React.memo(function GameIndicatorBadge({
  isLoading,
  color,
  icon,
  size,
  variant,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  badge,
  hidden = false,
  testID,
}: GameIndicatorBadgeProps) {
  const iconSize = size === 'sm' ? 18 : 24;
  const containerSize = size === 'sm' ? 32 : 40;

  if (hidden && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <View
        style={[styles.container, { width: containerSize, height: containerSize }]}
        testID={testID}
      >
        <ActivityIndicator size="small" color={color} />
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
          backgroundColor: variant === 'default' ? `${color}15` : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      <Icon source={icon} size={iconSize} color={color} />

      {badge && (
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={styles.badgeText}>{badge.content}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

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

export default GameIndicatorBadge;
