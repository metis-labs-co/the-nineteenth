/**
 * AchievementProgressSection - shows in-progress achievements with progress bars.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { AchievementHighlight } from '@/hooks/home';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface AchievementProgressSectionProps {
  achievements: AchievementHighlight[];
}

export const AchievementProgressSection = React.memo(
  function AchievementProgressSection({
    achievements,
  }: AchievementProgressSectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    if (achievements.length === 0) return null;

    return (
      <View style={styles.container}>
        <SectionHeader
          title="Closing in"
          actionLabel="See all"
          onActionPress={() => navigation.navigate('Achievements')}
        />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          {achievements.map((a, idx) => (
            <TouchableOpacity
              key={a.code}
              onPress={() => navigation.navigate('Achievements')}
              accessibilityRole="button"
              accessibilityLabel={`${a.name}, ${Math.round(a.progressPercent)}% complete`}
              style={[
                styles.row,
                idx < achievements.length - 1 && {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Icon source={a.icon || 'medal'} size={22} color={colors.primary} />
              <View style={styles.text}>
                <Text
                  style={[styles.name, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {a.name}
                </Text>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: colors.surfaceVariant },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${Math.round(a.progressPercent)}%`,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.progressLabel, { color: colors.textSecondary }]}
                >
                  {a.currentValue} of {a.threshold}
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
    minHeight: 64,
  },
  text: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressLabel: {
    ...typography.caption,
    marginTop: 4,
  },
});
