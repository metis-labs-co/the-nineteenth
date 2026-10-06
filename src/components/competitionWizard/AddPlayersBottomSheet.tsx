/**
 * AddPlayersBottomSheet - Slide-up drawer for adding players to a competition
 *
 * Features:
 * - Slides up from bottom of screen
 * - Search friends to add
 * - Multi-select players with chips display
 * - Add/select guest (placeholder) players when the competition allows guests
 * - Backdrop dismissal
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { FriendSelector, type SelectedPlayer } from '@/components/common/FriendSelector';
import { AddPlaceholderModal } from '@/components/common/AddPlaceholderModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { supabase } from '@/services/supabase/client';
import { useFriends } from '@/hooks/useFriends';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import { useToast } from '@/context/ToastContext';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { Player } from '@/types/database.types';

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
  /**
   * Whether the competition allows guest (placeholder) players. When false the
   * guest list and "Add Guest" button are hidden; the DB rejects guest inserts.
   */
  allowGuests?: boolean;
}

export default function AddPlayersBottomSheet({
  visible,
  onClose,
  competitionId,
  existingPlayerIds,
  maxPlayers,
  currentPlayerCount = 0,
  allowGuests = true,
}: AddPlayersBottomSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { showErrorToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  // Modal state for creating placeholder/guest players
  const [showAddPlaceholderModal, setShowAddPlaceholderModal] = useState(false);

  // Calculate if we have unlimited players (no limit)
  const hasUnlimitedPlayers =
    maxPlayers === undefined || isUnlimited(maxPlayers) || isNoLimit(maxPlayers);

  // Calculate remaining slots (how many more players can be added)
  const remainingSlots = hasUnlimitedPlayers
    ? Infinity
    : Math.max(0, maxPlayers - currentPlayerCount);

  // Fetch user's friends
  const { data: friends = [], isLoading: friendsLoading } = useFriends();

  // Fetch the user's placeholder (guest) players
  const { data: placeholderPlayers } = usePlaceholderPlayers();

  // Filter to only show accepted friends not already in competition
  const availableFriends = useMemo(
    () =>
      friends.filter(
        (f) =>
          f.friendship_status === 'accepted' && !existingPlayerIds.includes(f.id)
      ),
    [friends, existingPlayerIds]
  );

  // Filter to only show guests not already in the competition
  const availablePlaceholders = useMemo(
    () =>
      allowGuests
        ? (placeholderPlayers ?? []).filter((p) => !existingPlayerIds.includes(p.id))
        : [],
    [allowGuests, placeholderPlayers, existingPlayerIds]
  );

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
      showErrorToast("Couldn't Add Players", error.message);
    },
  });

  // Handle selection changes from FriendSelector
  const handleSelectionChange = useCallback(
    (players: SelectedPlayer[]) => {
      // Check if we would exceed the limit
      if (!hasUnlimitedPlayers && currentPlayerCount + players.length > maxPlayers!) {
        // Don't update if exceeding limit
        return;
      }
      setSelectedPlayers(players);
    },
    [hasUnlimitedPlayers, currentPlayerCount, maxPlayers]
  );

  // Auto-add a freshly created guest to the selection (respecting the limit)
  const handlePlaceholderCreated = useCallback(
    (player: Player) => {
      setShowAddPlaceholderModal(false);

      // Guard against exceeding the subscription player limit
      if (!hasUnlimitedPlayers && currentPlayerCount + selectedPlayers.length + 1 > maxPlayers!) {
        showErrorToast(
          'Player Limit Reached',
          `You can only add ${remainingSlots} more player${remainingSlots === 1 ? '' : 's'} on your plan.`
        );
        return;
      }

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
    },
    [hasUnlimitedPlayers, currentPlayerCount, selectedPlayers.length, maxPlayers, remainingSlots, showErrorToast]
  );

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

  const isAdding = addPlayersMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height={0.8}
      title="Add Players"
      enableSwipeToDismiss={false}
      testID="add-players-bottom-sheet"
    >
      {/* Friend Selector */}
      <FriendSelector
        selectedPlayers={selectedPlayers}
        onSelectionChange={handleSelectionChange}
        friends={availableFriends}
        friendsLoading={friendsLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        limits={{ max: remainingSlots }}
        limitIndicator={{
          show: !hasUnlimitedPlayers && maxPlayers !== undefined,
          label: 'Players',
          showBar: true,
        }}
        selectedTitle={`SELECTED PLAYERS (${selectedPlayers.length})`}
        listTitle={`YOUR FRIENDS (${availableFriends.length})`}
        emptyMessage={
          friends.length > 0 ? 'All friends already added' : 'No friends yet'
        }
        testID="add-players-selector"
        placeholderPlayers={availablePlaceholders}
        onAddPlaceholderPress={allowGuests ? () => setShowAddPlaceholderModal(true) : undefined}
        addPlaceholderLabel="Add Guest"
      />

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
              <Icon source="account-plus" size={20} color={colors.textOnColored} />
              <Text style={[styles.addButtonText, { color: colors.textOnColored }]}>
                {selectedPlayers.length > 0
                  ? `Add ${selectedPlayers.length} Player${selectedPlayers.length !== 1 ? 's' : ''}`
                  : 'Select Players to Add'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Guest Modal */}
      <AddPlaceholderModal
        visible={showAddPlaceholderModal}
        onClose={() => setShowAddPlaceholderModal(false)}
        onPlayerCreated={handlePlaceholderCreated}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
