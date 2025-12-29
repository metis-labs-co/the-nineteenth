/**
 * AILoadingState - Loading state display for AI generation
 *
 * Shows animated progress ring, dots animation, and step checklist
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

const LOADING_STEPS = [
  'Analyzing your requirements',
  'Configuring competition settings',
  'Finalizing details',
];

interface AILoadingStateProps {
  spin: Animated.AnimatedInterpolation<string>;
  dotOpacity1: Animated.Value;
  dotOpacity2: Animated.Value;
  dotOpacity3: Animated.Value;
  loadingStep: number;
}

export function AILoadingState({
  spin,
  dotOpacity1,
  dotOpacity2,
  dotOpacity3,
  loadingStep,
}: AILoadingStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Circular progress with sparkle */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressRing, { borderColor: colors.gray200 }]} />
        <Animated.View
          style={[
            styles.progressRingActive,
            {
              borderColor: colors.primary,
              transform: [{ rotate: spin }],
            },
          ]}
        />
        <View style={styles.sparkleContainer}>
          <Icon source="creation" size={32} color={colors.primary} />
        </View>
      </View>

      {/* Generating title with animated dots */}
      <View style={styles.generatingTitleContainer}>
        <Text style={[styles.generatingTitle, { color: colors.textPrimary }]}>
          Generating
        </Text>
        <View style={styles.dotsContainer}>
          <Animated.Text
            style={[
              styles.dot,
              { color: colors.textPrimary, opacity: dotOpacity1 },
            ]}
          >
            .
          </Animated.Text>
          <Animated.Text
            style={[
              styles.dot,
              { color: colors.textPrimary, opacity: dotOpacity2 },
            ]}
          >
            .
          </Animated.Text>
          <Animated.Text
            style={[
              styles.dot,
              { color: colors.textPrimary, opacity: dotOpacity3 },
            ]}
          >
            .
          </Animated.Text>
        </View>
      </View>

      <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
        Creating your competition with AI
      </Text>

      {/* Loading steps checklist */}
      <View style={styles.stepsContainer}>
        {LOADING_STEPS.map((step, index) => {
          const isCompleted = loadingStep > index;
          const isActive = loadingStep === index;
          const isPending = loadingStep < index;

          return (
            <View key={step} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIndicator,
                  isCompleted && { borderColor: colors.success },
                  isActive && { borderColor: colors.primary },
                  isPending && { borderColor: colors.gray300 },
                ]}
              >
                {isCompleted && (
                  <Icon source="check" size={14} color={colors.success} />
                )}
              </View>
              <Text
                style={[
                  styles.stepText,
                  {
                    color: isPending
                      ? colors.textTertiary
                      : isActive
                        ? colors.primary
                        : colors.success,
                  },
                ]}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  progressContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    borderWidth: 3,
  },
  progressRingActive: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  sparkleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatingTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    width: 24,
  },
  dot: {
    ...typography.h3,
    fontWeight: '700',
  },
  loadingSubtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  stepsContainer: {
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    ...typography.body,
  },
});
