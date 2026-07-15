/**
 * ActivitySection - entry card for the friends' activity feed.
 *
 * Mirrors HomeClubSection's card style. Sits below the home club card on the
 * Profile screen and opens the Activity feed.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SectionLabel } from '@/components/common';
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
    <View style={styles.section}>
      <SectionLabel style={styles.sectionLabel}>Activity</SectionLabel>
      <TouchableOpacity
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Activity"
        accessibilityHint="Tap to view your friends' activity feed"
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="newspaper-variant-outline" size={22} color={colors.primary} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {"Friends' rounds, likes & comments"}
          </Text>
        </View>

        <Icon source="chevron-right" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionLabel: {
    marginHorizontal: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md + 1,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ActivitySection;
