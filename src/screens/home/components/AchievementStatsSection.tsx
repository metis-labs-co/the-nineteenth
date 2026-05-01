/**
 * AchievementStatsSection - 3 mini tiles mirroring the summary cards on the
 * Achievements screen (earned / points / completion %).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { AchievementSummaryStats } from '@/hooks/home';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface AchievementStatsSectionProps {
  summary: AchievementSummaryStats | null;
}

interface TileProps {
  value: string | number;
  label: string;
  icon: string;
  colors: ReturnType<typeof useThemeColors>;
}

function StatTile({ value, label, icon, colors }: TileProps) {
  return (
    <View
      style={[
        styles.tile,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <Icon source={icon} size={20} color={colors.primary} />
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export const AchievementStatsSection = React.memo(
  function AchievementStatsSection({ summary }: AchievementStatsSectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    if (!summary) return null;

    const goToAchievements = () => navigation.navigate('Achievements');

    return (
      <View style={styles.container}>
        <SectionHeader
          title="Achievements"
          actionLabel="See all"
          onActionPress={goToAchievements}
        />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goToAchievements}
          accessibilityRole="button"
          accessibilityLabel={`Achievements: ${summary.totalEarned} earned, ${summary.totalPoints} points, ${Math.round(summary.completionPercentage)}% complete`}
          style={styles.row}
        >
          <StatTile
            value={summary.totalEarned}
            label="Earned"
            icon="trophy"
            colors={colors}
          />
          <StatTile
            value={summary.totalPoints}
            label="Points"
            icon="star"
            colors={colors}
          />
          <StatTile
            value={`${Math.round(summary.completionPercentage)}%`}
            label="Complete"
            icon="check-circle"
            colors={colors}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  value: {
    ...typography.h3,
  },
  label: {
    ...typography.caption,
  },
});
