/**
 * SelectionModal - Generic selection modal component
 *
 * A reusable bottom sheet modal for selecting items from a list.
 * Supports search/filtering, single selection, and custom item rendering.
 *
 * Features:
 * - Generic type support for any data type
 * - Optional search with custom filter function
 * - Customizable item rendering
 * - Empty state handling
 * - Loading state support
 * - Dark mode support via useThemeColors
 * - Keyboard-avoiding layout
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SelectionModal
 *   visible={visible}
 *   onClose={handleClose}
 *   onSelect={handleSelectCourse}
 *   items={courses}
 *   keyExtractor={(c) => c.id}
 *   renderItem={(course, selected) => (
 *     <CourseRow course={course} selected={selected} />
 *   )}
 *   title="Select Course"
 *   selectedKey={selectedCourseId}
 * />
 *
 * // With search
 * <SelectionModal
 *   visible={visible}
 *   onClose={handleClose}
 *   onSelect={handleSelectTee}
 *   items={tees}
 *   keyExtractor={(t) => t.id}
 *   renderItem={(tee, selected) => <TeeRow tee={tee} selected={selected} />}
 *   searchable
 *   searchPlaceholder="Search tees..."
 *   filterFn={(tee, query) => tee.name.toLowerCase().includes(query.toLowerCase())}
 *   title="Select Tees"
 *   selectedKey={selectedTeeId}
 * />
 * ```
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ListRenderItem } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { BottomSheet, SearchBar, EmptyState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

/**
 * Props for SelectionModal component
 * @template T - The type of items in the selection list
 */
export interface SelectionModalProps<T> {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Callback when the modal is closed
   */
  onClose: () => void;

  /**
   * Callback when an item is selected
   */
  onSelect: (item: T) => void;

  /**
   * Array of items to display in the selection list
   */
  items: T[];

  /**
   * Function to extract a unique key from each item
   */
  keyExtractor: (item: T) => string;

  /**
   * Function to render each item in the list
   * @param item - The item to render
   * @param selected - Whether the item is currently selected
   */
  renderItem: (item: T, selected: boolean) => React.ReactNode;

  /**
   * Whether to show search functionality
   * @default false
   */
  searchable?: boolean;

  /**
   * Placeholder text for the search input
   * @default "Search..."
   */
  searchPlaceholder?: string;

  /**
   * Function to filter items based on search query
   * Required if searchable is true
   */
  filterFn?: (item: T, query: string) => boolean;

  /**
   * Title displayed in the modal header
   */
  title: string;

  /**
   * Message to display when the list is empty
   * @default "No items found"
   */
  emptyMessage?: string;

  /**
   * Icon to display in the empty state
   * @default "magnify"
   */
  emptyIcon?: string;

  /**
   * The key of the currently selected item
   */
  selectedKey?: string;

  /**
   * Whether multiple items can be selected (not yet implemented)
   * @default false
   */
  multiSelect?: boolean;

  /**
   * Whether the list is currently loading
   * @default false
   */
  loading?: boolean;

  /**
   * Loading message to display
   * @default "Loading..."
   */
  loadingMessage?: string;

  /**
   * Optional header content to render above the list
   */
  headerContent?: React.ReactNode;

  /**
   * Height of the bottom sheet
   * @default 0.7 (70% of screen height)
   */
  height?: number | 'full';

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Generic selection modal component
 *
 * A reusable bottom sheet modal for selecting items from a list.
 * Supports search/filtering, single selection, and custom item rendering.
 */
export function SelectionModal<T>({
  visible,
  onClose,
  onSelect,
  items,
  keyExtractor,
  renderItem,
  searchable = false,
  searchPlaceholder = 'Search...',
  filterFn,
  title,
  emptyMessage = 'No items found',
  emptyIcon = 'magnify',
  selectedKey,
  loading = false,
  loadingMessage = 'Loading...',
  headerContent,
  height = 0.7,
  testID,
}: SelectionModalProps<T>) {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!query || !filterFn) return items;
    return items.filter((item) => filterFn(item, query));
  }, [items, query, filterFn]);

  // Handle item selection
  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      onClose();
    },
    [onSelect, onClose]
  );

  // Clear search when modal closes
  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  // Render each list item
  const renderListItem: ListRenderItem<T> = useCallback(
    ({ item }) => {
      const itemKey = keyExtractor(item);
      const isSelected = selectedKey === itemKey;

      return (
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          style={[
            styles.itemContainer,
            { borderBottomColor: colors.border },
            isSelected && { backgroundColor: colors.primaryLighter },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          testID={`${testID}-item-${itemKey}`}
        >
          {renderItem(item, isSelected)}
        </TouchableOpacity>
      );
    },
    [keyExtractor, selectedKey, handleSelect, renderItem, colors, testID]
  );

  // Render loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        {loadingMessage}
      </Text>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <EmptyState
      title={emptyMessage}
      message={
        query.length > 0
          ? 'Try a different search term'
          : 'No items available'
      }
      icon={emptyIcon}
      compact
    />
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={title}
      height={height}
      testID={testID}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        {searchable && (
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            accessibilityLabel={`Search ${title.toLowerCase()}`}
            hideBorder
          />
        )}

        {/* Optional Header Content */}
        {headerContent && (
          <View style={styles.headerContent}>{headerContent}</View>
        )}

        {/* Loading State */}
        {loading && renderLoading()}

        {/* Item List */}
        {!loading && (
          <FlatList
            data={filteredItems}
            keyExtractor={keyExtractor}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={renderEmpty}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            testID={`${testID}-list`}
          />
        )}
      </View>
    </BottomSheet>
  );
}

/**
 * Selection item row component for common use case
 *
 * A pre-built row component that can be used with SelectionModal
 * for simple text + check mark selections.
 */
export interface SelectionItemRowProps {
  /**
   * Primary label text
   */
  label: string;

  /**
   * Optional secondary description text
   */
  description?: string;

  /**
   * Whether this item is selected
   */
  selected: boolean;

  /**
   * Optional icon to display before the label
   */
  icon?: string;

  /**
   * Optional icon color
   */
  iconColor?: string;

  /**
   * Whether the item is disabled
   */
  disabled?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Pre-built selection item row component
 */
export function SelectionItemRow({
  label,
  description,
  selected,
  icon,
  iconColor,
  disabled = false,
  testID,
}: SelectionItemRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.rowContainer, disabled && { opacity: 0.5 }]}
      testID={testID}
    >
      <View style={styles.rowContent}>
        {icon && (
          <View style={styles.rowIcon}>
            <Icon
              source={icon}
              size={24}
              color={iconColor ?? colors.textSecondary}
            />
          </View>
        )}
        <View style={styles.rowTextContainer}>
          <Text
            style={[
              styles.rowLabel,
              { color: selected ? colors.primary : colors.textPrimary },
              disabled && { color: colors.textDisabled },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {description && (
            <Text
              style={[styles.rowDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {description}
            </Text>
          )}
        </View>
      </View>
      {selected && !disabled && (
        <Icon source="check" size={24} color={colors.primary} />
      )}
    </View>
  );
}

// Styles are at the bottom of the file

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  itemContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  separator: {
    height: 0,
  },
  // SelectionItemRow styles
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    ...typography.bodyBold,
  },
  rowDescription: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});
