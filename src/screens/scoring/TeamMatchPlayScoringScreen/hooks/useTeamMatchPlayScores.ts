/**
 * useTeamMatchPlayScores
 *
 * Manages score-related computations for team match play:
 * - Per-hole player scores
 * - Team best scores (best ball)
 * - Best contributors per team
 * - Hole winners
 * - Hole result display text
 */

import { useCallback, useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { isSingleBallScore } from '@/types/database';
import { useThemeColors } from '@/context/ThemeContext';
import { determineTeamHoleWinner, getBestContributor } from '../utils';
import type { MatchTeam } from '../types';

export function useTeamMatchPlayScores(
  team1: MatchTeam,
  team2: MatchTeam,
  currentHole: number
) {
  const colors = useThemeColors();
  const { setPlayerScore, getPlayerScore } = useScorecardStore();

  // Get player score for a specific player on current hole
  const getPlayerScoreValue = useCallback(
    (playerId: string): number | null => {
      const score = getPlayerScore(playerId, currentHole);
      if (score && isSingleBallScore(score)) {
        return score.strokes;
      }
      return null;
    },
    [currentHole, getPlayerScore]
  );

  // Calculate team best scores for current hole
  const team1BestScore = useMemo(() => {
    let best: number | null = null;
    for (const member of team1.members) {
      const score = getPlayerScoreValue(member.id);
      if (score !== null && (best === null || score < best)) {
        best = score;
      }
    }
    return best;
  }, [team1.members, getPlayerScoreValue]);

  const team2BestScore = useMemo(() => {
    let best: number | null = null;
    for (const member of team2.members) {
      const score = getPlayerScoreValue(member.id);
      if (score !== null && (best === null || score < best)) {
        best = score;
      }
    }
    return best;
  }, [team2.members, getPlayerScoreValue]);

  // Get best contributors for current hole (prefixed with _ as used internally)
  const _team1BestContributor = useMemo(() => {
    return getBestContributor(team1, currentHole, (id, hole) => {
      const score = getPlayerScore(id, hole);
      if (score && isSingleBallScore(score)) {
        return { strokes: score.strokes };
      }
      return undefined;
    });
  }, [team1, currentHole, getPlayerScore]);

  const _team2BestContributor = useMemo(() => {
    return getBestContributor(team2, currentHole, (id, hole) => {
      const score = getPlayerScore(id, hole);
      if (score && isSingleBallScore(score)) {
        return { strokes: score.strokes };
      }
      return undefined;
    });
  }, [team2, currentHole, getPlayerScore]);

  // Determine current hole winner
  const currentHoleWinner = useMemo(() => {
    return determineTeamHoleWinner(team1BestScore, team2BestScore);
  }, [team1BestScore, team2BestScore]);

  // Get player score for any hole (dynamic version for swipe rendering)
  const getPlayerScoreForHole = useCallback(
    (playerId: string, holeNumber: number): number | null => {
      const score = getPlayerScore(playerId, holeNumber);
      if (score && isSingleBallScore(score)) {
        return score.strokes;
      }
      return null;
    },
    [getPlayerScore]
  );

  // Get team best score for any hole
  const getTeamBestScoreForHole = useCallback(
    (team: MatchTeam, holeNumber: number): number | null => {
      let best: number | null = null;
      for (const member of team.members) {
        const score = getPlayerScoreForHole(member.id, holeNumber);
        if (score !== null && (best === null || score < best)) {
          best = score;
        }
      }
      return best;
    },
    [getPlayerScoreForHole]
  );

  // Get best contributor for any hole
  const getBestContributorForHole = useCallback(
    (team: MatchTeam, holeNumber: number): string | null => {
      return getBestContributor(team, holeNumber, (id, hole) => {
        const score = getPlayerScore(id, hole);
        if (score && isSingleBallScore(score)) {
          return { strokes: score.strokes };
        }
        return undefined;
      });
    },
    [getPlayerScore]
  );

  // Determine hole winner for any hole
  const getHoleWinnerForHole = useCallback(
    (holeNumber: number): 'team1' | 'team2' | 'halved' | null => {
      const t1Score = getTeamBestScoreForHole(team1, holeNumber);
      const t2Score = getTeamBestScoreForHole(team2, holeNumber);
      return determineTeamHoleWinner(t1Score, t2Score);
    },
    [getTeamBestScoreForHole, team1, team2]
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
  };
}
