/**
 * GrossNetToggle - segmented control for switching scoring between
 * gross strokes and handicap-adjusted net strokes.
 *
 * Only affects categories in the Scoring group. Rendered conditionally
 * by the parent StatsTab when the competition has a handicap-based format.
 *
 * Delegates to the shared SegmentedButton for consistent sub-tab styling.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import type { ScoringMode } from '@/hooks/competitionStatistics';

export interface GrossNetToggleProps {
  value: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}

export const GrossNetToggle = React.memo(function GrossNetToggle({
  value,
  onChange,
}: GrossNetToggleProps) {
  return (
    <SegmentedButton<ScoringMode>
      value={value}
      onValueChange={onChange}
      buttons={[
        { value: 'gross', label: 'Gross' },
        { value: 'net', label: 'Net' },
      ]}
      size="small"
      style={styles.toggle}
    />
  );
});

const styles = StyleSheet.create({
  toggle: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
});

export default GrossNetToggle;
