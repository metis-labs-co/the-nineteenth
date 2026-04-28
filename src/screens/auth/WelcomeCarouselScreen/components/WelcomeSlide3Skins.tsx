import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, skinsColor } from '@/constants/theme';
import { WelcomeSlide } from './WelcomeSlide';

interface WelcomeSlide3SkinsProps {
  onGetStarted: () => void;
  onLogIn: () => void;
}

export function WelcomeSlide3Skins({
  onGetStarted,
  onLogIn,
}: WelcomeSlide3SkinsProps) {
  const colors = useThemeColors();

  return (
    <WelcomeSlide
      illustration={
        <View
          style={[
            styles.iconBubble,
            { backgroundColor: `${skinsColor}22` },
          ]}
        >
          <Icon source="cash-multiple" size={72} color={skinsColor} />
        </View>
      }
      headline="Play for skins, skip the maths"
      body="Automatic payout calculations and settlement — no more post-round arguments about who owes what."
      footer={
        <View style={styles.ctas}>
          <TouchableOpacity
            onPress={onGetStarted}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            accessibilityHint="Create a new account"
          >
            <Text style={[styles.primaryLabel, { color: colors.white }]}>
              Get Started
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogIn}
            style={styles.secondaryButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="I already have an account"
            accessibilityHint="Sign in to your existing account"
          >
            <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconBubble: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctas: {
    gap: spacing.sm,
  },
  primaryButton: {
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    ...typography.bodyBold,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  secondaryLabel: {
    ...typography.smallBold,
  },
});

export default WelcomeSlide3Skins;
