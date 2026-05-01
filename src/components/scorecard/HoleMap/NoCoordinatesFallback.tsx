import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface NoCoordinatesFallbackProps {
  onRequestBackfill: () => void;
}

export function NoCoordinatesFallback({ onRequestBackfill }: NoCoordinatesFallbackProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, shadows.lg, { backgroundColor: colors.surface }]}>
      <Icon source="crosshairs-off" size={32} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        No map data for this hole
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        We don&apos;t have GPS coordinates for this hole yet. Try fetching them from
        our course data partner.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try fetching coordinates"
        onPress={onRequestBackfill}
        style={[styles.cta, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.ctaText, { color: colors.white }]}>
          Try fetching coordinates
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  body: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    ...typography.body,
    fontWeight: '600',
  },
});
