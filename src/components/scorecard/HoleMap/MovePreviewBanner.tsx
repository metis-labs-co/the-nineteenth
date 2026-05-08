import React, { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { metersToYards } from '@/utils/gpsCalculations';

interface MovePreviewBannerProps {
  /** Human-friendly shot number (1-based) being moved. Used to build the
   *  default row label "Shot N". Ignored when `shotLabel` is provided. */
  shotNumber: number;
  /** Optional override for the moved-shot row label (e.g. "Distance" when
   *  there's only one shot in scope, like the bag-shot detail screen). */
  shotLabel?: string;
  /** Distance the shot travelled before the move, in metres. `null` when no prior anchor. */
  movedOriginal: number | null;
  /** Candidate new distance for the moved shot, in metres. `null` when no prior anchor. */
  movedNew: number | null;
  /** Shot number of the next shot whose distance also changes; `null` when none. */
  nextShotNumber: number | null;
  /** Original distance for the next shot, in metres. */
  nextOriginal: number | null;
  /** Candidate new distance for the next shot, in metres. */
  nextNew: number | null;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  /** Display unit for distances. Defaults to yards (matches the scoring UI). */
  distanceUnit?: 'yards' | 'metres';
}

function buildDistanceFormatter(
  unit: 'yards' | 'metres'
): (meters: number | null) => string {
  if (unit === 'metres') {
    return (m) => (m === null ? '—' : `${Math.round(m)}m`);
  }
  return (m) => (m === null ? '—' : `${Math.round(metersToYards(m))}y`);
}

export const MovePreviewBanner = React.memo(function MovePreviewBanner({
  shotNumber,
  shotLabel,
  movedOriginal,
  movedNew,
  nextShotNumber,
  nextOriginal,
  nextNew,
  onSave,
  onCancel,
  isSaving,
  distanceUnit = 'yards',
}: MovePreviewBannerProps) {
  const colors = useThemeColors();
  const showNextRow = nextShotNumber !== null;
  const formatDistance = useMemo(
    () => buildDistanceFormatter(distanceUnit),
    [distanceUnit]
  );

  return (
    <View
      style={[styles.container, shadows.lg, { backgroundColor: colors.surface }]}
      pointerEvents="box-none"
      testID="move-preview-banner"
    >
      <View style={styles.rows}>
        <DistanceRow
          label={shotLabel ?? `Shot ${shotNumber}`}
          original={movedOriginal}
          next={movedNew}
          color={colors.textPrimary}
          subColor={colors.textSecondary}
          formatDistance={formatDistance}
        />
        {showNextRow && (
          <DistanceRow
            label={`Shot ${nextShotNumber}`}
            original={nextOriginal}
            next={nextNew}
            color={colors.textPrimary}
            subColor={colors.textSecondary}
            formatDistance={formatDistance}
          />
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel move"
          onPress={onCancel}
          disabled={isSaving}
          style={[
            styles.button,
            styles.cancelButton,
            { borderColor: colors.border },
            isSaving && styles.buttonDisabled,
          ]}
          testID="move-preview-cancel"
        >
          <Icon source="close" size={18} color={colors.textPrimary} />
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save new shot position"
          onPress={onSave}
          disabled={isSaving}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            isSaving && styles.buttonDisabled,
          ]}
          testID="move-preview-save"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Icon source="check" size={18} color={colors.white} />
          )}
          <Text style={[styles.buttonText, { color: colors.white }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
});
MovePreviewBanner.displayName = 'MovePreviewBanner';

interface DistanceRowProps {
  label: string;
  original: number | null;
  next: number | null;
  color: string;
  subColor: string;
  formatDistance: (m: number | null) => string;
}

const DistanceRow = React.memo(function DistanceRow({
  label,
  original,
  next,
  color,
  subColor,
  formatDistance,
}: DistanceRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <View style={styles.rowValues}>
        <Text style={[styles.rowOriginal, { color: subColor }]}>
          {formatDistance(original)}
        </Text>
        <Icon source="arrow-right" size={14} color={subColor} />
        <Text style={[styles.rowNew, { color }]}>{formatDistance(next)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  rows: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  rowValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowOriginal: {
    ...typography.body,
    textDecorationLine: 'line-through',
  },
  rowNew: {
    ...typography.body,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
