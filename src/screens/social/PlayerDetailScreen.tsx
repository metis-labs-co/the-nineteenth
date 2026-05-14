/**
 * PlayerDetailScreen - View a friend's profile and statistics
 *
 * Shows:
 * - Player profile header (avatar, name, email, handicap)
 * - Equipped cosmetics (frame, badge, title)
 * - Achievements summary with View Achievements button
 * - Overview stats (rounds, competitions, wins)
 * - Score distribution (eagles, birdies, pars, bogeys, etc.)
 * - Best performances
 * - Recent activity
 * - Compare Stats button (navigates to CompareStatsScreen)
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  LoadingSpinner,
  PlayerAvatar,
  ErrorState,
  EmptyState,
  ConfirmationDialog,
} from '@/components/common';
import { Text, Icon } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
import { usePlayer } from '@/hooks/usePlayer';
import { useAuth } from '@/hooks/useAuth';
import { useAchievementSummary } from '@/hooks/achievements';
import { useEquippedCosmetics } from '@/hooks/cosmetics';
import {
  useFriendsWithPendingSent,
  useFriendRequests,
  useCheckCanAddFriend,
  useAddFriend,
  useAcceptFriendRequest,
} from '@/hooks/friends';
import { useConfirmationDialog } from '@/hooks';
import { useToast } from '@/context/ToastContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/social';
import { StatCard, ScoreDistributionBar } from '@/components/statistics';
import { FeatureLockButton } from '@/components/subscription/FeatureLockButton';
import { UpgradePrompt, type UpgradePromptConfig } from '@/components/subscription';
import { ProfileFrame, ProfileBadge, ProfileTitle } from '@/components/cosmetics';
import { formatDateAustralian } from '@/utils/formatting';
import { formatHandicapIndex } from '@/utils/displayHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerDetail'>;

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function PlayerDetailScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { id: playerId } = route.params;
  const { user } = useAuth();
  const { showSuccessToast } = useToast();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
  const { tier } = useSubscriptionContext();

  // Card background
  const cardBg = colors.surface;

  // Fetch player profile
  const {
    data: player,
    isLoading: isLoadingPlayer,
    error: playerError,
    refetch: refetchPlayer,
  } = usePlayer(playerId);

  // Fetch player statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
    isRefetching,
  } = usePlayerStatistics(playerId);

  // Fetch equipped cosmetics for this player
  const { data: equipped } = useEquippedCosmetics(playerId);

  // Fetch achievements summary for this player
  const { data: achievementSummary } = useAchievementSummary(playerId);

  // Friendship state
  const { data: friendsWithPending = [] } = useFriendsWithPendingSent();
  const { data: receivedRequests = [] } = useFriendRequests();
  const friendsAccess = useCheckCanAddFriend();
  const addFriend = useAddFriend();
  const acceptFriendRequest = useAcceptFriendRequest();
  const [isMutatingFriendship, setIsMutatingFriendship] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const friendship = useMemo<{
    status: 'self' | 'friend' | 'sent' | 'received' | 'none';
    friendshipId?: string;
  }>(() => {
    if (user?.id && playerId === user.id) return { status: 'self' };

    const fr = friendsWithPending.find((f) => f.id === playerId);
    if (fr?.friendship_status === 'accepted') {
      return { status: 'friend', friendshipId: fr.friendship_id };
    }
    if (fr?.friendship_status === 'pending' && fr.is_requester) {
      return { status: 'sent', friendshipId: fr.friendship_id };
    }

    const incoming = receivedRequests.find((r) => r.requester.id === playerId);
    if (incoming) return { status: 'received', friendshipId: incoming.id };

    return { status: 'none' };
  }, [friendsWithPending, receivedRequests, playerId, user?.id]);

  const showsFullProfile =
    friendship.status === 'friend' || friendship.status === 'self';

  const isLoading = isLoadingPlayer || isLoadingStats;
  const error = playerError || statsError;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetchPlayer();
    refetchStats();
  }, [refetchPlayer, refetchStats]);

  const handleCompareStats = useCallback(() => {
    if (user?.id && playerId) {
      navigation.navigate('CompareStats', {
        playerId1: user.id,
        playerId2: playerId,
      });
    }
  }, [navigation, user?.id, playerId]);

  const handleViewAchievements = useCallback(() => {
    navigation.navigate('Achievements', { playerId });
  }, [navigation, playerId]);

  const handleAddFriend = useCallback(async () => {
    if (!friendsAccess.allowed && !friendsAccess.isLoading) {
      setShowUpgradePrompt(true);
      return;
    }
    setIsMutatingFriendship(true);
    try {
      await addFriend.mutateAsync(playerId);
      showSuccessToast(
        'Friend Request Sent',
        player?.name
          ? `Request sent to ${player.name}`
          : 'Your friend request has been sent',
      );
    } catch (err) {
      showAlert(
        'Could not add friend',
        err instanceof Error ? err.message : 'Please try again later',
      );
    } finally {
      setIsMutatingFriendship(false);
    }
  }, [
    addFriend,
    friendsAccess.allowed,
    friendsAccess.isLoading,
    playerId,
    player?.name,
    showAlert,
    showSuccessToast,
  ]);

  const handleAcceptRequest = useCallback(async () => {
    if (!friendship.friendshipId) return;
    setIsMutatingFriendship(true);
    try {
      await acceptFriendRequest.mutateAsync(friendship.friendshipId);
      showSuccessToast(
        'Friend Request Accepted',
        player?.name
          ? `You and ${player.name} are now friends`
          : 'Friend request accepted',
      );
    } catch (err) {
      showAlert(
        'Could not accept request',
        err instanceof Error ? err.message : 'Please try again later',
      );
    } finally {
      setIsMutatingFriendship(false);
    }
  }, [
    acceptFriendRequest,
    friendship.friendshipId,
    player?.name,
    showAlert,
    showSuccessToast,
  ]);

  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    navigation.navigate('Subscription');
  }, [navigation]);

  const upgradePromptConfig: UpgradePromptConfig = {
    feature: 'add_friend',
    title: 'Friends Limit Reached',
    message: `You've reached the maximum number of friends on your ${tier} plan. Upgrade to grow your golf network.`,
    targetTier: tier === 'free' ? 'social' : 'premium',
    benefits:
      tier === 'free'
        ? [
            'Up to 25 friends',
            'Compare stats with friends',
            'Score distribution analytics',
            'Export your data',
          ]
        : [
            'Unlimited friends',
            'Advanced statistics',
            'All game types',
            'Team formats',
          ],
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Player Profile"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" message="Loading player profile..." />
        </View>
      </View>
    );
  }

  // Render error state
  if (error || !player) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Player Profile"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <ErrorState
          error={error instanceof Error ? error : 'An error occurred'}
          title="Unable to load player"
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  // Check if player has stats
  const hasStats = stats && stats.roundsPlayed > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Player Profile"
        variant="centered"
        showBack
        onBack={handleGoBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {/* Player Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: cardBg }, shadows.sm]}>
          <ProfileFrame frame={equipped?.frame ?? null} size={88}>
            <PlayerAvatar
              photoUrl={player.photo_url}
              name={player.name}
              size={80}
            />
          </ProfileFrame>
          <View style={styles.nameRow}>
            <Text style={[styles.playerName, { color: colors.textPrimary }]}>{player.name}</Text>
            <ProfileBadge badge={equipped?.badge ?? null} size={18} />
          </View>
          <ProfileTitle title={equipped?.title ?? null} />
          {showsFullProfile && (
            <Text style={[styles.playerEmail, { color: colors.textSecondary }]}>{player.email}</Text>
          )}
          {player.handicap !== null && player.handicap !== undefined && (
            <View style={[styles.handicapBadge, { backgroundColor: colors.primaryLighter }]}>
              <Text style={[styles.handicapText, { color: colors.primaryDark }]}>
                HC: {formatHandicapIndex(player.handicap)}
              </Text>
            </View>
          )}

          {/* Achievements Summary */}
          {achievementSummary && (
            <TouchableOpacity
              style={[styles.achievementsSummary, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleViewAchievements}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View ${player.name}'s achievements`}
            >
              <View style={styles.achievementsInfo}>
                <Icon source="trophy" size={20} color={colors.warning} />
                <Text style={[styles.achievementsText, { color: colors.textPrimary }]}>
                  {achievementSummary.total_earned} achievements
                </Text>
                <Text style={[styles.achievementsPoints, { color: colors.textSecondary }]}>
                  {achievementSummary.total_points} pts
                </Text>
              </View>
              <Icon source="chevron-right" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}

          {/* Compare Stats / Friendship Action Button */}
          {showsFullProfile ? (
            <FeatureLockButton
              feature="compare_stats"
              onPress={handleCompareStats}
              onUpgradePress={() => navigation.navigate('Subscription')}
              upgradeConfig={{
                feature: 'compare_stats',
                title: 'Compare Stats',
                message: 'Upgrade to compare your statistics with friends and see how you stack up.',
                targetTier: 'social',
                benefits: [
                  'Compare stats with any friend',
                  'Side-by-side performance analysis',
                  'Score distribution comparison',
                  'Head-to-head records',
                ],
              }}
              accessibilityLabel="Compare your stats with this player"
            >
              <View style={[styles.compareButton, { backgroundColor: colors.primary }]}>
                <Icon source="chart-bar" size={20} color={colors.white} />
                <Text style={[styles.compareButtonText, { color: colors.white }]}>Compare Stats</Text>
              </View>
            </FeatureLockButton>
          ) : (
            <FriendshipActionButton
              status={friendship.status as 'sent' | 'received' | 'none'}
              isBusy={isMutatingFriendship}
              onAdd={handleAddFriend}
              onAccept={handleAcceptRequest}
              colors={colors}
            />
          )}
        </View>

        {/* Stats sections — only shown for friends (or self) */}
        {showsFullProfile && (!hasStats ? (
          <EmptyState
            title="No statistics yet"
            message={`${player.name} hasn't completed any rounds yet. Statistics will appear once they start playing.`}
            icon="chart-line"
            compact
          />
        ) : (
          <>
            {/* Overview Stats */}
            <SectionHeader title="Overview" icon="golf" />
            <View style={styles.statsGrid}>
              <StatCard
                title="Rounds Played"
                value={stats.roundsPlayed}
                icon="flag-checkered"
                iconColor={colors.primary}
              />
              <StatCard
                title="Competitions"
                value={stats.competitionsEntered}
                icon="trophy-outline"
                iconColor={colors.warning}
              />
              <StatCard
                title="Wins"
                value={stats.competitionsWon}
                icon="trophy"
                iconColor={colors.success}
              />
              <StatCard
                title="Holes Played"
                value={stats.holesPlayed}
                icon="golf-tee"
                iconColor={colors.info}
              />
            </View>

            {/* Averages */}
            <SectionHeader title="Averages" icon="chart-line" />
            <View style={styles.statsGrid}>
              <StatCard
                title="Avg Score"
                value={stats.averageGrossScore || '-'}
                subtitle="per round"
                icon="counter"
                iconColor={colors.primary}
              />
              <StatCard
                title="Avg Points"
                value={stats.averageStablefordPoints || '-'}
                subtitle="Stableford"
                icon="star"
                iconColor={colors.warning}
              />
              <StatCard
                title="Per Hole"
                value={stats.averageScorePerHole.toFixed(2) || '-'}
                subtitle="strokes"
                icon="target"
                iconColor={colors.info}
              />
              <StatCard
                title="Par or Better"
                value={`${stats.parOrBetterPercentage}%`}
                subtitle="of holes"
                icon="check-circle"
                iconColor={colors.success}
              />
            </View>

            {/* Score Distribution */}
            <SectionHeader title="Score Distribution" icon="chart-bar" />
            <View style={[styles.distributionCard, { backgroundColor: cardBg }, shadows.sm]}>
              <ScoreDistributionBar
                label="Eagles"
                count={stats.scoreDistribution.eagles}
                total={stats.totalScoreDistribution}
                color={colors.eagle}
              />
              <ScoreDistributionBar
                label="Birdies"
                count={stats.scoreDistribution.birdies}
                total={stats.totalScoreDistribution}
                color={colors.birdie}
              />
              <ScoreDistributionBar
                label="Pars"
                count={stats.scoreDistribution.pars}
                total={stats.totalScoreDistribution}
                color={colors.par}
              />
              <ScoreDistributionBar
                label="Bogeys"
                count={stats.scoreDistribution.bogeys}
                total={stats.totalScoreDistribution}
                color={colors.bogey}
              />
              <ScoreDistributionBar
                label="Double Bogeys"
                count={stats.scoreDistribution.doubleBogeys}
                total={stats.totalScoreDistribution}
                color={colors.doubleBogey}
              />
              <ScoreDistributionBar
                label="Triple+"
                count={stats.scoreDistribution.triplePlus}
                total={stats.totalScoreDistribution}
                color={colors.error}
              />
            </View>

            {/* Best Performances */}
            <SectionHeader title="Best Performances" icon="medal" />
            <View style={[styles.performanceCard, { backgroundColor: cardBg }, shadows.sm]}>
              {stats.bestRound && (
                <View style={styles.performanceRow}>
                  <View
                    style={[
                      styles.performanceIcon,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <Icon source="trophy" size={20} color={colors.success} />
                  </View>
                  <View style={styles.performanceDetails}>
                    <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                      Best Gross Score
                    </Text>
                    <Text style={[styles.performanceValue, { color: colors.textPrimary }]}>
                      {stats.bestRound.totalGross} strokes
                    </Text>
                    <Text style={[styles.performanceSubtitle, { color: colors.textSecondary }]}>
                      {stats.bestRound.courseName} • {formatDateAustralian(stats.bestRound.date)}
                    </Text>
                  </View>
                </View>
              )}

              {stats.bestStablefordRound && (
                <View style={styles.performanceRow}>
                  <View
                    style={[
                      styles.performanceIcon,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <Icon source="star" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.performanceDetails}>
                    <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                      Best Stableford
                    </Text>
                    <Text style={[styles.performanceValue, { color: colors.textPrimary }]}>
                      {stats.bestStablefordRound.totalPoints} points
                    </Text>
                    <Text style={[styles.performanceSubtitle, { color: colors.textSecondary }]}>
                      {stats.bestStablefordRound.courseName} •{' '}
                      {formatDateAustralian(stats.bestStablefordRound.date)}
                    </Text>
                  </View>
                </View>
              )}

              {stats.birdieOrBetterPercentage > 0 && (
                <View style={styles.performanceRow}>
                  <View
                    style={[
                      styles.performanceIcon,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                  >
                    <Icon source="bird" size={20} color={colors.birdie} />
                  </View>
                  <View style={styles.performanceDetails}>
                    <Text style={[styles.performanceLabel, { color: colors.textSecondary }]}>
                      Birdie Rate
                    </Text>
                    <Text style={[styles.performanceValue, { color: colors.textPrimary }]}>
                      {stats.birdieOrBetterPercentage}%
                    </Text>
                    <Text style={[styles.performanceSubtitle, { color: colors.textSecondary }]}>
                      {stats.scoreDistribution.eagles + stats.scoreDistribution.birdies} birdies or
                      better
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Recent Rounds */}
            {stats.recentRounds.length > 0 && (
              <>
                <SectionHeader title="Recent Activity" icon="history" />
                <View style={[styles.recentCard, { backgroundColor: cardBg }, shadows.sm]}>
                  {stats.recentRounds.map((round, index) => (
                    <View
                      key={round.roundId}
                      style={[
                        styles.recentRow,
                        { borderBottomColor: colors.borderLight },
                        index === stats.recentRounds.length - 1 && styles.recentRowLast,
                      ]}
                    >
                      <View style={styles.recentDate}>
                        <Text style={[styles.recentDateText, { color: colors.textSecondary }]}>
                          {formatDateAustralian(round.date)}
                        </Text>
                      </View>
                      <View style={styles.recentDetails}>
                        <Text
                          style={[styles.recentCourse, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {round.courseName}
                        </Text>
                        <Text
                          style={[styles.recentCompetition, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {round.competitionName}
                        </Text>
                      </View>
                      <View style={styles.recentScores}>
                        <Text style={[styles.recentGross, { color: colors.textPrimary }]}>
                          {round.totalGross}
                        </Text>
                        <Text style={[styles.recentPoints, { color: colors.primary }]}>
                          {round.totalPoints} pts
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        ))}

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>

      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      <UpgradePrompt
        config={upgradePromptConfig}
        onUpgrade={handleUpgrade}
        onDismiss={() => setShowUpgradePrompt(false)}
        visible={showUpgradePrompt}
      />
    </View>
  );
}

// =====================================================
// FRIENDSHIP ACTION BUTTON
// =====================================================

function FriendshipActionButton({
  status,
  isBusy,
  onAdd,
  onAccept,
  colors,
}: {
  status: 'sent' | 'received' | 'none';
  isBusy: boolean;
  onAdd: () => void;
  onAccept: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (status === 'sent') {
    return (
      <View style={[styles.compareButton, { backgroundColor: colors.gray100 }]}>
        <Icon source="clock-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.compareButtonText, { color: colors.textSecondary }]}>
          Request Sent
        </Text>
      </View>
    );
  }

  const isAccept = status === 'received';
  const label = isAccept ? 'Accept Friend Request' : 'Add Friend';
  const icon = isAccept ? 'account-check' : 'account-plus';

  return (
    <TouchableOpacity
      onPress={isAccept ? onAccept : onAdd}
      disabled={isBusy}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.compareButton,
        { backgroundColor: colors.primary },
        isBusy && { opacity: 0.6 },
      ]}
    >
      <Icon source={icon} size={20} color={colors.white} />
      <Text style={[styles.compareButtonText, { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },

  // Profile Card
  profileCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  playerName: {
    ...typography.h2,
    textAlign: 'center',
  },
  playerEmail: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  handicapBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  handicapText: {
    ...typography.bodyBold,
  },
  achievementsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  achievementsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  achievementsText: {
    ...typography.bodyBold,
  },
  achievementsPoints: {
    ...typography.small,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    minHeight: 44,
  },
  compareButtonText: {
    ...typography.bodyBold,
  },


  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },

  // Distribution
  distributionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  // Performance Card
  performanceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  performanceIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  performanceDetails: {
    flex: 1,
  },
  performanceLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  performanceValue: {
    ...typography.h3,
    marginTop: 2,
  },
  performanceSubtitle: {
    ...typography.small,
    marginTop: 2,
  },

  // Recent Card
  recentCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  recentRowLast: {
    borderBottomWidth: 0,
  },
  recentDate: {
    width: 80,
  },
  recentDateText: {
    ...typography.small,
  },
  recentDetails: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  recentCourse: {
    ...typography.bodyBold,
  },
  recentCompetition: {
    ...typography.caption,
    marginTop: 2,
  },
  recentScores: {
    alignItems: 'flex-end',
  },
  recentGross: {
    ...typography.h4,
  },
  recentPoints: {
    ...typography.caption,
    marginTop: 2,
  },

  // Footer
  footer: {
    height: spacing.xxxl,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.lg,
  },

});
