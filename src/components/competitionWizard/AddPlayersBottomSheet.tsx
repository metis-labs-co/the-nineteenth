/**
 * AddPlayersBottomSheet - Slide-up drawer for adding players to a competition
 *
 * Features:
 * - Slides up from bottom of screen
 * - Search all players in the database
 * - Quick-add friends section
 * - Multi-select players with chips display
 * - Backdrop dismissal
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Text,
  Avatar,
  Chip,
  Icon,
  Divider,
} from 'react-native-paper';
import { LoadingSpinner, GolfBallLoader, BottomSheet, SearchBar } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { supabase } from '@/services/supabase/client';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { LimitIndicator } from '@/components/subscription';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { Friend } from '@/types/database.types';

interface AddPlayersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  competitionId: string;
  existingPlayerIds: string[];
  /**
   * Maximum number of players allowed based on subscription tier
   * Use undefined or -1/-2 for unlimited
   */
  maxPlayers?: number;
  /**
   * Current player count in the competition (existing players)
   */
  currentPlayerCount?: number;
}

interface PlayerResult {
  id: string;
  name: string;
  email: string | null;
  handicap: number | null;
  photo_url: string | null;
}

export default function AddPlayersBottomSheet({
  visible,
  onClose,
  competitionId,
  existingPlayerIds,
  maxPlayers,
  currentPlayerCount = 0,
}: AddPlayersBottomSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerResult[]>([]);

  // Calculate if we have unlimited players (no limit)
  const hasUnlimitedPlayers =
    maxPlayers === undefined || isUnlimited(maxPlayers) || isNoLimit(maxPlayers);

  // Calculate remaining slots (how many more players can be added)
  const remainingSlots = hasUnlimitedPlayers
    ? Infinity
    : Math.max(0, maxPlayers - currentPlayerCount);

  // Total player count including selected players
  const totalWithSelected = currentPlayerCount + selectedPlayers.length;

  // Whether we're at the limit with current selections
  const isAtLimit = !hasUnlimitedPlayers && totalWithSelected >= maxPlayers;

  // Whether adding another player would exceed the limit
  const canAddMorePlayers =
    hasUnlimitedPlayers || totalWithSelected < maxPlayers;

  // Fetch user's friends
  const { data: friends = [], isLoading: friendsLoading } = useFriends();

  // Filter to only show accepted friends not already in competition
  const availableFriends = useMemo(
    () =>
      friends.filter(
        (f) =>
          f.friendship_status === 'accepted' &&
          !existingPlayerIds.includes(f.id)
      ),
    [friends, existingPlayerIds]
  );

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return availableFriends;
    const query = searchQuery.toLowerCase();
    return availableFriends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query)
    );
  }, [availableFriends, searchQuery]);

  // Search players in database (when search query is entered)
  const { data: searchResults, isLoading: searchLoading } = useQuery<
    PlayerResult[]
  >({
    queryKey: ['players-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('players')
        .select('id, name, email, handicap, photo_url')
        .ilike('name', `%${searchQuery.trim()}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) {
        console.error('Error searching players:', error);
        return [];
      }

      // Filter out existing players and already selected
      return ((data as PlayerResult[]) || []).filter(
        (player) =>
          !existingPlayerIds.includes(player.id) &&
          !selectedPlayers.some((p) => p.id === player.id)
      );
    },
    enabled: visible && searchQuery.length >= 2,
  });

  // Add players mutation
  const addPlayersMutation = useMutation({
    mutationFn: async (playerIds: string[]) => {
      const now = new Date().toISOString();
      const inserts = playerIds.map((playerId) => ({
        competition_id: competitionId,
        player_id: playerId,
        status: 'accepted' as const,
        invited_at: now,
        responded_at: now,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('competition_players') as any).insert(
        inserts
      );

      if (error) {
        throw new Error(`Failed to add players: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate competition details to refresh the players list
      queryClient.invalidateQueries({
        queryKey: ['competition', competitionId, 'details'],
      });
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to add players:', error);
    },
  });

  // Toggle player selection
  const togglePlayerSelection = useCallback(
    (player: PlayerResult | Friend) => {
      setSelectedPlayers((prev) => {
        const isSelected = prev.some((p) => p.id === player.id);
        if (isSelected) {
          // Always allow deselecting
          return prev.filter((p) => p.id !== player.id);
        }
        // Check if we can add more players (within limit)
        const wouldExceedLimit =
          !hasUnlimitedPlayers &&
          currentPlayerCount + prev.length + 1 > maxPlayers!;
        if (wouldExceedLimit) {
          // Don't add - at limit
          return prev;
        }
        return [
          ...prev,
          {
            id: player.id,
            name: player.name,
            email: player.email ?? null,
            handicap: player.handicap ?? null,
            photo_url: player.photo_url ?? null,
          },
        ];
      });
    },
    [hasUnlimitedPlayers, currentPlayerCount, maxPlayers]
  );

  // Remove player from selection
  const handleRemovePlayer = useCallback((playerId: string) => {
    setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedPlayers([]);
    onClose();
  }, [onClose]);

  const handleAddPlayers = useCallback(() => {
    if (selectedPlayers.length > 0) {
      addPlayersMutation.mutate(selectedPlayers.map((p) => p.id));
    }
  }, [selectedPlayers, addPlayersMutation]);

  const isPlayerSelected = useCallback(
    (playerId: string) => selectedPlayers.some((p) => p.id === playerId),
    [selectedPlayers]
  );

  const showSearchResults = searchQuery.length >= 2;
  const isAdding = addPlayersMutation.isPending;

  // Render friend card (matching AddPlayersStep design)
  const renderFriendCard = (friend: Friend, index: number, isLast: boolean) => {
    const isSelected = isPlayerSelected(friend.id);
    // Disable selection when at limit and not already selected
    const isDisabled = isAtLimit && !isSelected;

    return (
      <React.Fragment key={friend.id}>
        <TouchableOpacity
          style={[
            styles.friendCard,
            isDisabled && styles.disabledCard,
          ]}
          onPress={() => togglePlayerSelection(friend)}
          disabled={isDisabled}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected, disabled: isDisabled }}
          accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${friend.name}${isDisabled ? ', player limit reached' : ''}`}
          activeOpacity={0.7}
        >
          <View style={styles.friendCardContent}>
            {/* Avatar */}
            {friend.photo_url ? (
              <Avatar.Image
                size={56}
                source={{ uri: friend.photo_url }}
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              />
            ) : (
              <Avatar.Icon
                size={56}
                icon="account"
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              />
            )}

            {/* Friend Info */}
            <View style={styles.friendInfo}>
              <Text
                style={[styles.friendName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {friend.name}
              </Text>
              {friend.email && (
                <Text
                  style={[styles.friendEmail, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {friend.email}
                </Text>
              )}
              {friend.handicap !== null && friend.handicap !== undefined && (
                <Text
                  style={[styles.friendHandicap, { color: colors.primary }]}
                >
                  HC: {friend.handicap}
                </Text>
              )}
            </View>

            {/* Selection indicator */}
            <View
              style={[
                styles.selectionButton,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.gray100,
                },
              ]}
            >
              {isSelected ? (
                <Icon source="check" size={20} color={colors.white} />
              ) : (
                <Icon source="plus" size={20} color={colors.gray400} />
              )}
            </View>
          </View>
        </TouchableOpacity>
        {!isLast && (
          <Divider
            style={[styles.divider, { backgroundColor: colors.gray100 }]}
          />
        )}
      </React.Fragment>
    );
  };

  // Render search result card
  const renderSearchResultCard = (
    player: PlayerResult,
    index: number,
    isLast: boolean
  ) => {
    const isSelected = isPlayerSelected(player.id);
    // Disable selection when at limit and not already selected
    const isDisabled = isAtLimit && !isSelected;

    return (
      <React.Fragment key={player.id}>
        <TouchableOpacity
          style={[
            styles.friendCard,
            isDisabled && styles.disabledCard,
          ]}
          onPress={() => togglePlayerSelection(player)}
          disabled={isDisabled}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected, disabled: isDisabled }}
          accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${player.name}${isDisabled ? ', player limit reached' : ''}`}
          activeOpacity={0.7}
        >
          <View style={styles.friendCardContent}>
            {/* Avatar */}
            {player.photo_url ? (
              <Avatar.Image
                size={56}
                source={{ uri: player.photo_url }}
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              />
            ) : (
              <Avatar.Icon
                size={56}
                icon="account"
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              />
            )}

            {/* Player Info */}
            <View style={styles.friendInfo}>
              <Text
                style={[styles.friendName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {player.name}
              </Text>
              {player.email && (
                <Text
                  style={[styles.friendEmail, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {player.email}
                </Text>
              )}
              {player.handicap !== null && player.handicap !== undefined && (
                <Text
                  style={[styles.friendHandicap, { color: colors.primary }]}
                >
                  HC: {player.handicap}
                </Text>
              )}
            </View>

            {/* Selection indicator */}
            <View
              style={[
                styles.selectionButton,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.gray100,
                },
              ]}
            >
              {isSelected ? (
                <Icon source="check" size={20} color={colors.white} />
              ) : (
                <Icon source="plus" size={20} color={colors.gray400} />
              )}
            </View>
          </View>
        </TouchableOpacity>
        {!isLast && (
          <Divider
            style={[styles.divider, { backgroundColor: colors.gray100 }]}
          />
        )}
      </React.Fragment>
    );
  };

  // Render selected player chip
  const renderSelectedChip = (player: PlayerResult) => (
    <Chip
      key={player.id}
      style={[styles.selectedChip, { backgroundColor: colors.primaryLight }]}
      textStyle={[styles.selectedChipText, { color: colors.textPrimary }]}
      closeIcon="close"
      onClose={() => handleRemovePlayer(player.id)}
      avatar={
        player.photo_url ? (
          <Avatar.Image size={24} source={{ uri: player.photo_url }} />
        ) : (
          <Avatar.Icon
            size={24}
            icon="account"
            style={[styles.chipAvatar, { backgroundColor: colors.primaryDark }]}
          />
        )
      }
    >
      {player.name}
    </Chip>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height={0.8}
      title="Add Players"
      enableSwipeToDismiss={false}
      testID="add-players-bottom-sheet"
    >
      {/* Player Limit Indicator */}
      {!hasUnlimitedPlayers && maxPlayers !== undefined && (
        <View
          style={[
            styles.limitIndicatorContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          <LimitIndicator
            current={totalWithSelected}
            max={maxPlayers}
            label="Players"
            showBar
          />
          {isAtLimit && (
            <Text style={[styles.limitWarning, { color: colors.warning }]}>
              Player limit reached for your subscription
            </Text>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Players Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SELECTED PLAYERS ({selectedPlayers.length})
            </Text>
            {selectedPlayers.length > 0 && (
              <View
                style={[
                  styles.validBadge,
                  { backgroundColor: colors.successLight },
                ]}
              >
                <Icon source="check-circle" size={16} color={colors.success} />
                <Text style={[styles.validText, { color: colors.success }]}>
                  Ready
                </Text>
              </View>
            )}
          </View>

          <View
            style={[styles.selectedSection, { backgroundColor: colors.surface }]}
          >
            {selectedPlayers.length === 0 ? (
              <Text
                style={[styles.emptySelection, { color: colors.textSecondary }]}
              >
                Tap on players below to select them
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedList}
              >
                {selectedPlayers.map(renderSelectedChip)}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search players..."
          accessibilityLabel="Search players"
        />

        {/* Search Results */}
        {showSearchResults && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SEARCH RESULTS
            </Text>

            {searchLoading ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size="lg" />
              </View>
            ) : searchResults && searchResults.length > 0 ? (
              <View
                style={[
                  styles.friendsContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                {searchResults.map((player, index) =>
                  renderSearchResultCard(
                    player,
                    index,
                    index === searchResults.length - 1
                  )
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon source="account-question" size={48} color={colors.gray300} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No players found
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                  No players match &quot;{searchQuery}&quot;
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Friends List */}
        {!showSearchResults && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              YOUR FRIENDS ({availableFriends.length})
            </Text>

            {friendsLoading ? (
              <View style={styles.loadingContainer}>
                <LoadingSpinner size="lg" />
              </View>
            ) : availableFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon
                  source="account-group-outline"
                  size={48}
                  color={colors.gray300}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {friends.length > 0
                    ? 'All friends already added'
                    : 'No friends yet'}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                  {friends.length > 0
                    ? 'Search for other players above'
                    : 'Add friends or search for players above'}
                </Text>
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon
                  source="account-question"
                  size={48}
                  color={colors.gray300}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No friends found
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                  No friends match &quot;{searchQuery}&quot;
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.friendsContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                {filteredFriends.map((friend, index) =>
                  renderFriendCard(
                    friend,
                    index,
                    index === filteredFriends.length - 1
                  )
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer with Add Button */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.gray200 },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor:
                selectedPlayers.length === 0 ? colors.gray300 : colors.primary,
            },
          ]}
          onPress={handleAddPlayers}
          activeOpacity={0.8}
          disabled={selectedPlayers.length === 0 || isAdding}
        >
          {isAdding ? (
            <GolfBallLoader size="sm" />
          ) : (
            <>
              <Icon source="account-plus" size={20} color={colors.white} />
              <Text style={[styles.addButtonText, { color: colors.white }]}>
                {selectedPlayers.length > 0
                  ? `Add ${selectedPlayers.length} Player${selectedPlayers.length !== 1 ? 's' : ''}`
                  : 'Select Players to Add'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  limitIndicatorContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  limitWarning: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.lg,
  },

  // Sections
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.lg,
  },
  validText: {
    ...typography.captionBold,
  },

  // Selected players
  selectedSection: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  emptySelection: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  selectedList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectedChip: {
    marginRight: spacing.sm,
  },
  selectedChipText: {
    ...typography.small,
  },
  chipAvatar: {
    // Color applied inline
  },

  // Search
  searchSection: {
    marginTop: spacing.lg,
  },

  // Friends list
  friendsContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  friendCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  disabledCard: {
    opacity: 0.5,
  },
  friendCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    // Color applied inline
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  friendName: {
    ...typography.bodyBold,
  },
  friendEmail: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  friendHandicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  selectionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    marginHorizontal: spacing.lg,
  },

  // Loading & Empty states
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.small,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Footer
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addButtonText: {
    ...typography.bodyBold,
  },
});
