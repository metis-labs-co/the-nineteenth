/**
 * Alt Shot (Foursomes) Team Scoring
 *
 * One ball per team (partners alternate shots). Mirrors scramble.ts, but the
 * team handicap allowance is 50% of the sum of member daily handicaps (the
 * WHS foursomes standard) instead of scramble's 25%. Used by the combined
 * Alt Shot finalize path (resultsEngine.pickAltShotScore).
 */
import type { Scorecard } from '@/types/database/scorecard.types';

export interface AltShotTeamMember {
  player_id: string;
  handicap: number | null | undefined;
}

interface HandicapOnly {
  handicap?: number | null | undefined;
}

export interface AltShotTeamScore {
  teamGross: number;
  teamHandicap: number;
  teamHandicapStrokes: number;
  teamNet: number;
  holesCompleted: number;
}

/** 50% of the sum of member handicaps (= pair average), rounded to 1 dp. */
export function calculateAltShotTeamHandicap(members: HandicapOnly[]): number {
  if (members.length === 0) return 0;
  const sum = members.reduce((acc, m) => acc + (m.handicap ?? 0), 0);
  return Math.round(sum * 0.5 * 10) / 10;
}

interface SingleBallStrokes {
  strokes: number;
}

function readStrokes(score: unknown): number {
  if (!score || typeof score !== 'object') return 0;
  const s = score as Partial<SingleBallStrokes>;
  return typeof s.strokes === 'number' && s.strokes > 0 ? s.strokes : 0;
}

function resolveMemberDailyHandicaps(
  teamScorecards: Scorecard[],
  members: AltShotTeamMember[]
): HandicapOnly[] {
  const dhcByPlayer = new Map<string, number>();
  for (const sc of teamScorecards) {
    if (typeof sc.daily_handicap_used === 'number') {
      dhcByPlayer.set(sc.player_id, sc.daily_handicap_used);
    }
  }
  return members.map((m) => ({ handicap: dhcByPlayer.get(m.player_id) ?? m.handicap }));
}

export function computeAltShotTeamRoundScore(
  teamScorecards: Scorecard[],
  members: AltShotTeamMember[]
): AltShotTeamScore {
  const memberHandicaps = resolveMemberDailyHandicaps(teamScorecards, members);
  const teamHandicap = calculateAltShotTeamHandicap(memberHandicaps);
  const teamHandicapStrokes = Math.min(Math.floor(teamHandicap), 18);

  let withScores: Scorecard | undefined;
  let withTotal: Scorecard | undefined;
  for (const sc of teamScorecards) {
    if (!withScores && sc.scores && Object.keys(sc.scores).length > 0) withScores = sc;
    if (!withTotal && (sc.total_gross ?? 0) > 0) withTotal = sc;
  }

  const chosen = withScores ?? withTotal;
  if (!chosen) {
    return { teamGross: 0, teamHandicap: 0, teamHandicapStrokes: 0, teamNet: 0, holesCompleted: 0 };
  }

  let perHoleGross = 0;
  let holesCompleted = 0;
  if (chosen.scores) {
    for (const score of Object.values(chosen.scores)) {
      const strokes = readStrokes(score);
      if (strokes > 0) {
        perHoleGross += strokes;
        holesCompleted++;
      }
    }
  }

  const fromTotal = chosen.total_gross ?? 0;
  const teamGross = fromTotal > 0 ? fromTotal : perHoleGross;

  return {
    teamGross,
    teamHandicap,
    teamHandicapStrokes,
    teamNet: teamGross - teamHandicapStrokes,
    holesCompleted,
  };
}
