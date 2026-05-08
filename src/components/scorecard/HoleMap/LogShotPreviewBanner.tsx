/**
 * LogShotPreviewBanner — confirm-shot banner for the HoleMap `log-shot` mode.
 *
 * Mirrors `MovePreviewBanner` styling. Shown after the user taps to place
 * a candidate shot position. Surfaces the distance from the prior anchor
 * (last shot or tee), and adapts its CTA when the new shot would push
 * the score above the entered stroke count for an in-progress hole.
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { metersToYards } from '@/utils/gpsCalculations';

interface LogShotPreviewBannerProps {
  /** 1-based sequence number this candidate shot will receive on save. */
  shotNumber: number;
  /** Distance from prior shot (or tee anchor) to the candidate position. `null` when no prior anchor. */
  distanceMeters: number | null;
  /**
   * When true, saving will push the shot count above the entered stroke
   * count for this hole. The Save CTA renames to "Save & bump score" and
   * a helper line explains.
   */
  isAboveCap: boolean;
  /** Saving is in flight (mutation pending OR strokes-bump pending). */
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  /** Display unit for distances. Defaults to yards (matches the scoring UI). */
  distanceUnit?: 'yards' | 'metres';
}

function formatDistance(
  meters: number | null,
  unit: 'yards' | 'metres'
): string {
  if (meters === null) return '—';
  if (unit === 'metres') return `${Math.round(meters)}m`;
  return `${Math.round(metersToYards(meters))}y`;
}

export const LogShotPreviewBanner = React.memo(function LogShotPreviewBanner({
  shotNumber,
  distanceMeters,
  isAboveCap,
  isSaving,
  onCancel,
  onSave,
  distanceUnit = 'yards',
}: LogShotPreviewBannerProps) {
  const colors = useThemeColors();
  const distanceLabel = useMemo(
    () => formatDistance(distanceMeters, distanceUnit),
    [distanceMeters, distanceUnit]
  );

  return (
    <View
      style={[styles.container, shadows.lg, { backgroundColor: colors.surface }]}
      pointerEvents="box-none"
      testID="log-shot-preview-banner"
    >
      <View style={styles.rows}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
            Shot {shotNumber}
          </Text>
          <View style={styles.rowValues}>
            <Text style={[styles.rowDistance, { color: colors.textPrimary }]}>
              {distanceLabel}
            </Text>
          </View>
        </View>
        {isAboveCap && (
          <Text
            style={[styles.helper, { color: colors.warningDark ?? colors.warning }]}
          >
            This will push your score for the hole up by one.
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel new shot"
          onPress={onCancel}
          disabled={isSaving}
          style={[
            styles.button,
            styles.cancelButton,
            { borderColor: colors.border },
            isSaving && styles.buttonDisabled,
          ]}
          testID="log-shot-preview-cancel"
        >
          <Icon source="close" size={18} color={colors.textPrimary} />
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isAboveCap ? 'Save shot and bump score' : 'Save shot'}
          onPress={onSave}
          disabled={isSaving}
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            isSaving && styles.buttonDisabled,
          ]}
          testID="log-shot-preview-save"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Icon source="check" size={18} color={colors.white} />
          )}
          <Text style={[styles.buttonText, { color: colors.white }]}>
            {isAboveCap ? 'Save & bump score' : 'Save shot'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});
LogShotPreviewBanner.displayName = 'LogShotPreviewBanner';

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
  rowDistance: {
    ...typography.body,
    fontWeight: '700',
  },
  helper: {
    ...typography.small,
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
