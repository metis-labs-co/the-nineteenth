import React, { useCallback, useState } from 'react';
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
import { clearSyncQueue, manualSync } from '@/services/offline/sync';
import { markAllForResync } from '@/services/offline/database';
import { PageHeader } from '@/components/common/PageHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DeveloperScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const [isClearing, setIsClearing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleResetDefaults = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

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
    }
  }, [dismissDialog, showAlert]);

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
});
