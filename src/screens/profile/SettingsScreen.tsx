/**
 * SettingsScreen - User preferences and app settings
 *
 * Allows users to configure:
 * - Theme mode (light/dark/system)
 * - Distance units (yards/metres)
 * - Push notification preferences
 * - Which stats to show in scoring entry (putts, FIR, GIR)
 * - These settings affect leaderboards, stats, and scorecard entry
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Switch, Icon, Divider } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, ThemeMode } from '@/constants/theme';
import { useTheme, useThemeColors } from '@/context/ThemeContext';
import { useSettingsStore, type DistanceUnit } from '@/store/settingsStore';
import { clearSyncQueue } from '@/services/offline/sync';
import { PageHeader } from '@/components/common/PageHeader';

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

interface DistanceOptionProps {
  unit: DistanceUnit;
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  colors: ColorPalette;
}

const DistanceOption = React.memo(function DistanceOption({
  unit,
  label,
  isSelected,
  onSelect,
  colors,
}: DistanceOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.distanceOption,
        { backgroundColor: colors.surface, borderColor: colors.gray200 },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLighter + '20' },
      ]}
      activeOpacity={0.7}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Use ${label} for distances`}
    >
      <Text
        style={[
          styles.distanceOptionText,
          { color: colors.textSecondary },
          isSelected && { color: colors.primary },
        ]}
      >
        {label}
      </Text>
      {isSelected && (
        <Icon source="check" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
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
  mode,
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

  // Get theme colors and mode
  const colors = useThemeColors();
  const { themeMode, setThemeMode } = useTheme();

  // Get settings from store
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);
  const debugModeEnabled = useSettingsStore((state) => state.debugModeEnabled);

  // Get actions from store
  const setDistanceUnit = useSettingsStore((state) => state.setDistanceUnit);
  const setShowPutts = useSettingsStore((state) => state.setShowPutts);
  const setShowFairwayHit = useSettingsStore((state) => state.setShowFairwayHit);
  const setShowGreenInRegulation = useSettingsStore((state) => state.setShowGreenInRegulation);
  const setDebugModeEnabled = useSettingsStore((state) => state.setDebugModeEnabled);
  const resetToDefaults = useSettingsStore((state) => state.resetToDefaults);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleResetDefaults = useCallback(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  const handleClearSyncQueue = useCallback(async () => {
    Alert.alert(
      'Clear Sync Queue',
      'This will clear all pending sync operations and remove any invalid data. Your saved scores will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const result = await clearSyncQueue();
              Alert.alert(
                'Sync Queue Cleared',
                `Cleared ${result.pendingCleared} pending syncs and ${result.invalidCleared} invalid entries.`
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear sync queue. Please try again.');
              console.error('[Settings] Failed to clear sync queue:', error);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, []);

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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose your preferred theme
          </Text>
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Distance Units</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose how distances are displayed throughout the app
          </Text>
          <View style={styles.distanceOptions}>
            <DistanceOption
              unit="metres"
              label="Metres"
              isSelected={distanceUnit === 'metres'}
              onSelect={() => setDistanceUnit('metres')}
              colors={colors}
            />
            <DistanceOption
              unit="yards"
              label="Yards"
              isSelected={distanceUnit === 'yards'}
              onSelect={() => setDistanceUnit('yards')}
              colors={colors}
            />
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Scoring Entry Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scoring Entry</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose which additional stats to track when entering scores. These will also appear in leaderboards and statistics.
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
            <SettingRow
              icon="golf-tee"
              label="Putts"
              description="Track number of putts per hole"
              value={showPutts}
              onValueChange={setShowPutts}
              colors={colors}
            />
            <SettingRow
              icon="arrow-right-bold"
              label="Fairways Hit (FIR)"
              description="Track fairways hit on par 4s and 5s"
              value={showFairwayHit}
              onValueChange={setShowFairwayHit}
              colors={colors}
            />
            <SettingRow
              icon="flag-checkered"
              label="Greens in Regulation (GIR)"
              description="Track greens hit in regulation"
              value={showGreenInRegulation}
              onValueChange={setShowGreenInRegulation}
              colors={colors}
            />
          </View>
        </View>

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

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Troubleshooting Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Troubleshooting</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            If you&apos;re experiencing sync issues, clearing the sync queue may help.
          </Text>
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
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Developer Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Developer</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Tools for debugging and troubleshooting the app.
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
            <SettingRow
              icon="bug-outline"
              label="Debug Mode"
              description="Show debug panels on scoring screens with detailed state information"
              value={debugModeEnabled}
              onValueChange={setDebugModeEnabled}
              colors={colors}
            />
          </View>
        </View>

        {/* Info Footer */}
        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            These settings affect how data is displayed in scorecard entry, leaderboards, and your statistics.
          </Text>
        </View>
      </ScrollView>
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
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.small,
    marginBottom: spacing.md,
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
    flexDirection: 'row',
    gap: spacing.md,
  },
  distanceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  distanceOptionText: {
    ...typography.bodyBold,
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
