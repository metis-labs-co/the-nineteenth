/**
 * FriendSelectorBottomSheet - Bottom sheet for selecting playing partners
 *
 * Wraps the existing FriendSelector in a BottomSheet to declutter
 * the PartnersStep. Contains:
 * - Selected player chips
 * - Search bar
 * - Friends + guests list with checkboxes
 * - Done button to close
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { FriendSelector } from '@/components/common/FriendSelector';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { SelectedPlayer } from '@/components/common/FriendSelector';
import type { Friend, PlaceholderPlayerWithStats, TeeBox } from '@/types/database.types';

interface FriendSelectorBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedPlayers: SelectedPlayer[];
  onSelectionChange: (players: SelectedPlayer[]) => void;
  friends: Friend[];
  friendsLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  maxPartners: number;
  placeholderPlayers: PlaceholderPlayerWithStats[];
  onAddPlaceholderPress: () => void;
  selectedTee?: TeeBox | null;
  coursePar?: number;
}

export function FriendSelectorBottomSheet({
  visible,
  onClose,
  selectedPlayers,
  onSelectionChange,
  friends,
  friendsLoading,
  searchQuery,
  onSearchQueryChange,
  maxPartners,
  placeholderPlayers,
  onAddPlaceholderPress,
  selectedTee,
  coursePar,
}: FriendSelectorBottomSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.85}
      title="Add Friends"
      useModal
    >
      <FriendSelector
        selectedPlayers={selectedPlayers}
        onSelectionChange={onSelectionChange}
        friends={friends}
        friendsLoading={friendsLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        limits={{ max: maxPartners, min: 0 }}
        limitIndicator={{ show: false }}
        selectedTitle={`Playing with (${selectedPlayers.length}/${maxPartners})`}
        listTitle={`Select up to ${maxPartners} players`}
        emptyMessage="Add friends from the Friends tab to play together"
        placeholderPlayers={placeholderPlayers}
        onAddPlaceholderPress={onAddPlaceholderPress}
        addPlaceholderLabel="Create Guest"
        selectedTee={selectedTee}
        coursePar={coursePar}
      />

      {/* Done Button */}
      <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneButtonText, { color: colors.white }]}>
            {selectedPlayers.length > 0
              ? `Done (${selectedPlayers.length} player${selectedPlayers.length !== 1 ? 's' : ''})`
              : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  doneButtonText: {
    ...typography.bodyBold,
  },
});
