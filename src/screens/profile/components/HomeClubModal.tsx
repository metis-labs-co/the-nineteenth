/**
 * HomeClubModal - Modal for selecting home golf club
 *
 * Full-screen modal with search, club list, and clear option.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Modal, FlatList, TouchableOpacity } from 'react-native';
import { Text, Icon, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar, GolfBallLoader } from '@/components/common';
import { ClubCard } from '@/components/courses/ClubCard';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { ClubCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';

interface HomeClubModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Current home club (null if not set) */
  homeClub: { id: string; name: string } | null;
  /** Search query value */
  searchQuery: string;
  /** Update search query */
  onSearchChange: (query: string) => void;
  /** Club display items for list */
  displayItems: ClubCourseDisplayItem[];
  /** Whether clubs are loading */
  isLoading: boolean;
  /** Whether a mutation is in progress */
  isProcessing: boolean;
  /** Whether clear mutation is pending */
  isClearingClub: boolean;
  /** Callback when a course is selected */
  onCourseSelect: (course: CourseWithFavoriteStatus, club: Club) => void;
  /** Callback when a club is pressed */
  onClubPress: (club: Club) => void;
  /** Callback to clear home club */
  onClearHomeClub: () => void;
}

/**
 * @deprecated Use HomeClubModalProps instead
 */
export type HomeVenueModalProps = HomeClubModalProps;

export const HomeClubModal = React.memo(function HomeClubModal({
  visible,
  onClose,
  homeClub,
  searchQuery,
  onSearchChange,
  displayItems,
  isLoading,
  isProcessing,
  isClearingClub,
  onCourseSelect,
  onClubPress,
  onClearHomeClub,
}: HomeClubModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const renderClubItem = useCallback(
    ({ item }: { item: ClubCourseDisplayItem }) => (
      <ClubCard
        item={item}
        onCourseSelect={onCourseSelect}
        onClubPress={onClubPress}
        showFavoriteButton={false}
        selectionMode
      />
    ),
    [onCourseSelect, onClubPress]
  );

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon source="home-city" size={48} color={colors.gray400} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {searchQuery.length >= 2 ? 'No clubs found' : 'No clubs available'}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
          {searchQuery.length >= 2
            ? 'Try a different search term'
            : 'Add clubs from the Courses tab'}
        </Text>
      </View>
    );
  }, [isLoading, searchQuery, colors]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {homeClub ? 'Change Home Club' : 'Set Home Club'}
          </Text>
          <IconButton icon="close" onPress={onClose} iconColor={colors.textPrimary} />
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search golf clubs..."
          accessibilityLabel="Search golf clubs"
          hideBorder
        />

        {/* Clear Home Club Option */}
        {homeClub && (
          <TouchableOpacity
            style={[styles.clearButton, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={onClearHomeClub}
            disabled={isProcessing}
          >
            {isClearingClub ? (
              <GolfBallLoader size="sm" />
            ) : (
              <>
                <Icon source="home-remove" size={20} color={colors.error} />
                <Text style={[styles.clearText, { color: colors.error }]}>
                  Clear Home Club
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading clubs...
            </Text>
          </View>
        )}

        {/* Club List */}
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.club.id}
          renderItem={renderClubItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={ListEmptyComponent}
        />
      </View>
    </Modal>
  );
});

/**
 * @deprecated Use HomeClubModal instead
 */
export const HomeVenueModal = HomeClubModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h4,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  clearText: {
    ...typography.body,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default HomeClubModal;
