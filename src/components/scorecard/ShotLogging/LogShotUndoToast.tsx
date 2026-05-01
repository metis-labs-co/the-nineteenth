import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
  const { lastShotId, lastSequence, lastShotContext, dismissAt } =
    useShotLoggingUiStore();
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

  if (!lastShotId || lastSequence === null) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: 168 + bottomInset }]}
    >
      <View style={[styles.toast, shadows.lg, { backgroundColor: colors.surface }]}>
        <Text style={[styles.message, { color: colors.textPrimary }]}>
          Shot {lastSequence} logged
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Undo shot ${lastSequence}`}
          onPress={handleUndo}
          testID="log-shot-undo-button"
        >
          <Text style={[styles.action, { color: colors.primary }]}>Undo</Text>
        </Pressable>
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
    gap: spacing.lg,
  },
  message: {
    ...typography.body,
  },
  action: {
    ...typography.body,
    fontWeight: '600',
  },
});
