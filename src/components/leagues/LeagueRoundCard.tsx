/**
 * LeagueRoundCard - Card showing a tagged round in a league
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useUntagRound } from '@/hooks/useLeagues';
import { ConfirmationDialog } from '@/components/common';
import { DifferentialBadge } from './DifferentialBadge';
import { useOpenRound } from '@/navigation/openRound';
import type { LeagueRound } from '@/types/database';

interface Props {
  round: LeagueRound;
  leagueId: string;
}

export default React.memo(function LeagueRoundCard({ round, leagueId }: Props) {
  const colors = useThemeColors();
  const untagMutation = useUntagRound(leagueId);
  const openRound = useOpenRound();
  const roundId = round.round_id;
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleUntag = useCallback(() => {
    setShowRemoveDialog(true);
  }, []);

  const confirmUntag = useCallback(() => {
    setShowRemoveDialog(false);
    untagMutation.mutate(round.id);
  }, [round.id, untagMutation]);

  const date = new Date(round.tagged_at);
  const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={
          roundId
            ? () => openRound({ roundId, competitionId: round.competition_id })
            : undefined
        }
        disabled={!roundId}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Differential ${round.handicap_differential}, tagged ${formattedDate}. Opens round`}
      >
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
      </TouchableOpacity>

      <ConfirmationDialog
        visible={showRemoveDialog}
        title="Remove Round"
        message="This round will be removed from the league leaderboard. Continue?"
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={confirmUntag}
        onCancel={() => setShowRemoveDialog(false)}
      />
    </>
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
