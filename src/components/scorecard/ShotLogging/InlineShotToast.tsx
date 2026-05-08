import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import { useDeleteShot, useSetShotBunker } from '@/hooks/shots';

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
  const dismissBunkerPrompt = useShotLoggingUiStore((s) => s.dismissBunkerPrompt);
  const confirmShotPrompt = useShotLoggingUiStore((s) => s.confirmShotPrompt);
  const dismissShotPrompt = useShotLoggingUiStore((s) => s.dismissShotPrompt);
  const deleteShot = useDeleteShot();
  const setShotBunker = useSetShotBunker();

  const isBunkerPrompt = variant === 'bunkerPrompt';
  const isShotPrompt = variant === 'shotPrompt';

  useEffect(() => {
    if (!dismissAt) return;
    const remaining = dismissAt - Date.now();
    const onTimeout = isBunkerPrompt
      ? () => dismissBunkerPrompt({ confirmed: false })
      : isShotPrompt
        ? dismissShotPrompt
        : clearToast;
    if (remaining <= 0) {
      onTimeout();
      return;
    }
    const t = setTimeout(onTimeout, remaining);
    return () => clearTimeout(t);
  }, [dismissAt, clearToast, isBunkerPrompt, dismissBunkerPrompt, isShotPrompt, dismissShotPrompt]);

  const handleUndo = useCallback(() => {
    if (!lastShotId || !lastShotContext) return;
    deleteShot.mutate({
      shotId: lastShotId,
      roundId: lastShotContext.roundId,
      holeNumber: lastShotContext.holeNumber,
    });
    clearToast();
  }, [lastShotId, lastShotContext, deleteShot, clearToast]);

  const handleYes = useCallback(() => {
    if (!lastShotId) return;
    setShotBunker.mutate({ shotId: lastShotId });
    dismissBunkerPrompt({ confirmed: true });
  }, [lastShotId, setShotBunker, dismissBunkerPrompt]);

  const handleNo = useCallback(() => {
    dismissBunkerPrompt({ confirmed: false });
  }, [dismissBunkerPrompt]);

  const handleShotPromptYes = useCallback(() => {
    confirmShotPrompt();
  }, [confirmShotPrompt]);

  const handleShotPromptDismiss = useCallback(() => {
    dismissShotPrompt();
  }, [dismissShotPrompt]);

  if (!dismissAt) return null;
  if (variant === 'success' && (!lastShotId || lastSequence === null)) return null;
  if (variant === 'error' && !errorMessage) return null;
  if (variant === 'warning' && (!lastShotId || lastSequence === null)) return null;
  if (variant === 'bunkerPrompt' && !lastShotId) return null;

  const isError = variant === 'error';
  const isWarning = variant === 'warning';
  const surface = isError
    ? colors.error
    : isWarning
      ? colors.warning
      : colors.primary;
  const textColor = colors.white;

  const message = isError
    ? errorMessage
    : isWarning
      ? `Shot ${lastSequence} logged · weak GPS — tap the shot on the map to reposition`
      : isBunkerPrompt
        ? 'Was that a bunker shot?'
        : isShotPrompt
          ? 'Did you just take a shot?'
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
      {isWarning && (
        <Icon source="crosshairs-question" size={20} color={textColor} />
      )}
      <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
        {message}
      </Text>
      {isBunkerPrompt ? (
        <View style={styles.promptActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yes, that was a bunker shot"
            onPress={handleYes}
            testID="inline-shot-toast-bunker-yes"
            hitSlop={8}
            style={styles.promptButton}
          >
            <Text style={[styles.action, { color: textColor }]}>Yes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="No, not a bunker shot"
            onPress={handleNo}
            testID="inline-shot-toast-bunker-no"
            hitSlop={8}
            style={styles.promptButton}
          >
            <Text style={[styles.action, { color: textColor }]}>No</Text>
          </Pressable>
        </View>
      ) : isShotPrompt ? (
        <View style={styles.promptActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yes, log a shot now"
            onPress={handleShotPromptYes}
            testID="inline-shot-toast-shot-prompt-yes"
            hitSlop={8}
            style={styles.promptButton}
          >
            <Text style={[styles.action, { color: textColor }]}>Yes</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss shot prompt"
            onPress={handleShotPromptDismiss}
            testID="inline-shot-toast-shot-prompt-dismiss"
            hitSlop={8}
            style={styles.promptButton}
          >
            <Text style={[styles.action, { color: textColor }]}>Dismiss</Text>
          </Pressable>
        </View>
      ) : !isError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Undo shot ${lastSequence}`}
          onPress={handleUndo}
          testID="inline-shot-toast-undo"
          hitSlop={8}
        >
          <Text style={[styles.action, { color: textColor }]}>Undo</Text>
        </Pressable>
      ) : (
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
  promptActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  promptButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
