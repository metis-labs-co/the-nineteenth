import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { GolfBallLoader, ConfirmationDialog, SectionHeader } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import {
  clearSyncQueue,
  manualSync,
  listFailedSyncs,
  discardFailedSync,
  retryFailedSyncs,
} from '@/services/offline/sync';
import { markAllForResync } from '@/services/offline/database';
import { PageHeader } from '@/components/common/PageHeader';
import { formatDateDisplay } from '@/utils/formatting';
import type { PendingSync } from '@/types';
import { roundEndIntentRoundId } from '@/services/offline/dao/pendingSyncRecovery';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Human-readable identity for a retained failure.
 *
 * Queued scorecard payloads carry the player they belong to, which is far more
 * useful than the row id when deciding whether a stuck upload still matters.
 */
function describeFailedSync(sync: PendingSync): string {
  if (sync.endIntentRead) {
    const roundId = roundEndIntentRoundId(sync.entityKey);
    return `End round · ${roundId ? `${roundId.slice(0, 8)}…` : 'unknown round'}`;
  }
  if (sync.type !== 'scorecard' || !sync.data) return `${sync.type} · ${sync.action}`;

  const playerName = sync.data.player?.name;
  const roundId = sync.data.roundId ? `${sync.data.roundId.slice(0, 8)}…` : 'unknown round';
  return playerName ? `${playerName} · round ${roundId}` : `Round ${roundId}`;
}

