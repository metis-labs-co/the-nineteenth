/**
 * useTeamMatchPlayScores
 *
 * Manages score-related computations for team match play:
 * - Per-hole player scores
 * - Team best scores (best-ball, net-aware)
 * - Best contributors per team (lowest net score)
 * - Hole winners determined on team best net scores
 * - Hole result display text
 */

import { useCallback, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { isSingleBallScore } from '@/types/database';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesReceived } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/constants/scoring';
import { determineTeamHoleWinner } from '../utils';
import type { MatchTeam } from '../types';
import type { Hole } from '@/types';

/**
 * Return the best (lowest-net) team member on a hole.
 * Ties broken by lowest gross, then by team-member order.
 * Conceded members (the explicit PICKUP_SCORE sentinel) are excluded so a
 * concession never bubbles up as a team's "best"; a genuine blow-up score is
 * NOT a concession and counts normally.
 * Returns { playerId, gross, net } for the best contributor, or null if no
 * team member has a non-pickup score on the hole.
 */
function findBestNetContributor(
  team: MatchTeam,
  hole: Hole | undefined,
  getGross: (playerId: string) => number | null
): { playerId: string; gross: number; net: number } | null {
  let best: { playerId: string; gross: number; net: number } | null = null;
  if (!hole) return null;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross === null) continue;
    if (gross === PICKUP_SCORE) continue;
    const strokes = getStrokesReceived(member.handicap, hole.strokeIndex);
    const net = gross - strokes;
    if (best === null || net < best.net || (net === best.net && gross < best.gross)) {
      best = { playerId: member.id, gross, net };
    }
  }
  return best;
}

/**
 * Has every member who carded a score on this hole conceded (PICKUP_SCORE)?
 * True only when at least one member has a score and all such scores are
 * pickups — i.e. the team has effectively conceded the hole.
 */
function isTeamConceded(
  team: MatchTeam,
  getGross: (playerId: string) => number | null
): boolean {
  let sawAny = false;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross === null) continue;
    sawAny = true;
    if (gross !== PICKUP_SCORE) return false;
  }
  return sawAny;
}

/**
 * Resolve a team hole winner with concession awareness: a team that has
 * conceded the hole loses it, but only once the opponent has actually carded a
 * (non-pickup) score. Mutual concessions are halved; otherwise the lower team
 * best net wins.
 */
function resolveTeamHoleWinner(
  team1: MatchTeam,
  team2: MatchTeam,
  hole: Hole | undefined,
  getGross: (playerId: string) => number | null
): 'team1' | 'team2' | 'halved' | null {
  if (!hole) return null;
  const t1Best = findBestNetContributor(team1, hole, getGross);
  const t2Best = findBestNetContributor(team2, hole, getGross);
  const t1Conceded = isTeamConceded(team1, getGross);
  const t2Conceded = isTeamConceded(team2, getGross);

  if (t1Conceded && t2Conceded) return 'halved';
  if (t1Conceded) return t2Best ? 'team2' : null;
  if (t2Conceded) return t1Best ? 'team1' : null;
  return determineTeamHoleWinner(t1Best?.net ?? null, t2Best?.net ?? null);
}

