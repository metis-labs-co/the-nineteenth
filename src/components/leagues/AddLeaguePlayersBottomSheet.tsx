/**
 * AddLeaguePlayersBottomSheet - Slide-up drawer for adding players to a league
 *
 * Features:
 * - Slides up from bottom of screen
 * - Search friends to add
 * - Multi-select players with chips display
 * - Backdrop dismissal
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { FriendSelector, type SelectedPlayer } from '@/components/common/FriendSelector';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useFriends } from '@/hooks/useFriends';
import { useAddLeaguePlayers } from '@/hooks/useLeagues';

interface AddLeaguePlayersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  leagueId: string;
  existingPlayerIds: string[];
}

export default function AddLeaguePlayersBottomSheet({
  visible,
  onClose,
  leagueId,
  existingPlayerIds,
}: AddLeaguePlayersBottomSheetProps) {
  const colors = useThemeColors();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);

  const { data: friends = [], isLoading: friendsLoading } = useFriends();
  const addPlayersMutation = useAddLeaguePlayers(leagueId);

  // Filter to only show accepted friends not already in league
  const availableFriends = useMemo(
    () =>
      friends.filter(
        (f) =>
          f.friendship_status === 'accepted' && !existingPlayerIds.includes(f.id)
      ),
    [friends, existingPlayerIds]
  );

  const handleSelectionChange = useCallback((players: SelectedPlayer[]) => {
    setSelectedPlayers(players);
  }, []);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedPlayers([]);
    onClose();
  }, [onClose]);

  const handleAddPlayers = useCallback(() => {
    if (selectedPlayers.length > 0) {
      addPlayersMutation.mutate(selectedPlayers.map((p) => p.id), {
        onSuccess: handleClose,
      });
    }
  }, [selectedPlayers, addPlayersMutation, handleClose]);

  const isAdding = addPlayersMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height={0.8}
      title="Add Players"
      enableSwipeToDismiss={false}
      testID="add-league-players-bottom-sheet"
    >
      <FriendSelector
        selectedPlayers={selectedPlayers}
        onSelectionChange={handleSelectionChange}
        friends={availableFriends}
        friendsLoading={friendsLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedTitle={`SELECTED PLAYERS (${selectedPlayers.length})`}
        listTitle={`YOUR FRIENDS (${availableFriends.length})`}
        emptyMessage={
          friends.length > 0 ? 'All friends already added' : 'No friends yet'
        }
        testID="add-league-players-selector"
      />

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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
