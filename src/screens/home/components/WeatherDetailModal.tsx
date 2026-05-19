/**
 * WeatherDetailModal — centered modal triggered from HeaderWeatherChip.
 *
 * Layout:
 *  - Location header (reverse-geocoded place name, falls back to timezone).
 *  - Day mode  (before 18:00): today's morning/afternoon split as the
 *    headline, with tomorrow + day-after as compact rows. Morning stays
 *    visible all day — buckets are never collapsed to "already passed".
 *  - Evening mode (≥ 18:00): today collapses to a compact row, tomorrow's
 *    morning/afternoon split becomes the headline, day-after stays as a row.
 *
 * Loading, error, and missing-bucket fallbacks are all handled inline.
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
  type Coords,
  type DayBuckets,
  type DaySummary,
  type DetailedForecast,
} from '@/hooks/weather';
import { weatherCodeToIcon } from '@/hooks/weather/weatherCodeToIcon';
import { useReverseGeocode, timezoneToPlace } from '@/hooks/weather/useReverseGeocode';

interface WeatherDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  coords: Coords | null;
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
            { backgroundColor: colors.surfaceElevated },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.topBar}>
            <LocationHeader coords={coords} locationIso={data?.locationIso ?? null} />
            <CloseButton onPress={onDismiss} />
          </View>
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
        Couldn&apos;t load weather right now
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[typography.body, { color: colors.textOnColored, fontWeight: '600' }]}>
          Retry
        </Text>
      </Pressable>
    </View>
  );
}

function SuccessBody({ data }: { data: DetailedForecast }) {
  return (
    <ScrollView contentContainerStyle={styles.successBody}>
      {data.eveningMode ? (
        <EveningLayout data={data} />
      ) : (
        <DayLayout data={data} />
      )}
    </ScrollView>
  );
}

function DayLayout({ data }: { data: DetailedForecast }) {
  return (
    <>
      <DayHeader summary={data.today.summary} />
      <SectionLabel>TODAY</SectionLabel>
      <BucketSplit buckets={data.today} testIDPrefix="today" />
      <SectionLabel>NEXT DAYS</SectionLabel>
      <ForecastRow day={data.tomorrow.summary} />
      <ForecastRow day={data.dayAfter} />
    </>
  );
}

function EveningLayout({ data }: { data: DetailedForecast }) {
  return (
    <>
      <SectionLabel>TODAY</SectionLabel>
      <CompactDayRow day={data.today.summary} testID="today-compact-row" />
      <DayHeader summary={data.tomorrow.summary} accent />
      <SectionLabel>TOMORROW</SectionLabel>
      <BucketSplit buckets={data.tomorrow} testIDPrefix="tomorrow" />
      <SectionLabel>NEXT DAY</SectionLabel>
      <ForecastRow day={data.dayAfter} />
    </>
  );
}

function LocationHeader({
  coords,
  locationIso,
}: {
  coords: Coords | null;
  locationIso: string | null;
}) {
  const colors = useThemeColors();
  const { data: place } = useReverseGeocode(coords);

  const fallback = timezoneToPlace(locationIso);
  const primary = place?.primary ?? fallback ?? 'Current location';
  const secondary = place?.secondary ?? null;
  const inlineLabel = secondary ? `${primary}, ${secondary}` : primary;
  const a11y = `Forecast for ${inlineLabel}`;

  return (
    <View
      testID="weather-location-header"
      accessibilityRole="text"
      accessibilityLabel={a11y}
      style={[
        styles.locationHeader,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
    >
      <Icon source="map-marker" size={16} color={colors.primary} />
      <Text
        style={[
          typography.small,
          styles.locationText,
          { color: colors.textPrimary, fontWeight: '600' },
        ]}
        numberOfLines={1}
      >
        {inlineLabel}
      </Text>
    </View>
  );
}

function DayHeader({ summary, accent }: { summary: DaySummary; accent?: boolean }) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(summary.weatherCode);
  return (
    <View style={[styles.dayHeader, accent ? styles.dayHeaderAccent : null]}>
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

function BucketSplit({
  buckets,
  testIDPrefix,
}: {
  buckets: DayBuckets;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.bucketRow}>
      <BucketCard
        label="Morning"
        testIDBase={`${testIDPrefix}-morning`}
        stats={buckets.morning}
      />
      <BucketCard
        label="Afternoon"
        testIDBase={`${testIDPrefix}-afternoon`}
        stats={buckets.afternoon}
      />
    </View>
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

  // Defensive: stats can be null only when the API returns no hours for the
  // window (very rare — e.g. partial midnight rollover). Render a quiet
  // placeholder rather than crashing.
  if (stats === null) {
    return (
      <View
        testID={`bucket-${testIDBase}-empty`}
        style={[
          styles.bucketCard,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
        ]}
      >
        <Text style={[typography.small, { color: colors.textSecondary, fontWeight: '600' }]}>
          {label}
        </Text>
        <Text
          style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}
        >
          No data
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

function CompactDayRow({ day, testID }: { day: DaySummary; testID: string }) {
  const colors = useThemeColors();
  const { icon, label } = weatherCodeToIcon(day.weatherCode);
  const a11y =
    `Today, ${label}, ` +
    `high ${Math.round(day.tempHighC)} degrees, low ${Math.round(day.tempLowC)} degrees, ` +
    `${Math.round(day.precipProbabilityMax)} percent rain.`;
  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={a11y}
      style={[
        styles.compactRow,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight },
      ]}
    >
      <Icon source={icon} size={20} color={colors.textPrimary} />
      <Text
        style={[
          typography.small,
          { color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
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
      style={[styles.forecastRow, { borderTopColor: colors.borderLight }]}
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
  if (!iso || iso.length < 16) return '--:--';
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  // Visual: 32×32 (compact density). Effective tap area: 56×56 via hitSlop on the Pressable — meets ≥44 a11y target.
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBody: {
    paddingBottom: spacing.md,
  },
  locationHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minWidth: 0,
  },
  locationText: {
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  dayHeader: {
    marginBottom: spacing.md,
  },
  dayHeaderAccent: {
    marginTop: spacing.md,
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
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
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
