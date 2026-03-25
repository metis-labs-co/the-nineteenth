import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type PlayerFormData } from '@/schemas/competition';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog } from '@/hooks';
import { useFriendsWithPendingSent, useCheckCanAddFriend } from '@/hooks/useFriends';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import { FriendSelector, type SelectedPlayer } from '@/components/common/FriendSelector';
import { ConfirmationDialog } from '@/components/common';
import { AddFriendModal } from '@/components/social/AddFriendModal';
import { AddPlaceholderModal } from '@/components/common/AddPlaceholderModal';
import type { Friend, Player } from '@/types/database.types';

interface AddPlayersStepProps {
  initialData?: PlayerFormData[];
  onComplete: (data: PlayerFormData[]) => void;
  onBack: () => void;
  /** Called when user skips the players step */
  onSkip?: () => void;
  /** Maximum players per competition based on subscription tier */
  maxPlayersPerCompetition?: number;
}

// Convert a Player/Friend to PlayerFormData
const playerToFormData = (player: Player | Friend | SelectedPlayer): PlayerFormData => ({
  id: player.id,
  name: player.name,
  email: player.email || '',
  phone: 'phone' in player ? player.phone || '' : '',
  handicap: player.handicap?.toString() || '',
  golf_id: 'golf_id' in player ? player.golf_id || '' : '',
});

