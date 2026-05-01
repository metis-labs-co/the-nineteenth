import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, ThemeMode, SurfaceStyle, BackdropStyle } from '@/constants/theme';
import { useTheme, useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common';
import type { ColorPalette } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AppearanceOptionProps {
  label: string;
  accessibilityLabel: string;
  icon: string;
  isSelected: boolean;
  onSelect: () => void;
  colors: ColorPalette;
}

const AppearanceOption = React.memo(function AppearanceOption({
  label,
  accessibilityLabel,
  icon,
  isSelected,
  onSelect,
  colors,
}: AppearanceOptionProps) {
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
      accessibilityLabel={accessibilityLabel}
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

const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { mode: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
  { mode: 'system', label: 'System', icon: 'cellphone-cog' },
];

const SURFACE_STYLES: { style: SurfaceStyle; label: string; icon: string }[] = [
  { style: 'solid', label: 'Solid', icon: 'circle' },
  { style: 'translucent', label: 'Translucent', icon: 'circle-half-full' },
];

const BACKDROP_STYLES: { style: BackdropStyle; label: string; icon: string }[] = [
  { style: 'image', label: 'Image', icon: 'image-outline' },
  { style: 'none', label: 'None', icon: 'image-off-outline' },
];

export default function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const {
    themeMode,
    setThemeMode,
    surfaceStyle,
    setSurfaceStyle,
    backdropStyle,
    setBackdropStyle,
  } = useTheme();

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
            {THEME_MODES.map(({ mode, label, icon }) => (
              <AppearanceOption
                key={mode}
                label={label}
                accessibilityLabel={`Use ${label} theme`}
                icon={icon}
                isSelected={themeMode === mode}
                onSelect={() => setThemeMode(mode)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Surface style"
            description="Solid card backgrounds, or a translucent brand-tinted wash"
          />
          <View style={styles.themeModeOptions}>
            {SURFACE_STYLES.map(({ style, label, icon }) => (
              <AppearanceOption
                key={style}
                label={label}
                accessibilityLabel={`Use ${label} surface style`}
                icon={icon}
                isSelected={surfaceStyle === style}
                onSelect={() => setSurfaceStyle(style)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Backdrop"
            description="Photographic backdrop behind every screen"
          />
          <View style={styles.themeModeOptions}>
            {BACKDROP_STYLES.map(({ style, label, icon }) => (
              <AppearanceOption
                key={style}
                label={label}
                accessibilityLabel={`Use ${label} backdrop`}
                icon={icon}
                isSelected={backdropStyle === style}
                onSelect={() => setBackdropStyle(style)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            System mode automatically switches between light and dark themes based on your device settings. Modals and sheets stay solid in either surface style for legibility.
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
