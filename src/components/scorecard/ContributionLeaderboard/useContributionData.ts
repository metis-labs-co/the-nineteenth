/**
 * useContributionData - Computation logic for ContributionLeaderboard
 *
 * Calculates player contributions (drives, approaches, putts),
 * builds leaderboards, and computes team/player score summaries.
 */

import { useMemo } from 'react';
import type { Player, HoleScore, MultiBallHoleScore, Hole } from '@/types';
import { isSingleBallScore } from '@/types/database';

// =====================================================
// TYPES
// =====================================================

export interface PlayerContribution {
  playerId: string;
  playerName: string;
  drives: number;
  approaches: number;
  putts: number;
  total: number;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  count: number;
  percentage: number;
}

export interface DriveEntryWithHoles {
  playerId: string;
  playerName: string;
  count: number;
  percentage: number;
  holeNumbers: number[];
}

export interface TeamScoreSummary {
  grossTotal: number;
  netTotal: number;
  stablefordTotal: number;
  holesScored: number;
  parTotal: number;
  toParNet: number;
}

export interface PlayerScoreSummary {
  playerId: string;
  playerName: string;
  handicap: number;
  gross: number;
  net: number;
  toPar: number;
  holesPlayed: number;
}

// =====================================================
// PURE CALCULATION HELPERS
// =====================================================

/** Calculate stableford points for a score relative to par */
export function calculateStablefordPoints(strokes: number, par: number, handicapStrokes: number): number {
  const netStrokes = strokes - handicapStrokes;
  const relativeToParNet = netStrokes - par;

  if (relativeToParNet <= -3) return 5;
  if (relativeToParNet === -2) return 4;
  if (relativeToParNet === -1) return 3;
  if (relativeToParNet === 0) return 2;
  if (relativeToParNet === 1) return 1;
  return 0;
}

/** Calculate handicap strokes for a hole based on player handicap and stroke index */
export function getHandicapStrokesForHole(playerHandicap: number, strokeIndex: number): number {
  if (playerHandicap <= 0) return 0;
  if (playerHandicap >= 36) {
    const extraStrokes = playerHandicap - 18;
    return strokeIndex <= extraStrokes ? 2 : 1;
  }
  return playerHandicap >= strokeIndex ? 1 : 0;
}

// =====================================================
// HOOK
// =====================================================

