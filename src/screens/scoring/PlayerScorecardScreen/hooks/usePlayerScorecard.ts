/**
 * usePlayerScorecard Hook
 *
 * Manages scorecard data, player lookup, and score calculations
 * for the PlayerScorecardScreen.
 *
 * Supports both single-ball and multi-ball scoring modes.
 */

import { useMemo } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { useRoundScorecards, useRoundDetails } from '@/hooks/rounds/queries';
import {
  getStrokesReceived,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { isMultiBallScore, isSingleBallScore } from '@/types/database/base';
import type { HandicapSource } from '@/types/database/enums';
import type { Hole, Player, Scorecard, HoleScore } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import { PICKUP_SCORE } from '@/constants/scoring';

export interface PlayerStats {
  front9Gross: number;
  back9Gross: number;
  front9Stableford: number;
  back9Stableford: number;
  front9Putts: number;
  back9Putts: number;
  totalGross: number;
  totalStableford: number;
  totalPutts: number;
  totalPar: number;
  front9Par: number;
  back9Par: number;
  // Handicap stats
  handicap: number; // Raw WHS handicap index
  dailyHandicap: number; // Daily handicap (calculated from tee ratings)
  // FIR/GIR stats
  totalFairwaysHit: number;
  totalFairwaysPossible: number; // Par 4+ holes only
  totalGIR: number;
  totalGIRPossible: number;
}

export interface HoleRowData {
  hole: Hole;
  strokes: number | undefined;
  putts: number | undefined;
  stablefordPoints: number;
  strokesReceived: number;
  isPickup: boolean;
  fairwayHit: boolean | undefined;
  greenInRegulation: boolean | undefined;
}

// Multi-ball specific types
export interface BallScoreData {
  strokes: number | undefined;
  stablefordPoints: number;
  isPickup: boolean;
  fairwayHit: boolean | undefined;
  greenInRegulation: boolean | undefined;
}

export interface MultiBallHoleRowData {
  hole: Hole;
  strokesReceived: number;
  balls: BallScoreData[];
}

export interface MultiBallStats {
  // Per-ball stats indexed by ball number (1-based)
  ballStats: {
    [ballNumber: number]: {
      front9Gross: number;
      back9Gross: number;
      front9Stableford: number;
      back9Stableford: number;
      totalGross: number;
      totalStableford: number;
    };
  };
  front9Par: number;
  back9Par: number;
  totalPar: number;
}

interface UsePlayerScorecardResult {
  player: Player | undefined;
  scorecard: Scorecard | undefined;
  holes: Hole[];
  holeRowData: HoleRowData[];
  playerStats: PlayerStats;
  front9Holes: HoleRowData[];
  back9Holes: HoleRowData[];
  isLoading: boolean;
  isInitialized: boolean;
  /** True when viewing a completed/other round (data loaded from DB, not the live scoring store). */
  isReadOnly: boolean;
  /** First hole played (1 normally, 10 for back-9 rounds) — for hole-number display. */
  startHole: number;
  // Multi-ball support
  isMultiBall: boolean;
  ballCount: BallCount;
  multiBallHoleData: MultiBallHoleRowData[];
  multiBallFront9: MultiBallHoleRowData[];
  multiBallBack9: MultiBallHoleRowData[];
  multiBallStats: MultiBallStats;
}

export function usePlayerScorecard(playerId: string, roundId?: string): UsePlayerScorecardResult {
  const {
    currentRoundId,
    currentPlayers,
    groupScorecards,
    holes: storeHoles,
    isLoading: storeIsLoading,
    isInitialized: storeIsInitialized,
    isMultiBall: storeIsMultiBall,
    ballCount: storeBallCount,
    selectedTeeData: storeSelectedTeeData,
    handicapSource: storeHandicapSource,
    startHole: storeStartHole,
  } = useScorecardStore();

  // "Live" = the scoring store holds the round we're viewing. Without a roundId we
  // preserve legacy behaviour (always read from the store). When a roundId is given
  // but the store is scoring a different round (e.g. opened from a leaderboard), we
  // fall back to read-only data fetched from the database.
  const isLive = !roundId || (storeIsInitialized && currentRoundId === roundId);
  const isReadOnly = !isLive;
  const readOnlyEnabled = !!roundId && isReadOnly;

  // Read-only sources (DB). Gated so live scoring doesn't trigger extra fetches.
  const { data: roScorecards, isLoading: roScLoading } = useRoundScorecards(roundId ?? '', {
    enabled: readOnlyEnabled,
  });
  const { data: roRound, isLoading: roRoundLoading } = useRoundDetails(roundId ?? '', {
    enabled: readOnlyEnabled,
  });

  const roScorecardRaw = useMemo(
    () => roScorecards?.find((sc) => sc.player_id === playerId),
    [roScorecards, playerId]
  );

  // Find the player (camelCase shape) from the active source.
  const player = useMemo<Player | undefined>(() => {
    if (isLive) {
      return currentPlayers.find((p) => p.id === playerId);
    }
    const p = roScorecardRaw?.player;
    if (!p) return undefined;
    return {
      id: p.id,
      name: p.name,
      email: p.email ?? '',
      handicap: p.handicap,
      handicapIndex: p.handicap_index,
      gender: p.gender,
    };
  }, [isLive, currentPlayers, playerId, roScorecardRaw]);

  // Get scorecard for this player. The read-only (snake) and live (camel) shapes
  // differ, but both expose `scores` keyed by hole number — all the calc below reads.
  const scorecard = useMemo(() => {
    return isLive
      ? groupScorecards.get(playerId)
      : (roScorecardRaw as unknown as Scorecard | undefined);
  }, [isLive, groupScorecards, playerId, roScorecardRaw]);

  // Resolve the remaining inputs from the active source.
  const selectedTeeData = isLive ? storeSelectedTeeData : roRound?.selected_tee ?? null;
  const handicapSource: HandicapSource = isLive
    ? storeHandicapSource
    : roRound?.competition?.handicap_source ?? 'profile';
  const startHole = isLive ? storeStartHole : roRound?.nine_type === 'back9' ? 10 : 1;
  const isLoading = isLive ? storeIsLoading : roScLoading || roRoundLoading;
  const isInitialized = isLive ? storeIsInitialized : !roScLoading && !roRoundLoading;

  // Daily handicap recorded on a completed card — preferred over recomputation so the
  // displayed strokes-received matches what was actually scored.
  const dailyHandicapOverride = isLive ? undefined : roScorecardRaw?.daily_handicap_used ?? undefined;
  const baseHandicapOverride = isLive ? undefined : roScorecardRaw?.ga_handicap_used ?? undefined;

  // Multi-ball flags. The live store tracks these directly; read-only detects from data.
  const isMultiBall = useMemo(() => {
    if (isLive) return storeIsMultiBall;
    const scores = roScorecardRaw?.scores;
    if (!scores) return false;
    return Object.values(scores).some((s) => isMultiBallScore(s));
  }, [isLive, storeIsMultiBall, roScorecardRaw]);

  const ballCount: BallCount = useMemo(() => {
    if (isLive) return storeBallCount;
    const scores = roScorecardRaw?.scores;
    if (!scores) return 1;
    let max = 1;
    for (const s of Object.values(scores)) {
      if (isMultiBallScore(s)) max = Math.max(max, s.balls.length);
    }
    return max as BallCount;
  }, [isLive, storeBallCount, roScorecardRaw]);

  // Get holes data
  const holes: Hole[] = useMemo(() => {
    const sourceHoles = isLive ? storeHoles : roRound?.course?.holes;
    if (sourceHoles && sourceHoles.length > 0) {
      return sourceHoles;
    }

    // Default holes with standard pars and stroke indexes
    const defaultHoles: Hole[] = [];
    const pars: (3 | 4 | 5)[] = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    const strokeIndexes = [7, 15, 11, 1, 5, 9, 17, 13, 3, 8, 16, 12, 2, 6, 10, 18, 14, 4];

    for (let i = 1; i <= 18; i++) {
      defaultHoles.push({
        number: i as Hole['number'],
        par: pars[i - 1],
        strokeIndex: strokeIndexes[i - 1],
        yardages: { white: 380 },
      });
    }
    return defaultHoles;
  }, [isLive, storeHoles, roRound]);

  // Calculate course par for daily handicap calculation
  const coursePar = useMemo(() => {
    return Array.isArray(holes) ? holes.reduce((sum, hole) => sum + hole.par, 0) : 0;
  }, [holes]);

  // Calculate daily handicap using WHS formula, respecting handicap source
  const { handicap, dailyHandicap } = useMemo(() => {
    // Use getBaseHandicap to select correct value based on handicap source (profile vs social index).
    // For completed cards viewed read-only, prefer the handicap recorded at scoring time.
    const rawHandicap = baseHandicapOverride ?? getBaseHandicap(
      player ? {
        id: player.id,
        name: player.name,
        handicap: player.handicap ?? null,
        handicap_index: player.handicapIndex ?? null,
        gender: player.gender ?? null,
      } : null,
      handicapSource
    );

    // Prefer the daily handicap recorded on the card; otherwise compute from tee data.
    if (dailyHandicapOverride != null) {
      return { handicap: rawHandicap, dailyHandicap: dailyHandicapOverride };
    }

    let daily = rawHandicap;
    if (selectedTeeData?.slopeRating && selectedTeeData?.courseRating && coursePar > 0) {
      const result = calculateGADailyHandicap({
        gaHandicap: rawHandicap,
        slopeRating: selectedTeeData.slopeRating,
        courseRating: selectedTeeData.courseRating,
        par: coursePar,
        gender: player?.gender,
      });
      daily = result.dailyHandicap;
    }

    return { handicap: rawHandicap, dailyHandicap: daily };
  }, [player?.handicap, player?.handicapIndex, player?.gender, selectedTeeData, coursePar, handicapSource, baseHandicapOverride, dailyHandicapOverride]);

  // Calculate hole row data
  const holeRowData: HoleRowData[] = useMemo(() => {
    return holes.map((hole) => {
      const rawScore = scorecard?.scores[hole.number];
      // Get single-ball score values (for single-ball or first ball of multi-ball)
      const score = rawScore && isSingleBallScore(rawScore) ? rawScore : rawScore?.balls?.[0];
      const strokes = score?.strokes;
      const putts = score?.putts;
      const fairwayHit = score?.fairwayHit;
      const greenInRegulation = score?.greenInRegulation;
      // Use daily handicap for strokes received calculation
      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
      const isPickup = strokes !== undefined && strokes >= PICKUP_SCORE;

      let stablefordPoints = 0;
      if (strokes && strokes > 0 && !isPickup) {
        stablefordPoints = calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
      }

      return {
        hole,
        strokes,
        putts,
        stablefordPoints,
        strokesReceived,
        isPickup,
        fairwayHit,
        greenInRegulation,
      };
    });
  }, [holes, scorecard, dailyHandicap]);

  // Calculate player statistics
  const playerStats: PlayerStats = useMemo(() => {
    let front9Gross = 0;
    let back9Gross = 0;
    let front9Stableford = 0;
    let back9Stableford = 0;
    let front9Putts = 0;
    let back9Putts = 0;
    let front9Par = 0;
    let back9Par = 0;
    // FIR/GIR tracking
    let totalFairwaysHit = 0;
    let totalFairwaysPossible = 0; // Par 4+ holes only
    let totalGIR = 0;
    let totalGIRPossible = 0;

    holeRowData.forEach((data) => {
      const { hole, strokes, putts, stablefordPoints, fairwayHit, greenInRegulation, isPickup } = data;

      if (hole.number <= 9) {
        front9Par += hole.par;
        if (strokes) front9Gross += strokes;
        front9Stableford += stablefordPoints;
        if (putts) front9Putts += putts;
      } else {
        back9Par += hole.par;
        if (strokes) back9Gross += strokes;
        back9Stableford += stablefordPoints;
        if (putts) back9Putts += putts;
      }

      // FIR: Only count for par 4+ holes where score was entered (not picked up)
      if (hole.par >= 4 && strokes !== undefined && !isPickup) {
        totalFairwaysPossible++;
        if (fairwayHit === true) {
          totalFairwaysHit++;
        }
      }

      // GIR: Count for all holes where score was entered (not picked up)
      if (strokes !== undefined && !isPickup) {
        totalGIRPossible++;
        if (greenInRegulation === true) {
          totalGIR++;
        }
      }
    });

    return {
      front9Gross,
      back9Gross,
      front9Stableford,
      back9Stableford,
      front9Putts,
      back9Putts,
      totalGross: front9Gross + back9Gross,
      totalStableford: front9Stableford + back9Stableford,
      totalPutts: front9Putts + back9Putts,
      totalPar: front9Par + back9Par,
      front9Par,
      back9Par,
      // Handicap stats
      handicap,
      dailyHandicap,
      // FIR/GIR stats
      totalFairwaysHit,
      totalFairwaysPossible,
      totalGIR,
      totalGIRPossible,
    };
  }, [holeRowData, handicap, dailyHandicap]);

  // Split holes into front 9 and back 9
  const front9Holes = useMemo(() => {
    return holeRowData.filter((d) => d.hole.number <= 9);
  }, [holeRowData]);

  const back9Holes = useMemo(() => {
    return holeRowData.filter((d) => d.hole.number > 9);
  }, [holeRowData]);

  // Calculate multi-ball hole row data
  const multiBallHoleData: MultiBallHoleRowData[] = useMemo(() => {
    if (!isMultiBall || ballCount <= 1) return [];

    return holes.map((hole) => {
      const score = scorecard?.scores[hole.number];
      // Use daily handicap for strokes received calculation
      const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);

      // Get ball scores from multi-ball structure
      const balls: BallScoreData[] = [];

      if (score && isMultiBallScore(score)) {
        // Multi-ball score structure: { balls: HoleScore[] }
        for (let i = 0; i < ballCount; i++) {
          const ballScore = score.balls[i] as HoleScore | undefined;
          const strokes = ballScore?.strokes;
          const isPickup = strokes !== undefined && strokes >= PICKUP_SCORE;
          const fairwayHit = ballScore?.fairwayHit;
          const greenInRegulation = ballScore?.greenInRegulation;

          let stablefordPoints = 0;
          if (strokes && strokes > 0 && !isPickup) {
            stablefordPoints = calculateStablefordPointsNet(strokes, hole.par, strokesReceived);
          }

          balls.push({ strokes, stablefordPoints, isPickup, fairwayHit, greenInRegulation });
        }
      } else {
        // No scores yet - create empty ball data
        for (let i = 0; i < ballCount; i++) {
          balls.push({ strokes: undefined, stablefordPoints: 0, isPickup: false, fairwayHit: undefined, greenInRegulation: undefined });
        }
      }

      return {
        hole,
        strokesReceived,
        balls,
      };
    });
  }, [holes, scorecard, dailyHandicap, isMultiBall, ballCount]);

  // Split multi-ball data into front 9 and back 9
  const multiBallFront9 = useMemo(() => {
    return multiBallHoleData.filter((d) => d.hole.number <= 9);
  }, [multiBallHoleData]);

  const multiBallBack9 = useMemo(() => {
    return multiBallHoleData.filter((d) => d.hole.number > 9);
  }, [multiBallHoleData]);

  // Calculate multi-ball statistics per ball
  const multiBallStats: MultiBallStats = useMemo(() => {
    const ballStats: MultiBallStats['ballStats'] = {};

    // Initialize stats for each ball
    for (let b = 1; b <= ballCount; b++) {
      ballStats[b] = {
        front9Gross: 0,
        back9Gross: 0,
        front9Stableford: 0,
        back9Stableford: 0,
        totalGross: 0,
        totalStableford: 0,
      };
    }

    let front9Par = 0;
    let back9Par = 0;

    multiBallHoleData.forEach((data) => {
      const { hole, balls } = data;

      if (hole.number <= 9) {
        front9Par += hole.par;
      } else {
        back9Par += hole.par;
      }

      // Accumulate stats for each ball
      balls.forEach((ball, index) => {
        const ballNumber = index + 1;
        const stats = ballStats[ballNumber];
        if (!stats) return;

        if (ball.strokes && !ball.isPickup) {
          if (hole.number <= 9) {
            stats.front9Gross += ball.strokes;
            stats.front9Stableford += ball.stablefordPoints;
          } else {
            stats.back9Gross += ball.strokes;
            stats.back9Stableford += ball.stablefordPoints;
          }
        }
      });
    });

    // Calculate totals
    for (let b = 1; b <= ballCount; b++) {
      const stats = ballStats[b];
      stats.totalGross = stats.front9Gross + stats.back9Gross;
      stats.totalStableford = stats.front9Stableford + stats.back9Stableford;
    }

    return {
      ballStats,
      front9Par,
      back9Par,
      totalPar: front9Par + back9Par,
    };
  }, [multiBallHoleData, ballCount]);

  return {
    player,
    scorecard,
    holes,
    holeRowData,
    playerStats,
    front9Holes,
    back9Holes,
    isLoading,
    isInitialized,
    isReadOnly,
    startHole,
    // Multi-ball support
    isMultiBall,
    ballCount,
    multiBallHoleData,
    multiBallFront9,
    multiBallBack9,
    multiBallStats,
  };
}
