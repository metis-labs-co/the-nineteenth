import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { useDeleteShot } from '@/hooks/shots';

interface LogShotUndoToastProps {
  bottomInset?: number;
}

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

  // Nothing to show.
  if (!dismissAt) return null;
  if (variant === 'success' && (!lastShotId || lastSequence === null)) return null;
  if (variant === 'error' && !errorMessage) return null;

  const isError = variant === 'error';
  const surface = isError ? (colors.errorLight ?? colors.surface) : colors.surface;
  const textColor = isError ? (colors.errorDark ?? colors.textPrimary) : colors.textPrimary;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: 168 + bottomInset }]}
    >
      <View style={[styles.toast, shadows.lg, { backgroundColor: surface }]}>
        {isError && (
          <Icon source="alert-circle-outline" size={18} color={colors.error} />
        )}
        <Text style={[styles.message, { color: textColor }]}>
          {isError ? errorMessage : `Shot ${lastSequence} logged`}
        </Text>
        {!isError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Undo shot ${lastSequence}`}
            onPress={handleUndo}
            testID="log-shot-undo-button"
          >
            <Text style={[styles.action, { color: colors.primary }]}>Undo</Text>
          </Pressable>
        )}
        {isError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={clearToast}
            testID="log-shot-error-dismiss"
          >
            <Text style={[styles.action, { color: colors.textSecondary }]}>Dismiss</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    minWidth: 220,
    gap: spacing.md,
  },
  message: {
    ...typography.body,
    flex: 1,
  },
  action: {
    ...typography.body,
    fontWeight: '600',
  },
});
