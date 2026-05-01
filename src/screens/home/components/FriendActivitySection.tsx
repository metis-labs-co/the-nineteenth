/**
 * FriendActivitySection - placeholder for v2.
 *
 * The codebase has no friend-activity feed hook yet. The section is wired in
 * so the design is preserved, but it currently always renders null. When a
 * friend feed query is added (e.g. recent completed scorecards from friends
 * within the last 14 days), populate `items` and the rest of the section
 * will light up.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { FriendActivityItem } from '@/types/home';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FriendActivitySectionProps {
  items: FriendActivityItem[];
}

export const FriendActivitySection = React.memo(
  function FriendActivitySection({ items }: FriendActivitySectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    if (items.length === 0) return null;

    return (
      <View style={styles.container}>
        <SectionHeader
          title="From your friends"
          actionLabel="See all"
          onActionPress={() => navigation.navigate('Friends')}
        />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              onPress={() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                navigation.navigate(item.navigateTo.route as any, item.navigateTo.params)
              }
              accessibilityRole="button"
              accessibilityLabel={`${item.friendName} ${item.action}`}
              style={[
                styles.row,
                idx < items.length - 1 && {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Icon source="account-circle" size={28} color={colors.primary} />
              <View style={styles.text}>
                <Text
                  style={[styles.label, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.friendName} {item.action}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  text: {
    flex: 1,
  },
  label: {
    ...typography.body,
  },
});
