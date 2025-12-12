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
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  /** Hide the outer container border */
  hideBorder?: boolean;
  /** Custom background color for the input wrapper */
  inputBackgroundColor?: string;
  /** Style overrides for the outer container */
  containerStyle?: object;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  accessibilityLabel = 'Search',
  hideBorder = false,
  inputBackgroundColor,
  containerStyle,
}: SearchBarProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.searchSection,
        {
          backgroundColor: colors.surface,
          borderBottomColor: hideBorder ? 'transparent' : colors.gray100,
          borderBottomWidth: hideBorder ? 0 : 1,
        },
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.searchInputWrapper,
          { backgroundColor: inputBackgroundColor ?? colors.surfaceVariant },
        ]}
      >
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
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon source="close-circle" size={20} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
