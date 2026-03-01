/**
 * LeagueRoundCard - Card showing a tagged round in a league
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useUntagRound } from '@/hooks/useLeagues';
import { DifferentialBadge } from './DifferentialBadge';
import type { LeagueRound } from '@/types/database';

interface Props {
  round: LeagueRound;
  leagueId: string;
}

export default React.memo(function LeagueRoundCard({ round, leagueId }: Props) {
  const colors = useThemeColors();
  const untagMutation = useUntagRound(leagueId);

  const handleUntag = useCallback(() => {
    Alert.alert(
      'Remove Round',
      'This round will be removed from the league leaderboard. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            untagMutation.mutate(round.id);
          },
        },
      ]
    );
  }, [round.id, untagMutation]);

  const date = new Date(round.tagged_at);
  const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.leftSection}>
        <DifferentialBadge value={round.handicap_differential} variant="block" />
      </View>

      <View style={styles.middleSection}>
        <Text style={[styles.dateText, { color: colors.textPrimary }]}>
          Tagged {formattedDate}
        </Text>
        <Text style={[styles.diffLabel, { color: colors.textSecondary }]}>
          Handicap Differential
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleUntag}
        style={styles.untagButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Remove this round from league"
      >
        <Icon source="close-circle-outline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  leftSection: {
    alignItems: 'center',
  },
  middleSection: {
    flex: 1,
  },
  dateText: {
    ...typography.body,
  },
  diffLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  untagButton: {
    padding: spacing.xs,
  },
});
