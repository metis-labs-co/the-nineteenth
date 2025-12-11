import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform, ScrollView, Alert, Pressable } from 'react-native';
import {
  Button,
  Text,
  Surface,
  Avatar,
  Searchbar,
  ActivityIndicator,
  Chip,
  Icon,
  Divider,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type PlayerFormData } from '@/schemas/competition';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import type { Friend, Player } from '@/types/database.types';

interface AddPlayersStepProps {
  initialData?: PlayerFormData[];
  onComplete: (data: PlayerFormData[]) => void;
  onBack: () => void;
  /** Maximum players per competition based on subscription tier */
  maxPlayersPerCompetition?: number;
}

// Convert a Player/Friend to PlayerFormData
const playerToFormData = (player: Player | Friend): PlayerFormData => ({
  name: player.name,
  email: player.email || '',
  phone: player.phone || '',
  handicap: player.handicap?.toString() || '',
  golf_id: player.golf_id || '',
});

export default function AddPlayersStep({
  initialData,
  onComplete,
  onBack,
  maxPlayersPerCompetition,
}: AddPlayersStepProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDark = useIsDark();
  const { player: currentPlayer, user } = useAuth();
  const { data: friends = [], isLoading: isLoadingFriends } = useFriends();

  // Determine effective max players (default to 40 for unlimited/-1 or if not provided)
  const effectiveMaxPlayers = (!maxPlayersPerCompetition || maxPlayersPerCompetition < 0) ? 40 : maxPlayersPerCompetition;

  // Filter to only show accepted friends
  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.friendship_status === 'accepted'),
    [friends]
  );

  // Selected player IDs (including current user)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    if (user?.id) {
      ids.add(user.id);
    }
    return ids;
  });

  // Search query for filtering friends
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-add current user on mount
  useEffect(() => {
    if (user?.id) {
      setSelectedPlayerIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(user.id);
        return newSet;
      });
    }
  }, [user?.id]);

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return acceptedFriends;
    const query = searchQuery.toLowerCase();
    return acceptedFriends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query)
    );
  }, [acceptedFriends, searchQuery]);

  // Toggle friend selection with limit check
  const toggleFriendSelection = useCallback((friendId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        // Check if adding would exceed limit
        if (newSet.size >= effectiveMaxPlayers) {
          Alert.alert(
            'Player Limit Reached',
            `Maximum ${effectiveMaxPlayers} players allowed on your plan. Upgrade to add more players.`,
            [{ text: 'OK' }]
          );
          return prev;
        }
        newSet.add(friendId);
      }
      return newSet;
    });
  }, [effectiveMaxPlayers]);

  // Get selected players for display
  const selectedPlayers = useMemo(() => {
    const players: (Player | Friend)[] = [];

    // Add current user first
    if (currentPlayer && selectedPlayerIds.has(currentPlayer.id)) {
      players.push(currentPlayer);
    }

    // Add selected friends
    acceptedFriends.forEach((friend) => {
      if (selectedPlayerIds.has(friend.id) && friend.id !== currentPlayer?.id) {
        players.push(friend);
      }
    });

    return players;
  }, [selectedPlayerIds, currentPlayer, acceptedFriends]);

  // Remove player (except current user)
  const handleRemovePlayer = useCallback(
    (playerId: string) => {
      if (playerId === user?.id) {
        Alert.alert('Cannot Remove', 'You must be included in the competition.');
        return;
      }
      setSelectedPlayerIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    },
    [user?.id]
  );

  // Proceed to next step
  const handleNext = () => {
    if (selectedPlayers.length < 2) {
      Alert.alert(
        'Not Enough Players',
        'Please select at least 1 friend to add to the competition (minimum 2 players total).'
      );
      return;
    }
    if (selectedPlayers.length > effectiveMaxPlayers) {
      Alert.alert(
        'Too Many Players',
        `Maximum ${effectiveMaxPlayers} players allowed on your plan. Upgrade to add more players.`
      );
      return;
    }

    // Convert selected players to form data
    const playersData = selectedPlayers.map(playerToFormData);
    onComplete(playersData);
  };

  // Calculate if approaching player limit (80% threshold)
  const isApproachingLimit = selectedPlayers.length >= effectiveMaxPlayers * 0.8 && selectedPlayers.length < effectiveMaxPlayers;
  const isAtLimit = selectedPlayers.length >= effectiveMaxPlayers;

  // Render friend card (matching FriendsScreen design)
  const renderFriendCard = useCallback(
    (friend: Friend, index: number, isLast: boolean) => {
      const isSelected = selectedPlayerIds.has(friend.id);

      return (
        <React.Fragment key={friend.id}>
          <Pressable
            style={({ pressed }) => [
              styles.friendCard,
              pressed && { backgroundColor: colors.gray50 },
            ]}
            onPress={() => toggleFriendSelection(friend.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${friend.name}`}
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
                <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {friend.name}
                </Text>
                {friend.email && (
                  <Text style={[styles.friendEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {friend.email}
                  </Text>
                )}
                {friend.handicap !== null && friend.handicap !== undefined && (
                  <Text style={[styles.friendHandicap, { color: colors.primary }]}>HC: {friend.handicap}</Text>
                )}
              </View>

              {/* Selection indicator */}
              <View
                style={[
                  styles.selectionButton,
                  { backgroundColor: isSelected ? colors.primary : colors.gray100 },
                ]}
              >
                {isSelected ? (
                  <Icon source="check" size={20} color={colors.white} />
                ) : (
                  <Icon source="plus" size={20} color={colors.gray400} />
                )}
              </View>
            </View>
          </Pressable>
          {!isLast && <Divider style={[styles.divider, { backgroundColor: colors.gray100 }]} />}
        </React.Fragment>
      );
    },
    [selectedPlayerIds, toggleFriendSelection, colors]
  );

  // Render selected player chip
  const renderSelectedPlayer = useCallback(
    (item: Player | Friend) => {
      const isCurrentUser = item.id === user?.id;

      return (
        <Chip
          key={item.id}
          style={[styles.selectedChip, { backgroundColor: isCurrentUser ? colors.primary : colors.primaryLight }]}
          textStyle={[styles.selectedChipText, { color: isCurrentUser ? colors.white : colors.textPrimary }]}
          closeIcon={isCurrentUser ? undefined : 'close'}
          onClose={isCurrentUser ? undefined : () => handleRemovePlayer(item.id)}
          avatar={
            item.photo_url ? (
              <Avatar.Image size={24} source={{ uri: item.photo_url }} />
            ) : (
              <Avatar.Icon size={24} icon="account" style={[styles.chipAvatar, { backgroundColor: colors.primaryDark }]} />
            )
          }
        >
          {item.name}
          {isCurrentUser && ' (You)'}
        </Chip>
      );
    },
    [handleRemovePlayer, user?.id, colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Select players for your competition. You are automatically included.
        </Text>

        {/* Selected Players Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SELECTED PLAYERS
            </Text>
            {selectedPlayers.length >= 2 && !isAtLimit && (
              <View style={[styles.validBadge, { backgroundColor: colors.successLight }]}>
                <Icon source="check-circle" size={16} color={colors.success} />
                <Text style={[styles.validText, { color: colors.success }]}>Ready</Text>
              </View>
            )}
          </View>

          {/* Player Limit Indicator */}
          <View style={styles.limitIndicatorContainer}>
            <LimitIndicator
              current={selectedPlayers.length}
              max={effectiveMaxPlayers}
              label="Players"
              showBar={true}
            />
          </View>

          {/* Warning when approaching limit */}
          {isApproachingLimit && (
            <Surface style={[styles.warningBox, { backgroundColor: colors.warningLight }]} elevation={0}>
              <Icon source="alert-circle-outline" size={18} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Approaching player limit ({selectedPlayers.length}/{effectiveMaxPlayers})
              </Text>
            </Surface>
          )}

          {/* Warning at limit */}
          {isAtLimit && (
            <Surface style={[styles.warningBox, { backgroundColor: colors.errorLight }]} elevation={0}>
              <Icon source="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.warningText, { color: colors.error }]}>
                Player limit reached. Upgrade to add more players.
              </Text>
            </Surface>
          )}

          <Surface style={[styles.selectedSection, { backgroundColor: isDark ? colors.gray100 : colors.white }]} elevation={0}>
            {selectedPlayers.length === 0 ? (
              <Text style={[styles.emptySelection, { color: colors.textSecondary }]}>No players selected yet</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedList}
              >
                {selectedPlayers.map(renderSelectedPlayer)}
              </ScrollView>
            )}

            {selectedPlayers.length === 1 && (
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>Select at least 1 friend to continue</Text>
            )}
          </Surface>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchSection, { backgroundColor: isDark ? colors.gray100 : colors.white, borderBottomColor: colors.gray100 }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.gray50 }]}>
            <Icon source="magnify" size={20} color={colors.gray400} />
            <Searchbar
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              iconColor="transparent"
              icon={() => null}
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

        {/* Friends List Header */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {acceptedFriends.length} {acceptedFriends.length === 1 ? 'FRIEND' : 'FRIENDS'}
          </Text>

          {/* Loading State */}
          {isLoadingFriends && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Empty Friends State */}
          {!isLoadingFriends && acceptedFriends.length === 0 && (
            <View style={styles.emptyState}>
              <Icon source="account-group-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No friends yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                Add friends from the Friends tab to invite them to competitions
              </Text>
            </View>
          )}

          {/* No Search Results */}
          {!isLoadingFriends &&
            acceptedFriends.length > 0 &&
            filteredFriends.length === 0 && (
              <View style={styles.emptyState}>
                <Icon source="account-question" size={48} color={colors.gray300} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No friends found</Text>
                <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
                  No friends match "{searchQuery}"
                </Text>
              </View>
            )}

          {/* Friends List */}
          {!isLoadingFriends && filteredFriends.length > 0 && (
            <View style={[styles.friendsContainer, { backgroundColor: isDark ? colors.gray100 : colors.white }]}>
              {filteredFriends.map((friend, index) =>
                renderFriendCard(friend, index, index === filteredFriends.length - 1)
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: isDark ? colors.gray100 : colors.white, borderTopColor: colors.gray200 }]}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
          theme={{ colors: { outline: colors.gray300 } }}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
          disabled={selectedPlayers.length < 2}
        >
          Next: Review
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl + 80,
  },
  description: {
    ...typography.body,
    padding: spacing.lg,
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
  limitIndicatorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
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
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
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
  chipAvatar: {},

  // Search
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginTop: spacing.lg,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  searchInput: {
    ...typography.body,
    marginLeft: -spacing.md,
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
  friendCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {},
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
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
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
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});
