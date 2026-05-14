/**
 * StatsHighlightsSection - identity stats row + recent form card + notable moment.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import type { RootStackParamList } from '@/navigation/types';
import type { StatsHighlights, NotableMoment } from '@/types/home';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface StatsHighlightsSectionProps {
  stats: StatsHighlights | null;
}

function formatNumber(value: number | null, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(fractionDigits);
}

function notableMomentText(m: NotableMoment): {
  icon: string;
  title: string;
  detail: string;
} {
  switch (m.kind) {
    case 'course_best':
      return {
        icon: 'star-outline',
        title: 'Course best',
        detail: `${m.score} at ${m.courseName}`,
      };
    case 'best_recent':
      return {
        icon: 'fire',
        title: 'Recent best',
        detail: `${m.score} at ${m.courseName}`,
      };
    case 'biggest_delta':
      return {
        icon: 'trending-up',
        title: 'Best round vs handicap',
        detail: `${m.delta > 0 ? '+' : ''}${m.delta} at ${m.courseName}`,
      };
  }
}

export const StatsHighlightsSection = React.memo(
  function StatsHighlightsSection({ stats }: StatsHighlightsSectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    if (!stats) return null;

    const goToStats = () => navigation.navigate('MyStatistics');
    const goToNotable = (m: NotableMoment) => {
      if (m.kind === 'course_best') {
        navigation.navigate('CourseStatistics', {
          courseId: m.courseId,
          courseName: m.courseName,
        });
      } else {
        goToStats();
      }
    };

    return (
      <View style={styles.container}>
        <SectionHeader
          title="Your form"
          actionLabel="See all"
          onActionPress={goToStats}
        />

        <TouchableOpacity
          onPress={goToStats}
          accessibilityRole="button"
          accessibilityLabel="View full statistics"
          style={[
            styles.identityRow,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <Pill
            label="Handicap"
            value={formatHandicapIndex(stats.handicap)}
            colors={colors}
          />
          <Pill
            label="Rounds (YTD)"
            value={String(stats.roundsYtd)}
            colors={colors}
          />
          <Pill
            label="Avg score"
            value={formatNumber(stats.scoringAverage, 1)}
            colors={colors}
          />
        </TouchableOpacity>

        {stats.last5Average !== null ? (
          <TouchableOpacity
            onPress={goToStats}
            accessibilityRole="button"
            accessibilityLabel="View recent form"
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            <Icon source="chart-line" size={20} color={colors.primary} />
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Last 5 rounds
              </Text>
              <Text
                style={[styles.cardDetail, { color: colors.textSecondary }]}
              >
                {formatNumber(stats.last5Average, 1)} average
              </Text>
            </View>
            <Icon
              source="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}

        {stats.notable ? (
          <TouchableOpacity
            onPress={() => goToNotable(stats.notable!)}
            accessibilityRole="button"
            accessibilityLabel={notableMomentText(stats.notable).title}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.borderLight },
            ]}
          >
            <Icon
              source={notableMomentText(stats.notable).icon}
              size={20}
              color={colors.primary}
            />
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {notableMomentText(stats.notable).title}
              </Text>
              <Text
                style={[styles.cardDetail, { color: colors.textSecondary }]}
              >
                {notableMomentText(stats.notable).detail}
              </Text>
            </View>
            <Icon
              source="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }
);

interface PillProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
}

function Pill({ label, value, colors }: PillProps) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.pillValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
  },
  pillLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  pillValue: {
    ...typography.h4,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  cardDetail: {
    ...typography.caption,
    marginTop: 2,
  },
});
