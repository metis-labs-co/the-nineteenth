/**
 * FriendsScreen - View and manage friends list
 *
 * Displays the user's friends with:
 * - Tabbed interface: Friends | Requests
 * - Friend list with profile info (name, photo, email, handicap)
 * - Add friend button with search modal
 * - Pending friend requests (received and sent)
 * - Pull-to-refresh
 * - Navigate to friend profile for stats
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LoadingSpinner } from '@/components/common';
import { Text, Badge, Icon } from 'react-native-paper';
import { createModuleLogger } from '@/utils/debugLogger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext, useTierLimits } from '@/context/SubscriptionContext';
import { EmptyState, Tabs } from '@/components/common';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { FriendCard } from '@/components/social/FriendCard';
import { FriendRequestCard } from '@/components/social/FriendRequestCard';
import { SentRequestCard } from '@/components/social/SentRequestCard';
import { AddFriendModal } from '@/components/social/AddFriendModal';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { UpgradePrompt } from '@/components/subscription';
import type { UpgradePromptConfig } from '@/components/subscription';
import {
  useFriends,
  useFriendRequests,
  useSentFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useCancelFriendRequest,
  useRemoveFriend,
  useFriendsCount,
  useCheckCanAddFriend,
} from '@/hooks/useFriends';

const logger = createModuleLogger('FriendsScreen');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'friends' | 'requests';

export default function FriendsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  // Friends is always pushed from another screen (Profile, Home, etc.) — show
  // a back button unconditionally so the user can return to where they came
  // from. The `fromProfile` route param is retained for compatibility but no
  // longer gates the back button.
  const showBackButton = true;

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  // Subscription tier limits
  const tierLimits = useTierLimits();
  const { tier } = useSubscriptionContext();
  const friendsAccess = useCheckCanAddFriend();
  const { data: friendsCount = 0 } = useFriendsCount();

  // Get max friends limit from tier limits
  const maxFriends = tierLimits?.maxFriends ?? 5; // Default to free tier limit

  // Data fetching
  const {
    data: friends,
    isLoading: isLoadingFriends,
    error: friendsError,
    refetch: refetchFriends,
    isRefetching: isRefetchingFriends,
  } = useFriends();

  const {
    data: friendRequests,
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
    isRefetching: isRefetchingRequests,
  } = useFriendRequests();

  const {
    data: sentRequests,
    isLoading: isLoadingSent,
    refetch: refetchSent,
    isRefetching: isRefetchingSent,
  } = useSentFriendRequests();

  // Mutations
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeFriend = useRemoveFriend();

  const isLoading = isLoadingFriends || isLoadingRequests || isLoadingSent;
  const isRefreshing = isRefetchingFriends || isRefetchingRequests || isRefetchingSent;

  // Count only accepted friends for limit display
  const acceptedFriendsCount = friendsCount;

  // Upgrade prompt config for friends limit
  const upgradePromptConfig: UpgradePromptConfig = {
    feature: 'add_friend',
    title: 'Friends Limit Reached',
    message: `You've reached the maximum of ${maxFriends} friends on your ${tier} plan. Upgrade to add more friends and grow your golf network.`,
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

  // Handle add friend button press - check tier limits first
  const handleAddFriendPress = useCallback(() => {
    if (!friendsAccess.allowed && !friendsAccess.isLoading) {
      setShowUpgradePrompt(true);
    } else {
      setShowAddModal(true);
    }
  }, [friendsAccess.allowed, friendsAccess.isLoading]);

  // Handle upgrade navigation
  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    navigation.navigate('Subscription');
  }, [navigation]);

  // Handle at-limit error from modal
  const handleAtLimitError = useCallback(() => {
    setShowAddModal(false);
    setShowUpgradePrompt(true);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchFriends();
    refetchRequests();
    refetchSent();
  }, [refetchFriends, refetchRequests, refetchSent]);

  const handleAcceptRequest = useCallback(
    async (requestId: string) => {
      setAcceptingRequestId(requestId);
      try {
        await acceptRequest.mutateAsync(requestId);
      } catch (error) {
        logger.error('Failed to accept request', error);
      } finally {
        setAcceptingRequestId(null);
      }
    },
    [acceptRequest]
  );

  const handleDeclineRequest = useCallback(
    async (requestId: string) => {
      setDecliningRequestId(requestId);
      try {
        await declineRequest.mutateAsync(requestId);
      } catch (error) {
        logger.error('Failed to decline request', error);
      } finally {
        setDecliningRequestId(null);
      }
    },
    [declineRequest]
  );

  const handleCancelRequest = useCallback(
    async (requestId: string) => {
      setCancellingRequestId(requestId);
      try {
        await cancelRequest.mutateAsync(requestId);
      } catch (error) {
        logger.error('Failed to cancel request', error);
      } finally {
        setCancellingRequestId(null);
      }
    },
    [cancelRequest]
  );

  const handleRemoveFriend = useCallback(
    async (friendshipId: string) => {
      try {
        await removeFriend.mutateAsync(friendshipId);
      } catch (error) {
        logger.error('Failed to remove friend', error);
      }
    },
    [removeFriend]
  );

  const handleFriendPress = useCallback(
    (friendId: string) => {
      navigation.navigate('PlayerDetail', { id: friendId });
    },
    [navigation]
  );

  // Build header right action
  const headerRightActions = [
    {
      icon: 'account-plus',
      onPress: handleAddFriendPress,
      accessibilityLabel: 'Add friend',
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Friends"
          showBack={showBackButton}
          onBack={() => navigation.goBack()}
          rightActions={headerRightActions}
        />
        <View style={[styles.centerContent, { flex: 1 }]}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  // Error state
  if (friendsError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Friends"
          showBack={showBackButton}
          onBack={() => navigation.goBack()}
          rightActions={headerRightActions}
        />
        <ErrorState
          error={friendsError}
          onRetry={handleRefresh}
          title="Couldn't load friends"
        />
      </View>
    );
  }

  const hasFriends = friends && friends.length > 0;
  const hasReceivedRequests = friendRequests && friendRequests.length > 0;
  const hasSentRequests = sentRequests && sentRequests.length > 0;

  // Friends tab content
  const FriendsTabContent = () => (
    <>
      {/* Friends Limit Indicator */}
      <View style={styles.limitIndicatorContainer}>
        <LimitIndicator
          current={acceptedFriendsCount}
          max={maxFriends}
          label="Friends"
          showBar={false}
          testID="friends-limit-indicator"
        />
      </View>

      {/* Add Friends Button */}
      <TouchableOpacity
        style={[
          styles.addFriendsButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={handleAddFriendPress}
        accessibilityRole="button"
        accessibilityLabel="Add friends"
      >
        <Icon source="account-plus" size={20} color={colors.primary} />
        <Text style={[styles.addFriendsButtonText, { color: colors.textPrimary }]}>
          Add Friends
        </Text>
      </TouchableOpacity>

      {/* Friends List Section */}
      {hasFriends ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {`${friends.length} ${friends.length === 1 ? 'Friend' : 'Friends'}`}
          </Text>
          <View style={styles.friendsList}>
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onPress={() => handleFriendPress(friend.id)}
                onRemove={() => handleRemoveFriend(friend.friendship_id)}
              />
            ))}
          </View>
        </View>
      ) : (
        <EmptyState
          title="No friends yet"
          message="Add friends to track scores together and see their playing stats"
          icon="account-group-outline"
          actionLabel="Add Friend"
          onAction={handleAddFriendPress}
        />
      )}
    </>
  );

  // Requests tab content
  const RequestsTabContent = () => (
    <>
      {/* Received Requests Section */}
      {hasReceivedRequests && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]}>
              Received
            </Text>
            <Badge size={20} style={{ backgroundColor: colors.primary }}>
              {friendRequests.length}
            </Badge>
          </View>
          <View style={[styles.requestsContainer, { backgroundColor: colors.surface }]}>
            {friendRequests.map((request) => (
              <FriendRequestCard
                key={request.id}
                request={request}
                onAccept={() => handleAcceptRequest(request.id)}
                onDecline={() => handleDeclineRequest(request.id)}
                isAccepting={acceptingRequestId === request.id}
                isDeclining={decliningRequestId === request.id}
              />
            ))}
          </View>
        </View>
      )}

      {/* Sent Requests Section */}
      {hasSentRequests && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]}>
              Sent
            </Text>
            <Badge size={20} style={{ backgroundColor: colors.gray300 }}>
              {sentRequests.length}
            </Badge>
          </View>
          <View style={[styles.requestsContainer, { backgroundColor: colors.surface }]}>
            {sentRequests.map((request) => (
              <SentRequestCard
                key={request.id}
                request={request}
                onCancel={() => handleCancelRequest(request.id)}
                isCancelling={cancellingRequestId === request.id}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty state for requests */}
      {!hasReceivedRequests && !hasSentRequests && (
        <EmptyState
          title="No pending requests"
          message="Friend requests you send or receive will appear here"
          icon="account-clock-outline"
          actionLabel="Add Friend"
          onAction={handleAddFriendPress}
        />
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Friends"
        showBack={showBackButton}
        onBack={() => navigation.goBack()}
        rightActions={headerRightActions}
      />

      {/* Tab Bar */}
      <Tabs
        tabs={[
          { key: 'friends', label: 'Friends', count: friends?.length || 0 },
          {
            key: 'requests',
            label: 'Requests',
            count: (friendRequests?.length ?? 0) + (sentRequests?.length ?? 0),
          },
        ]}
        selectedTab={activeTab}
        onTabChange={setActiveTab}
        style={styles.tabContainer}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
      >
        {activeTab === 'friends' ? <FriendsTabContent /> : <RequestsTabContent />}
      </ScrollView>

      {/* Add Friend Modal */}
      <AddFriendModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        canAddFriend={friendsAccess.allowed}
        onAtLimitError={handleAtLimitError}
      />

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        config={upgradePromptConfig}
        onUpgrade={handleUpgrade}
        onDismiss={() => setShowUpgradePrompt(false)}
        visible={showUpgradePrompt}
        testID="friends-upgrade-prompt"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },

  // Tab Bar
  tabContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  // Content sections
  limitIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionHeaderTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Add Friends button
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  addFriendsButtonText: {
    ...typography.bodyBold,
  },

  // Friends List
  friendsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  // Friend Requests
  requestsContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    padding: spacing.md,
  },
});
