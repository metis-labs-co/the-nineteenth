/**
 * Sub-match info card — read-only summary of the sub-match.
 *
 * Shows status, tee time, and the players on each side.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type { SubMatch } from '@/types/database/round.types';

interface SubMatchInfoCardProps {
  subMatch: SubMatch;
  /** Map of player id → display name. Missing entries fall back to a short id. */
  playerNames: Map<string, string>;
  /** Tap handler for the tee-time pill. When omitted (or null), the pill
   *  renders as a static badge. Same gating as on `SubMatchesTab`: tee-time
   *  edits are organiser-only. */
  onEditTeeTime?: (() => void) | null;
}

const STATUS_LABELS: Record<SubMatch['status'], string> = {
  upcoming: 'Upcoming',
  'in-progress': 'In progress',
  completed: 'Completed',
  forfeited: 'Forfeited',
};

export function SubMatchInfoCard({
  subMatch,
  playerNames,
  onEditTeeTime,
}: SubMatchInfoCardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const statusColor =
    subMatch.status === 'completed'
      ? colors.success
      : subMatch.status === 'forfeited'
        ? colors.error
        : subMatch.status === 'in-progress'
          ? colors.primary
          : colors.textSecondary;

  const teeTimeBackground = isDark ? `${colors.primary}33` : colors.primaryLighter;
  const teeTimeLabel = subMatch.tee_time
    ? `Tee time ${subMatch.tee_time.slice(0, 5)}`
    : 'Set tee time';
  const showTeeTimeRow = !!subMatch.tee_time || !!onEditTeeTime;

  const teeTimeContent = (
    <>
      <Icon
        source="clock-outline"
        size={14}
        color={onEditTeeTime ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          typography.small,
          { color: onEditTeeTime ? colors.primary : colors.textSecondary },
        ]}
      >
        {teeTimeLabel}
      </Text>
      {onEditTeeTime ? (
        <Icon source="pencil-outline" size={12} color={colors.primary} />
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>
          Sub-match {subMatch.sort_order + 1}
        </Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${statusColor}1A`, borderColor: statusColor },
          ]}
        >
          <Text style={[typography.captionBold, { color: statusColor }]}>
            {STATUS_LABELS[subMatch.status]}
          </Text>
        </View>
      </View>

      {showTeeTimeRow ? (
        onEditTeeTime ? (
          <TouchableOpacity
            onPress={onEditTeeTime}
            style={[styles.teeTimePill, { backgroundColor: teeTimeBackground }]}
            accessibilityRole="button"
            accessibilityLabel={`Edit tee time for Sub-Match ${subMatch.sort_order + 1}`}
            accessibilityHint="Opens a time picker"
            testID="sub-match-detail-tee-time-edit"
          >
            {teeTimeContent}
          </TouchableOpacity>
        ) : (
          <View style={[styles.teeTimePill, { backgroundColor: teeTimeBackground }]}>
            {teeTimeContent}
          </View>
        )
      ) : null}

      <View style={styles.sidesRow}>
        <SideColumn
          label="Team A"
          playerIds={subMatch.team_a_player_ids}
          playerNames={playerNames}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SideColumn
          label="Team B"
          playerIds={subMatch.team_b_player_ids}
          playerNames={playerNames}
        />
      </View>
    </View>
  );
}

interface SideColumnProps {
  label: string;
  playerIds: string[];
  playerNames: Map<string, string>;
}

function SideColumn({ label, playerIds, playerNames }: SideColumnProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.sideColumn}>
      <Text style={[typography.captionBold, { color: colors.textSecondary }]}>{label}</Text>
      {playerIds.map((id) => (
        <Text
          key={id}
          style={[typography.body, { color: colors.textPrimary, marginTop: spacing.xs }]}
          numberOfLines={1}
        >
          {playerNames.get(id) ?? id.slice(0, 8)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  teeTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  sidesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  sideColumn: {
    flex: 1,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
  },
});
