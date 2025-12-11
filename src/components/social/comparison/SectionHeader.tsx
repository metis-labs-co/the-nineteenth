/**
 * SectionHeader - Section title with optional icon
 *
 * Provides consistent section headers for the comparison screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface SectionHeaderProps {
  /** Section title text */
  title: string;
  /** Optional icon name from MaterialCommunityIcons */
  icon?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const SectionHeader = React.memo(function SectionHeader({
  title,
  icon,
}: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {icon && <Icon source={icon} size={20} color={colors.textSecondary} />}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
  },
});

export default SectionHeader;
