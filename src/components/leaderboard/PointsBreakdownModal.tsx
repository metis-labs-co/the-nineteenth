/**
 * PointsBreakdownModal - Shows per-round points breakdown for a player/team
 *
 * Displays:
 * - Player/team name and total points
 * - Per-round breakdown with position and points earned
 * - Round details (course, date, game type)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
import { buildPositionalRoundNumbers } from './roundNumbering';

interface RoundPoints {
  roundId: string;
  points: number;
  position: number;
}

export interface PointsBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  participantName: string;
  isTeam: boolean;
  totalPoints: number;
  position: number;
  roundsPlayed: number;
  roundPoints: RoundPoints[];
  /** Round metadata for displaying course/date info */
  rounds: RoundWithCourse[];
  /** When provided, each round row becomes tappable and calls this with the
   *  round id (used to open the participant's scorecard for that round). Not
   *  passed for team entries, which have no single scorecard to open. */
  onRoundPress?: (roundId: string) => void;
  testID?: string;
}

export function PointsBreakdownModal({
  visible,
  onClose,
  participantName,
  isTeam,
  totalPoints,
  position,
  roundsPlayed,
  roundPoints,
  rounds,
  onRoundPress,
  testID,
}: PointsBreakdownModalProps) {
  const colors = useThemeColors();

  // Create a map of round info for quick lookup
  const roundInfoMap = useMemo(() => {
    const map = new Map<string, RoundWithCourse>();
    for (const round of rounds) {
      map.set(round.id, round);
    }
    return map;
  }, [rounds]);

  // Positional round numbers: 1-based position within the display_order-sorted
  // list, matching the Rounds tab (round.round_number is a stable id with gaps).
  const positionalByRoundId = useMemo(
    () => buildPositionalRoundNumbers(rounds),
    [rounds]
  );

  // Sort round points by positional round number
  const sortedRoundPoints = useMemo(() => {
    return [...roundPoints].sort((a, b) => {
      const posA = positionalByRoundId.get(a.roundId) ?? Number.MAX_SAFE_INTEGER;
      const posB = positionalByRoundId.get(b.roundId) ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
  }, [roundPoints, positionalByRoundId]);

  // Calculate average points per round
  const avgPoints = roundsPlayed > 0 ? (totalPoints / roundsPlayed).toFixed(1) : '0';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const getPositionSuffix = (pos: number): string => {
    if (pos >= 11 && pos <= 13) return 'th';
    switch (pos % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const getPositionColor = (pos: number): string => {
    switch (pos) {
      case 1: return colors.warning;
      case 2: return colors.gray500;
      case 3: return '#CD7F32'; // Bronze
      default: return colors.textSecondary;
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.85}
      title="Points Breakdown"
      testID={testID}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryHeader}>
            <Icon
              source={isTeam ? 'account-group' : 'account'}
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.participantName, { color: colors.textPrimary }]}>
              {participantName}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {position}{getPositionSuffix(position)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Position
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {totalPoints}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Points
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {avgPoints}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Avg/Round
              </Text>
            </View>
          </View>
        </View>

        {/* Round Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Round by Round
        </Text>

        {sortedRoundPoints.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Icon source="golf" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No rounds played yet
            </Text>
          </View>
        ) : (
          <View style={[styles.roundsContainer, { backgroundColor: colors.surface }]}>
            {sortedRoundPoints.map((rp, index) => {
              const roundInfo = roundInfoMap.get(rp.roundId);
              const isLast = index === sortedRoundPoints.length - 1;

              const rowContent = (
                <>
                  <View style={styles.roundInfo}>
                    <View style={styles.roundHeader}>
                      <Text style={[styles.roundNumber, { color: colors.textPrimary }]}>
                        Round {positionalByRoundId.get(rp.roundId) ?? index + 1}
                      </Text>
                      {roundInfo?.date && (
                        <Text style={[styles.roundDate, { color: colors.textSecondary }]}>
                          {formatDate(roundInfo.date)}
                        </Text>
                      )}
                    </View>
                    {roundInfo?.course?.name && (
                      <Text
                        style={[styles.courseName, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {roundInfo.course.name}
                      </Text>
                    )}
                  </View>

                  <View style={styles.roundScore}>
                    <View style={styles.positionBadge}>
                      <Text style={[styles.positionText, { color: getPositionColor(rp.position) }]}>
                        {rp.position}{getPositionSuffix(rp.position)}
                      </Text>
                    </View>
                    <Text style={[styles.pointsValue, { color: colors.textPrimary }]}>
                      {rp.points} pts
                    </Text>
                  </View>

                  {onRoundPress && (
                    <View style={styles.chevron}>
                      <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                    </View>
                  )}
                </>
              );

              return (
                <View key={rp.roundId}>
                  {onRoundPress ? (
                    <TouchableOpacity
                      style={styles.roundRow}
                      onPress={() => onRoundPress(rp.roundId)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Round ${positionalByRoundId.get(rp.roundId) ?? index + 1}, ${rp.position}${getPositionSuffix(rp.position)} place, ${rp.points} points`}
                      accessibilityHint="Tap to view scorecard"
                    >
                      {rowContent}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.roundRow}>{rowContent}</View>
                  )}
                  {!isLast && (
                    <Divider style={[styles.divider, { backgroundColor: colors.gray100 }]} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Points System Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Points are awarded based on finishing position each round: 1st = 10pts, 2nd = 8pts, 3rd = 6pts, etc.
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Summary Card
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  participantName: {
    ...typography.h3,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  // Section
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  // Rounds Container
  roundsContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  roundInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roundNumber: {
    ...typography.bodyBold,
  },
  roundDate: {
    ...typography.small,
  },
  courseName: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  roundScore: {
    alignItems: 'flex-end',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  positionBadge: {
    marginBottom: spacing.xs,
  },
  positionText: {
    ...typography.small,
    fontWeight: '600',
  },
  pointsValue: {
    ...typography.bodyBold,
  },
  divider: {
    marginHorizontal: spacing.md,
  },
  // Empty State
  emptyState: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
});
