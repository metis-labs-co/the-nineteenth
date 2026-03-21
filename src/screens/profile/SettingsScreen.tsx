/**
 * SettingsScreen - User preferences and app settings
 *
 * Allows users to configure:
 * - Theme mode (light/dark/system)
 * - Distance units (yards/metres)
 * - Push notification preferences
 * - GPS distance-to-pin display during scoring
 * - Which stats to show in scoring entry (putts, FIR, GIR)
 * - These settings affect leaderboards, stats, and scorecard entry
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Switch, Icon, Divider } from 'react-native-paper';
import { GolfBallLoader, ConfirmationDialog, SectionHeader } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { RadioButtonOption } from './components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, ThemeMode } from '@/constants/theme';
import { useTheme, useThemeColors } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useBiometricSetting } from '@/store/settingsStore';
import { clearSyncQueue, manualSync } from '@/services/offline/sync';
import { markAllForResync } from '@/services/offline/database';
import { PageHeader } from '@/components/common/PageHeader';
import { FeatureLockToggle } from '@/components/subscription/FeatureLockToggle';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { biometricService } from '@/services/biometric';
import type { BiometricAvailability } from '@/services/biometric';

import type { ColorPalette } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ColorPalette;
}

const SettingRow = React.memo(function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  colors,
}: SettingRowProps) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.gray100 }]}>
      <View style={styles.settingRowLeft}>
        <Icon source={icon} size={20} color={colors.gray600} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
          {description && (
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        color={colors.primary}
        accessibilityLabel={`Toggle ${label}`}
        accessibilityHint={description}
      />
    </View>
  );
});

interface ThemeModeOptionProps {
  mode: ThemeMode;
  label: string;
  icon: string;
  isSelected: boolean;
  onSelect: () => void;
  colors: ColorPalette;
}

const ThemeModeOption = React.memo(function ThemeModeOption({
  mode: _mode,
  label,
  icon,
  isSelected,
  onSelect,
  colors,
}: ThemeModeOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.themeModeOption,
        { backgroundColor: colors.surface, borderColor: colors.gray200 },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLighter + '20' },
      ]}
      activeOpacity={0.7}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Use ${label} theme`}
    >
      <Icon source={icon} size={24} color={isSelected ? colors.primary : colors.textSecondary} />
      <Text
        style={[
          styles.themeModeLabel,
          { color: colors.textSecondary },
          isSelected && { color: colors.primary },
        ]}
      >
        {label}
      </Text>
      {isSelected && (
        <View style={[styles.themeModeCheck, { backgroundColor: colors.primary }]}>
          <Icon source="check" size={12} color={colors.surface} />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [isClearing, setIsClearing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  // Dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // Get theme colors and mode
  const colors = useThemeColors();
  const { themeMode, setThemeMode } = useTheme();
  const { isSuperAdmin } = useSubscription();

  // Get settings from store
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);
  const _showGpsDistance = useSettingsStore((state) => state.showGpsDistance);

  // Get actions from store
  const setDistanceUnit = useSettingsStore((state) => state.setDistanceUnit);
  const setShowPutts = useSettingsStore((state) => state.setShowPutts);
  const setShowFairwayHit = useSettingsStore((state) => state.setShowFairwayHit);
  const setShowGreenInRegulation = useSettingsStore((state) => state.setShowGreenInRegulation);
  const _setShowGpsDistance = useSettingsStore((state) => state.setShowGpsDistance);
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  // Biometric settings
  const { biometricEnabled, setBiometricEnabled } = useBiometricSetting();
  const [biometricAvailability, setBiometricAvailability] = useState<BiometricAvailability | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    biometricService.checkAvailability().then(setBiometricAvailability);
  }, []);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      if (value) {
        // Verify biometric works before enabling
        const result = await biometricService.authenticate(
          'Confirm your identity to enable biometric lock'
        );
        if (result.success) {
          // Store current refresh token for session recovery
          if (session?.refresh_token) {
            await biometricService.storeRefreshToken(session.refresh_token);
          }
          setBiometricEnabled(true);
        }
        // If cancelled or failed, toggle stays off (no action needed)
      } else {
        await biometricService.clearStoredRefreshToken();
        setBiometricEnabled(false);
      }
    } finally {
      setIsToggling(false);
    }
  }, [session, setBiometricEnabled, isToggling]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleResetDefaults = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  // Perform the actual clear operation
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
      console.error('[Settings] Failed to clear sync queue:', error);
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

  // Re-sync all scorecards (backfill FIR/GIR data that was previously stripped)
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
      console.error('[Settings] Failed to re-sync scores:', error);
    } finally {
      setIsResyncing(false);
    }
  }, [dismissDialog, showAlert]);

  const handleResyncScores = useCallback(() => {
    showDialog({
      title: 'Re-sync All Scores',
      message: 'This will re-upload all scorecards from your device to restore any missing FIR/GIR data. This is safe and will not delete any scores.',
      confirmLabel: 'Re-sync',
      icon: 'sync',
    onConfirm: performResyncScores,
    });
  }, [showDialog, performResyncScores]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Settings"
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
        {/* Appearance Section */}
        <View style={styles.section}>
          <SectionHeader title="Appearance" description="Choose your preferred theme" />
          <View style={styles.themeModeOptions}>
            <ThemeModeOption
              mode="light"
              label="Light"
              icon="white-balance-sunny"
              isSelected={themeMode === 'light'}
              onSelect={() => setThemeMode('light')}
              colors={colors}
            />
            <ThemeModeOption
              mode="dark"
              label="Dark"
              icon="moon-waning-crescent"
              isSelected={themeMode === 'dark'}
              onSelect={() => setThemeMode('dark')}
              colors={colors}
            />
            <ThemeModeOption
              mode="system"
              label="System"
              icon="cellphone-cog"
              isSelected={themeMode === 'system'}
              onSelect={() => setThemeMode('system')}
              colors={colors}
            />
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Distance Units Section */}
        <View style={styles.section}>
          <SectionHeader title="Distance Units" description="Choose how distances are displayed throughout the app" />
          <View style={styles.distanceOptions}>
            <View style={styles.distanceOptionWrapper}>
              <RadioButtonOption
                label="Metres"
                description="Metric measurement (international standard)"
                selected={distanceUnit === 'metres'}
                onSelect={() => setDistanceUnit('metres')}
                icon="ruler"
                testID="distance-option-metres"
              />
            </View>
            <View style={styles.distanceOptionWrapper}>
              <RadioButtonOption
                label="Yards"
                description="Imperial measurement (US standard)"
                selected={distanceUnit === 'yards'}
                onSelect={() => setDistanceUnit('yards')}
                icon="ruler"
                testID="distance-option-yards"
              />
            </View>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Scoring Entry Section */}
        <View style={styles.section}>
          <SectionHeader title="Scoring Entry" description="Choose which additional stats to track when entering scores. These will also appear in leaderboards and statistics." />
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
            <SettingRow
              icon="golf-tee"
              label="Putts"
              description="Track number of putts per hole"
              value={showPutts}
              onValueChange={setShowPutts}
              colors={colors}
            />
            <FeatureLockToggle
              feature="fir_gir_tracking"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon="arrow-right-bold"
                label="Fairways Hit (FIR)"
                description="Track fairways hit on par 4s and 5s"
                value={showFairwayHit}
                onValueChange={setShowFairwayHit}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="fir_gir_tracking"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon="flag-checkered"
                label="Greens in Regulation (GIR)"
                description="Track greens hit in regulation"
                value={showGreenInRegulation}
                onValueChange={setShowGreenInRegulation}
                colors={colors}
              />
            </FeatureLockToggle>
          </View>
        </View>

        {biometricAvailability?.isAvailable && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.section}>
              <SectionHeader title="Security" description="Protect access to your account" />
              <View
                style={[styles.settingsGroup, { backgroundColor: colors.surface }]}
                pointerEvents={isToggling ? 'none' : 'auto'}
              >
                <SettingRow
                  icon={biometricAvailability.biometricType === 'facial' ? 'face-recognition' : 'fingerprint'}
                  label={biometricAvailability.biometricType === 'facial' ? 'Face ID' : 'Fingerprint Lock'}
                  description="Require biometric authentication to open the app"
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  colors={colors}
                />
              </View>
            </View>
          </>
        )}

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Reset Section */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleResetDefaults}
            style={[
              styles.resetButton,
              { backgroundColor: colors.surface, borderColor: colors.errorLight },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset settings to defaults"
          >
            <Icon source="refresh" size={20} color={colors.error} />
            <Text style={[styles.resetButtonText, { color: colors.error }]}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Troubleshooting Section - Super Admin only */}
        {isSuperAdmin && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

            <View style={styles.section}>
              <SectionHeader title="Troubleshooting" description="If you're experiencing sync issues, clearing the sync queue may help." />
              <TouchableOpacity
                onPress={handleClearSyncQueue}
                disabled={isClearing}
                style={[
                  styles.troubleshootButton,
                  { backgroundColor: colors.surface, borderColor: colors.gray300 },
                  isClearing && styles.troubleshootButtonDisabled,
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
                <Text style={[styles.troubleshootButtonText, { color: colors.textSecondary }]}>
                  {isClearing ? 'Clearing...' : 'Clear Sync Queue'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResyncScores}
                disabled={isResyncing}
                style={[
                  styles.troubleshootButton,
                  { backgroundColor: colors.surface, borderColor: colors.gray300, marginTop: spacing.sm },
                  isResyncing && styles.troubleshootButtonDisabled,
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
                <Text style={[styles.troubleshootButtonText, { color: colors.textSecondary }]}>
                  {isResyncing ? 'Re-syncing...' : 'Re-sync All Scores'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Info Footer */}
        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            These settings affect how data is displayed in scorecard entry, leaderboards, and your statistics.
          </Text>
        </View>
      </ScrollView>

      {/* Confirmation/Alert Dialog */}
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
  // Theme mode options
  themeModeOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  themeModeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    position: 'relative',
  },
  themeModeLabel: {
    ...typography.smallBold,
  },
  themeModeCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Distance options
  distanceOptions: {
    gap: spacing.md,
  },
  distanceOptionWrapper: {
    flex: 1,
  },
  // Settings group
  settingsGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
  },
  settingDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  // Buttons
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  resetButtonText: {
    ...typography.bodyBold,
  },
  troubleshootButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  troubleshootButtonDisabled: {
    opacity: 0.6,
  },
  troubleshootButtonText: {
    ...typography.body,
  },
  // Info footer
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
  },
});