export function useTeamMatchPlayScores(
  team1: MatchTeam,
  team2: MatchTeam,
  currentHole: number,
  holes: Hole[]
) {
  const colors = useThemeColors();
  // Subscribe to `groupScorecards` so the memos below recompute when scores
  // update. The Zustand `getPlayerScore`/`setPlayerScore` function references
  // are stable across renders; without subscribing to the Map itself, the
  // best-contributor / hole-winner memos would never re-run on score changes
  // and the per-team match-status badge would go stale.
  const { setPlayerScore, getPlayerScore, groupScorecards } = useScorecardStore();

  const getHoleByNumber = useCallback(
    (holeNumber: number): Hole | undefined => holes.find((h) => h.number === holeNumber),
    [holes]
  );
  const currentHoleData = useMemo(() => getHoleByNumber(currentHole), [getHoleByNumber, currentHole]);

  // Get player score for a specific player on current hole.
  // `groupScorecards` is included so the callback identity refreshes when the
  // underlying store Map changes — cascading through to memos that depend on
  // this function.
  const getPlayerScoreValue = useCallback(
    (playerId: string): number | null => {
      const score = getPlayerScore(playerId, currentHole);
      if (score && isSingleBallScore(score)) {
        return score.strokes;
      }
      return null;
    },
    [currentHole, getPlayerScore, groupScorecards]
  );

  // Best contributor on the current hole (lowest net).
  const team1BestContribCurrent = useMemo(
    () => findBestNetContributor(team1, currentHoleData, getPlayerScoreValue),
    [team1, currentHoleData, getPlayerScoreValue]
  );
  const team2BestContribCurrent = useMemo(
    () => findBestNetContributor(team2, currentHoleData, getPlayerScoreValue),
    [team2, currentHoleData, getPlayerScoreValue]
  );

  // Displayed team score = the best contributor's gross (what the player carded).
  const team1BestScore = team1BestContribCurrent?.gross ?? null;
  const team2BestScore = team2BestContribCurrent?.gross ?? null;

  // Hole winner is decided on team best *net* score, with concession awareness
  // (a fully-conceded team loses the hole only once the opponent has scored).
  const currentHoleWinner = useMemo(
    () => resolveTeamHoleWinner(team1, team2, currentHoleData, getPlayerScoreValue),
    [team1, team2, currentHoleData, getPlayerScoreValue]
  );

  // Get player score for any hole (dynamic version for swipe rendering).
  // Depends on `groupScorecards` so consumers re-compute when scores update.
  const getPlayerScoreForHole = useCallback(
    (playerId: string, holeNumber: number): number | null => {
      const score = getPlayerScore(playerId, holeNumber);
      if (score && isSingleBallScore(score)) {
        return score.strokes;
      }
      return null;
    },
    [getPlayerScore, groupScorecards]
  );

  // Get team best score for any hole (gross of the lowest-net player).
  const getTeamBestScoreForHole = useCallback(
    (team: MatchTeam, holeNumber: number): number | null => {
      const hole = getHoleByNumber(holeNumber);
      const best = findBestNetContributor(team, hole, (id) => getPlayerScoreForHole(id, holeNumber));
      return best?.gross ?? null;
    },
    [getHoleByNumber, getPlayerScoreForHole]
  );

  // Get best contributor for any hole (player with the lowest net).
  const getBestContributorForHole = useCallback(
    (team: MatchTeam, holeNumber: number): string | null => {
      const hole = getHoleByNumber(holeNumber);
      const best = findBestNetContributor(team, hole, (id) => getPlayerScoreForHole(id, holeNumber));
      return best?.playerId ?? null;
    },
    [getHoleByNumber, getPlayerScoreForHole]
  );

  // Determine hole winner for any hole (concession-aware net best-ball).
  const getHoleWinnerForHole = useCallback(
    (holeNumber: number): 'team1' | 'team2' | 'halved' | null => {
      const hole = getHoleByNumber(holeNumber);
      return resolveTeamHoleWinner(team1, team2, hole, (id) =>
        getPlayerScoreForHole(id, holeNumber)
      );
    },
    [getHoleByNumber, getPlayerScoreForHole, team1, team2]
  );

  // Helper: locate a team member across both teams (for handicap + owning team lookup).
  const findMember = useCallback(
    (playerId: string) => {
      for (const team of [team1, team2]) {
        const member = team.members.find((m) => m.id === playerId);
        if (member) return member;
      }
      return null;
    },
    [team1, team2]
  );

  // Number of handicap strokes a player receives on a given hole.
  const getPlayerStrokesReceivedForHole = useCallback(
    (playerId: string, holeNumber: number): number => {
      const hole = getHoleByNumber(holeNumber);
      const member = findMember(playerId);
      if (!hole || !member) return 0;
      return getStrokesReceived(member.handicap, hole.strokeIndex);
    },
    [getHoleByNumber, findMember]
  );

  // Whether the stored score on a given hole represents a pickup (the explicit
  // PICKUP_SCORE sentinel — never inferred from a high score).
  const isPlayerPickedUpOnHole = useCallback(
    (playerId: string, holeNumber: number): boolean => {
      return getPlayerScoreForHole(playerId, holeNumber) === PICKUP_SCORE;
    },
    [getPlayerScoreForHole]
  );

  // Toggle pickup for a player on the current hole.
  // Uses the same setPlayerScore pathway as normal score edits — no new store field.
  const pickUpPlayer = useCallback(
    async (playerId: string): Promise<void> => {
      const member = findMember(playerId);
      if (!member || !currentHoleData) return;

      if (isPlayerPickedUpOnHole(playerId, currentHole)) {
        // Toggle off — reset to par.
        await setPlayerScore(playerId, currentHole, currentHoleData.par);
        return;
      }

      // Concede the hole — store the explicit pickup sentinel.
      await setPlayerScore(playerId, currentHole, PICKUP_SCORE);
    },
    [findMember, currentHole, currentHoleData, isPlayerPickedUpOnHole, setPlayerScore]
  );

  // Get hole result display
  const getHoleResultDisplay = useCallback(
    (
      winner: 'team1' | 'team2' | 'halved' | null
    ): { text: string; color: string } | null => {
      if (!winner) return null;

      switch (winner) {
        case 'team1':
          return { text: `${team1.name} wins`, color: colors.success };
        case 'team2':
          return { text: `${team2.name} wins`, color: colors.success };
        case 'halved':
          return { text: 'Halved', color: colors.warning };
        default:
          return null;
      }
    },
    [colors, team1.name, team2.name]
  );

  return {
    // Store actions
    setPlayerScore,
    getPlayerScore,
    // Current hole values
    getPlayerScoreValue,
    team1BestScore,
    team2BestScore,
    currentHoleWinner,
    // Dynamic hole helpers
    getPlayerScoreForHole,
    getTeamBestScoreForHole,
    getBestContributorForHole,
    getHoleWinnerForHole,
    getHoleResultDisplay,
    // Pickup + stroke indicator support
    getPlayerStrokesReceivedForHole,
    isPlayerPickedUpOnHole,
    pickUpPlayer,
  };
}
