import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SectionHeader } from './SectionHeader';
import { CompetitionWeatherRow } from './CompetitionWeatherRow';
import { formatDayLabel } from './dateLabels';
import { formatDisplayDate } from '@/utils/locale';
import { useCompetitionWeather } from '@/hooks/weather';
import type { CompetitionDay } from '@/hooks/home/useHomeData';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface NextCompetitionCardProps {
  round: RoundWithCourse;
  /** Distinct days the competition runs — drives the per-day weather lines. */
  days?: CompetitionDay[];
}

function isoDateStr(date: RoundWithCourse['date']): string | null {
  if (!date) return null;
  return typeof date === 'string'
    ? date.slice(0, 10)
    : (date as Date).toISOString().slice(0, 10);
}

/** "This Friday · 26 Jun" — day label plus a short date. */
function buildSubtitle(dateIso: string | null): string {
  if (!dateIso) return '';
  const dayLabel = formatDayLabel(dateIso);
  const shortDate = formatDisplayDate(new Date(`${dateIso}T00:00:00`), {
    day: 'numeric',
    month: 'short',
  });
  return [dayLabel, shortDate].filter(Boolean).join(' · ');
}

export const NextCompetitionCard = React.memo(function NextCompetitionCard({
  round,
  days = [],
}: NextCompetitionCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  const competitionId = round.competition?.id;
  const name = round.competition?.name ?? 'Competition';
  const description = round.competition?.description?.trim() ?? '';
  const subtitle = buildSubtitle(isoDateStr(round.date));

  const { data: weatherByDate } = useCompetitionWeather(days);
  const forecastDays = days.filter((d) => weatherByDate?.[d.dateIso]);

  // Guard: this card is only rendered for competition rounds, but stay safe.
  if (!competitionId) return null;

  return (
    <View style={styles.wrapper}>
      <SectionHeader title="Upcoming competition" />
      <TouchableOpacity
        testID="next-competition-card"
        onPress={() =>
          navigation.navigate('CompetitionDetail', { id: competitionId })
        }
        accessibilityRole="button"
        accessibilityLabel={`Upcoming competition ${name}, ${subtitle}`}
        accessibilityHint="Opens the competition"
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            // Gold-tinted border per the design's next-competition card.
            borderColor: `${colors.warning}4D`,
          },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[styles.iconSquare, { backgroundColor: colors.warningBackground }]}
          >
            <Icon source="trophy-outline" size={24} color={colors.warning} />
          </View>
          <View style={styles.text}>
            {!!subtitle && (
              <Text
                style={[styles.subtitle, { color: colors.warning }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {!!description && (
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {description}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={20} color={colors.textTertiary} />
        </View>

        {forecastDays.length > 0 && (
          <View
            testID="competition-weather"
            style={[styles.weather, { borderTopColor: colors.borderLight }]}
          >
            {forecastDays.map((d) => (
              <CompetitionWeatherRow
                key={d.dateIso}
                dateIso={d.dateIso}
                weather={weatherByDate![d.dateIso]}
              />
            ))}
          </View>
        )}
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
    gap: spacing.md + 1,
    padding: spacing.lg,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  description: { ...typography.caption, marginTop: 1 },
  weather: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
