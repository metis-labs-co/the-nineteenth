/**
 * SearchRow - Search bar with optional Add Friend / Add Guest action buttons
 *
 * Displays a search input for filtering friends and placeholders,
 * with optional action buttons for adding new friends or guests.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { IconUserPlus, IconUserQuestion } from '@tabler/icons-react-native';
import { spacing, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { SearchBar } from '@/components/common/SearchBar';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchRowProps {
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchQueryChange: (query: string) => void;
  /** Whether placeholder players are available (affects placeholder text) */
  hasPlaceholders: boolean;
  /** Callback when "Add Guest" button is pressed */
  onAddPlaceholderPress?: () => void;
  /** Label for add placeholder button */
  addPlaceholderLabel: string;
  /** Callback when "Add Friend" button is pressed */
  onAddFriendPress?: () => void;
  /** Label for add friend button */
  addFriendLabel: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SearchRow = React.memo(function SearchRow({
  searchQuery,
  onSearchQueryChange,
  hasPlaceholders,
  onAddPlaceholderPress,
  addPlaceholderLabel,
  onAddFriendPress,
  addFriendLabel,
}: SearchRowProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.searchRow}>
      <View style={styles.searchBarWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder={hasPlaceholders ? 'Search friends & guests...' : 'Search friends...'}
          accessibilityLabel="Search friends"
        />
      </View>
      {onAddPlaceholderPress && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.textSecondary }]}
          onPress={onAddPlaceholderPress}
          accessibilityLabel={addPlaceholderLabel}
          accessibilityRole="button"
        >
          <IconUserQuestion size={22} color={colors.white} />
        </TouchableOpacity>
      )}
      {onAddFriendPress && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={onAddFriendPress}
          accessibilityLabel={addFriendLabel}
          accessibilityRole="button"
        >
          <IconUserPlus size={22} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchBarWrapper: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
