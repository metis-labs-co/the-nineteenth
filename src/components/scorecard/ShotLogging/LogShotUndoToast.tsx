import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { useDeleteShot } from '@/hooks/shots';

interface LogShotUndoToastProps {
  /** Bottom safe-area / chrome inset. The toast sits 16dp above this. */
  bottomInset?: number;
}

/**
 * Sits flush on top of the scorecard footer. The footer is:
 *   paddingTop (8) + button content (48) + paddingBottom (64) = 120dp
 * (paddingBottom includes the home-indicator safe area, so we use a
 * single screen-relative number here rather than mixing in
 * useSafeAreaInsets and double-counting.)
 */
export const TOAST_BASE_BOTTOM = 120;
export const TOAST_HEIGHT = 56;
export const TOAST_FAB_GAP = 16;

export const LogShotUndoToast = React.memo(function LogShotUndoToast({
  bottomInset = 0,
}: LogShotUndoToastProps) {
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
  // Solid surface — primary green for success, solid error red for error.
  const surface = isError ? colors.error : colors.primary;
  const textColor = colors.white;
  const actionColor = colors.white;

  const message = isError
    ? errorMessage
    : lastFromBunker
      ? `Bunker shot ${lastSequence} logged`
      : `Shot ${lastSequence} logged`;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: TOAST_BASE_BOTTOM + bottomInset }]}
    >
      <View style={[styles.toast, { backgroundColor: surface, height: TOAST_HEIGHT }]}>
        {isError && <Icon source="alert-circle-outline" size={20} color={textColor} />}
        <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
          {message}
        </Text>
        {!isError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Undo shot ${lastSequence}`}
            onPress={handleUndo}
            testID="log-shot-undo-button"
            hitSlop={8}
          >
            <Text style={[styles.action, { color: actionColor }]}>Undo</Text>
          </Pressable>
        )}
        {isError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={clearToast}
            testID="log-shot-error-dismiss"
            hitSlop={8}
          >
            <Text style={[styles.action, { color: actionColor }]}>Dismiss</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
