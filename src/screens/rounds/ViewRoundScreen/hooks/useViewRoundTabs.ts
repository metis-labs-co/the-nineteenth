import { useMemo } from 'react';
import type { TabItem } from '@/components/common/Tabs';
import type { TabKey } from '../types';

interface UseViewRoundTabsParams {
  isMatchPlayRound: boolean;
  isTeamMatchPlayRound: boolean;
  isShambleRound: boolean;
  isScrambleRound: boolean;
  /** True when this is a split alt-shot round (head-to-head 2v2). The
   *  cross-field Scramble Scorecard/Leaderboard tabs are wrong for this
   *  format; only Contributions is kept alongside the Sub-Matches tab. */
  isAltShotSplitRound: boolean;
  isStrokePlayRound: boolean;
  isStablefordRound: boolean;
  isParRound: boolean;
  /** True when the round is a split team round (Ryder-Cup-style sub-matches). */
  isSplitRound: boolean;
  /** True for team stroke rounds (best-ball / aggregate) — not match-play, not scramble/shamble. */
  isTeamStrokeRound: boolean;
  /** True for any team-format round. Used to gate the Groups tab visibility
   *  for small (≤4 player) team rounds where pairings still need a surface. */
  isTeamRound: boolean;
  hasSkinsGame: boolean;
  hasWolfGame: boolean;
  hasPayoutsTab: boolean;
  hasStats: boolean;
  /** True when at least one shot has been logged on the round. */
  hasShots: boolean;
  playerCount: number;
  /** Number of tee groups / sub-matches for the Groups tab badge. */
  groupCount?: number;
  /** Number of teams for the Teams tab badge. */
  teamCount?: number;
}

/**
 * Tab order for the View Round screen:
 *   Details → Groups/Sub-Matches → Leaderboard (stroke play) →
 *   Scorecard → Match/Team tabs → Scramble suite → Skins → Wolf →
 *   Payouts → Stats (always last)
 *
 * The second tab appears in two situations:
 *   - Split team rounds → labelled "Sub-Matches" (Ryder-Cup-style head-to-heads).
 *   - Any other round with more than 4 players → labelled "Groups"
 *     (tee groups / pairings — a foursome is the largest physical group).
 *
 * On a multi-player stroke play round the leaderboard is the first thing
 * players want to see after the grouping, and Stats is a personal deep-dive
 * that belongs at the end rather than sandwiched between Scorecard and the
 * group-level tabs.
 */
export function useViewRoundTabs({
  isMatchPlayRound,
  isTeamMatchPlayRound,
  isShambleRound,
  isScrambleRound,
  isAltShotSplitRound,
  isStrokePlayRound,
  isStablefordRound,
  isParRound,
  isSplitRound,
  // isTeamStrokeRound kept in the param contract because callers still
  // pass it, but the Teams-tab logic now gates on isTeamRound instead.
  isTeamStrokeRound: _isTeamStrokeRound,
  isTeamRound,
  hasSkinsGame,
  hasWolfGame,
  hasPayoutsTab,
  hasStats,
  hasShots,
  playerCount,
  groupCount,
  teamCount,
}: UseViewRoundTabsParams) {
  return useMemo<TabItem<TabKey>[]>(() => {
    const result: TabItem<TabKey>[] = [{ key: 'details', label: 'Details' }];

    // Groups / Sub-Matches — split team rounds show the per-sub-match
    // breakdown; non-split rounds with more than 4 players show tee
    // groups (pairings). Team rounds with 2+ teams always need this tab
    // so organisers can assign tee times even before pairings exist —
    // playerCount can transiently read <5 while scorecards/round_players
    // are still loading. Individual 1v1 match-play also always needs this
    // tab — pairings are *the* matchups, and a 4-player round (2 matches)
    // would otherwise have nowhere to display them.
    const showGroupsTab =
      isSplitRound ||
      playerCount > 4 ||
      (isTeamRound && (teamCount ?? 0) >= 2) ||
      isMatchPlayRound;
    if (showGroupsTab) {
      result.push({
        key: 'subMatches',
        label: isSplitRound ? 'Sub-Matches' : 'Groups',
        count: groupCount && groupCount > 0 ? groupCount : undefined,
      });
    }

    // Format-aware leaderboard — appears right after Details so it's the
    // first thing after the round header for multi-player rounds. Shown for
    // every individual stroke-based format; the View Round screen renders
    // the appropriate leaderboard view (Stroke / Stableford / Par).
    if ((isStrokePlayRound || isStablefordRound || isParRound) && playerCount > 1) {
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

    if (isShambleRound) {
      result.push({ key: 'teamScores', label: 'Team Scores' });
    }

    if (isScrambleRound) {
      // Split alt-shot is head-to-head 2v2: the cross-field Scorecard/Leaderboard
      // tabs rank across all players and are wrong here. Keep only Contributions;
      // the Sub-Matches tab already shows the pair results.
      if (!isAltShotSplitRound) {
        result.push({ key: 'scrambleTeamScore', label: 'Scorecard' });
        result.push({ key: 'scrambleLeaderboard', label: 'Leaderboard' });
      }
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
    // Skipped for team match-play (team view is the point of interest)
    // and for scramble/shamble (team-format scoring makes per-player
    // putt/fairway stats meaningless).
    if (hasStats && !isTeamMatchPlayRound && !isScrambleRound && !isShambleRound) {
      result.push({ key: 'stats', label: 'Stats' });
    }

    // Shots tab — only when shots exist for the round. Sits after Stats so
    // it doesn't push the more common tabs off-screen for users who don't
    // track shots.
    if (hasShots) {
      result.push({ key: 'shots', label: 'Shots' });
    }

    return result;
  }, [isMatchPlayRound, isTeamMatchPlayRound, isShambleRound, isScrambleRound, isAltShotSplitRound, isStrokePlayRound, isStablefordRound, isParRound, isSplitRound, isTeamRound, hasSkinsGame, hasWolfGame, hasPayoutsTab, hasStats, hasShots, playerCount, groupCount, teamCount]);
}
