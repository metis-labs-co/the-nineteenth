/**
 * ChallengeDetailScreen - Detail view for a ladder challenge
 *
 * Shows challenge status, both players' round status, and result.
 * Allows submitting a scorecard to an accepted challenge.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { DifferentialBadge } from '@/components/leagues/DifferentialBadge';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  useChallenge,
  useRespondToChallenge,
  useCancelChallenge,
} from '@/hooks/useLeagues';
import { TouchableOpacity } from 'react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChallengeRoute = RouteProp<RootStackParamList, 'ChallengeDetail'>;

export default function ChallengeDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChallengeRoute>();
  const { user } = useAuth();
  const { challengeId, leagueId } = route.params;

  const { data: challenge, isLoading } = useChallenge(challengeId);
  const respondMutation = useRespondToChallenge(leagueId);
  const cancelMutation = useCancelChallenge(leagueId);

  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isChallenger = challenge?.challenger_id === user?.id;
  const isChallenged = challenge?.challenged_id === user?.id;

  const handleAccept = useCallback(async () => {
    try {
      await respondMutation.mutateAsync({ challengeId, accept: true });
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
    }
  }, [respondMutation, challengeId]);

  const handleDecline = useCallback(() => {
    setShowDeclineDialog(true);
  }, []);

  const confirmDecline = useCallback(async () => {
    setShowDeclineDialog(false);
    try {
      await respondMutation.mutateAsync({ challengeId, accept: false });
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
    }
  }, [respondMutation, challengeId, navigation]);

  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    setShowCancelDialog(false);
    try {
      await cancelMutation.mutateAsync(challengeId);
      navigation.goBack();
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
    }
  }, [cancelMutation, challengeId, navigation]);

  const handleSubmitRound = useCallback(() => {
    // Navigate to tag round screen which can be adapted for challenge submission
    navigation.navigate('TagRoundToLeague', { leagueId });
  }, [navigation, leagueId]);

  if (isLoading || !challenge) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Challenge" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  const statusLabel = {
    pending: 'Awaiting Response',
    accepted: 'In Progress',
    completed: 'Completed',
    declined: 'Declined',
    expired: 'Expired',
    cancelled: 'Cancelled',
  }[challenge.status] ?? challenge.status;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Challenge" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {/* Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.statusValue, { color: colors.textPrimary }]}>{statusLabel}</Text>
          {challenge.deadline && challenge.status === 'accepted' && (
            <Text style={[styles.deadline, { color: colors.textSecondary }]}>
              Deadline: {new Date(challenge.deadline).toLocaleDateString(undefined)}
            </Text>
          )}
        </View>

        {/* Players */}
        <View style={styles.playersSection}>
          {/* Challenger */}
          <View style={[styles.playerCard, { backgroundColor: colors.surface, borderColor: isChallenger ? colors.primary : colors.border }]}>
            <View style={styles.playerHeader}>
              <Text style={[styles.playerRole, { color: colors.textSecondary }]}>Challenger</Text>
              <Text style={[styles.position, { color: colors.textSecondary }]}>
                #{challenge.challenger_position}
              </Text>
            </View>
            <Text style={[styles.playerName, { color: colors.textPrimary }]}>
              {challenge.challenger_name}
              {isChallenger ? ' (You)' : ''}
            </Text>
            {challenge.challenger_differential != null ? (
              <View style={styles.differentialRow}>
                <DifferentialBadge value={challenge.challenger_differential} variant="block" />
                <Text style={[styles.submittedLabel, { color: colors.success }]}>Submitted</Text>
              </View>
            ) : challenge.status === 'accepted' ? (
              <Text style={[styles.pendingLabel, { color: colors.warning }]}>Round not yet submitted</Text>
            ) : null}
          </View>

          <View style={styles.vsSection}>
            <Text style={[styles.vsText, { color: colors.textSecondary }]}>VS</Text>
          </View>

          {/* Challenged */}
          <View style={[styles.playerCard, { backgroundColor: colors.surface, borderColor: isChallenged ? colors.primary : colors.border }]}>
            <View style={styles.playerHeader}>
              <Text style={[styles.playerRole, { color: colors.textSecondary }]}>Defender</Text>
              <Text style={[styles.position, { color: colors.textSecondary }]}>
                #{challenge.challenged_position}
              </Text>
            </View>
            <Text style={[styles.playerName, { color: colors.textPrimary }]}>
              {challenge.challenged_name}
              {isChallenged ? ' (You)' : ''}
            </Text>
            {challenge.challenged_differential != null ? (
              <View style={styles.differentialRow}>
                <DifferentialBadge value={challenge.challenged_differential} variant="block" />
                <Text style={[styles.submittedLabel, { color: colors.success }]}>Submitted</Text>
              </View>
            ) : challenge.status === 'accepted' ? (
              <Text style={[styles.pendingLabel, { color: colors.warning }]}>Round not yet submitted</Text>
            ) : null}
          </View>
        </View>

        {/* Winner */}
        {challenge.status === 'completed' && challenge.winner_id && (
          <View style={[styles.winnerCard, { backgroundColor: colors.successLight }]}>
            <Icon source="trophy" size={24} color={colors.success} />
            <View style={styles.winnerInfo}>
              <Text style={[styles.winnerLabel, { color: colors.success }]}>Winner</Text>
              <Text style={[styles.winnerName, { color: colors.textPrimary }]}>
                {challenge.winner_id === challenge.challenger_id
                  ? challenge.challenger_name
                  : challenge.challenged_name}
              </Text>
              {challenge.winner_id === challenge.challenger_id && (
                <Text style={[styles.swapNote, { color: colors.textSecondary }]}>
                  Positions swapped
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Respond to pending challenge */}
          {isChallenged && challenge.status === 'pending' && (
            <>
              <TouchableOpacity
                onPress={handleAccept}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionText, { color: colors.white }]}>Accept Challenge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDecline}
                style={[styles.actionButton, { backgroundColor: colors.errorLight }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionText, { color: colors.error }]}>Decline</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Cancel pending challenge */}
          {isChallenger && challenge.status === 'pending' && (
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.actionButton, { backgroundColor: colors.errorLight }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: colors.error }]}>Cancel Challenge</Text>
            </TouchableOpacity>
          )}

          {/* Submit round for accepted challenge */}
          {challenge.status === 'accepted' && (
            (isChallenger && !challenge.challenger_scorecard_id) ||
            (isChallenged && !challenge.challenged_scorecard_id)
          ) && (
            <TouchableOpacity
              onPress={handleSubmitRound}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.7}
            >
              <Icon source="golf" size={20} color={colors.white} />
              <Text style={[styles.actionText, { color: colors.white }]}>Submit Your Round</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="information-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Both players play any round at any course and tag it. The lower handicap differential wins. Ties go to the defender.
          </Text>
        </View>
      </ScrollView>

      <ConfirmationDialog
        visible={showDeclineDialog}
        title="Decline Challenge"
        message="Are you sure you want to decline this challenge?"
        confirmLabel="Decline"
        confirmVariant="destructive"
        onConfirm={confirmDecline}
        onCancel={() => setShowDeclineDialog(false)}
      />
      <ConfirmationDialog
        visible={showCancelDialog}
        title="Cancel Challenge"
        message="Are you sure you want to cancel this challenge?"
        confirmLabel="Cancel Challenge"
        confirmVariant="destructive"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statusCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusLabel: {
    ...typography.small,
  },
  statusValue: {
    ...typography.h3,
    marginTop: spacing.xs,
  },
  deadline: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  playersSection: {
    gap: spacing.sm,
  },
  playerCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerRole: {
    ...typography.smallBold,
  },
  position: {
    ...typography.small,
  },
  playerName: {
    ...typography.h4,
    marginTop: spacing.xs,
  },
  differentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  submittedLabel: {
    ...typography.smallBold,
  },
  pendingLabel: {
    ...typography.small,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  vsSection: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  vsText: {
    ...typography.bodyBold,
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerLabel: {
    ...typography.smallBold,
  },
  winnerName: {
    ...typography.h4,
    marginTop: spacing.xs,
  },
  swapNote: {
    ...typography.small,
    marginTop: 2,
  },
  actions: {
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  actionText: {
    ...typography.bodyBold,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
});
