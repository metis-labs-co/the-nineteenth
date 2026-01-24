/**
 * AddFriendModal - Modal for searching and adding friends
 *
 * Provides player search functionality and displays results with
 * add friend actions. Handles tier limits and shows appropriate errors.
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useConfirmationDialog } from '@/hooks';
import Toast from 'react-native-toast-message';
import { LoadingSpinner, SearchBar, BottomSheet, ConfirmationDialog } from '@/components/common';
import { SearchResultCard } from './SearchResultCard';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useSearchPlayers, useAddFriend } from '@/hooks/useFriends';

/**
 * Props for the AddFriendModal component
 */
export interface AddFriendModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Callback when the modal should close
   */
  onClose: () => void;
  /**
   * Whether the user can add more friends (tier limit check)
   */
  canAddFriend: boolean;
  /**
   * Callback when user tries to add but is at tier limit
   */
  onAtLimitError: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * AddFriendModal - Search and add friends modal
 *
 * @example
 * ```tsx
 * <AddFriendModal
 *   visible={showModal}
 *   onClose={() => setShowModal(false)}
 *   canAddFriend={tierAllowed}
 *   onAtLimitError={() => setShowUpgrade(true)}
 * />
 * ```
 */
export function AddFriendModal({
  visible,
  onClose,
  canAddFriend,
  onAtLimitError,
  testID,
}: AddFriendModalProps) {
  const colors = useThemeColors();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [addingPlayerId, setAddingPlayerId] = useState<string | null>(null);

  const { data: searchResults, isLoading: isSearching } =
    useSearchPlayers(searchQuery);
  const addFriend = useAddFriend();

  const handleAddFriend = useCallback(
    async (playerId: string, playerName?: string) => {
      // Check if user can add more friends before proceeding
      if (!canAddFriend) {
        onAtLimitError();
        return;
      }

      setAddingPlayerId(playerId);
      try {
        await addFriend.mutateAsync(playerId);
        // Clear search and show success toast
        setSearchQuery('');
        Toast.show({
          type: 'success',
          text1: 'Friend Request Sent',
          text2: playerName
            ? `Request sent to ${playerName}`
            : 'Your friend request has been sent',
          visibilityTime: 3000,
          position: 'bottom',
        });
      } catch (error) {
        console.error('Failed to add friend:', error);
        // Show error alert
        showAlert(
          'Could not add friend',
          error instanceof Error ? error.message : 'Please try again later'
        );
      } finally {
        setAddingPlayerId(null);
      }
    },
    [addFriend, canAddFriend, onAtLimitError, showAlert]
  );

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      height="full"
      title="Add Friend"
      showHandle={false}
      safeAreaTop
      testID={testID}
    >
      {/* Search Input */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search by name..."
        accessibilityLabel="Search for friends by name"
      />

      {/* Search Results */}
      <View style={styles.results}>
        {searchQuery.length < 2 ? (
          <View style={styles.prompt}>
            <Icon source="account-search" size={48} color={colors.gray300} />
            <Text style={[styles.promptText, { color: colors.textSecondary }]}>
              Enter at least 2 characters to search
            </Text>
          </View>
        ) : isSearching ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" />
          </View>
        ) : searchResults && searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SearchResultCard
                player={item}
                onAddFriend={() => handleAddFriend(item.id, item.name)}
                isAdding={addingPlayerId === item.id}
              />
            )}
            ItemSeparatorComponent={() => (
              <View
                style={[styles.separator, { backgroundColor: colors.gray100 }]}
              />
            )}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <View style={styles.noResults}>
            <Icon source="account-question" size={48} color={colors.gray300} />
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              No players found matching &quot;{searchQuery}&quot;
            </Text>
          </View>
        )}
      </View>

      {/* Error Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  results: {
    flex: 1,
  },
  prompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  promptText: {
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
  resultsList: {
    padding: spacing.lg,
  },
  separator: {
    height: 1,
    marginVertical: spacing.sm,
  },
});

export default AddFriendModal;