interface UseContributionDataParams {
  players: Player[];
  getTeamScore: (holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  totalHoles: number;
  showOnlyDrives: boolean;
  getPlayerScore?: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  holes?: Hole[];
}

function buildLeaderboard(
  contributions: PlayerContribution[],
  field: keyof Pick<PlayerContribution, 'drives' | 'approaches' | 'putts' | 'total'>,
): LeaderboardEntry[] {
  const total = contributions.reduce((sum, c) => sum + c[field], 0);
  return contributions
    .filter((c) => c[field] > 0)
    .map((c) => ({
      playerId: c.playerId,
      playerName: c.playerName,
      count: c[field],
      percentage: total > 0 ? (c[field] / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function useContributionData({
  players,
  getTeamScore,
  totalHoles,
  showOnlyDrives,
  getPlayerScore,
  holes,
}: UseContributionDataParams) {
  // Calculate contributions per player
  const contributions: PlayerContribution[] = useMemo(() => {
    const playerContribs = new Map<string, PlayerContribution>();

    players.forEach((p) => {
      playerContribs.set(p.id, {
        playerId: p.id,
        playerName: p.name,
        drives: 0,
        approaches: 0,
        putts: 0,
        total: 0,
      });
    });

    for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
      const score = getTeamScore(holeNum);
      if (!score || !isSingleBallScore(score)) continue;

      const contribs = score.shotContributions;
      if (!contribs) continue;

      if (contribs.drive && playerContribs.has(contribs.drive)) {
        const player = playerContribs.get(contribs.drive)!;
        player.drives += 1;
        player.total += 1;
      }

      if (contribs.approach && playerContribs.has(contribs.approach)) {
        const player = playerContribs.get(contribs.approach)!;
        player.approaches += 1;
        player.total += 1;
      }

      if (contribs.putt && playerContribs.has(contribs.putt)) {
        const player = playerContribs.get(contribs.putt)!;
        player.putts += 1;
        player.total += 1;
      }
    }

    return Array.from(playerContribs.values());
  }, [players, getTeamScore, totalHoles]);

  const hasContributions = contributions.some((c) => c.total > 0);

  const driveLeaderboard = useMemo(() => buildLeaderboard(contributions, 'drives'), [contributions]);
  const approachLeaderboard = useMemo(() => buildLeaderboard(contributions, 'approaches'), [contributions]);
  const puttLeaderboard = useMemo(() => buildLeaderboard(contributions, 'putts'), [contributions]);
  const overallLeaderboard = useMemo(() => buildLeaderboard(contributions, 'total'), [contributions]);

  // Drive leaderboard with hole numbers (for expandable view)
  const driveLeaderboardWithHoles: DriveEntryWithHoles[] = useMemo(() => {
    const playerDriveHoles = new Map<string, number[]>();
    players.forEach((p) => playerDriveHoles.set(p.id, []));

    for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
      const score = getTeamScore(holeNum);
      if (!score || !isSingleBallScore(score)) continue;
      const contribs = score.shotContributions;
      if (!contribs?.drive) continue;
      const existingHoles = playerDriveHoles.get(contribs.drive);
      if (existingHoles) existingHoles.push(holeNum);
    }

    const totalDrives = contributions.reduce((sum, c) => sum + c.drives, 0);

    return contributions
      .filter((c) => c.drives > 0)
      .map((c) => ({
        playerId: c.playerId,
        playerName: c.playerName,
        count: c.drives,
        percentage: totalDrives > 0 ? (c.drives / totalDrives) * 100 : 0,
        holeNumbers: playerDriveHoles.get(c.playerId) || [],
      }))
      .sort((a, b) => b.count - a.count);
  }, [contributions, players, getTeamScore, totalHoles]);

  // Team score summary for Shamble format
  const teamScoreSummary: TeamScoreSummary | null = useMemo(() => {
    if (!showOnlyDrives || !getPlayerScore || !holes || holes.length === 0) return null;

    let grossTotal = 0;
    let netTotal = 0;
    let stablefordTotal = 0;
    let holesScored = 0;
    let parTotal = 0;

    for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
      const holeData = holes.find((h) => h.number === holeNum);
      if (!holeData) continue;

      let holeHasScores = false;
      let playersOnHole = 0;

      for (const player of players) {
        const score = getPlayerScore(player.id, holeNum);
        if (!score || !isSingleBallScore(score) || !score.strokes) continue;

        holeHasScores = true;
        playersOnHole++;
        const strokes = score.strokes;
        const playerHandicap = player.handicap ?? 0;
        const strokeIndex = holeData.strokeIndex ?? holeNum;
        const handicapStrokes = getHandicapStrokesForHole(playerHandicap, strokeIndex);

        grossTotal += strokes;
        netTotal += strokes - handicapStrokes;
        stablefordTotal += calculateStablefordPoints(strokes, holeData.par, handicapStrokes);
      }

      if (holeHasScores) {
        holesScored++;
        parTotal += holeData.par * playersOnHole;
      }
    }

    return { grossTotal, netTotal, stablefordTotal, holesScored, parTotal, toParNet: netTotal - parTotal };
  }, [showOnlyDrives, getPlayerScore, holes, totalHoles, players]);

  // Individual player score summaries for Shamble format
  const playerScoreSummaries: PlayerScoreSummary[] = useMemo(() => {
    if (!showOnlyDrives || !getPlayerScore || !holes || holes.length === 0) return [];

    return players.map((player) => {
      let gross = 0;
      let net = 0;
      let parForPlayer = 0;
      let holesPlayed = 0;
      const playerHandicap = player.handicap ?? 0;

      for (let holeNum = 1; holeNum <= totalHoles; holeNum++) {
        const holeData = holes.find((h) => h.number === holeNum);
        if (!holeData) continue;

        const score = getPlayerScore(player.id, holeNum);
        if (!score || !isSingleBallScore(score) || !score.strokes) continue;

        holesPlayed++;
        const strokes = score.strokes;
        const strokeIndex = holeData.strokeIndex ?? holeNum;
        const handicapStrokes = getHandicapStrokesForHole(playerHandicap, strokeIndex);

        gross += strokes;
        net += strokes - handicapStrokes;
        parForPlayer += holeData.par;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: playerHandicap,
        gross,
        net,
        toPar: net - parForPlayer,
        holesPlayed,
      };
    }).sort((a, b) => a.toPar - b.toPar);
  }, [showOnlyDrives, getPlayerScore, holes, totalHoles, players]);

  return {
    contributions,
    hasContributions,
    driveLeaderboard,
    approachLeaderboard,
    puttLeaderboard,
    overallLeaderboard,
    driveLeaderboardWithHoles,
    teamScoreSummary,
    playerScoreSummaries,
  };
}
