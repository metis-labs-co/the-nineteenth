/**
 * ClubAutocomplete - Smart club search with autocomplete dropdown
 *
 * Searches existing clubs as user types, shows matching results in a dropdown.
 * When a club is selected, displays it as a chip with a clear button.
 * Includes a "Create new" option when the typed name doesn't match.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import { useSearchClubs } from '@/hooks/clubs/queries';
import { isLocalClub } from '@/hooks/clubs/helpers';
import type { SearchResultItem } from '@/hooks/clubs/types';
import type { Club } from '@/types/database.types';

interface ClubAutocompleteProps {
  selectedClub: Club | null;
  onSelectClub: (item: SearchResultItem) => void;
  onCreateNew: (name: string) => void;
  onClearSelection: () => void;
  isImporting?: boolean;
  autoFocus?: boolean;
}

export function ClubAutocomplete({
  selectedClub,
  onSelectClub,
  onCreateNew,
  onClearSelection,
  isImporting = false,
  autoFocus = true,
}: ClubAutocompleteProps) {
  const colors = useThemeColors();
  const [searchText, setSearchText] = useState('');

  const { data: searchResults, isLoading, isSearchingApi } = useSearchClubs(
    searchText.trim(),
    undefined
  );

  const showDropdown = searchText.trim().length >= 2 && !selectedClub;
  const results = searchResults ?? [];

  const handleSelectItem = useCallback(
    (item: SearchResultItem) => {
      setSearchText('');
      onSelectClub(item);
    },
    [onSelectClub]
  );

  const handleCreateNew = useCallback(() => {
    const name = searchText.trim();
    if (!name) return;
    setSearchText('');
    onCreateNew(name);
  }, [searchText, onCreateNew]);

  const handleClear = useCallback(() => {
    setSearchText('');
    onClearSelection();
  }, [onClearSelection]);

  const renderResultItem = useCallback(
    ({ item }: { item: SearchResultItem }) => {
      const isLocal = isLocalClub(item);
      const subtitle = [item.city, item.state].filter(Boolean).join(', ');

      return (
        <TouchableOpacity
          style={[styles.resultItem, { borderBottomColor: colors.border }]}
          onPress={() => handleSelectItem(item)}
          activeOpacity={0.7}
        >
          <View style={styles.resultTextContainer}>
            <Text
              style={[styles.resultName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.resultSubtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {!isLocal && (
            <View style={[styles.apiBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.apiBadgeText, { color: colors.primary }]}>
                Import
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [colors, handleSelectItem]
  );

  // Selected club chip
  if (selectedClub) {
    return (
      <View style={[styles.chipContainer, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
        {isImporting ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.chipIcon} />
        ) : (
          <Icon source="map-marker" size={16} color={colors.primary} />
        )}
        <Text
          style={[styles.chipText, { color: colors.primary }]}
          numberOfLines={1}
        >
          {isImporting ? 'Importing...' : selectedClub.name}
        </Text>
        {!isImporting && (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <Icon source="close-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceVariant,
            color: colors.textPrimary,
            borderColor: colors.border,
          },
        ]}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search clubs or enter new name"
        placeholderTextColor={colors.textDisabled}
        autoFocus={autoFocus}
        autoCapitalize="words"
        returnKeyType="search"
      />

      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.md]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Searching...
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id ?? item.name}
              renderItem={renderResultItem}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.createNewItem, { borderTopColor: colors.border }]}
                  onPress={handleCreateNew}
                  activeOpacity={0.7}
                >
                  <Icon source="plus-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.createNewText, { color: colors.primary }]} numberOfLines={1}>
                    Create new: &quot;{searchText.trim()}&quot;
                  </Text>
                </TouchableOpacity>
              }
              ListEmptyComponent={
                isSearchingApi ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      Searching online...
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    borderWidth: 1,
  },
  dropdown: {
    maxHeight: 220,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  resultsList: {
    maxHeight: 220,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resultName: {
    ...typography.bodyBold,
  },
  resultSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  apiBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  apiBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  createNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  createNewText: {
    ...typography.bodyBold,
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  chipIcon: {
    marginRight: 0,
  },
  chipText: {
    ...typography.bodyBold,
    flex: 1,
  },
});
