/**
 * CupBoard - Dark hero scoreboard for 2-team head-to-head competitions
 *
 * Redesign of the old surface-card head-to-head: renders on the shared dark
 * HeroCard with big cup scores, an optional progress bar toward the
 * points-to-win target, and an outcome pill. Purely presentational — all
 * numbers arrive via props (from useCompetitionLeaderboard entries).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { HeroCard, heroPalette } from '@/components/common/HeroCard';
import { spacing, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamLeaderboardEntry } from './TeamLeaderboardTable';

export interface CupBoardProps {
  /** The two teams, in stable input order (left, right) */
  entries: [TeamLeaderboardEntry, TeamLeaderboardEntry];
  /** teamId -> hex colour */
  teamColors: Map<string, string>;
  /** Total points available + target to win (per-round rules comps only) */
  pointsToWin?: { total: number; toWin: number } | null;
  /** True once every round is completed — switches "lead" to "win" phrasing */
  allRoundsCompleted?: boolean;
  /** Headline label, e.g. "CUP POINTS" */
  headline?: string;
  testID?: string;
}

/** Lighten a hex colour toward white for legibility on the dark hero card. */
function lightenForDark(hex: string, amount = 0.55): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '#ffffff';
  const ch = (s: string) => {
    const v = parseInt(s, 16);
    return Math.round(v + (255 - v) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`;
}

/** Format points for display — halves render as ½. */
function formatPoints(points: number): string {
  const whole = Math.floor(points);
  const hasHalf = points - whole >= 0.5;
  if (hasHalf) return whole > 0 ? `${whole}½` : '½';
  return `${points}`;
}

export function CupBoard({
  entries,
  teamColors,
  pointsToWin,
  allRoundsCompleted = false,
  headline = 'CUP POINTS',
  testID,
}: CupBoardProps) {
  const colors = useThemeColors();
  const [home, away] = entries;

  const homeColor = teamColors.get(home.teamId) ?? colors.primary;
  const awayColor = teamColors.get(away.teamId) ?? colors.info;
  const homeText = lightenForDark(homeColor);
  const awayText = lightenForDark(awayColor);

  const homePts = home.totalPoints;
  const awayPts = away.totalPoints;
  const isTie = homePts === awayPts;
  const leader = homePts > awayPts ? home : away;
  const nothingPlayed = homePts === 0 && awayPts === 0;

  // Outcome pill copy + colours
  let outcomeText: string;
  let outcomeColor: string;
  let outcomeBg: string;
  if (nothingPlayed && !allRoundsCompleted) {
    outcomeText = pointsToWin
      ? `Best of ${formatPoints(pointsToWin.total)} · first to ${formatPoints(pointsToWin.toWin)} wins`
      : 'No points scored yet';
    outcomeColor = colors.primaryDark;
    outcomeBg = colors.primaryBackground;
  } else if (allRoundsCompleted) {
    outcomeText = isTie ? 'Competition tied' : `🏆 ${leader.teamName} win`;
    outcomeColor = colors.warningDark;
    outcomeBg = colors.warningBackground;
  } else {
    outcomeText = isTie ? 'All square' : `${leader.teamName} lead`;
    outcomeColor = colors.primaryDark;
    outcomeBg = colors.primaryBackground;
  }

  // Progress bar percentages (only meaningful with a points target)
  const total = pointsToWin?.total ?? 0;
  const homePct = total > 0 ? Math.min(100, (homePts / total) * 100) : 0;
  const awayPct = total > 0 ? Math.min(100, (awayPts / total) * 100) : 0;
  const markerPct = total > 0 && pointsToWin ? (pointsToWin.toWin / total) * 100 : 0;

  return (
    <HeroCard glow="green" testID={testID} style={styles.card}>
      <Text style={styles.headline}>{headline}</Text>

      <View style={styles.scoreRow}>
        <View style={styles.sideLeft}>
          <Text style={[styles.teamName, { color: homeText }]} numberOfLines={1}>
            {home.teamName}
          </Text>
        </View>
        <View style={styles.scores}>
          <Text
            style={[styles.score, { color: homeText }]}
            testID={testID ? `${testID}-home-score` : undefined}
          >
            {formatPoints(homePts)}
          </Text>
          <Text style={styles.dash}>–</Text>
          <Text
            style={[styles.score, { color: awayText }]}
            testID={testID ? `${testID}-away-score` : undefined}
          >
            {formatPoints(awayPts)}
          </Text>
        </View>
        <View style={styles.sideRight}>
          <Text style={[styles.teamName, { color: awayText }]} numberOfLines={1}>
            {away.teamName}
          </Text>
        </View>
      </View>

      {pointsToWin && total > 0 && (
        <>
          <View style={styles.track}>
            <View
              style={[
                styles.barLeft,
                { width: `${homePct}%`, backgroundColor: homeColor },
              ]}
            />
            <View
              style={[
                styles.barRight,
                { width: `${awayPct}%`, backgroundColor: awayColor },
              ]}
            />
          </View>
          <View style={styles.markerRow}>
            <View style={[styles.markerLine, { left: `${markerPct}%` }]} />
            <Text style={[styles.markerLabel, { left: `${markerPct}%` }]}>
              {formatPoints(pointsToWin.toWin)} to win
            </Text>
          </View>
        </>
      )}

      <View style={styles.outcomeRow}>
        <View style={[styles.outcomePill, { backgroundColor: outcomeBg }]}>
          <Text
            style={[styles.outcomeText, { color: outcomeColor }]}
            testID={testID ? `${testID}-outcome` : undefined}
          >
            {outcomeText}
          </Text>
        </View>
      </View>
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xs,
  },
  headline: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: heroPalette.mutedGreen,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md + 2,
    marginTop: spacing.md,
  },
  sideLeft: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sideRight: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scores: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  score: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  dash: {
    fontSize: 18,
    fontWeight: '700',
    color: heroPalette.mutedGreen,
  },
  track: {
    height: 9,
    borderRadius: 6,
    backgroundColor: heroPalette.track,
    marginTop: spacing.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLeft: {
    height: '100%',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  barRight: {
    height: '100%',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    alignSelf: 'flex-end',
  },
  markerRow: {
    height: 16,
    marginTop: 3,
  },
  markerLine: {
    position: 'absolute',
    top: -15,
    width: 1,
    height: 26,
    backgroundColor: heroPalette.marker,
  },
  markerLabel: {
    position: 'absolute',
    top: 2,
    transform: [{ translateX: -24 }],
    fontSize: 9,
    fontWeight: '700',
    color: heroPalette.mutedGreen,
  },
  outcomeRow: {
    alignItems: 'center',
    marginTop: spacing.md + 2,
  },
  outcomePill: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: borderRadius.full,
  },
  outcomeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});

export default CupBoard;
