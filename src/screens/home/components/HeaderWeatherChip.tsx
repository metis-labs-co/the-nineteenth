import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useDeviceWeather } from '@/hooks/weather/useDeviceWeather';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';
import { WeatherDetailModal } from './WeatherDetailModal';

export function HeaderWeatherChip() {
  const colors = useThemeColors();
  const { data: snapshot, location } = useDeviceWeather();
  const [modalVisible, setModalVisible] = useState(false);

  if (!snapshot) return null;

  const { icon, label } = weatherCodeToIcon(snapshot.weatherCode);
  const tempLabel = `${Math.round(snapshot.tempC)}°`;
  const coords = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  return (
    <>
      <Pressable
        testID="header-weather-chip"
        accessibilityRole="button"
        accessibilityLabel={`Currently ${Math.round(snapshot.tempC)} degrees, ${label}`}
        accessibilityHint="Opens detailed forecast"
        accessibilityState={{ expanded: modalVisible }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => setModalVisible(true)}
        style={[
          styles.chip,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
        ]}
      >
        <Icon source={icon} size={16} color={colors.textSecondary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>{tempLabel}</Text>
      </Pressable>
      <WeatherDetailModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        coords={coords}
      />
    </>
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
