import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { useDeleteShot } from '@/hooks/shots';

/**
 * Inline shot-logging banner. Mount this in the scorecard layout
 * directly under the hole header so it sticks to the bottom edge of
 * that section. Pushes the rest of the content down when visible
 * (it's part of normal flow — no absolute positioning).
 *
 * Reads from `shotLoggingUiStore`. Renders nothing when there's no
 * active toast.
 */
export const InlineShotToast = React.memo(function InlineShotToast() {
  const colors = useThemeColors();
  const variant = useShotLoggingUiStore((s) => s.variant);
  const lastShotId = useShotLoggingUiStore((s) => s.lastShotId);
  const lastSequence = useShotLoggingUiStore((s) => s.lastSequence);
  const lastFromBunker = useShotLoggingUiStore((s) => s.lastFromBunker);
  const lastShotContext = useShotLoggingUiStore((s) => s.lastShotContext);
  const errorMessage = useShotLoggingUiStore((s) => s.errorMessage);
  const dismissAt = useShotLoggingUiStore((s) => s.dismissAt);
  const clearToast = useShotLoggingUiStore((s) => s.clearToast);
  const deleteShot = useDeleteShot();

  useEffect(() => {
    if (!dismissAt) return;
    const remaining = dismissAt - Date.now();
    if (remaining <= 0) {
      clearToast();
      return;
    }
    const t = setTimeout(clearToast, remaining);
    return () => clearTimeout(t);
  }, [dismissAt, clearToast]);

  const handleUndo = useCallback(() => {
    if (!lastShotId || !lastShotContext) return;
    deleteShot.mutate({
      shotId: lastShotId,
      roundId: lastShotContext.roundId,
      holeNumber: lastShotContext.holeNumber,
    });
    clearToast();
  }, [lastShotId, lastShotContext, deleteShot, clearToast]);

  if (!dismissAt) return null;
  if (variant === 'success' && (!lastShotId || lastSequence === null)) return null;
  if (variant === 'error' && !errorMessage) return null;

  const isError = variant === 'error';
  const surface = isError ? colors.error : colors.primary;
  const textColor = colors.white;

  const message = isError
    ? errorMessage
    : lastFromBunker
      ? `Bunker shot ${lastSequence} logged`
      : `Shot ${lastSequence} logged`;

  return (
    <View
      style={[styles.banner, { backgroundColor: surface }]}
      testID="inline-shot-toast"
    >
      {isError && (
        <Icon source="alert-circle-outline" size={20} color={textColor} />
      )}
      <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
        {message}
      </Text>
      {!isError && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Undo shot ${lastSequence}`}
          onPress={handleUndo}
          testID="inline-shot-toast-undo"
          hitSlop={8}
        >
          <Text style={[styles.action, { color: textColor }]}>Undo</Text>
        </Pressable>
      )}
      {isError && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={clearToast}
          testID="inline-shot-toast-dismiss"
          hitSlop={8}
        >
          <Text style={[styles.action, { color: textColor }]}>Dismiss</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 48,
  },
  message: {
    ...typography.body,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  action: {
    ...typography.body,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
