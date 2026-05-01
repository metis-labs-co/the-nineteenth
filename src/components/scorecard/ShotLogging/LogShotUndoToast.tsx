import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { useDeleteShot } from '@/hooks/shots';

interface LogShotUndoToastProps {
  /** Bottom safe-area / chrome inset. The toast sits 16dp above this. */
  bottomInset?: number;
}

/** Layout constants shared with LogShotFAB so the FAB can shift up cleanly. */
export const TOAST_BASE_BOTTOM = 16;
export const TOAST_HEIGHT = 56;
export const TOAST_FAB_GAP = 12;

export const LogShotUndoToast = React.memo(function LogShotUndoToast({
  bottomInset = 0,
}: LogShotUndoToastProps) {
  const colors = useThemeColors();
  const variant = useShotLoggingUiStore((s) => s.variant);
  const lastShotId = useShotLoggingUiStore((s) => s.lastShotId);
  const lastSequence = useShotLoggingUiStore((s) => s.lastSequence);
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
  // Solid surface — slightly elevated grey for success, error tone for error.
  const surface = isError ? colors.error : (colors.gray900 ?? colors.textPrimary);
  const textColor = colors.white;
  const actionColor = isError ? colors.white : (colors.primaryLight ?? colors.white);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: TOAST_BASE_BOTTOM + bottomInset }]}
    >
      <View
        style={[
          styles.toast,
          shadows.lg,
          { backgroundColor: surface, height: TOAST_HEIGHT },
        ]}
      >
        {isError && (
          <Icon source="alert-circle-outline" size={20} color={textColor} />
        )}
        <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
          {isError ? errorMessage : `Shot ${lastSequence} logged`}
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
    left: spacing.md,
    right: spacing.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  message: {
    ...typography.body,
    fontWeight: '500',
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
