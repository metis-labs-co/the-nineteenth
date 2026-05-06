/**
 * WeatherDetailModal — centered modal triggered from HeaderWeatherChip.
 * Shows today (Morning + Afternoon buckets) plus a 2-day outlook for the
 * device location. Loading, error, and "bucket already passed" states are
 * all handled inline.
 */

import React from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import {
  useDetailedDayForecast,
  type BucketStats,
  type DaySummary,
  type DetailedForecast,
} from '@/hooks/weather';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';

interface WeatherDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  coords: { lat: number; lng: number } | null;
}

export function WeatherDetailModal({
  visible,
  onDismiss,
  coords,
}: WeatherDetailModalProps) {
  const colors = useThemeColors();
  const { data, isLoading, refetch } = useDetailedDayForecast(coords);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        testID="weather-detail-modal-backdrop"
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onDismiss}
      >
        <Pressable
          testID="weather-detail-modal"
          accessibilityViewIsModal
          style={[
            styles.card,
            shadows.lg,
            { backgroundColor: colors.surface },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <CloseButton onPress={onDismiss} />
          {isLoading || data === undefined ? (
            <SkeletonBody />
          ) : data === null ? (
            <ErrorBody onRetry={refetch} />
          ) : (
            <SuccessBody data={data} />
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      testID="weather-detail-modal-close"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close weather details"
      hitSlop={12}
      style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
    >
      <Icon source="close" size={20} color={colors.textPrimary} />
    </Pressable>
  );
}

function SkeletonBody() {
  const colors = useThemeColors();
  const block = { backgroundColor: colors.surfaceVariant };
  return (
    <View testID="weather-detail-modal-skeleton" style={styles.skeletonBody}>
      <View style={[styles.skeletonHeader, block]} />
      <View style={styles.skeletonRow}>
        <View style={[styles.skeletonCard, block]} />
        <View style={[styles.skeletonCard, block]} />
      </View>
      <View style={[styles.skeletonForecast, block]} />
      <View style={[styles.skeletonForecast, block]} />
    </View>
  );
}

function ErrorBody({ onRetry }: { onRetry: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={styles.errorBody}>
      <Icon source="weather-cloudy-alert" size={36} color={colors.textSecondary} />
      <Text style={[typography.body, { color: colors.textPrimary, marginTop: spacing.md }]}>
        Couldn't load weather right now
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[typography.body, { color: colors.onPrimary, fontWeight: '600' }]}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

function SuccessBody({ data }: { data: DetailedForecast }) {
  return (
    <ScrollView contentContainerStyle={styles.successBody}>
      <DayHeader summary={data.today.summary} />
      <SectionLabel>TODAY</SectionLabel>
      <View style={styles.bucketRow}>
        <BucketCard label="Morning" testIDBase="morning" stats={data.today.morning} />
        <BucketCard label="Afternoon" testIDBase="afternoon" stats={data.today.afternoon} />
      </View>
      <SectionLabel>NEXT DAYS</SectionLabel>
      {data.forecast.map((day) => (
        <ForecastRow key={day.dateIso} day={day} />
      ))}
    </ScrollView>
  );
}

function DayHeader({ summary }: { summary: DaySummary }) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(summary.weatherCode);
  return (
    <View style={styles.dayHeader}>
      <View style={styles.dayHeaderTop}>
        <Icon source={icon} size={36} color={colors.textPrimary} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {formatDayDate(summary.dateIso)}
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {label} · High {Math.round(summary.tempHighC)}° / Low {Math.round(summary.tempLowC)}°
          </Text>
        </View>
      </View>
      <View style={styles.sunRow}>
        <SunMeta icon="weather-sunset-up" label="Sunrise" iso={summary.sunriseIso} />
        <SunMeta icon="weather-sunset-down" label="Sunset" iso={summary.sunsetIso} />
      </View>
    </View>
  );
}

function SunMeta({ icon, label, iso }: { icon: string; label: string; iso: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.sunMeta}>
      <Icon source={icon} size={16} color={colors.textSecondary} />
      <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
        {label} {formatTime(iso)}
      </Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <Text
      style={[
        typography.caption,
        styles.sectionLabel,
        { color: colors.textSecondary },
      ]}
    >
      {children}
    </Text>
  );
}

function BucketCard({
  label,
  testIDBase,
  stats,
}: {
  label: string;
  testIDBase: string;
  stats: BucketStats | null;
}) {
  const colors = useThemeColors();
  if (stats === null) {
    return (
      <View
        testID={`bucket-${testIDBase}-passed`}
        style={[
          styles.bucketCard,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
        ]}
      >
        <Text style={[typography.small, { color: colors.textSecondary, fontWeight: '600' }]}>
          {label}
        </Text>
        <Text
          style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}
        >
          Already passed
        </Text>
      </View>
    );
  }

  const { icon, label: condLabel } = weatherCodeToIcon(stats.dominantCode);
  const dirCardinal = degToCardinal(stats.windDirDegAvg);
  const a11y =
    `${label}. ${condLabel}. ` +
    `Temperature ${Math.round(stats.tempLowC)} to ${Math.round(stats.tempHighC)} degrees, ` +
    `feels like ${Math.round(stats.feelsLikeAvgC)}. ` +
    `Wind ${Math.round(stats.windKphAvg)} kph from the ${dirCardinal}, ` +
    `gusts ${Math.round(stats.windGustKphMax)} kph. ` +
    `Rain ${Math.round(stats.precipProbabilityMax)} percent, ` +
    `${stats.precipMm.toFixed(1)} millimetres. ` +
    `UV index ${Math.round(stats.uvIndexMax)}.`;

  return (
    <View
      testID={`bucket-${testIDBase}`}
      accessibilityLabel={a11y}
      accessibilityRole="text"
      style={[
        styles.bucketCard,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
    >
      <Text style={[typography.small, { color: colors.textPrimary, fontWeight: '700' }]}>
        {label}
      </Text>
      <View style={styles.bucketCondRow}>
        <Icon source={icon} size={20} color={colors.textPrimary} />
        <Text style={[typography.small, { color: colors.textPrimary, marginLeft: spacing.xs }]}>
          {condLabel}
        </Text>
      </View>
      <BucketLine label={`${Math.round(stats.tempLowC)}° – ${Math.round(stats.tempHighC)}°`} />
      <BucketLine label={`Feels ${Math.round(stats.feelsLikeAvgC)}°`} />
      <BucketLine label={`Wind ${Math.round(stats.windKphAvg)}kph ${dirCardinal}`} />
      <BucketLine label={`Gusts ${Math.round(stats.windGustKphMax)}kph`} />
      <BucketLine
        label={`Rain ${Math.round(stats.precipProbabilityMax)}% · ${stats.precipMm.toFixed(1)}mm`}
      />
      <BucketLine label={`UV ${Math.round(stats.uvIndexMax)}`} />
    </View>
  );
}

function BucketLine({ label }: { label: string }) {
  const colors = useThemeColors();
  return (
    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
      {label}
    </Text>
  );
}

function ForecastRow({ day }: { day: DaySummary }) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(day.weatherCode);
  const a11y =
    `${formatDayDate(day.dateIso)}, ${label}, ` +
    `high ${Math.round(day.tempHighC)} degrees, low ${Math.round(day.tempLowC)} degrees, ` +
    `${Math.round(day.precipProbabilityMax)} percent rain.`;
  return (
    <View
      testID={`forecast-row-${day.dateIso}`}
      accessibilityLabel={a11y}
      accessibilityRole="text"
      style={[styles.forecastRow, { borderTopColor: colors.divider }]}
    >
      <Text style={[typography.small, { color: colors.textPrimary, flex: 1 }]}>
        {formatDayDate(day.dateIso)}
      </Text>
      <Icon source={icon} size={20} color={colors.textPrimary} />
      <Text
        style={[
          typography.small,
          { color: colors.textPrimary, marginLeft: spacing.md, width: 70, textAlign: 'right' },
        ]}
      >
        {Math.round(day.tempHighC)}° / {Math.round(day.tempLowC)}°
      </Text>
      <Text
        style={[
          typography.caption,
          { color: colors.textSecondary, marginLeft: spacing.md, width: 60, textAlign: 'right' },
        ]}
      >
        {Math.round(day.precipProbabilityMax)}% rain
      </Text>
    </View>
  );
}

function formatDayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  return `${weekday} ${dayNum} ${month}`;
}

function formatTime(iso: string): string {
  const hh = iso.slice(11, 13);
  const mm = iso.slice(14, 16);
  return `${parseInt(hh, 10)}:${mm}`;
}

function degToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successBody: {
    paddingBottom: spacing.md,
  },
  dayHeader: {
    marginBottom: spacing.md,
  },
  dayHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  sunMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bucketCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  bucketCondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  errorBody: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    minHeight: 44,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonBody: {
    paddingVertical: spacing.md,
  },
  skeletonHeader: {
    height: 56,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletonCard: {
    flex: 1,
    height: 180,
    borderRadius: borderRadius.lg,
  },
  skeletonForecast: {
    height: 36,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
});
