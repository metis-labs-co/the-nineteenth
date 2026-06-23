import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SectionHeader } from './SectionHeader';
import { formatDayLabel } from './dateLabels';
import { formatDisplayDate } from '@/utils/locale';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface NextCompetitionCardProps {
  round: RoundWithCourse;
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
}: NextCompetitionCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  const competitionId = round.competition?.id;
  const name = round.competition?.name ?? 'Competition';
  const subtitle = buildSubtitle(isoDateStr(round.date));

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
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.row}>
          <Icon source="trophy-outline" size={28} color={colors.primary} />
          <View style={styles.text}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {!!subtitle && (
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={22} color={colors.textSecondary} />
        </View>
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
});
