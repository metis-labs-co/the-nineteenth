import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';
import { formatDisplayDate } from '@/utils/locale';
import { formatDayLabel } from './dateLabels';
import type { DailyWeather } from '@/hooks/weather';

interface CompetitionWeatherRowProps {
  dateIso: string;
  weather: DailyWeather;
}

/** One day's forecast line on the upcoming-competition card. */
export const CompetitionWeatherRow = React.memo(function CompetitionWeatherRow({
  dateIso,
  weather,
}: CompetitionWeatherRowProps) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(weather.weatherCode);

  const dayLabel = formatDayLabel(dateIso);
  const shortDate = formatDisplayDate(new Date(`${dateIso}T00:00:00`), {
    day: 'numeric',
    month: 'short',
  });
  const whenLabel = [dayLabel, shortDate].filter(Boolean).join(' · ');

  const tempLabel = `${Math.round(weather.tempMaxC)}°/${Math.round(weather.tempMinC)}°`;
  const showPrecip = weather.precipProbabilityMax >= 10;

  return (
    <View
      testID="competition-weather-row"
      style={styles.row}
      accessibilityLabel={`${whenLabel}, ${label}, ${Math.round(
        weather.tempMaxC,
      )} to ${Math.round(weather.tempMinC)} degrees${
        showPrecip
          ? `, ${weather.precipProbabilityMax} percent chance of precipitation`
          : ''
      }`}
    >
      <Text
        style={[styles.when, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {whenLabel}
      </Text>
      <View style={styles.metrics}>
        <Icon source={icon} size={16} color={colors.textTertiary} />
        <Text style={[styles.metricText, { color: colors.textTertiary }]}>
          {tempLabel}
        </Text>
        {showPrecip && (
          <>
            <Text style={[styles.dot, { color: colors.textTertiary }]}>·</Text>
            <Icon source="water-percent" size={16} color={colors.textTertiary} />
            <Text style={[styles.metricText, { color: colors.textTertiary }]}>
              {weather.precipProbabilityMax}%
            </Text>
          </>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  when: {
    ...typography.small,
    flexShrink: 1,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricText: {
    ...typography.smallBold,
  },
  dot: {
    ...typography.small,
    paddingHorizontal: spacing.xxs,
  },
});
