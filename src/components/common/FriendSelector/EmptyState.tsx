/**
 * EmptyState - Empty state display when no friends or search results
 *
 * Shows an icon, title, description, and optional "Add Friend" action button
 * based on whether a search query is active.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconUsers, IconUserPlus } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export interface EmptyStateProps {
  /** Current search query (affects messaging) */
  searchQuery: string;
  /** Message when no friends exist */
  emptyMessage: string;
  /** Message when search returns no results */
  emptySearchMessage: string;
  /** Callback when "Add Friend" button is pressed */
  onAddFriendPress?: () => void;
  /** Label for add friend button */
  addFriendLabel: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const EmptyState = React.memo(function EmptyState({
  searchQuery,
  emptyMessage,
  emptySearchMessage,
  onAddFriendPress,
  addFriendLabel,
}: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyContainer}>
      <IconUsers size={48} color={colors.textDisabled} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {searchQuery ? emptySearchMessage : emptyMessage}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery
          ? `No friends match "${searchQuery}"`
          : onAddFriendPress
            ? 'Tap the + button above to add friends'
            : 'Add friends from the Friends tab'}
      </Text>
      {!searchQuery && onAddFriendPress && (
        <TouchableOpacity
          style={[styles.emptyAddButton, { backgroundColor: colors.primary }]}
          onPress={onAddFriendPress}
          accessibilityLabel={addFriendLabel}
          accessibilityRole="button"
        >
          <IconUserPlus size={18} color={colors.white} />
          <Text style={[styles.emptyAddButtonText, { color: colors.white }]}>
            {addFriendLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyBold,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  emptyAddButtonText: {
    ...typography.bodyBold,
  },
});
