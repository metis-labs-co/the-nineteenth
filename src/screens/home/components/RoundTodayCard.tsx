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
import { formatDayLabel } from './dateLabels';

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

export const RoundTodayCard = React.memo(function RoundTodayCard({
  round,
}: RoundTodayCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { data: weather } = useUpcomingRoundWeather(round);

  const courseName = round.course?.name ?? 'Round';
  const clubName = round.course?.clubs?.name ?? null;
  const headlineLabel = clubName ?? courseName;
  const dayLabel = formatDayLabel(round.date);
  const teeLabel = formatTeeTime(getTeeTime(round));
  // When we have a club name, show course name on its own line above the day/time.
  const courseLine = clubName && courseName !== clubName ? courseName : null;
  const subtitle = [courseLine, [dayLabel, teeLabel].filter(Boolean).join(' · ')]
    .filter(Boolean)
    .join(' · ');
  const sectionTitle = dayLabel === 'Tomorrow' ? 'Round tomorrow' : 'Round today';

  return (
    <View style={styles.wrapper}>
      <SectionHeader title={sectionTitle} />
      <TouchableOpacity
        testID="round-today-card"
        onPress={() =>
          navigation.navigate('ViewRound', {
            roundId: round.id,
            competitionId: round.competition?.id,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Round at ${headlineLabel}, ${subtitle}`}
        accessibilityHint="Opens round details"
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[styles.iconSquare, { backgroundColor: colors.primaryBackground }]}
          >
            <Icon source="golf" size={22} color={colors.primary} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {headlineLabel}
            </Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
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
    borderRadius: borderRadius.xl + 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { ...typography.caption, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
});
