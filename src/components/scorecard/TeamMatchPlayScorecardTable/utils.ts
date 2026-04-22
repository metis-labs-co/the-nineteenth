/**
 * TeamMatchPlayScorecardTable Utilities
 *
 * Pure calculation for the team match play scorecard. Mirrors the shape of
 * `MatchPlayScorecardTable/utils.ts` (so we can reuse HoleRow / SubtotalRow /
 * TotalRow) but operates on best-ball team scores:
 *
 * For each team, the hole contributor is the member with the lowest net score
 * (gross − strokes received on that hole), excluding picked-up scores. The
 * team's "gross" for the hole is that contributor's gross. Hole winner is
 * decided on net scores (same as the score-entry screen).
 */

import { getStrokesReceived, isPickupScore } from '@/utils/scoring';
import {
  determineHoleWinner,
  calculateMatchStatus,
} from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import type { TeamCalculatedData } from './types';

interface TeamHoleContribution {
  gross: number;
  net: number;
  playerId: string;
}

/**
 * Find the best (lowest net) non-pickup contributor for a team on a hole.
 * Returns null when no team member carded a non-pickup score.
 */
function findBestContributor(
  team: MatchTeam,
  hole: Hole,
  getGross: (playerId: string) => number | undefined
): TeamHoleContribution | null {
  let best: TeamHoleContribution | null = null;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross == null) continue;
    if (isPickupScore(gross, hole.par, member.handicap, hole.strokeIndex)) continue;
    const strokes = getStrokesReceived(member.handicap, hole.strokeIndex);
    const net = gross - strokes;
    if (
      best === null ||
      net < best.net ||
      (net === best.net && gross < best.gross)
    ) {
      best = { gross, net, playerId: member.id };
    }
  }
  return best;
}

/**
 * Was every scored member of this team a pickup? (Used to flag the team-level
 * "pickup" on a hole so the score cell renders the P marker, matching the
 * individual match-play scorecard behaviour.)
 */
function isTeamPickedUp(
  team: MatchTeam,
  hole: Hole,
  getGross: (playerId: string) => number | undefined
): boolean {
  let sawAny = false;
  for (const member of team.members) {
    const gross = getGross(member.id);
    if (gross == null) continue;
    sawAny = true;
    if (!isPickupScore(gross, hole.par, member.handicap, hole.strokeIndex)) {
      return false;
    }
  }
  return sawAny;
}

export function calculateTeamMatchData(
  holes: Hole[],
  team1: MatchTeam,
  team2: MatchTeam,
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined
): TeamCalculatedData {
  const holeResults: Record<number, HoleResult> = {};
  const runningStatus: Record<number, MatchStatus> = {};

  let front9Par = 0;
  let front9T1 = 0;
  let front9T2 = 0;
  let front9Played = 0;

  let back9Par = 0;
  let back9T1 = 0;
  let back9T2 = 0;
  let back9Played = 0;

  for (let holeNum = 1; holeNum <= 18; holeNum++) {
    const hole = holes.find((h) => h.number === holeNum);
    if (!hole) continue;

    const getGrossForHole = (playerId: string) => getPlayerScore(playerId, holeNum);
    const t1Best = findBestContributor(team1, hole, getGrossForHole);
    const t2Best = findBestContributor(team2, hole, getGrossForHole);

    const t1PickedUp = isTeamPickedUp(team1, hole, getGrossForHole);
    const t2PickedUp = isTeamPickedUp(team2, hole, getGrossForHole);

    const baseWinner = determineHoleWinner(t1Best?.net ?? null, t2Best?.net ?? null);
    // If one team fully pickd up and the other has any score, that team loses.
    const winner =
      t1PickedUp && !t2PickedUp
        ? 'player2'
        : t2PickedUp && !t1PickedUp
          ? 'player1'
          : t1PickedUp && t2PickedUp
            ? 'halved'
            : baseWinner;

    holeResults[holeNum] = {
      player1Score: t1Best?.gross ?? null,
      player2Score: t2Best?.gross ?? null,
      player1PickedUp: t1PickedUp,
      player2PickedUp: t2PickedUp,
      winner,
    };

    runningStatus[holeNum] = calculateMatchStatus(holeResults);

    const t1Counts = t1Best !== null;
    const t2Counts = t2Best !== null;
    const holePlayed = t1Counts || t2Counts;
    if (holeNum <= 9) {
      front9Par += hole.par;
      if (t1Counts) front9T1 += t1Best!.gross;
      if (t2Counts) front9T2 += t2Best!.gross;
      if (holePlayed) front9Played++;
    } else {
      back9Par += hole.par;
      if (t1Counts) back9T1 += t1Best!.gross;
      if (t2Counts) back9T2 += t2Best!.gross;
      if (holePlayed) back9Played++;
    }
  }

  return {
    holeResults,
    runningStatus,
    front9: {
      par: front9Par,
      player1: front9T1,
      player2: front9T2,
      holesPlayed: front9Played,
    },
    back9: {
      par: back9Par,
      player1: back9T1,
      player2: back9T2,
      holesPlayed: back9Played,
    },
    total: {
      par: front9Par + back9Par,
      player1: front9T1 + back9T1,
      player2: front9T2 + back9T2,
      holesPlayed: front9Played + back9Played,
    },
    finalStatus: calculateMatchStatus(holeResults),
  };
}
