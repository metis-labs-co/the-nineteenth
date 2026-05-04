import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useUpcomingRoundWeather } from '@/hooks/weather/useUpcomingRoundWeather';
import { WeatherStrip } from './WeatherStrip';
import { SectionHeader } from './SectionHeader';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface RoundTodayCardProps {
  round: RoundWithCourse;
}

function getTeeTime(round: { tee_time?: string | null; teeTime?: string | null }): string | null {
  return round.tee_time ?? round.teeTime ?? null;
}

function formatTeeTime(teeTime: string | null): string {
  if (!teeTime) return '';
  const [h, m] = teeTime.split(':').map((s) => parseInt(s, 10));
  if (Number.isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minStr = String(m).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayLabel(dateIso: string | null): string {
  if (!dateIso) return '';
  const today = localDateStr(new Date());
  if (dateIso === today) return 'Today';
  const tomorrow = localDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (dateIso === tomorrow) return 'Tomorrow';
  const d = new Date(`${dateIso}T00:00:00`);
  return d.toLocaleDateString('en-AU', { weekday: 'long' });
}

export const RoundTodayCard = React.memo(function RoundTodayCard({
  round,
}: RoundTodayCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { data: weather } = useUpcomingRoundWeather(round);

  const courseName = round.course?.name ?? 'Round';
  const dayLabel = formatDayLabel(round.date);
  const teeLabel = formatTeeTime(getTeeTime(round));
  const subtitle = [dayLabel, teeLabel].filter(Boolean).join(' · ');
  const sectionTitle = dayLabel === 'Tomorrow' ? 'Round tomorrow' : 'Round today';

  return (
    <View style={styles.wrapper}>
      <SectionHeader title={sectionTitle} />
      <TouchableOpacity
        testID="round-today-card"
        onPress={() => navigation.navigate('ViewRound', { roundId: round.id })}
        accessibilityRole="button"
        accessibilityLabel={`Round at ${courseName}, ${subtitle}`}
        accessibilityHint="Opens round details"
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          <Icon source="golf" size={28} color={colors.primary} />
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {courseName}
            </Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={22} color={colors.textSecondary} />
        </View>
        {weather && (
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        )}
        {weather && <WeatherStrip snapshot={weather} />}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: { flex: 1 },
  title: { ...typography.body, fontWeight: '700' },
  subtitle: { ...typography.caption, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
});
