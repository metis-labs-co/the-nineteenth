/**
 * LinkPlaceholderScreen - Manage and link placeholder (guest) players
 *
 * Admin screen for viewing unlinked placeholder players, linking them to
 * real player accounts, or deleting them. When a placeholder is linked,
 * all their scores and history transfer to the real player.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconUserQuestion, IconLink, IconTrash } from '@tabler/icons-react-native';
import Toast from 'react-native-toast-message';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, SearchBar, BottomSheet, EmptyState, ErrorState, Pill } from '@/components/common';
import { FeatureLock } from '@/components/subscription';
// SearchResultCard removed - using custom LinkSearchResultCard below
import {
  usePlaceholderPlayers,
  useLinkPlaceholderPlayer,
  useDeletePlaceholderPlayer,
} from '@/hooks/usePlaceholderPlayers';
import { useSearchPlayers } from '@/hooks/useFriends';
import type { PlaceholderPlayerWithStats, PlayerSearchResult } from '@/types/database.types';

type Props = NativeStackScreenProps<RootStackParamList, 'LinkPlaceholder'>;

// =====================================================
// PLACEHOLDER CARD COMPONENT
// =====================================================

interface PlaceholderCardProps {
  placeholder: PlaceholderPlayerWithStats;
  onLinkPress: () => void;
  onDeletePress: () => void;
  isLinking: boolean;
  isDeleting: boolean;
}

function PlaceholderCard({
  placeholder,
  onLinkPress,
  onDeletePress,
  isLinking,
  isDeleting,
}: PlaceholderCardProps) {
  const colors = useThemeColors();

  const createdDate = new Date(placeholder.created_at).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Guest Icon */}
      <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceVariant }]}>
        <IconUserQuestion size={28} color={colors.textSecondary} />
      </View>

      {/* Info Section */}
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {placeholder.name}
          </Text>
          <Pill label="Guest" variant="default" filled size="sm" />
        </View>

        <View style={styles.detailsRow}>
          {placeholder.handicap !== null && placeholder.handicap !== undefined && (
            <Text style={[styles.handicap, { color: colors.primary }]}>
              HC: {placeholder.handicap}
            </Text>
          )}
          <Text style={[styles.createdDate, { color: colors.textSecondary }]}>
            Created: {createdDate}
          </Text>
        </View>

        {/* Stats - show competitions/scorecards count if available */}
        {(placeholder.competitions_count > 0 || placeholder.scorecards_count > 0) && (
          <View style={styles.statsRow}>
            {placeholder.competitions_count > 0 && (
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {placeholder.competitions_count} competition{placeholder.competitions_count !== 1 ? 's' : ''}
              </Text>
            )}
            {placeholder.scorecards_count > 0 && (
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {placeholder.scorecards_count} scorecard{placeholder.scorecards_count !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.linkButton, { backgroundColor: colors.primary }]}
          onPress={onLinkPress}
          disabled={isLinking || isDeleting}
          accessibilityRole="button"
          accessibilityLabel={`Link ${placeholder.name} to a real account`}
        >
          {isLinking ? (
            <ActivityIndicator size={16} color={colors.white} />
          ) : (
            <IconLink size={18} color={colors.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.errorLight }]}
          onPress={onDeletePress}
          disabled={isLinking || isDeleting}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${placeholder.name}`}
        >
          {isDeleting ? (
            <ActivityIndicator size={16} color={colors.error} />
          ) : (
            <IconTrash size={18} color={colors.error} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =====================================================
// MAIN SCREEN COMPONENT
// =====================================================

export default function LinkPlaceholderScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Confirmation dialog state
  const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();

  // State
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<PlaceholderPlayerWithStats | null>(null);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Additional state for pending link operation
  const [_pendingLinkPlayer, setPendingLinkPlayer] = useState<PlayerSearchResult | null>(null);

  // Data hooks
  const {
    data: placeholders,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePlaceholderPlayers();

  const { data: searchResults, isLoading: isSearching } = useSearchPlayers(searchQuery);

  const linkPlaceholder = useLinkPlaceholderPlayer();
  const deletePlaceholder = useDeletePlaceholderPlayer();

  // Filter search results to only show real players (not already friends status, just non-placeholders)
  // The search already excludes the current user and includes friendship status
  const filteredSearchResults = searchResults?.filter(
    (player) => !player.is_friend && !player.has_pending_request
  );

  // Handle link button press - open friend search modal
  const handleLinkPress = useCallback((placeholder: PlaceholderPlayerWithStats) => {
    setSelectedPlaceholder(placeholder);
    setSearchQuery('');
    setShowFriendSearch(true);
  }, []);

  // Perform the actual link operation
  const performLink = useCallback(async (placeholder: PlaceholderPlayerWithStats, player: PlayerSearchResult) => {
    setShowFriendSearch(false);
    setLinkingId(placeholder.id);

    try {
      await linkPlaceholder.mutateAsync({
        placeholderId: placeholder.id,
        realPlayerId: player.id,
      });

      Toast.show({
        type: 'success',
        text1: 'Guest Player Linked',
        text2: `${placeholder.name}'s history has been transferred to ${player.name}`,
        visibilityTime: 4000,
        position: 'bottom',
      });
    } catch (err) {
      showAlert(
        'Link Failed',
        err instanceof Error ? err.message : 'Failed to link guest player. Please try again.'
      );
    } finally {
      setLinkingId(null);
      setSelectedPlaceholder(null);
      setPendingLinkPlayer(null);
    }
  }, [linkPlaceholder, showAlert]);

  // Handle selecting a real player to link to
  const handleSelectPlayer = useCallback((player: PlayerSearchResult) => {
    if (!selectedPlaceholder) return;

    setPendingLinkPlayer(player);
    showDialog({
      title: 'Link Guest to Account?',
      message: `All scores and history from "${selectedPlaceholder.name}" will be transferred to "${player.name}". This cannot be undone.`,
      confirmLabel: 'Link',
      confirmVariant: 'destructive',
      icon: 'link-variant',
      onConfirm: () => {
        dismissDialog();
        if (selectedPlaceholder && player) {
          performLink(selectedPlaceholder, player);
        }
      },
    });
  }, [selectedPlaceholder, showDialog, dismissDialog, performLink]);

  // Perform the actual delete operation
  const performDelete = useCallback(async (placeholder: PlaceholderPlayerWithStats) => {
    setDeletingId(placeholder.id);

    try {
      await deletePlaceholder.mutateAsync(placeholder.id);

      Toast.show({
        type: 'success',
        text1: 'Guest Player Deleted',
        text2: `${placeholder.name} has been removed`,
        visibilityTime: 3000,
        position: 'bottom',
      });
    } catch (err) {
      showAlert(
        'Delete Failed',
        err instanceof Error ? err.message : 'Failed to delete guest player. Please try again.'
      );
    } finally {
      setDeletingId(null);
    }
  }, [deletePlaceholder, showAlert]);

  // Handle delete button press
  const handleDeletePress = useCallback((placeholder: PlaceholderPlayerWithStats) => {
    const hasData = placeholder.competitions_count > 0 || placeholder.scorecards_count > 0;

    showDialog({
      title: 'Delete Guest Player?',
      message: hasData
        ? `This will permanently delete "${placeholder.name}" and all their ${placeholder.scorecards_count} scorecard(s). This cannot be undone.`
        : `This will permanently delete "${placeholder.name}". This cannot be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        performDelete(placeholder);
      },
    });
  }, [showDialog, dismissDialog, performDelete]);

  // Close friend search modal
  const handleCloseFriendSearch = useCallback(() => {
    setShowFriendSearch(false);
    setSearchQuery('');
    setSelectedPlaceholder(null);
  }, []);

  // Render placeholder item
  const renderPlaceholder = useCallback(
    ({ item }: { item: PlaceholderPlayerWithStats }) => (
      <PlaceholderCard
        placeholder={item}
        onLinkPress={() => handleLinkPress(item)}
        onDeletePress={() => handleDeletePress(item)}
        isLinking={linkingId === item.id}
        isDeleting={deletingId === item.id}
      />
    ),
    [handleLinkPress, handleDeletePress, linkingId, deletingId]
  );

  // Render empty state
  const renderEmpty = useCallback(() => (
    <EmptyState
      title="No Guest Players to Link"
      message="Guest players are people you add to competitions without requiring them to have an app account. When they sign up, you can link their guest profile here to transfer all their scores and history."
      icon="account-group"
    />
  ), []);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Manage Guest Players"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Manage Guest Players"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centered}>
          <ErrorState
            error={error}
            title="Failed to load guest players"
            onRetry={refetch}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Manage Guest Players"
        showBack
        onBack={() => navigation.goBack()}
      />

      <FeatureLock feature="manage_guests" onUpgradePress={() => navigation.navigate('Subscription')}>
        <FlatList
          data={placeholders || []}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaceholder}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
            (!placeholders || placeholders.length === 0) && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </FeatureLock>

      {/* Friend Search Modal */}
      <BottomSheet
        visible={showFriendSearch}
        onClose={handleCloseFriendSearch}
        height="full"
        title={`Link "${selectedPlaceholder?.name ?? 'Guest'}"`}
        showHandle={false}
        safeAreaTop
      >
        {/* Search Input */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search for a player by name..."
          accessibilityLabel="Search for a player to link to"
        />

        {/* Search Results */}
        <View style={styles.searchResults}>
          {searchQuery.length < 2 ? (
            <View style={styles.searchPrompt}>
              <Icon source="account-search" size={48} color={colors.gray300} />
              <Text style={[styles.searchPromptText, { color: colors.textSecondary }]}>
                Enter at least 2 characters to search for players
              </Text>
            </View>
          ) : isSearching ? (
            <View style={styles.centered}>
              <LoadingSpinner size="lg" />
            </View>
          ) : filteredSearchResults && filteredSearchResults.length > 0 ? (
            <FlatList
              data={filteredSearchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.searchResultItem, { backgroundColor: colors.surface }]}
                  onPress={() => handleSelectPlayer(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.name}`}
                >
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.email && (
                      <Text style={[styles.searchResultEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.email}
                      </Text>
                    )}
                    {item.handicap !== null && item.handicap !== undefined && (
                      <Text style={[styles.searchResultHandicap, { color: colors.primary }]}>
                        HC: {item.handicap}
                      </Text>
                    )}
                  </View>
                  <Icon source="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={[styles.searchSeparator, { backgroundColor: colors.border }]} />
              )}
              contentContainerStyle={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={styles.noResults}>
              <Icon source="account-question" size={48} color={colors.gray300} />
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                No players found matching &ldquo;{searchQuery}&rdquo;
              </Text>
              <Text style={[styles.noResultsHint, { color: colors.textSecondary }]}>
                The player must have an account to be linked
              </Text>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* Confirmation Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyListContent: {
    flex: 1,
  },
  separator: {
    height: spacing.md,
  },

  // Card styles
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  handicap: {
    ...typography.small,
    fontWeight: '600',
  },
  createdDate: {
    ...typography.caption,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statText: {
    ...typography.caption,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  linkButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search modal
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
  searchResultsList: {
    padding: spacing.lg,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    ...typography.bodyBold,
  },
  searchResultEmail: {
    ...typography.caption,
    marginTop: 2,
  },
  searchResultHandicap: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  searchSeparator: {
    height: 1,
    marginVertical: spacing.sm,
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
  noResultsHint: {
    ...typography.small,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
