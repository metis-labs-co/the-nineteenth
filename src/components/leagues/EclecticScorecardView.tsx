/**
 * EclecticScorecardView - 18-hole composite scorecard for eclectic leagues
 *
 * Shows par, best score, and improvement indicators for each hole.
 * Holes without a score are shown as empty/dashed.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { getScoreColor } from '@/utils/scoring';
import type { EclecticBestScore, EclecticScoring } from '@/types/database';

interface CourseHole {
  hole_number: number;
  par: number;
  stroke_index?: number;
}

interface EclecticScorecardViewProps {
  bestScores: EclecticBestScore[];
  courseHoles: CourseHole[];
  scoring: EclecticScoring;
  courseName?: string;
}

export default React.memo(function EclecticScorecardView({
  bestScores,
  courseHoles,
  scoring,
  courseName,
}: EclecticScorecardViewProps) {
  const colors = useThemeColors();

  const scoreMap = useMemo(() => {
    const map = new Map<number, EclecticBestScore>();
    bestScores.forEach((s) => map.set(s.hole_number, s));
    return map;
  }, [bestScores]);

  // Calculate totals
  const front9 = courseHoles.filter((h) => h.hole_number <= 9);
  const back9 = courseHoles.filter((h) => h.hole_number > 9);

  const frontPar = front9.reduce((sum, h) => sum + h.par, 0);
  const backPar = back9.reduce((sum, h) => sum + h.par, 0);
  const totalPar = frontPar + backPar;

  const frontScore = front9.reduce((sum, h) => sum + (scoreMap.get(h.hole_number)?.best_gross ?? 0), 0);
  const backScore = back9.reduce((sum, h) => sum + (scoreMap.get(h.hole_number)?.best_gross ?? 0), 0);
  const totalScore = frontScore + backScore;

  const holesCompleted = bestScores.length;

  const renderHoleRow = (hole: CourseHole) => {
    const bestScore = scoreMap.get(hole.hole_number);
    const hasScore = !!bestScore;

    return (
      <View key={hole.hole_number} style={[styles.holeRow, { borderBottomColor: colors.border }]}>
        {/* Hole Number */}
        <View style={[styles.holeCell, styles.holeLabelCell]}>
          <Text style={[styles.holeNumber, { color: colors.textPrimary }]}>
            {hole.hole_number}
          </Text>
        </View>

        {/* Par */}
        <View style={[styles.holeCell, styles.parCell]}>
          <Text style={[styles.parText, { color: colors.textSecondary }]}>
            {hole.par}
          </Text>
        </View>

        {/* Stroke Index */}
        <View style={[styles.holeCell, styles.siCell]}>
          <Text style={[styles.siText, { color: colors.textSecondary }]}>
            {hole.stroke_index ?? '-'}
          </Text>
        </View>

        {/* Best Score */}
        <View style={[styles.holeCell, styles.scoreCell]}>
          {hasScore ? (
            <View style={[
              styles.scoreBadge,
              { backgroundColor: getScoreColor(bestScore.best_gross, hole.par, colors) + '20' },
            ]}>
              <Text style={[
                styles.scoreText,
                { color: getScoreColor(bestScore.best_gross, hole.par, colors) },
              ]}>
                {bestScore.best_gross}
              </Text>
            </View>
          ) : (
            <Text style={[styles.emptyScore, { color: colors.gray300 }]}>—</Text>
          )}
        </View>

        {/* Net Score (if applicable) */}
        {scoring === 'net' && (
          <View style={[styles.holeCell, styles.netCell]}>
            {hasScore && bestScore.best_net != null ? (
              <Text style={[styles.netText, { color: colors.textSecondary }]}>
                {bestScore.best_net}
              </Text>
            ) : (
              <Text style={[styles.emptyScore, { color: colors.gray300 }]}>—</Text>
            )}
          </View>
        )}

        {/* Vs Par */}
        <View style={[styles.holeCell, styles.vsParCell]}>
          {hasScore ? (
            <Text style={[
              styles.vsParText,
              { color: getScoreColor(bestScore.best_gross, hole.par, colors) },
            ]}>
              {bestScore.best_gross - hole.par === 0
                ? 'E'
                : bestScore.best_gross - hole.par > 0
                  ? `+${bestScore.best_gross - hole.par}`
                  : `${bestScore.best_gross - hole.par}`}
            </Text>
          ) : (
            <Text style={[styles.emptyScore, { color: colors.gray300 }]}>—</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Course Name */}
      {courseName && (
        <View style={styles.courseHeader}>
          <Icon source="golf" size={18} color={colors.primary} />
          <Text style={[styles.courseName, { color: colors.textPrimary }]}>
            {courseName}
          </Text>
        </View>
      )}

      {/* Summary */}
      <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {holesCompleted}/18
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Holes
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {holesCompleted === 18 ? totalScore : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {holesCompleted === 18 ? (totalScore - totalPar === 0 ? 'E' : totalScore - totalPar > 0 ? `+${totalScore - totalPar}` : totalScore - totalPar) : '—'}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            vs Par
          </Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
        <View style={[styles.holeCell, styles.holeLabelCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Hole</Text>
        </View>
        <View style={[styles.holeCell, styles.parCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Par</Text>
        </View>
        <View style={[styles.holeCell, styles.siCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>SI</Text>
        </View>
        <View style={[styles.holeCell, styles.scoreCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Best</Text>
        </View>
        {scoring === 'net' && (
          <View style={[styles.holeCell, styles.netCell]}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Net</Text>
          </View>
        )}
        <View style={[styles.holeCell, styles.vsParCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>+/-</Text>
        </View>
      </View>

      {/* Front 9 */}
      {front9.map(renderHoleRow)}

      {/* Front 9 Total */}
      <View style={[styles.totalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
        <View style={[styles.holeCell, styles.holeLabelCell]}>
          <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>OUT</Text>
        </View>
        <View style={[styles.holeCell, styles.parCell]}>
          <Text style={[styles.totalText, { color: colors.textSecondary }]}>{frontPar}</Text>
        </View>
        <View style={[styles.holeCell, styles.siCell]} />
        <View style={[styles.holeCell, styles.scoreCell]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>
            {frontScore > 0 ? frontScore : '—'}
          </Text>
        </View>
        {scoring === 'net' && <View style={[styles.holeCell, styles.netCell]} />}
        <View style={[styles.holeCell, styles.vsParCell]} />
      </View>

      {/* Back 9 */}
      {back9.map(renderHoleRow)}

      {/* Back 9 Total */}
      <View style={[styles.totalRow, { backgroundColor: colors.gray100, borderBottomColor: colors.border }]}>
        <View style={[styles.holeCell, styles.holeLabelCell]}>
          <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>IN</Text>
        </View>
        <View style={[styles.holeCell, styles.parCell]}>
          <Text style={[styles.totalText, { color: colors.textSecondary }]}>{backPar}</Text>
        </View>
        <View style={[styles.holeCell, styles.siCell]} />
        <View style={[styles.holeCell, styles.scoreCell]}>
          <Text style={[styles.totalText, { color: colors.textPrimary }]}>
            {backScore > 0 ? backScore : '—'}
          </Text>
        </View>
        {scoring === 'net' && <View style={[styles.holeCell, styles.netCell]} />}
        <View style={[styles.holeCell, styles.vsParCell]} />
      </View>

      {/* Grand Total */}
      <View style={[styles.grandTotalRow, { backgroundColor: colors.primary + '15', borderBottomColor: colors.border }]}>
        <View style={[styles.holeCell, styles.holeLabelCell]}>
          <Text style={[styles.grandTotalLabel, { color: colors.primary }]}>TOTAL</Text>
        </View>
        <View style={[styles.holeCell, styles.parCell]}>
          <Text style={[styles.grandTotalText, { color: colors.textSecondary }]}>{totalPar}</Text>
        </View>
        <View style={[styles.holeCell, styles.siCell]} />
        <View style={[styles.holeCell, styles.scoreCell]}>
          <Text style={[styles.grandTotalText, { color: colors.primary }]}>
            {holesCompleted === 18 ? totalScore : '—'}
          </Text>
        </View>
        {scoring === 'net' && <View style={[styles.holeCell, styles.netCell]} />}
        <View style={[styles.holeCell, styles.vsParCell]} />
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  courseName: {
    ...typography.bodyBold,
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
  },
  summaryValue: {
    ...typography.h3,
  },
  summaryLabel: {
    ...typography.small,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  holeRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  holeCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeLabelCell: {
    width: 40,
  },
  parCell: {
    width: 36,
  },
  siCell: {
    width: 30,
  },
  scoreCell: {
    flex: 1,
    minWidth: 44,
  },
  netCell: {
    width: 40,
  },
  vsParCell: {
    width: 40,
  },
  holeNumber: {
    ...typography.bodyBold,
  },
  parText: {
    ...typography.small,
  },
  siText: {
    ...typography.small,
  },
  scoreBadge: {
    width: 32,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...typography.bodyBold,
  },
  netText: {
    ...typography.small,
  },
  vsParText: {
    ...typography.smallBold,
  },
  emptyScore: {
    ...typography.body,
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  totalLabel: {
    ...typography.bodyBold,
    fontSize: 12,
  },
  totalText: {
    ...typography.bodyBold,
  },
  grandTotalRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  grandTotalLabel: {
    ...typography.bodyBold,
  },
  grandTotalText: {
    ...typography.bodyBold,
  },
});
