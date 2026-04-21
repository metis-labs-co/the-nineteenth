import { useMemo } from 'react';
import type { TabItem } from '@/components/common/Tabs';
import type { TabKey } from '../types';

interface UseViewRoundTabsParams {
  isMatchPlayRound: boolean;
  isTeamMatchPlayRound: boolean;
  isShambleRound: boolean;
  isScrambleRound: boolean;
  isStrokePlayRound: boolean;
  /** True when the round is a split team round (Ryder-Cup-style sub-matches). */
  isSplitRound: boolean;
  hasSkinsGame: boolean;
  hasWolfGame: boolean;
  hasPayoutsTab: boolean;
  hasStats: boolean;
  playerCount: number;
}

/**
 * Tab order for the View Round screen:
 *   Details → Leaderboard (stroke play) → Scorecard → Match/Team tabs →
 *   Scramble suite → Skins → Wolf → Payouts → Stats (always last)
 *
 * Rationale: on a multi-player stroke play round the leaderboard is the
 * first thing players want to see, and Stats is a personal deep-dive that
 * belongs at the end rather than sandwiched between Scorecard and the
 * group-level tabs.
 */
export function useViewRoundTabs({
  isMatchPlayRound,
  isTeamMatchPlayRound,
  isShambleRound,
  isScrambleRound,
  isStrokePlayRound,
  isSplitRound,
  hasSkinsGame,
  hasWolfGame,
  hasPayoutsTab,
  hasStats,
  playerCount,
}: UseViewRoundTabsParams) {
  return useMemo<TabItem<TabKey>[]>(() => {
    const result: TabItem<TabKey>[] = [{ key: 'details', label: 'Details' }];

    // Stroke play leaderboard — show right after Details so it's the
    // first thing after the round header for multi-player stroke rounds.
    if (isStrokePlayRound && playerCount > 1) {
      result.push({ key: 'leaderboard', label: 'Leaderboard' });
    }

    // Scorecard (scramble rounds have their own dedicated scorecard tab
    // in the scramble suite below).
    if (!isScrambleRound) {
      result.push({ key: 'scorecard', label: 'Scorecard' });
    }

    if (isMatchPlayRound || isTeamMatchPlayRound) {
      result.push({ key: 'match', label: 'Match' });
    }

    // Sub-Matches tab — only for split team rounds (Ryder-Cup-style).
    // Shown right after Match so the flow is: aggregate Ryder points on
    // Match tab → per-sub-match detail here.
    if (isSplitRound) {
      result.push({ key: 'subMatches', label: 'Sub-Matches' });
    }

    if (isShambleRound) {
      result.push({ key: 'teamScores', label: 'Team Scores' });
    }

    if (isScrambleRound) {
      result.push({ key: 'scrambleTeamScore', label: 'Scorecard' });
      result.push({ key: 'scrambleLeaderboard', label: 'Leaderboard' });
      result.push({ key: 'scrambleContributions', label: 'Contributions' });
    }

    if (hasSkinsGame) {
      result.push({ key: 'skins', label: 'Skins' });
    }

    if (hasWolfGame) {
      result.push({ key: 'wolf', label: 'Wolf' });
    }

    if (hasPayoutsTab) {
      result.push({ key: 'payouts', label: 'Payouts' });
    }

    // Stats always last — it's a personal deep-dive, not group state.
    if (hasStats) {
      result.push({ key: 'stats', label: 'Stats' });
    }

    return result;
  }, [isMatchPlayRound, isTeamMatchPlayRound, isShambleRound, isScrambleRound, isStrokePlayRound, isSplitRound, hasSkinsGame, hasWolfGame, hasPayoutsTab, hasStats, playerCount]);
}