function formatAttemptedAt(date: Date | null | undefined): string {
  if (!date) return 'never attempted';
  return `last tried ${formatDateDisplay(date, {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export default function DeveloperScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const [isClearing, setIsClearing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [failedSyncs, setFailedSyncs] = useState<PendingSync[]>([]);
  const [isLoadingFailures, setIsLoadingFailures] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleResetDefaults = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  const loadFailedSyncs = useCallback(async () => {
    try {
      setFailedSyncs(await listFailedSyncs());
    } catch (error) {
      console.error('[Developer] Failed to read retained sync failures:', error);
      setFailedSyncs([]);
    } finally {
      setIsLoadingFailures(false);
    }
  }, []);

  useEffect(() => {
    loadFailedSyncs();
  }, [loadFailedSyncs]);

  const handleRetryFailed = useCallback(async () => {
    setIsRetrying(true);
    try {
      await retryFailedSyncs();
    } catch (error) {
      console.error('[Developer] Retry of retained failures failed:', error);
    } finally {
      setIsRetrying(false);
      await loadFailedSyncs();
    }
  }, [loadFailedSyncs]);

  const handleDiscardFailure = useCallback(
    (sync: PendingSync) => {
      if (sync.id == null) return;
      showDialog({
        title: 'Discard Upload',
        message: `"${describeFailedSync(sync)}" will not be uploaded and its queued copy will be deleted. Scores already on the server are unaffected.`,
        confirmLabel: 'Discard',
        confirmVariant: 'destructive',
        icon: 'delete-outline',
        onConfirm: async () => {
          dismissDialog();
          try {
            await discardFailedSync(sync.id!);
          } catch (error) {
            console.error('[Developer] Failed to discard retained sync:', error);
            showAlert('Error', 'Could not discard that upload. Please try again.');
          } finally {
            await loadFailedSyncs();
          }
        },
      });
    },
    [showDialog, dismissDialog, showAlert, loadFailedSyncs]
  );

  const performClearSyncQueue = useCallback(async () => {
    dismissDialog();
    setIsClearing(true);
    try {
      const result = await clearSyncQueue();
      showAlert(
        'Sync Queue Cleared',
        `Cleared ${result.pendingCleared} pending syncs and ${result.invalidCleared} invalid entries.`
      );
    } catch (error) {
      showAlert('Error', 'Failed to clear sync queue. Please try again.');
      console.error('[Developer] Failed to clear sync queue:', error);
    } finally {
      setIsClearing(false);
      await loadFailedSyncs();
    }
  }, [dismissDialog, showAlert, loadFailedSyncs]);

  const handleClearSyncQueue = useCallback(() => {
    showDialog({
      title: 'Clear Sync Queue',
      message: 'This will clear all pending sync operations and remove any invalid data. Your saved scores will not be affected.',
      confirmLabel: 'Clear',
      confirmVariant: 'destructive',
      icon: 'sync-off',
      onConfirm: performClearSyncQueue,
    });
  }, [showDialog, performClearSyncQueue]);

  const performResyncScores = useCallback(async () => {
    dismissDialog();
    setIsResyncing(true);
    try {
      const count = await markAllForResync();
      if (count > 0) {
        await manualSync();
        showAlert('Re-sync Complete', `${count} scorecard(s) queued for re-sync. FIR/GIR data will be restored.`);
      } else {
        showAlert('Nothing to Re-sync', 'All scorecards are already up to date.');
      }
    } catch (error) {
      showAlert('Error', 'Failed to re-sync scores. Please try again.');
      console.error('[Developer] Failed to re-sync scores:', error);
    } finally {
      setIsResyncing(false);
    }
  }, [dismissDialog, showAlert]);

  const handleResyncScores = useCallback(() => {
    showDialog({
      title: 'Re-sync All Scores',
      message: 'This will re-upload all completed scorecards from your device. Scorecards with fewer holes than the server version will be skipped to prevent data loss.',
      confirmLabel: 'Re-sync',
      icon: 'sync',
      onConfirm: performResyncScores,
    });
  }, [showDialog, performResyncScores]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Developer"
        showBack
        onBack={handleBack}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        {/* Reset Section */}
        <View style={styles.section}>
          <SectionHeader title="Settings" description="Reset all app settings to their default values" />
          <TouchableOpacity
            onPress={handleResetDefaults}
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.errorLight },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset settings to defaults"
          >
            <Icon source="refresh" size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Troubleshooting Section */}
        <View style={styles.section}>
          <SectionHeader title="Troubleshooting" description="If you're experiencing sync issues, clearing the sync queue may help." />
          <TouchableOpacity
            onPress={handleClearSyncQueue}
            disabled={isClearing}
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.gray300 },
              isClearing && styles.actionButtonDisabled,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Clear sync queue"
          >
            {isClearing ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Icon source="sync-off" size={20} color={colors.textSecondary} />
            )}
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
              {isClearing ? 'Clearing...' : 'Clear Sync Queue'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleResyncScores}
            disabled={isResyncing}
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, borderColor: colors.gray300, marginTop: spacing.sm },
              isResyncing && styles.actionButtonDisabled,
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Re-sync all scores"
          >
            {isResyncing ? (
              <GolfBallLoader size="sm" />
            ) : (
              <Icon source="sync" size={20} color={colors.textSecondary} />
            )}
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
              {isResyncing ? 'Re-syncing...' : 'Re-sync All Scores'}
            </Text>
          </TouchableOpacity>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Retained Failures Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Retained Uploads"
            description="Score uploads that gave up after repeated failures. They are never retried automatically, and stay here until they succeed or you discard them."
          />

          {isLoadingFailures ? (
            <View style={styles.failureEmpty}>
              <GolfBallLoader size="sm" />
            </View>
          ) : failedSyncs.length === 0 ? (
            <View style={[styles.failureEmpty, { backgroundColor: colors.surface }]}>
              <Icon source="check-circle-outline" size={20} color={colors.success} />
              <Text style={[styles.failureEmptyText, { color: colors.textSecondary }]}>
                Nothing stuck — every score has been uploaded.
              </Text>
            </View>
          ) : (
            <>
              {failedSyncs.map((sync) => (
                <View
                  key={sync.id}
                  style={[
                    styles.failureRow,
                    { backgroundColor: colors.surface, borderColor: colors.gray300 },
                  ]}
                >
                  <View style={styles.failureDetail}>
                    <Text style={[styles.failureTitle, { color: colors.textPrimary }]}>
                      {describeFailedSync(sync)}
                    </Text>
                    <Text style={[styles.failureMeta, { color: colors.textSecondary }]}>
                      {formatAttemptedAt(sync.lastAttemptAt)} · {sync.retryCount} attempt
                      {sync.retryCount === 1 ? '' : 's'}
                    </Text>
                    {!!sync.lastError && (
                      <Text
                        style={[styles.failureError, { color: colors.error }]}
                        numberOfLines={3}
                      >
                        {sync.lastError}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDiscardFailure(sync)}
                    style={styles.failureDiscard}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Discard upload for ${describeFailedSync(sync)}`}
                  >
                    <Icon source="delete-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={handleRetryFailed}
                disabled={isRetrying}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.surface, borderColor: colors.gray300, marginTop: spacing.sm },
                  isRetrying && styles.actionButtonDisabled,
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Retry retained uploads"
              >
                {isRetrying ? (
                  <GolfBallLoader size="sm" />
                ) : (
                  <Icon source="sync" size={20} color={colors.textSecondary} />
                )}
                <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                  {isRetrying ? 'Retrying...' : 'Retry All'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  divider: {
    marginVertical: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    ...typography.bodyBold,
  },
  failureEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  failureEmptyText: {
    ...typography.body,
    flexShrink: 1,
  },
  failureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  failureDetail: {
    flex: 1,
    gap: spacing.xxs,
  },
  failureTitle: {
    ...typography.bodyBold,
  },
  failureMeta: {
    ...typography.caption,
  },
  failureError: {
    ...typography.caption,
  },
  failureDiscard: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
