import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatPosition } from '@/utils/formatting';
import type { MiniLeaderboardEntry } from '@/utils/miniLeaderboard';
import type { MiniLeaderboardSectionProps } from './types';

interface MiniRowProps {
  entry: MiniLeaderboardEntry;
}

function MiniRow({ entry }: MiniRowProps) {
  const colors = useThemeColors();
  const rowStyle = entry.isCurrent
    ? [styles.row, { backgroundColor: colors.primaryLighter }]
    : styles.row;
  const textColor = entry.isCurrent ? colors.primaryDark : colors.textPrimary;
  const subColor = entry.isCurrent ? colors.primaryDark : colors.textSecondary;

  return (
    <View style={rowStyle}>
      <Text style={[styles.position, { color: subColor }]}>
        {formatPosition(entry.position)}
      </Text>
      <Text
        style={[
          styles.name,
          { color: textColor },
          entry.isCurrent && styles.nameCurrent,
        ]}
        numberOfLines={1}
      >
        {entry.name}
      </Text>
      <Text
        style={[
          styles.points,
          { color: textColor },
          entry.isCurrent && styles.nameCurrent,
        ]}
      >
        {entry.points}
      </Text>
    </View>
  );
}

interface SubSectionProps {
  testID: string;
  label: string;
  rows: {
    above: MiniLeaderboardEntry | null;
    you: MiniLeaderboardEntry;
    below: MiniLeaderboardEntry | null;
  };
  onPress: () => void;
}

function SubSection({ testID, label, rows, onPress }: SubSectionProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label} — open leaderboard`}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Icon source="chevron-right" size={18} color={colors.textSecondary} />
      </View>
      {rows.above && <MiniRow entry={rows.above} />}
      <MiniRow entry={rows.you} />
      {rows.below && <MiniRow entry={rows.below} />}
    </TouchableOpacity>
  );
}

export function MiniLeaderboardSection({
  individual,
  team,
  teamName,
  onOpenLeaderboard,
}: MiniLeaderboardSectionProps) {
  const colors = useThemeColors();

  if (!individual) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
      testID="mini-leaderboard-card"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Your Standing
      </Text>

      <SubSection
        testID="mini-leaderboard-individual"
        label="Individual"
        rows={individual}
        onPress={() => onOpenLeaderboard('individual')}
      />

      {team && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SubSection
            testID="mini-leaderboard-team"
            label={teamName ? `Team — ${teamName}` : 'Team'}
            rows={team}
            onPress={() => onOpenLeaderboard('team')}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  position: {
    ...typography.small,
    width: 36,
    fontVariant: ['tabular-nums'],
  },
  name: {
    ...typography.body,
    flex: 1,
  },
  nameCurrent: {
    fontWeight: '700',
  },
  points: {
    ...typography.body,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
});

export default MiniLeaderboardSection;
