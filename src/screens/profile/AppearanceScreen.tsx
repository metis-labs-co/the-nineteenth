import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, ThemeMode } from '@/constants/theme';
import { useTheme, useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common';
import type { ColorPalette } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const { themeMode, setThemeMode } = useTheme();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Appearance"
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
        <View style={styles.section}>
          <SectionHeader title="Theme" description="Choose your preferred theme" />
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

        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            System mode automatically switches between light and dark themes based on your device settings.
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
