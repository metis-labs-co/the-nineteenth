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

  // Get actions from store
  const setDistanceUnit = useSettingsStore((state) => state.setDistanceUnit);
  const setShowPutts = useSettingsStore((state) => state.setShowPutts);
  const setShowFairwayHit = useSettingsStore((state) => state.setShowFairwayHit);
  const setShowGreenInRegulation = useSettingsStore((state) => state.setShowGreenInRegulation);

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