export default function AddPlayersStep({
  initialData,
  onComplete,
  onBack,
  onSkip,
  maxPlayersPerCompetition,
}: AddPlayersStepProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { player: currentPlayer, user } = useAuth();
  const { data: friends = [], isLoading: isLoadingFriends } = useFriendsWithPendingSent();
  const friendsAccess = useCheckCanAddFriend();
  const { data: placeholderPlayers } = usePlaceholderPlayers();

  // Dialog state for alerts
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Modal state for adding friends
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  // Modal state for adding placeholder/guest players
  const [showAddPlaceholderModal, setShowAddPlaceholderModal] = useState(false);

  // Determine effective max players (default to 40 for unlimited/-1 or if not provided)
  const effectiveMaxPlayers =
    !maxPlayersPerCompetition || maxPlayersPerCompetition < 0 ? 40 : maxPlayersPerCompetition;

  // Filter to show accepted and pending-sent friends (friends where current user sent the request)
  const selectableFriends = useMemo(
    () =>
      friends.filter(
        (f) => f.friendship_status === 'accepted' || f.friendship_status === 'pending'
      ),
    [friends]
  );

  // Search query for filtering friends
  const [searchQuery, setSearchQuery] = useState('');

  // Selected players state
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>(() => {
    const players: SelectedPlayer[] = [];

    // First, restore previously selected players from initialData
    if (initialData && initialData.length > 0) {
      initialData.forEach((player) => {
        if (player.id) {
          players.push({
            id: player.id,
            name: player.name,
            email: player.email || null,
            handicap: player.handicap ? parseFloat(player.handicap) : null,
          });
        }
      });
    }

    // Always ensure current user is included
    if (currentPlayer && !players.some((p) => p.id === currentPlayer.id)) {
      players.unshift({
        id: currentPlayer.id,
        name: currentPlayer.name,
        email: currentPlayer.email,
        handicap: currentPlayer.handicap,
        photo_url: currentPlayer.photo_url,
      });
    }

    return players;
  });

  // Auto-add current user on mount
  useEffect(() => {
    if (currentPlayer && !selectedPlayers.some((p) => p.id === currentPlayer.id)) {
      setSelectedPlayers((prev) => [
        {
          id: currentPlayer.id,
          name: currentPlayer.name,
          email: currentPlayer.email,
          handicap: currentPlayer.handicap,
          photo_url: currentPlayer.photo_url,
        },
        ...prev,
      ]);
    }
  }, [currentPlayer, selectedPlayers]);

  // Handle selection changes from FriendSelector
  const handleSelectionChange = useCallback(
    (players: SelectedPlayer[]) => {
      // Don't allow removing current user
      if (user?.id && !players.some((p) => p.id === user.id)) {
        showAlert('Cannot Remove', 'You must be included in the competition.');
        return;
      }

      // Check if adding would exceed limit
      if (players.length > effectiveMaxPlayers) {
        showAlert(
          'Player Limit Reached',
          `Maximum ${effectiveMaxPlayers} players allowed on your plan. Upgrade to add more players.`
        );
        return;
      }

      setSelectedPlayers(players);
    },
    [user?.id, effectiveMaxPlayers, showAlert]
  );

  // Handle add friend button press
  const handleAddFriendPress = useCallback(() => {
    if (!friendsAccess.allowed) {
      showAlert(
        'Friends Limit Reached',
        friendsAccess.reason || 'You have reached your friends limit. Upgrade to add more friends.'
      );
      return;
    }
    setShowAddFriendModal(true);
  }, [friendsAccess.allowed, friendsAccess.reason, showAlert]);

  // Handle placeholder player creation - auto-add to selected players
  const handlePlaceholderCreated = useCallback(
    (player: Player) => {
      // Check if adding would exceed limit
      if (selectedPlayers.length >= effectiveMaxPlayers) {
        showAlert(
          'Player Limit Reached',
          `Maximum ${effectiveMaxPlayers} players allowed on your plan. Upgrade to add more players.`
        );
        setShowAddPlaceholderModal(false);
        return;
      }

      // Add the new placeholder player to selected players
      setSelectedPlayers((prev) => [
        ...prev,
        {
          id: player.id,
          name: player.name,
          email: player.email,
          handicap: player.handicap,
          is_placeholder: true,
        },
      ]);
      setShowAddPlaceholderModal(false);
    },
    [selectedPlayers.length, effectiveMaxPlayers, showAlert]
  );

  // Proceed to next step
  const handleNext = useCallback(() => {
    if (selectedPlayers.length < 2) {
      showAlert(
        'Not Enough Players',
        'Please select at least 1 friend to add to the competition (minimum 2 players total).'
      );
      return;
    }
    if (selectedPlayers.length > effectiveMaxPlayers) {
      showAlert(
        'Too Many Players',
        `Maximum ${effectiveMaxPlayers} players allowed on your plan. Upgrade to add more players.`
      );
      return;
    }

    // Convert selected players to form data
    const playersData = selectedPlayers.map(playerToFormData);
    onComplete(playersData);
  }, [selectedPlayers, effectiveMaxPlayers, showAlert, onComplete]);

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
          {onSkip && ' You can skip this step and add players later.'}
        </Text>

        {/* Friend Selector */}
        <FriendSelector
          selectedPlayers={selectedPlayers}
          onSelectionChange={handleSelectionChange}
          friends={selectableFriends}
          friendsLoading={isLoadingFriends}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          limits={{
            max: effectiveMaxPlayers,
            min: 2,
            includeCurrentUser: true,
          }}
          limitIndicator={{
            show: true,
            label: 'Players',
            showBar: true,
            warningThreshold: 0.8,
          }}
          currentUser={
            user && currentPlayer
              ? {
                  id: user.id,
                  name: currentPlayer.name,
                  photo_url: currentPlayer.photo_url,
                }
              : undefined
          }
          selectedTitle="SELECTED PLAYERS"
          listTitle={`${selectableFriends.length} ${selectableFriends.length === 1 ? 'FRIEND' : 'FRIENDS'}`}
          showReadyBadge={true}
          showPendingBadge={true}
          onAddFriendPress={handleAddFriendPress}
          emptyMessage="No friends yet"
          testID="add-players-step"
          placeholderPlayers={placeholderPlayers || []}
          onAddPlaceholderPress={() => setShowAddPlaceholderModal(true)}
          addPlaceholderLabel="Add Guest"
        />
      </ScrollView>

      {/* Add Friend Modal */}
      <AddFriendModal
        visible={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        canAddFriend={friendsAccess.allowed}
        onAtLimitError={() => {
          setShowAddFriendModal(false);
          showAlert(
            'Friends Limit Reached',
            friendsAccess.reason || 'You have reached your friends limit. Upgrade to add more friends.'
          );
        }}
        testID="add-players-add-friend-modal"
      />

      {/* Add Guest Modal */}
      <AddPlaceholderModal
        visible={showAddPlaceholderModal}
        onClose={() => setShowAddPlaceholderModal(false)}
        onPlayerCreated={handlePlaceholderCreated}
      />

      {/* Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      {/* Action Buttons - Sticky Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: colors.surface,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300, borderWidth: 1 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        {onSkip && selectedPlayers.length < 2 ? (
          <TouchableOpacity
            onPress={onSkip}
            style={[styles.skipButton, { borderColor: colors.gray300, borderWidth: 1 }]}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Skip for Now</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: colors.primary }, selectedPlayers.length < 2 && { opacity: 0.5 }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            disabled={selectedPlayers.length < 2}
          >
            <Text style={[styles.buttonLabel, { color: colors.white }]}>Next ({selectedPlayers.length} players)</Text>
          </TouchableOpacity>
        )}
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flex: 2,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});
