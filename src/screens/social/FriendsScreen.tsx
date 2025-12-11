/**
 * FriendsScreen - View and manage friends list
 *
 * Displays the user's friends with:
 * - Friend list with profile info (name, photo, email, handicap)
 * - Add friend button with search modal
 * - Pending friend requests section
 * - Pull-to-refresh
 * - Navigate to friend profile for stats
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Avatar, Icon, Badge } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { useSubscriptionContext, useTierLimits } from '@/context/SubscriptionContext';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { FriendCard } from '@/components/social/FriendCard';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { UpgradePrompt, UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
import {
  useFriends,
  useFriendRequests,
  useSearchPlayers,
  useAddFriend,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useFriendsCount,
  useCheckCanAddFriend,
} from '@/hooks/useFriends';
import { isUnlimited } from '@/types/subscription.types';
import type { Friend, FriendRequest, PlayerSearchResult } from '@/types/database.types';

type FriendsScreenRouteProp = RouteProp<RootStackParamList, 'Friends'>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// =====================================================
// FRIEND REQUEST CARD COMPONENT
// =====================================================

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting: boolean;
  isDeclining: boolean;
  colors: ColorPalette;
}

const FriendRequestCard = React.memo(function FriendRequestCard({
  request,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
  colors,
}: FriendRequestCardProps) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestInfo}>
        {request.requester.photo_url ? (
          <Avatar.Image
            size={48}
            source={{ uri: request.requester.photo_url }}
            style={{ backgroundColor: colors.primary }}
          />
        ) : (
          <Avatar.Icon
            size={48}
            icon="account"
            style={{ backgroundColor: colors.primary }}
          />
        )}
        <View style={styles.requestTextInfo}>
          <Text style={[styles.requestName, { color: colors.textPrimary }]} numberOfLines={1}>
            {request.requester.name}
          </Text>
          <Text style={[styles.requestEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {request.requester.email}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.requestButton, { backgroundColor: colors.gray100 }]}
          onPress={onDecline}
          disabled={isDeclining}
          accessibilityRole="button"
          accessibilityLabel="Decline friend request"
        >
          {isDeclining ? (
            <ActivityIndicator size="small" color={colors.gray600} />
          ) : (
            <Icon source="close" size={20} color={colors.gray600} />
          )}
        </Pressable>
        <Pressable
          style={[styles.requestButton, { backgroundColor: colors.success }]}
          onPress={onAccept}
          disabled={isAccepting}
          accessibilityRole="button"
          accessibilityLabel="Accept friend request"
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Icon source="check" size={20} color={colors.white} />
          )}
        </Pressable>
      </View>
    </View>
  );
});

// =====================================================
// SEARCH RESULT CARD COMPONENT
// =====================================================

interface SearchResultCardProps {
  player: PlayerSearchResult;
  onAddFriend: () => void;
  isAdding: boolean;
  colors: ColorPalette;
}

const SearchResultCard = React.memo(function SearchResultCard({
  player,
  onAddFriend,
  isAdding,
  colors,
}: SearchResultCardProps) {
  const getStatusText = () => {
    if (player.is_friend) return 'Friends';
    if (player.has_pending_request) {
      return player.request_direction === 'sent' ? 'Request Sent' : 'Respond';
    }
    return null;
  };

  const statusText = getStatusText();
  const canAdd = !player.is_friend && !player.has_pending_request;

  return (
    <View style={styles.searchResultCard}>
      {player.photo_url ? (
        <Avatar.Image
          size={48}
          source={{ uri: player.photo_url }}
          style={{ backgroundColor: colors.primary }}
        />
      ) : (
        <Avatar.Icon
          size={48}
          icon="account"
          style={{ backgroundColor: colors.primary }}
        />
      )}
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, { color: colors.textPrimary }]} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={[styles.searchResultEmail, { color: colors.textSecondary }]} numberOfLines={1}>
          {player.email}
        </Text>
        {player.handicap !== null && player.handicap !== undefined && (
          <Text style={[styles.searchResultHandicap, { color: colors.primary }]}>
            HC: {player.handicap}
          </Text>
        )}
      </View>
      {statusText ? (
        <View style={[styles.statusBadge, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>{statusText}</Text>
        </View>
      ) : canAdd ? (
        <Pressable
          style={[{ backgroundColor: colors.primary }, styles.addButton, isAdding && styles.addButtonDisabled]}
          onPress={onAddFriend}
          disabled={isAdding}
          accessibilityRole="button"
          accessibilityLabel={`Add ${player.name} as friend`}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Icon source="account-plus" size={20} color={colors.white} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
});

// =====================================================
// ADD FRIEND MODAL COMPONENT
// =====================================================

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  canAddFriend: boolean;
  onAtLimitError: () => void;
}

function AddFriendModal({ visible, onClose, canAddFriend, onAtLimitError }: AddFriendModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [addingPlayerId, setAddingPlayerId] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchPlayers(searchQuery);
  const addFriend = useAddFriend();

  const handleAddFriend = useCallback(async (playerId: string) => {
    // Check if user can add more friends before proceeding
    if (!canAddFriend) {
      onAtLimitError();
      return;
    }

    setAddingPlayerId(playerId);
    try {
      await addFriend.mutateAsync(playerId);
      // Clear search and show success
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to add friend:', error);
      // Show error alert
      Alert.alert(
        'Could not add friend',
        error instanceof Error ? error.message : 'Please try again later'
      );
    } finally {
      setAddingPlayerId(null);
    }
  }, [addFriend, canAddFriend, onAtLimitError]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { paddingTop: insets.top, backgroundColor: colors.white }]}
      >
        {/* Modal Header */}
        <View style={[styles.modalHeader, { backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Friend</Text>
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon source="close" size={24} color={colors.gray600} />
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { borderBottomColor: colors.gray100 }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.gray50 }]}>
            <Icon source="magnify" size={20} color={colors.gray400} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search by name..."
              placeholderTextColor={colors.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search for friends by name"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Icon source="close-circle" size={20} color={colors.gray400} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Search Results */}
        <View style={styles.searchResults}>
          {searchQuery.length < 2 ? (
            <View style={styles.searchPrompt}>
              <Icon source="account-search" size={48} color={colors.gray300} />
              <Text style={[styles.searchPromptText, { color: colors.textSecondary }]}>
                Enter at least 2 characters to search
              </Text>
            </View>
          ) : isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : searchResults && searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SearchResultCard
                  player={item}
                  onAddFriend={() => handleAddFriend(item.id)}
                  isAdding={addingPlayerId === item.id}
                  colors={colors}
                />
              )}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.gray100 }]} />}
              contentContainerStyle={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={styles.noResults}>
              <Icon source="account-question" size={48} color={colors.gray300} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                No players found matching "{searchQuery}"
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =====================================================
// MAIN FRIENDS SCREEN COMPONENT
// =====================================================

export default function FriendsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FriendsScreenRouteProp>();
  const showBackButton = route.params?.fromProfile ?? false;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [acceptingRequestId, setAcceptingRequestId] = useState<string | null>(null);
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Subscription tier limits
  const tierLimits = useTierLimits();
  const { tier } = useSubscriptionContext();
  const friendsAccess = useCheckCanAddFriend();
  const { data: friendsCount = 0 } = useFriendsCount();

  // Get max friends limit from tier limits
  const maxFriends = tierLimits?.maxFriends ?? 5; // Default to free tier limit
  const hasUnlimitedFriends = isUnlimited(maxFriends);

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

  // Mutations
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  const isLoading = isLoadingFriends || isLoadingRequests;
  const isRefreshing = isRefetchingFriends || isRefetchingRequests;

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

  // Filter friends based on search query
  const filteredFriends = React.useMemo(() => {
    if (!friends || searchQuery.length === 0) {
      return friends ?? [];
    }
    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.name?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const handleRefresh = useCallback(() => {
    refetchFriends();
    refetchRequests();
  }, [refetchFriends, refetchRequests]);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    setAcceptingRequestId(requestId);
    try {
      await acceptRequest.mutateAsync(requestId);
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setAcceptingRequestId(null);
    }
  }, [acceptRequest]);

  const handleDeclineRequest = useCallback(async (requestId: string) => {
    setDecliningRequestId(requestId);
    try {
      await declineRequest.mutateAsync(requestId);
    } catch (error) {
      console.error('Failed to decline request:', error);
    } finally {
      setDecliningRequestId(null);
    }
  }, [declineRequest]);

  const handleRemoveFriend = useCallback(async (friendshipId: string) => {
    try {
      await removeFriend.mutateAsync(friendshipId);
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  }, [removeFriend]);

  const handleFriendPress = useCallback((friendId: string) => {
    navigation.navigate('PlayerDetail', { id: friendId });
  }, [navigation]);

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
          <ActivityIndicator size="large" color={colors.primary} />
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
  const hasFilteredFriends = filteredFriends.length > 0;
  const hasRequests = friendRequests && friendRequests.length > 0;
  const isSearchActive = searchQuery.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Friends"
        showBack={showBackButton}
        onBack={() => navigation.goBack()}
        rightActions={headerRightActions}
      />

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search friends..."
        accessibilityLabel="Search friends by name or email"
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
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Friends Limit Indicator */}
        <View style={styles.limitIndicatorContainer}>
          <LimitIndicator
            current={acceptedFriendsCount}
            max={maxFriends}
            label="Friends"
            showBar={true}
            testID="friends-limit-indicator"
          />
        </View>

        {/* Friend Requests Section */}
        {hasRequests && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Friend Requests</Text>
              <Badge size={20} style={{ backgroundColor: colors.primary }}>
                {friendRequests.length}
              </Badge>
            </View>
            <View style={[styles.requestsContainer, { backgroundColor: colors.white }]}>
              {friendRequests.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  onAccept={() => handleAcceptRequest(request.id)}
                  onDecline={() => handleDeclineRequest(request.id)}
                  isAccepting={acceptingRequestId === request.id}
                  isDeclining={decliningRequestId === request.id}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {/* Friends List Section */}
        {hasFriends ? (
          hasFilteredFriends ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {isSearchActive
                  ? `${filteredFriends.length} ${filteredFriends.length === 1 ? 'Result' : 'Results'}`
                  : `${friends.length} ${friends.length === 1 ? 'Friend' : 'Friends'}`}
              </Text>
              <View style={styles.friendsList}>
                {filteredFriends.map((friend) => (
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
              title="No friends found"
              message={`No friends match "${searchQuery}"`}
              icon="account-search-outline"
            />
          )
        ) : (
          <EmptyState
            title="No friends yet"
            message="Add friends to track scores together and see their playing stats"
            icon="account-group-outline"
            actionLabel="Add Friend"
            onAction={handleAddFriendPress}
          />
        )}
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

// =====================================================
// STYLES
// =====================================================

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
  limitIndicatorContainer: {
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
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  badge: {
    marginLeft: spacing.sm,
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
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestTextInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  requestName: {
    ...typography.bodyBold,
  },
  requestEmail: {
    ...typography.caption,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h3,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  searchResults: {
    flex: 1,
  },
  searchPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  searchPromptText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  noResultsText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  searchResultsList: {
    padding: spacing.lg,
  },
  separator: {
    height: 1,
    marginVertical: spacing.sm,
  },

  // Search Result Card
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  searchResultName: {
    ...typography.bodyBold,
  },
  searchResultEmail: {
    ...typography.caption,
  },
  searchResultHandicap: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    ...typography.caption,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
});
