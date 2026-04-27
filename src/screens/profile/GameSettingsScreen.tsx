import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common';
import { FeatureLockToggle } from '@/components/subscription/FeatureLockToggle';
import { IconArrowsLeftRight, IconTarget, IconShovel, IconAlertTriangle } from '@tabler/icons-react-native';
import { RadioButtonOption, SettingRow } from './components';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GameSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();

  // Get settings from store
  const distanceUnit = useSettingsStore((state) => state.distanceUnit);
  const showPutts = useSettingsStore((state) => state.showPutts);
  const showFairwayHit = useSettingsStore((state) => state.showFairwayHit);
  const showGreenInRegulation = useSettingsStore((state) => state.showGreenInRegulation);
  const showFairwayMissDirection = useSettingsStore((state) => state.showFairwayMissDirection);
  const showGreenMissDirection = useSettingsStore((state) => state.showGreenMissDirection);
  const showBunkerShots = useSettingsStore((state) => state.showBunkerShots);
  const showHazards = useSettingsStore((state) => state.showHazards);
  const autoCollapseStatsForLargeGroups = useSettingsStore(
    (state) => state.autoCollapseStatsForLargeGroups
  );

  // Get actions from store
  const setDistanceUnit = useSettingsStore((state) => state.setDistanceUnit);
  const setShowPutts = useSettingsStore((state) => state.setShowPutts);
  const setShowFairwayHit = useSettingsStore((state) => state.setShowFairwayHit);
  const setShowGreenInRegulation = useSettingsStore((state) => state.setShowGreenInRegulation);
  const setShowFairwayMissDirection = useSettingsStore((state) => state.setShowFairwayMissDirection);
  const setShowGreenMissDirection = useSettingsStore((state) => state.setShowGreenMissDirection);
  const setShowBunkerShots = useSettingsStore((state) => state.setShowBunkerShots);
  const setShowHazards = useSettingsStore((state) => state.setShowHazards);
  const setAutoCollapseStatsForLargeGroups = useSettingsStore(
    (state) => state.setAutoCollapseStatsForLargeGroups
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Game Settings"
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
              feature="detailed_stats"
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
              feature="detailed_stats"
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
            <FeatureLockToggle
              feature="advanced_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon={<IconArrowsLeftRight size={20} color={colors.gray600} />}
                label="Fairway Miss Direction"
                description="Track left/right when you miss the fairway"
                value={showFairwayMissDirection}
                onValueChange={setShowFairwayMissDirection}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="advanced_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon={<IconTarget size={20} color={colors.gray600} />}
                label="Green Miss Direction"
                description="Track left/right/long/short when you miss the green"
                value={showGreenMissDirection}
                onValueChange={setShowGreenMissDirection}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="advanced_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon={<IconShovel size={20} color={colors.gray600} />}
                label="Bunker Shots"
                description="Track number of bunker shots per hole"
                value={showBunkerShots}
                onValueChange={setShowBunkerShots}
                colors={colors}
              />
            </FeatureLockToggle>
            <FeatureLockToggle
              feature="advanced_stats"
              onUpgradePress={() => navigation.navigate('Subscription')}
            >
              <SettingRow
                icon={<IconAlertTriangle size={20} color={colors.gray600} />}
                label="Hazards"
                description="Track hazard types (water, OB, lateral, lost ball)"
                value={showHazards}
                onValueChange={setShowHazards}
                colors={colors}
              />
            </FeatureLockToggle>
            <SettingRow
              icon="arrow-collapse-vertical"
              label="Collapse stats for groups of 3+"
              description="When scoring 3 or more players, hide FIR/GIR/Putts behind a tap to keep cards compact"
              value={autoCollapseStatsForLargeGroups}
              onValueChange={setAutoCollapseStatsForLargeGroups}
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
  divider: {
    marginVertical: spacing.md,
  },
  distanceOptions: {
    gap: spacing.md,
  },
  distanceOptionWrapper: {
    flex: 1,
  },
  settingsGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
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
