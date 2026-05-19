/**
 * CompetitionFirstRoundLine - Compact "1st round @ <club> — <course>" line
 * shown on upcoming competition cards. Tells players where and when the
 * competition kicks off without having to open the card.
 *
 * Fetches just the first round (lowest round_number) with course + club
 * names, and renders nothing while loading or when no round is set up yet.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { IconMapPin, IconCalendar } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { parseLocalDateString } from '@/utils/formatting';

interface CompetitionFirstRoundLineProps {
  competitionId: string;
}

interface FirstRoundInfo {
  date: string | null;
  teeTime: string | null;
  courseName: string | null;
  clubName: string | null;
}

interface FirstRoundRow {
  date: string | null;
  tee_time: string | null;
  courses: {
    name: string | null;
    clubs: { name: string | null } | null;
  } | null;
}

function useCompetitionFirstRound(competitionId: string) {
  return useQuery<FirstRoundInfo | null>({
    queryKey: ['competitionFirstRound', competitionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select(
          `
          date,
          tee_time,
          courses (
            name,
            clubs ( name )
          )
        `
        )
        .eq('competition_id', competitionId)
        .is('deleted_at', null)
        .order('round_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Treat fetch errors as "no info available" rather than blowing up
        // the list — the card stays compact and the user can still tap in.
        return null;
      }

      if (!data) return null;
      const row = data as FirstRoundRow;
      return {
        date: row.date ?? null,
        teeTime: row.tee_time ?? null,
        courseName: row.courses?.name ?? null,
        clubName: row.courses?.clubs?.name ?? null,
      };
    },
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.MODERATE,
    gcTime: GC_TIMES.STANDARD,
  });
}

function formatRoundDate(date: string | null): string {
  if (!date) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? parseLocalDateString(date)
    : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export const CompetitionFirstRoundLine = React.memo(
  function CompetitionFirstRoundLine({
    competitionId,
  }: CompetitionFirstRoundLineProps) {
    const colors = useThemeColors();
    const { data, isLoading } = useCompetitionFirstRound(competitionId);

    if (isLoading || !data) return null;

    const venueParts: string[] = [];
    if (data.clubName) venueParts.push(data.clubName);
    if (data.courseName && data.courseName !== data.clubName) {
      venueParts.push(data.courseName);
    }
    const venueText = venueParts.join(' — ');

    const dateText = formatRoundDate(data.date);
    const dateTimeText = data.teeTime
      ? dateText
        ? `${dateText} at ${data.teeTime}`
        : data.teeTime
      : dateText;

    // If we have nothing meaningful to show, render nothing.
    if (!venueText && !dateTimeText) return null;

    return (
      <View
        style={[styles.container, { borderTopColor: colors.borderLight }]}
        accessibilityLabel={
          venueText && dateTimeText
            ? `First round at ${venueText}, ${dateTimeText}`
            : `First round ${venueText || dateTimeText}`
        }
      >
        {venueText ? (
          <View style={styles.row}>
            <IconMapPin size={14} color={colors.textSecondary} style={styles.venueIcon} />
            <Text
              style={[styles.label, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              <Text
                style={[styles.labelStrong, { color: colors.textPrimary }]}
              >
                1st round
              </Text>{' '}
              @ {venueText}
            </Text>
          </View>
        ) : null}

        {dateTimeText ? (
          <View style={styles.row}>
            <IconCalendar size={14} color={colors.textSecondary} />
            <Text
              style={[styles.label, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {dateTimeText}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  venueIcon: {
    // Pin icon to the first line so it doesn't recenter when the text wraps.
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  label: {
    ...typography.small,
    flexShrink: 1,
  },
  labelStrong: {
    ...typography.smallBold,
  },
});
