/**
 * ChallengeCard - Active/completed challenge card for ladder leagues
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { DifferentialBadge } from '@/components/leagues/DifferentialBadge';
import type { LadderChallengeWithPlayers } from '@/types/database';

interface ChallengeCardProps {
  challenge: LadderChallengeWithPlayers;
  currentUserId: string | undefined;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Awaiting Response', color: 'warning', icon: 'clock-outline' },
  accepted: { label: 'In Progress', color: 'primary', icon: 'sword-cross' },
  completed: { label: 'Completed', color: 'success', icon: 'check-circle-outline' },
  declined: { label: 'Declined', color: 'error', icon: 'close-circle-outline' },
  expired: { label: 'Expired', color: 'textSecondary', icon: 'timer-off-outline' },
  cancelled: { label: 'Cancelled', color: 'textSecondary', icon: 'cancel' },
};

export default React.memo(function ChallengeCard({
  challenge,
  currentUserId,
  onPress,
  onAccept,
  onDecline,
}: ChallengeCardProps) {
  const colors = useThemeColors();

  const statusConfig = STATUS_CONFIG[challenge.status] ?? STATUS_CONFIG.pending;
  const statusColor = colors[statusConfig.color as keyof typeof colors] ?? colors.textSecondary;

  const isChallenger = challenge.challenger_id === currentUserId;
  const isChallenged = challenge.challenged_id === currentUserId;
  const canRespond = isChallenged && challenge.status === 'pending';

  const challengerSubmitted = challenge.challenger_scorecard_id != null;
  const challengedSubmitted = challenge.challenged_scorecard_id != null;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      {/* Status Badge */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Icon source={statusConfig.icon} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusConfig.label}
          </Text>
        </View>
        {challenge.status === 'accepted' && challenge.deadline && (
          <Text style={[styles.deadline, { color: colors.textSecondary }]}>
            {formatDeadline(challenge.deadline)}
          </Text>
        )}
      </View>

      {/* Players Row */}
      <View style={styles.playersRow}>
        {/* Challenger */}
        <View style={styles.playerSide}>
          <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>
            #{challenge.challenger_position}
          </Text>
          <Text style={[
            styles.playerName,
            { color: colors.textPrimary },
            isChallenger && styles.currentUser,
          ]} numberOfLines={1}>
            {challenge.challenger_name}
            {isChallenger ? ' (You)' : ''}
          </Text>
          {challenge.challenger_differential != null ? (
            <DifferentialBadge value={challenge.challenger_differential} variant="inline" />
          ) : challengerSubmitted ? (
            <Icon source="check" size={16} color={colors.success} />
          ) : challenge.status === 'accepted' ? (
            <Text style={[styles.waiting, { color: colors.textSecondary }]}>Pending</Text>
          ) : null}
        </View>

        {/* VS */}
        <View style={styles.vsContainer}>
          <Text style={[styles.vs, { color: colors.textSecondary }]}>vs</Text>
        </View>

        {/* Challenged */}
        <View style={[styles.playerSide, styles.playerSideRight]}>
          <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>
            #{challenge.challenged_position}
          </Text>
          <Text style={[
            styles.playerName,
            { color: colors.textPrimary },
            isChallenged && styles.currentUser,
          ]} numberOfLines={1}>
            {challenge.challenged_name}
            {isChallenged ? ' (You)' : ''}
          </Text>
          {challenge.challenged_differential != null ? (
            <DifferentialBadge value={challenge.challenged_differential} variant="inline" />
          ) : challengedSubmitted ? (
            <Icon source="check" size={16} color={colors.success} />
          ) : challenge.status === 'accepted' ? (
            <Text style={[styles.waiting, { color: colors.textSecondary }]}>Pending</Text>
          ) : null}
        </View>
      </View>

      {/* Winner */}
      {challenge.status === 'completed' && challenge.winner_id && (
        <View style={[styles.winnerRow, { backgroundColor: colors.successLight }]}>
          <Icon source="trophy" size={16} color={colors.success} />
          <Text style={[styles.winnerText, { color: colors.success }]}>
            {challenge.winner_id === challenge.challenger_id
              ? challenge.challenger_name
              : challenge.challenged_name} wins
            {challenge.winner_id === challenge.challenger_id && ' — positions swapped'}
          </Text>
        </View>
      )}

      {/* Accept/Decline Buttons */}
      {canRespond && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={onDecline}
            style={[styles.actionButton, { backgroundColor: colors.errorLight }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.error }]}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAccept}
            style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, { color: colors.white }]}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
});

function formatDeadline(deadline: string): string {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const hoursLeft = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (hoursLeft <= 0) return 'Expired';
  if (hoursLeft < 24) return `${Math.ceil(hoursLeft)}h left`;
  return `${Math.ceil(hoursLeft / 24)}d left`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.smallBold,
  },
  deadline: {
    ...typography.small,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerSide: {
    flex: 1,
    gap: 2,
  },
  playerSideRight: {
    alignItems: 'flex-end',
  },
  positionLabel: {
    ...typography.small,
  },
  playerName: {
    ...typography.bodyBold,
  },
  currentUser: {
    fontWeight: '700',
  },
  waiting: {
    ...typography.small,
    fontStyle: 'italic',
  },
  vsContainer: {
    paddingHorizontal: spacing.md,
  },
  vs: {
    ...typography.smallBold,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  winnerText: {
    ...typography.smallBold,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {},
  actionText: {
    ...typography.smallBold,
  },
});
