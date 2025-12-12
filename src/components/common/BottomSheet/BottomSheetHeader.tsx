/**
 * BottomSheetHeader - Default header component for BottomSheet
 *
 * Features:
 * - Optional handle bar
 * - Title with optional left/right content
 * - Close button (X)
 * - Accessible touch targets (44x44 minimum)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import {
  HANDLE_WIDTH,
  HANDLE_HEIGHT,
  HEADER_HEIGHT,
  CLOSE_BUTTON_SIZE,
} from './constants';
import type { BottomSheetHeaderProps } from './types';

export function BottomSheetHeader({
  title,
  showCloseButton = true,
  onClose,
  headerLeft,
  headerRight,
  showHandle = true,
}: BottomSheetHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Handle Bar */}
      {showHandle && (
        <View style={styles.handleContainer}>
          <View
            style={[styles.handle, { backgroundColor: colors.border }]}
          />
        </View>
      )}

      {/* Header Row */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {headerLeft}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          {title && (
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {headerRight}
          {showCloseButton && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Icon
                source="close"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: borderRadius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: CLOSE_BUTTON_SIZE,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    ...typography.h4,
    textAlign: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: CLOSE_BUTTON_SIZE,
    gap: spacing.xs,
  },
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
