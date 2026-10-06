import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { NetCardData } from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';

export interface SubMatchNetCardProps {
  index: number;
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  data: NetCardData;
  /** Players on the left side (e.g. "Sam Winzar & Sam Kay"), shown under the team name. */
  leftPlayers?: string;
  /** Players on the right side, shown under the team name. */
  rightPlayers?: string;
  /** Winning side when the sub-match was forfeited ('a'=left, 'b'=right); null otherwise. */
  forfeitWinner?: 'a' | 'b' | null;
}

function statusText(data: NetCardData, leftLabel: string, rightLabel: string): string {
  if (!data.hasScores) return 'Not started';
  if (data.leaderSide === null) return 'All square';
  const leader = data.leaderSide === 'a' ? leftLabel : rightLabel;
  return `${leader} leads by ${data.diff}${data.unit}`;
}

function SideRow({
  label,
  players,
  color,
  value,
  unit,
  isLeader,
}: {
  label: string;
  players?: string;
  color: string;
  value: number | string | null;
  unit: string;
  isLeader: boolean;
}) {
  const colors = useThemeColors();
  const display =
    value === null ? '—' : typeof value === 'string' ? value : `${value}${unit}`;
  return (
    <View style={styles.sideRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.sideLabelCol}>
        <Text numberOfLines={1} style={[styles.sideLabel, { color: colors.textPrimary }]}>
          {label}
        </Text>
        {players ? (
          <Text numberOfLines={1} style={[styles.sidePlayers, { color: colors.textSecondary }]}>
            {players}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.sideValue,
          { color: isLeader ? colors.success : colors.textPrimary, fontWeight: isLeader ? '800' : '600' },
        ]}
      >
        {display}
      </Text>
    </View>
  );
}

export function SubMatchNetCard({
  index,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  data,
  leftPlayers,
  rightPlayers,
  forfeitWinner = null,
}: SubMatchNetCardProps) {
  const colors = useThemeColors();
  const isForfeit = forfeitWinner != null;
  // On a forfeit, replace the net values with the forfeit outcome (the
  // forfeiting side reads "Forfeited", the other "Won") and state who won.
  const leftValue = isForfeit ? (forfeitWinner === 'a' ? 'Won' : 'Forfeited') : data.valueA;
  const rightValue = isForfeit ? (forfeitWinner === 'b' ? 'Won' : 'Forfeited') : data.valueB;
  const leftIsLeader = isForfeit ? forfeitWinner === 'a' : data.leaderSide === 'a';
  const rightIsLeader = isForfeit ? forfeitWinner === 'b' : data.leaderSide === 'b';
  const status = isForfeit
    ? `${forfeitWinner === 'a' ? leftLabel : rightLabel} wins by forfeit`
    : statusText(data, leftLabel, rightLabel);
  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Icon source="trophy-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>Sub-Match {index + 1}</Text>
      </View>
      <SideRow label={leftLabel} players={leftPlayers} color={leftColor} value={leftValue} unit={data.unit} isLeader={leftIsLeader} />
      <SideRow label={rightLabel} players={rightPlayers} color={rightColor} value={rightValue} unit={data.unit} isLeader={rightIsLeader} />
      <Text testID={`net-card-status-${index}`} style={[styles.status, { color: colors.textSecondary }]}>
        {status}
      </Text>
    </View>
  );
}

export interface SubMatchOverallHeaderProps {
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  pointsA: number;
  pointsB: number;
}

export function SubMatchOverallHeader({
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  pointsA,
  pointsB,
}: SubMatchOverallHeaderProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.overallRow}>
        <View style={styles.overallSide}>
          <Text style={[styles.overallPoints, { color: colors.textPrimary }]}>{pointsA}</Text>
          <View style={styles.overallLabelRow}>
            <View style={[styles.dot, { backgroundColor: leftColor }]} />
            <Text numberOfLines={1} style={[styles.overallLabel, { color: colors.textSecondary }]}>{leftLabel}</Text>
          </View>
        </View>
        <Text style={[styles.overallDash, { color: colors.textSecondary }]}>–</Text>
        <View style={styles.overallSide}>
          <Text style={[styles.overallPoints, { color: colors.textPrimary }]}>{pointsB}</Text>
          <View style={styles.overallLabelRow}>
            <Text numberOfLines={1} style={[styles.overallLabel, { color: colors.textSecondary }]}>{rightLabel}</Text>
            <View style={[styles.dot, { backgroundColor: rightColor }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderBottomWidth: 1, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  headerText: { ...typography.caption, fontWeight: '600' },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sideLabelCol: { flex: 1 },
  sideLabel: { ...typography.body },
  sidePlayers: { ...typography.caption, marginTop: 1 },
  sideValue: { ...typography.body },
  status: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  overallRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  overallSide: { alignItems: 'center', flex: 1 },
  overallPoints: { ...typography.h2, fontWeight: '800' },
  overallLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  overallLabel: { ...typography.caption },
  overallDash: { ...typography.h3 },
});
