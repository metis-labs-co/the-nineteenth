/**
 * MatesThisWeekSection - ranked list of your and your friends' best
 * Stableford rounds submitted this week (Mon-Sun). Tapping a row opens
 * that round's activity view. Renders nothing while loading, on error,
 * or when nobody (including you) has a submitted round this week.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { useMatesThisWeek } from '@/hooks/home/useMatesThisWeek';
import type { MateWeeklyEntry } from '@/hooks/home/matesLeaderboard';
import type { RootStackParamList } from '@/navigation/types';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AVATAR_SIZE = 40;

interface MateRowProps {
  entry: MateWeeklyEntry;
  position: number;
  leaderPoints: number;
  onPress: (roundId: string) => void;
}

const MateRow = React.memo(function MateRow({ entry, position, leaderPoints, onPress }: MateRowProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const displayName = entry.isCurrentUser ? 'You' : entry.name;
  const sublabel = position === 1 ? 'Leading' : `${leaderPoints - entry.points} behind`;
  const highlightText = isDark ? colors.primaryLight : colors.primaryDark;
  const nameColor = entry.isCurrentUser ? highlightText : colors.textPrimary;
  const subColor = entry.isCurrentUser ? highlightText : colors.textSecondary;

  return (
    <TouchableOpacity
      testID={`mate-row-${entry.playerId}`}
      onPress={() => onPress(entry.roundId)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, position ${position}, ${entry.points} points — view round`}
      style={[
        styles.row,
        entry.isCurrentUser && {
          backgroundColor: colors.primaryBackground,
          borderColor: `${colors.primary}66`,
        },
      ]}
    >
      <Text style={[styles.position, { color: subColor }]}>{position}</Text>
      <PlayerAvatar photoUrl={entry.photoUrl} name={entry.name} size={AVATAR_SIZE} />
      <View style={styles.nameBlock}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: nameColor }, entry.isCurrentUser && styles.nameCurrent]}
        >
          {displayName}
        </Text>
        <Text style={[styles.sublabel, { color: subColor }]}>{sublabel}</Text>
      </View>
      <Text style={[styles.points, { color: nameColor }]}>{entry.points}</Text>
    </TouchableOpacity>
  );
});

export const MatesThisWeekSection = React.memo(function MatesThisWeekSection() {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { data, isLoading, isError } = useMatesThisWeek();

  const openRound = useCallback(
    (roundId: string) => navigation.navigate('RoundActivity', { roundId }),
    [navigation]
  );
  const openActivity = useCallback(
    () => navigation.navigate('MainTabs', { screen: 'ActivityTab' }),
    [navigation]
  );

  const entries = data ?? [];
  if (isLoading || isError || entries.length === 0) return null;

  const leaderPoints = entries[0].points;

  return (
    <View style={styles.container}>
      <SectionHeader title="Mates this week" actionLabel="See all" onActionPress={openActivity} />
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Stableford points · tap to view
      </Text>
      <View
        style={[
          styles.card,
          shadows.sm,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {entries.map((entry, idx) => (
          <MateRow
            key={entry.playerId}
            entry={entry}
            position={idx + 1}
            leaderPoints={leaderPoints}
            onPress={openRound}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  caption: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 56,
  },
  position: {
    ...typography.small,
    width: 24,
    fontVariant: ['tabular-nums'],
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    ...typography.body,
  },
  nameCurrent: {
    fontWeight: '700',
  },
  sublabel: {
    ...typography.caption,
  },
  points: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
});
