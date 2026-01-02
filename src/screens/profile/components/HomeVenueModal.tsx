/**
 * HomeVenueModal - Modal for selecting home golf venue
 *
 * Full-screen modal with search, venue list, and clear option.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Modal, FlatList, TouchableOpacity } from 'react-native';
import { Text, Icon, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar, GolfBallLoader } from '@/components/common';
import { VenueCard } from '@/components/courses/VenueCard';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { VenueCourseDisplayItem, CourseWithFavoriteStatus } from '@/hooks/useVenues';
import type { Venue } from '@/types/database.types';

interface HomeVenueModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Current home venue (null if not set) */
  homeVenue: { id: string; name: string } | null;
  /** Search query value */
  searchQuery: string;
  /** Update search query */
  onSearchChange: (query: string) => void;
  /** Venue display items for list */
  displayItems: VenueCourseDisplayItem[];
  /** Whether venues are loading */
  isLoading: boolean;
  /** Whether a mutation is in progress */
  isProcessing: boolean;
  /** Whether clear mutation is pending */
  isClearingVenue: boolean;
  /** Callback when a course is selected */
  onCourseSelect: (course: CourseWithFavoriteStatus, venue: Venue) => void;
  /** Callback when a venue is pressed */
  onVenuePress: (venue: Venue) => void;
  /** Callback to clear home venue */
  onClearHomeVenue: () => void;
}

export const HomeVenueModal = React.memo(function HomeVenueModal({
  visible,
  onClose,
  homeVenue,
  searchQuery,
  onSearchChange,
  displayItems,
  isLoading,
  isProcessing,
  isClearingVenue,
  onCourseSelect,
  onVenuePress,
  onClearHomeVenue,
}: HomeVenueModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const renderVenueItem = useCallback(
    ({ item }: { item: VenueCourseDisplayItem }) => (
      <VenueCard
        item={item}
        onCourseSelect={onCourseSelect}
        onVenuePress={onVenuePress}
        showFavoriteButton={false}
        selectionMode
      />
    ),
    [onCourseSelect, onVenuePress]
  );

  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon source="home-city" size={48} color={colors.gray400} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {searchQuery.length >= 2 ? 'No venues found' : 'No venues available'}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.gray400 }]}>
          {searchQuery.length >= 2
            ? 'Try a different search term'
            : 'Add venues from the Courses tab'}
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
            {homeVenue ? 'Change Home Venue' : 'Set Home Venue'}
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

        {/* Clear Home Venue Option */}
        {homeVenue && (
          <TouchableOpacity
            style={[styles.clearButton, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={onClearHomeVenue}
            disabled={isProcessing}
          >
            {isClearingVenue ? (
              <GolfBallLoader size="sm" />
            ) : (
              <>
                <Icon source="home-remove" size={20} color={colors.error} />
                <Text style={[styles.clearText, { color: colors.error }]}>
                  Clear Home Venue
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
              Loading venues...
            </Text>
          </View>
        )}

        {/* Venue List */}
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.venue.id}
          renderItem={renderVenueItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={ListEmptyComponent}
        />
      </View>
    </Modal>
  );
});

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

export default HomeVenueModal;
