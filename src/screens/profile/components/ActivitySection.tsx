/**
 * ActivitySection - entry card for the friends' activity feed.
 *
 * Mirrors HomeClubSection's card style. Sits below the home club card on the
 * Profile screen and opens the Activity feed.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface ActivitySectionProps {
  /** Callback when the card is pressed. */
  onPress: () => void;
}

export const ActivitySection = React.memo(function ActivitySection({
  onPress,
}: ActivitySectionProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Activity"
      accessibilityHint="Tap to view your friends' activity feed"
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
        <Icon source="newspaper-variant-outline" size={20} color={colors.primary} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Activity</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {"Friends' rounds, likes & comments"}
        </Text>
      </View>

      <Icon source="chevron-right" size={20} color={colors.gray400} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  label: {
    ...typography.caption,
  },
  title: {
    ...typography.bodyBold,
    marginTop: 2,
  },
});

export default ActivitySection;
