// src/components/common/HeroCard.tsx
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, spacing } from '@/constants/theme';

export type HeroCardVariant = 'green' | 'gold' | 'blue';

export interface HeroCardProps {
  /** Gradient colorway. @default 'green' */
  variant?: HeroCardVariant;
  /**
   * Soft radial glow in the top-right corner
   * ('green' | 'gold' | 'none'). @default 'none'
   */
  glow?: 'green' | 'gold' | 'none';
  /** Inner padding. @default spacing.lg + 2 (18) */
  padding?: number;
  /** Container style override (margins etc.) */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Dark gradient hero card from the Competition Details redesign.
 *
 * Deliberately renders the same deep-green (or gold/blue) gradient in BOTH
 * light and dark themes — it is a fixed dark surface, so content placed
 * inside must use explicit light-on-dark colors (see heroPalette) rather
 * than theme tokens.
 */
export function HeroCard({
  variant = 'green',
  glow = 'none',
  padding = spacing.lg + 2,
  style,
  testID,
  children,
}: HeroCardProps) {
  const gradient = GRADIENTS[variant];

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.card, { padding }, style]}
      testID={testID}
    >
      {glow !== 'none' && (
        <View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: GLOWS[glow] }]}
        />
      )}
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

const GRADIENTS: Record<HeroCardVariant, [string, string]> = {
  green: ['#1f2a19', '#131a0f'],
  gold: ['#3a2f0e', '#241d08'],
  blue: ['#1c2c48', '#0f1728'],
};

const GLOWS: Record<'green' | 'gold', string> = {
  green: 'rgba(139,194,110,0.16)',
  gold: 'rgba(240,193,75,0.14)',
};

/**
 * Fixed light-on-dark colors for content inside a HeroCard.
 * These intentionally do not come from the theme palette — the card is the
 * same dark surface in both themes.
 */
export const heroPalette = {
  /** Primary text on the dark card */
  text: '#ffffff',
  /** Uppercase eyebrow / label text */
  eyebrowGreen: '#a7c98d',
  eyebrowGold: '#e6c76a',
  eyebrowBlue: '#9db6d8',
  /** Muted supporting text */
  mutedGreen: '#8ba079',
  mutedGold: '#b39a4d',
  mutedBlue: '#9db1cf',
  /** Softer status line text */
  statusGreen: '#93a385',
  /** Gold accent (trophy / winnings) */
  gold: '#f2cf5c',
  goldBright: '#f6d55c',
  /** Tinted icon squares on hero cards */
  iconTintBlue: 'rgba(120,165,220,0.18)',
  iconTintGold: 'rgba(242,207,92,0.18)',
  /** Track behind progress bars on the dark card */
  track: 'rgba(255,255,255,0.09)',
  /** Divider / marker lines */
  marker: 'rgba(255,255,255,0.4)',
} as const;

/**
 * Blue CTA gradient used on hero cards (fixed in both themes, like the
 * hero gradients above).
 */
export const heroCtaBlueGradient: [string, string] = ['#4f82c8', '#2d5aa0'];

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -34,
    right: -24,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  content: {
    position: 'relative',
  },
});

export default HeroCard;
