import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionLabel } from '@/components/common/SectionLabel';
import { formatPosition } from '@/utils/formatting';
import type { MiniLeaderboardEntry } from '@/utils/miniLeaderboard';
import type { MiniLeaderboardSectionProps } from './types';

interface MiniRowProps {
  entry: MiniLeaderboardEntry;
}

function MiniRow({ entry }: MiniRowProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const highlightBg = colors.primaryBackground;
  const highlightText = isDark ? colors.primaryLight : colors.primaryDark;
  const rowStyle = entry.isCurrent
    ? [
        styles.row,
        { backgroundColor: highlightBg, borderColor: `${colors.primary}66` },
      ]
    : [styles.row, styles.rowMuted];
  const textColor = entry.isCurrent ? highlightText : colors.textPrimary;
  const subColor = entry.isCurrent ? highlightText : colors.textSecondary;

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
      <MiniRow entry={rows.you} />
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
    <View style={styles.section}>
      <SectionLabel>Your Standing</SectionLabel>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          shadows.sm,
        ]}
        testID="mini-leaderboard-card"
      >
        <SubSection
          testID="mini-leaderboard-individual"
          label="Individual"
          rows={individual}
          onPress={() => onOpenLeaderboard('individual')}
        />

        {team && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
            <SubSection
              testID="mini-leaderboard-team"
              label={teamName ? `Team — ${teamName}` : 'Team'}
              rows={team}
              onPress={() => onOpenLeaderboard('team')}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowMuted: {
    opacity: 0.6,
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
