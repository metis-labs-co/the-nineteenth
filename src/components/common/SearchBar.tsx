/**
 * SearchBar - Reusable search input component
 *
 * Features:
 * - Search icon with text input
 * - Clear button when text is present
 * - Dark mode support
 * - Customizable placeholder
 * - Keyboard handling
 */

import React from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useIsDark, useThemeColors } from '@/context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  accessibilityLabel = 'Search',
}: SearchBarProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  return (
    <View
      style={[
        styles.searchSection,
        {
          backgroundColor: isDark ? colors.gray100 : colors.white,
          borderBottomColor: colors.gray100,
        },
      ]}
    >
      <View style={[styles.searchInputWrapper, { backgroundColor: colors.gray50 }]}>
        <Icon source="magnify" size={20} color={colors.gray400} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={accessibilityLabel}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon source="close-circle" size={20} color={colors.gray400} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
});
