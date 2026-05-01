/**
 * LastRoundSection - single card summarising the user's last completed round.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { RoundItem } from '@/screens/rounds/RoundListScreen/types';
import { formatUserScore } from '@/components/rounds/RoundListCard/types';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface LastRoundSectionProps {
  round: RoundItem | null;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const LastRoundSection = React.memo(function LastRoundSection({
  round,
}: LastRoundSectionProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  if (!round) return null;

  const scoreText = formatUserScore(round.gameType, round.userScore);

  return (
    <View style={styles.container}>
      <SectionHeader title="Last round" />
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('ViewRound', {
            roundId: round.id,
            competitionId: round.competition?.id,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`View last round at ${round.course.name}`}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <Icon source="golf" size={24} color={colors.primary} />
        <View style={styles.text}>
          <Text
            style={[styles.courseName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {round.course.name}
          </Text>
          <Text
            style={[styles.subLabel, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {[formatDate(round.date), scoreText].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
  courseName: {
    ...typography.body,
    fontWeight: '700',
  },
  subLabel: {
    ...typography.caption,
    marginTop: 2,
  },
});
