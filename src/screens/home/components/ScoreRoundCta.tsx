/**
 * ScoreRoundCta — the Home screen's primary "score a round" action, restyled
 * per the "The Nineteenth - Polished" design (HOME L96-106): green gradient
 * card, translucent icon square, title + subtitle, trailing chevron.
 *
 * Purely presentational — the copy, accessibility label, and onPress wiring
 * match the FeatureButton this replaces on Home.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { IconChevronRight, IconPlus } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';

/** Design gradient for the "Score a round" CTA — fixed in both themes. */
const CTA_GRADIENT = ['#7cbd57', '#5f9a3f'] as const;

interface ScoreRoundCtaProps {
  onPress: () => void;
}

export function ScoreRoundCta({ onPress }: ScoreRoundCtaProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Score new round"
      style={styles.container}
    >
      <LinearGradient
        colors={[...CTA_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconSquare}>
          <IconPlus size={24} color={colors.white} strokeWidth={2.5} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.white }]}>
            Score Social Round
          </Text>
          <Text style={styles.subtitle}>
            Start scoring a round at any course
          </Text>
        </View>
        <IconChevronRight size={20} color={colors.white} strokeWidth={2.2} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl + 2,
    ...shadows.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    padding: spacing.lg,
    borderRadius: borderRadius.xl + 2,
    minHeight: 72,
  },
  iconSquare: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.lg + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
});

export default ScoreRoundCta;
