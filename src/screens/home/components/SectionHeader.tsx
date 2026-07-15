/**
 * SectionHeader - small reusable title row with optional "see all" link.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const SectionHeader = React.memo(function SectionHeader({
  title,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.row}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.textSecondary }]}
      >
        {title}
      </Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.action, { color: colors.primary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
    marginHorizontal: 2,
  },
  title: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  action: {
    ...typography.small,
    fontWeight: '700',
  },
});
