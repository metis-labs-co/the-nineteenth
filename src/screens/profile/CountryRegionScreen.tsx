/**
 * CountryRegionScreen - Select browsing country/region
 *
 * Displays auto-detect option and all supported countries grouped by continent.
 * Selecting a country sets the override and navigates back.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserCountry } from '@/hooks/useUserCountry';
import { getCountriesByContinent, type CountryDefinition } from '@/constants/countries';

const CONTINENT_SECTIONS = getCountriesByContinent();

export default function CountryRegionScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const countryOverride = useSettingsStore((state) => state.countryOverride);
  const setCountryOverride = useSettingsStore((state) => state.setCountryOverride);
  const { country: detectedCountry } = useUserCountry();

  const handleSelectAutoDetect = useCallback(() => {
    setCountryOverride(null);
    navigation.goBack();
  }, [setCountryOverride, navigation]);

  const handleSelectCountry = useCallback(
    (name: string) => {
      setCountryOverride(name);
      navigation.goBack();
    },
    [setCountryOverride, navigation]
  );

  const isAutoDetect = countryOverride === null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Country / Region" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + spacing.xxxl }]}
      >
        {/* Auto-detect row */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={handleSelectAutoDetect}
            accessibilityRole="radio"
            accessibilityState={{ selected: isAutoDetect }}
            accessibilityLabel="Auto-detect country"
          >
            <View style={styles.rowLeft}>
              <Icon source="crosshairs-gps" size={22} color={colors.textSecondary} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Auto-detect</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                  {detectedCountry ? `Detected: ${detectedCountry}` : 'Uses GPS location'}
                </Text>
              </View>
            </View>
            {isAutoDetect && <Icon source="check" size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        {/* Country sections by continent */}
        {CONTINENT_SECTIONS.map(({ continent, countries }) => (
          <View key={continent} style={styles.continentSection}>
            <Text style={[styles.continentTitle, { color: colors.textSecondary }]}>
              {continent}
            </Text>
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              {countries.map((c, index) => (
                <CountryRow
                  key={c.code}
                  country={c}
                  isSelected={countryOverride === c.name}
                  onPress={handleSelectCountry}
                  isLast={index === countries.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// =====================================================
// CountryRow
// =====================================================

interface CountryRowProps {
  country: CountryDefinition;
  isSelected: boolean;
  onPress: (name: string) => void;
  isLast: boolean;
}

const CountryRow = React.memo(function CountryRow({
  country,
  isSelected,
  onPress,
  isLast,
}: CountryRowProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => onPress(country.name)}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${country.name}`}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.flag}>{country.flag}</Text>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{country.name}</Text>
      </View>
      {isSelected && <Icon source="check" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  continentSection: {
    marginTop: spacing.xl,
  },
  continentTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
  },
  rowSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  flag: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
});
