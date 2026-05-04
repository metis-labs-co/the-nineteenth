import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';
import type { WeatherSnapshot } from '@/hooks/weather';

interface WeatherStripProps {
  snapshot: WeatherSnapshot | null;
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function degreesToCardinal(deg: number): string {
  const idx = Math.round(((deg % 360) / 45)) % 8;
  return COMPASS_POINTS[idx];
}

export function WeatherStrip({ snapshot }: WeatherStripProps) {
  const colors = useThemeColors();
  if (!snapshot) return null;

  const { icon, label } = weatherCodeToIcon(snapshot.weatherCode);
  const tempLabel = `${Math.round(snapshot.tempC)}°`;
  const windLabel = `${Math.round(snapshot.windKph)} km/h ${degreesToCardinal(snapshot.windDirDeg)}`;
  const showPrecip = snapshot.precipProbability >= 10;

  return (
    <View
      testID="weather-strip"
      style={styles.container}
      accessibilityLabel={`${label}, ${tempLabel}, wind ${windLabel}${
        showPrecip ? `, ${snapshot.precipProbability} percent chance of precipitation` : ''
      }`}
    >
      <Icon source={icon} size={18} color={colors.textTertiary} />
      <Text style={[styles.text, { color: colors.textTertiary }]}>{tempLabel}</Text>
      <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
      <Icon source="weather-windy" size={16} color={colors.textTertiary} />
      <Text style={[styles.text, { color: colors.textTertiary }]}>{windLabel}</Text>
      {showPrecip && (
        <>
          <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
          <Icon source="water-percent" size={16} color={colors.textTertiary} />
          <Text style={[styles.text, { color: colors.textTertiary }]}>{snapshot.precipProbability}%</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.smallBold,
  },
  dot: {
    ...typography.small,
    paddingHorizontal: spacing.xxs,
  },
});
