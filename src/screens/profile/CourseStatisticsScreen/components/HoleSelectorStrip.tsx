/**
 * HoleSelectorStrip - Horizontal scrolling strip of hole mini-stat cards
 */

import React, { useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { HoleStatistics } from '@/hooks/playerStatistics';

interface HoleSelectorStripProps {
  holeStats: HoleStatistics[];
  selectedHole: number;
  onSelectHole: (holeNumber: number) => void;
}

export const HoleSelectorStrip = React.memo(function HoleSelectorStrip({
  holeStats,
  selectedHole,
  onSelectHole,
}: HoleSelectorStripProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  const handlePress = useCallback(
    (holeNumber: number, index: number) => {
      onSelectHole(holeNumber);
      scrollRef.current?.scrollTo({ x: Math.max(0, index * 68 - 120), animated: true });
    },
    [onSelectHole]
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {holeStats.map((hole, index) => {
        const isSelected = hole.holeNumber === selectedHole;
        return (
          <TouchableOpacity
            key={hole.holeNumber}
            style={[
              styles.card,
              { backgroundColor: isSelected ? colors.primary : colors.surface },
              isSelected && { borderColor: colors.primaryLight },
              !isSelected && { borderColor: colors.border },
              shadows.sm,
            ]}
            onPress={() => handlePress(hole.holeNumber, index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.holeLabel, { color: isSelected ? colors.white : colors.textSecondary }]}>
              Hole
            </Text>
            <Text style={[styles.holeNumber, { color: isSelected ? colors.white : colors.textPrimary }]}>
              {hole.holeNumber}
            </Text>
            <Text style={[styles.holeMeta, { color: isSelected ? colors.white : colors.textTertiary }]}>
              Par {hole.par} · {hole.averageScore.toFixed(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  card: {
    width: 60,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  holeLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  holeNumber: {
    ...typography.h3,
    lineHeight: 24,
  },
  holeMeta: {
    ...typography.caption,
    fontSize: 9,
  },
});
