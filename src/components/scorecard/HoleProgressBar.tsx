/**
 * HoleProgressBar Component
 *
 * Displays progress through an 18-hole round.
 * Shows current hole number and completion status.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface HoleProgressBarProps {
  currentHole: number;
  completedHoles: number;
  totalHoles?: number;
}

export const HoleProgressBar = React.memo(function HoleProgressBar({
  currentHole,
  completedHoles,
  totalHoles = 18,
}: HoleProgressBarProps) {
  const colors = useThemeColors();
  const progressPercent = (completedHoles / totalHoles) * 100;

  // Determine front/back nine status
  const isBackNine = currentHole > 9;
  const nineStatus = isBackNine ? 'Back 9' : 'Front 9';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: colors.success },
          ]}
        />
        {/* Current hole marker */}
        <View
          style={[
            styles.currentMarker,
            {
              left: `${((currentHole - 1) / totalHoles) * 100}%`,
              backgroundColor: colors.primary,
              borderColor: colors.white,
            },
          ]}
        />
      </View>

      {/* Progress Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.holeText, { color: colors.textPrimary }]}>
          Hole {currentHole} of {totalHoles}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {completedHoles} complete • {nineStatus}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.sm,
    overflow: 'visible',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  currentMarker: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    marginLeft: -8, // Center the marker
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holeText: {
    ...typography.smallBold,
  },
  statusText: {
    ...typography.caption,
  },
});

export default HoleProgressBar;
