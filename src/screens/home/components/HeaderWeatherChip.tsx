import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useDeviceWeather } from '@/hooks/weather/useDeviceWeather';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';

export function HeaderWeatherChip() {
  const colors = useThemeColors();
  const { data: snapshot } = useDeviceWeather();
  if (!snapshot) return null;

  const { icon, label } = weatherCodeToIcon(snapshot.weatherCode);
  const tempLabel = `${Math.round(snapshot.tempC)}°`;

  return (
    <View
      testID="header-weather-chip"
      accessibilityRole="text"
      accessibilityLabel={`Currently ${tempLabel}, ${label}`}
      style={[
        styles.chip,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
    >
      <Icon source={icon} size={16} color={colors.textPrimary} />
      <Text style={[styles.text, { color: colors.textPrimary }]}>{tempLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
  },
  text: {
    ...typography.small,
    fontWeight: '700',
  },
});
