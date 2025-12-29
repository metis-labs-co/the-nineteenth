/**
 * AICompetitionHeader - Header for AI competition screen
 *
 * Shows back button, title, and beta badge
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows, borderRadius } from '@/constants/theme';
import type { ScreenState } from '../hooks';

interface AICompetitionHeaderProps {
  screenState: ScreenState;
  onBack: () => void;
}

export function AICompetitionHeader({
  screenState,
  onBack,
}: AICompetitionHeaderProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const headerTitle =
    screenState === 'preview' ? 'Review Competition' : 'Create with AI';

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            source={screenState === 'input' ? 'close' : 'arrow-left'}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {headerTitle}
        </Text>

        <View style={styles.headerRight}>
          <View style={[styles.betaPill, { backgroundColor: colors.gray200 }]}>
            <Text style={[styles.betaText, { color: colors.textSecondary }]}>
              Beta
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h4,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  betaPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  betaText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
