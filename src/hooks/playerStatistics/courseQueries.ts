/**
 * Course Statistics Hook
 *
 * TanStack Query hook for fetching player statistics at a specific course.
 * Calculates score distribution, averages, par type stats, and
 * hole-by-hole aggregated statistics across all rounds played.
 */

import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { supabase } from '@/services/supabase/client';
import { statisticsKeys } from '@/hooks/queryKeys';
import { parseAndTransformHoles } from '@/utils/holeTransformers';
import {
  countScoreDistribution,
  calculateParTypeStats,
  calculateShortGameStats,
  calculatePuttingDepthStats,
} from './helpers';
import {
  calculateFairwayMissDirectionStats,
  calculateGreenMissDirectionStats,
  calculateBunkerStats,
  calculateHazardStats,
} from './advancedHelpers';
import type { EnrichedHoleScore } from './advancedHelpers';
import type { HoleScore } from '@/types/database.types';
import type {
  ScoreDistribution,
  RoundSummary,
  RoundStatPoint,
  HoleStatistics,
  CourseStatisticsData,
} from './types';

/**
 * Query hook to fetch player statistics for a specific course
 */
export function useCourseStatistics(
  playerId: string | undefined,
  courseId: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: statisticsKeys.course(playerId ?? '', courseId ?? ''),
    queryFn: async (): Promise<CourseStatisticsData> => {
      if (!playerId || !courseId) {
        throw new Error('Player ID and Course ID are required');
      }

      // Fetch scorecards for this player at this course
      const { data: scorecardsData, error } = await supabase
        .from('scorecards')
        .select(
          `
          id,
          round_id,
          player_id,
          scores,
          total_gross,
          total_net,
          total_points,
          status,
          submitted_at,
          rounds!inner (
            id,
            competition_id,
            round_number,
            course_id,
            date,
            game_type,
            handicap_source,
            status,
            courses!inner (
              id,
              name,
              holes,
              clubs (
                id,
                name
              )
            ),
            competitions (
              id,
              name,
              status,
              handicap_source
            )
          )
        `
        )
        .eq('player_id', playerId)
        .eq('rounds.course_id', courseId)
        .in('status', ['completed', 'confirmed']);

      if (error) {
        console.error('Error fetching course scorecards:', error);
        throw error;
      }

      const scorecards = scorecardsData || [];

      if (scorecards.length === 0) {
        return createEmptyCourseStatistics(courseId);
      }

      // Aggregate data
      const totalDistribution: ScoreDistribution = {
        eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, triplePlus: 0,
      };

      let totalHolesPlayed = 0;
      // Round-aggregated totals exclude short rounds so a 9-hole practice
      // round can't undercut "Best Score" or skew per-round averages on this
      // course. Per-hole metrics still include every hole played.
      let fullRoundsCount = 0;
      let totalGrossSum = 0;
      let nineHoleGrossSum = 0;
      let totalPointsSum = 0;
      let bestGross = Infinity;
      let worstGross = 0;
      let courseName = '';

      // Threshold for treating a round as "full" 18 holes.
      const FULL_ROUND_HOLE_COUNT = 18;

      // Putting / FIR / GIR tracking
      let totalPutts = 0;
      let holesWithPuttsRecorded = 0;
      let fairwaysHit = 0;
      let fairwayOpportunities = 0;
      let greensInRegulation = 0;
      let girOpportunities = 0;

      const allHoleScores: EnrichedHoleScore[] = [];
      const roundSummaries: RoundSummary[] = [];
      const perRoundStats: {
        roundId: string;
        date: string;
        grossScore: number;
        points: number;
        firHit: number;
        firOpps: number;
        girHit: number;
        girOpps: number;
        totalPutts: number;
        puttsHoles: number;
        missedGirs: number;
        scrambles: number;
      }[] = [];

      // Hole-by-hole aggregation maps
      const holeAgg = new Map<number, {
        par: number;
        totalStrokes: number;
        count: number;
        best: number;
        worst: number;
        puttsSum: number;
        puttsCount: number;
        girHit: number;
        girOpps: number;
        fwHit: number;
        fwOpps: number;
        birdieOrBetter: number;
        pars: number;
        bogeys: number;
        doublePlus: number;
        scoreTrend: { date: string; score: number }[];
      }>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scorecards.forEach((scorecard: any) => {
        const round = scorecard.rounds;
        const course = round?.courses;
        const competition = round?.competitions;

        if (!round || !course) return;

        courseName = course.name;
        const isStandaloneRound = !competition;
        // Mirror the logic in queries.ts: a standalone round is a "handicap
        // round" when its effective handicap source isn't 'none', otherwise
        // it's a "practice round". Competition rounds fall into neither.
        const effectiveHandicapSource =
          round.handicap_source ?? competition?.handicap_source ?? 'profile';
        const isHandicapRound = isStandaloneRound && effectiveHandicapSource !== 'none';
        const isPracticeRound = isStandaloneRound && effectiveHandicapSource === 'none';
        const holes = parseAndTransformHoles(course.holes);
        const scores = scorecard.scores as Record<string, HoleScore>;

        // Score distribution
        const cardDistribution = countScoreDistribution(scores, holes);
        totalDistribution.eagles += cardDistribution.eagles;
        totalDistribution.birdies += cardDistribution.birdies;
        totalDistribution.pars += cardDistribution.pars;
        totalDistribution.bogeys += cardDistribution.bogeys;
        totalDistribution.doubleBogeys += cardDistribution.doubleBogeys;
        totalDistribution.triplePlus += cardDistribution.triplePlus;

        // Par map for this course
        const parMap = new Map<number, number>();
        holes.forEach((hole) => parMap.set(hole.number, hole.par));

        // Process hole scores
        const holesInScorecard = Object.values(scores).filter((s) => s?.strokes).length;
        totalHolesPlayed += holesInScorecard;

        const isFullRound = holesInScorecard >= FULL_ROUND_HOLE_COUNT;
        if (isFullRound) {
          fullRoundsCount++;
          totalGrossSum += scorecard.total_gross || 0;
          totalPointsSum += scorecard.total_points || 0;

          if (scorecard.total_gross && scorecard.total_gross < bestGross) bestGross = scorecard.total_gross;
          if (scorecard.total_gross && scorecard.total_gross > worstGross) worstGross = scorecard.total_gross;
        } else {
          nineHoleGrossSum += scorecard.total_gross || 0;
        }

        Object.entries(scores).forEach(([holeNum, holeScore]) => {
          if (!holeScore?.strokes) return;

          const holeNumber = parseInt(holeNum, 10);
          const par = parMap.get(holeNumber) || 4;

          // Collect for par type stats
          allHoleScores.push({
            strokes: holeScore.strokes,
            par,
            gir: typeof holeScore.greenInRegulation === 'boolean' ? holeScore.greenInRegulation : null,
            putts: typeof holeScore.putts === 'number' ? holeScore.putts : null,
            fairwayHit: typeof holeScore.fairwayHit === 'boolean' ? holeScore.fairwayHit : null,
            fairwayMissDirection: holeScore.fairwayMissDirection,
            greenMissDirection: holeScore.greenMissDirection,
            bunkerShots: holeScore.bunkerShots,
            hazards: holeScore.hazards,
          });

          // Hole-by-hole aggregation
          if (!holeAgg.has(holeNumber)) {
            holeAgg.set(holeNumber, {
              par,
              totalStrokes: 0, count: 0,
              best: Infinity, worst: 0,
              puttsSum: 0, puttsCount: 0,
              girHit: 0, girOpps: 0,
              fwHit: 0, fwOpps: 0,
              birdieOrBetter: 0, pars: 0, bogeys: 0, doublePlus: 0,
              scoreTrend: [],
            });
          }
          const agg = holeAgg.get(holeNumber)!;
          agg.totalStrokes += holeScore.strokes;
          agg.count++;
          if (holeScore.strokes < agg.best) agg.best = holeScore.strokes;
          if (holeScore.strokes > agg.worst) agg.worst = holeScore.strokes;

          if (typeof holeScore.putts === 'number') {
            agg.puttsSum += holeScore.putts;
            agg.puttsCount++;
          }
          if (typeof holeScore.greenInRegulation === 'boolean') {
            agg.girOpps++;
            if (holeScore.greenInRegulation) agg.girHit++;
          }
          if (par >= 4 && typeof holeScore.fairwayHit === 'boolean') {
            agg.fwOpps++;
            if (holeScore.fairwayHit) agg.fwHit++;
          }

          // Per-hole score distribution
          const diff = holeScore.strokes - par;
          if (diff <= -1) agg.birdieOrBetter++;
          else if (diff === 0) agg.pars++;
          else if (diff === 1) agg.bogeys++;
          else agg.doublePlus++;

          // Course-level putt/FIR/GIR aggregation
          if (typeof holeScore.putts === 'number' && holeScore.putts >= 0) {
            totalPutts += holeScore.putts;
            holesWithPuttsRecorded++;
          }
          if (par >= 4 && typeof holeScore.fairwayHit === 'boolean') {
            fairwayOpportunities++;
            if (holeScore.fairwayHit) fairwaysHit++;
          }
          if (typeof holeScore.greenInRegulation === 'boolean') {
            girOpportunities++;
            if (holeScore.greenInRegulation) greensInRegulation++;
          }

          // Per-hole trend point
          agg.scoreTrend.push({
            date: round.date || scorecard.submitted_at || '',
            score: holeScore.strokes,
          });
        });

        // Round summary
        roundSummaries.push({
          roundId: round.id,
          courseId: course.id,
          competitionId: competition?.id ?? null,
          competitionName:
            competition?.name ?? (isHandicapRound ? 'Handicap Round' : 'Practice Round'),
          courseName: course.name,
          clubName: course.clubs?.name ?? null,
          date: round.date || scorecard.submitted_at || '',
          totalGross: scorecard.total_gross || 0,
          totalPoints: scorecard.total_points || 0,
          holesPlayed: holesInScorecard,
          isPracticeRound,
          isHandicapRound,
          gameType: round.game_type,
          roundStatus: round.status,
        });

        // Per-round stats collection
        let roundFirHit = 0, roundFirOpps = 0;
        let roundGirHit = 0, roundGirOpps = 0;
        let roundPutts = 0, roundPuttsHoles = 0;
        let roundMissedGirs = 0, roundScrambles = 0;

        Object.entries(scores).forEach(([hn, hs]) => {
          if (!hs?.strokes) return;
          const p = parMap.get(parseInt(hn, 10)) || 4;
          if (typeof hs.putts === 'number') { roundPutts += hs.putts; roundPuttsHoles++; }
          if (p >= 4 && typeof hs.fairwayHit === 'boolean') { roundFirOpps++; if (hs.fairwayHit) roundFirHit++; }
          if (typeof hs.greenInRegulation === 'boolean') {
            roundGirOpps++;
            if (hs.greenInRegulation) roundGirHit++;
            else {
              roundMissedGirs++;
              if (hs.strokes <= p) roundScrambles++;
            }
          }
        });

        perRoundStats.push({
          roundId: round.id,
          date: round.date || scorecard.submitted_at || '',
          grossScore: scorecard.total_gross || 0,
          points: scorecard.total_points || 0,
          firHit: roundFirHit, firOpps: roundFirOpps,
          girHit: roundGirHit, girOpps: roundGirOpps,
          totalPutts: roundPutts, puttsHoles: roundPuttsHoles,
          missedGirs: roundMissedGirs, scrambles: roundScrambles,
        });
      });

      // Calculate averages
      const timesPlayed = scorecards.length;
      // Per-round averages exclude 9-hole rounds — mixing the two produces a
      // misleading "Avg Score" stat. `timesPlayed` keeps the total count for
      // the "Rounds Played" tile.
      const averageGrossScore = fullRoundsCount > 0
        ? Math.round((totalGrossSum / fullRoundsCount) * 10) / 10 : 0;
      const averageStablefordPoints = fullRoundsCount > 0
        ? Math.round((totalPointsSum / fullRoundsCount) * 10) / 10 : 0;
      // Per-hole average spans every hole played, so include 9-hole gross
      // alongside the 18-hole sum (denominator already counts all holes).
      const averageScorePerHole = totalHolesPlayed > 0
        ? Math.round(((totalGrossSum + nineHoleGrossSum) / totalHolesPlayed) * 100) / 100 : 0;

      // Score distribution totals
      const totalScoreDistribution =
        totalDistribution.eagles + totalDistribution.birdies + totalDistribution.pars +
        totalDistribution.bogeys + totalDistribution.doubleBogeys + totalDistribution.triplePlus;

      const parOrBetter = totalDistribution.eagles + totalDistribution.birdies + totalDistribution.pars;
      const parOrBetterPercentage = totalScoreDistribution > 0
        ? Math.round((parOrBetter / totalScoreDistribution) * 1000) / 10 : 0;

      // Build hole-by-hole stats
      const holeStats: HoleStatistics[] = Array.from(holeAgg.entries())
        .sort(([a], [b]) => a - b)
        .map(([holeNumber, agg]) => {
          const avg = Math.round((agg.totalStrokes / agg.count) * 100) / 100;
          const total = agg.birdieOrBetter + agg.pars + agg.bogeys + agg.doublePlus;
          const sortedTrend = [...agg.scoreTrend].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          return {
            holeNumber,
            par: agg.par,
            averageScore: avg,
            scoreToPar: Math.round((avg - agg.par) * 100) / 100,
            bestScore: agg.best === Infinity ? 0 : agg.best,
            worstScore: agg.worst,
            averagePutts: agg.puttsCount > 0
              ? Math.round((agg.puttsSum / agg.puttsCount) * 100) / 100 : null,
            girPercentage: agg.girOpps > 0
              ? Math.round((agg.girHit / agg.girOpps) * 1000) / 10 : null,
            fairwayPercentage: agg.fwOpps > 0
              ? Math.round((agg.fwHit / agg.fwOpps) * 1000) / 10 : null,
            timesPlayed: agg.count,
            birdieOrBetterPercentage: total > 0
              ? Math.round((agg.birdieOrBetter / total) * 1000) / 10 : 0,
            parPercentage: total > 0
              ? Math.round((agg.pars / total) * 1000) / 10 : 0,
            bogeyPercentage: total > 0
              ? Math.round((agg.bogeys / total) * 1000) / 10 : 0,
            doublePlusPercentage: total > 0
              ? Math.round((agg.doublePlus / total) * 1000) / 10 : 0,
            scoreTrend: sortedTrend,
          };
        });

      // Par type stats
      const par3Stats = calculateParTypeStats(allHoleScores, 3);
      const par4Stats = calculateParTypeStats(allHoleScores, 4);
      const par5Stats = calculateParTypeStats(allHoleScores, 5);

      // Recent rounds (last 5) — exclude rounds still in-progress/upcoming
      // so the activity list only reflects finished play.
      const recentRounds = [...roundSummaries]
        .filter((r) => r.roundStatus === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Advanced stats (reuse existing helpers)
      const shortGame = calculateShortGameStats(allHoleScores);
      const puttingDepth = calculatePuttingDepthStats(allHoleScores);
      const fairwayMissDirection = calculateFairwayMissDirectionStats(allHoleScores);
      const greenMissDirection = calculateGreenMissDirectionStats(allHoleScores);
      const bunkerStatsData = calculateBunkerStats(allHoleScores, timesPlayed);
      const hazardStatsData = calculateHazardStats(allHoleScores, timesPlayed);

      const averagePuttsPerRound = holesWithPuttsRecorded > 0 && timesPlayed > 0
        ? Math.round((totalPutts / timesPlayed) * 10) / 10 : null;
      const averagePuttsPerHole = holesWithPuttsRecorded > 0
        ? Math.round((totalPutts / holesWithPuttsRecorded) * 100) / 100 : null;
      const fairwayPercentage = fairwayOpportunities > 0
        ? Math.round((fairwaysHit / fairwayOpportunities) * 1000) / 10 : null;
      const girPercentage = girOpportunities > 0
        ? Math.round((greensInRegulation / girOpportunities) * 1000) / 10 : null;

      const roundTrends: RoundStatPoint[] = perRoundStats
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-10)
        .map((r) => ({
          roundId: r.roundId,
          date: r.date,
          grossScore: r.grossScore,
          points: r.points,
          fairwayPercentage: r.firOpps > 0 ? Math.round((r.firHit / r.firOpps) * 1000) / 10 : null,
          girPercentage: r.girOpps > 0 ? Math.round((r.girHit / r.girOpps) * 1000) / 10 : null,
          averagePutts: r.puttsHoles > 0 ? Math.round((r.totalPutts / r.puttsHoles) * 100) / 100 : null,
          scramblingPercentage: r.missedGirs > 0 ? Math.round((r.scrambles / r.missedGirs) * 1000) / 10 : null,
        }));

      return {
        courseId,
        courseName,
        timesPlayed,
        averageGrossScore,
        bestGrossScore: bestGross === Infinity ? 0 : bestGross,
        worstGrossScore: worstGross,
        averageStablefordPoints,
        averageScorePerHole,
        parOrBetterPercentage,
        scoreDistribution: totalDistribution,
        totalScoreDistribution,
        holeStats,
        par3Stats,
        par4Stats,
        par5Stats,
        recentRounds,
        shortGame,
        puttingDepth,
        fairwayMissDirection,
        greenMissDirection,
        bunkerStats: bunkerStatsData,
        hazardStats: hazardStatsData,
        totalPutts: holesWithPuttsRecorded > 0 ? totalPutts : null,
        averagePuttsPerRound,
        averagePuttsPerHole,
        holesWithPuttsRecorded,
        fairwaysHit: fairwayOpportunities > 0 ? fairwaysHit : null,
        fairwayOpportunities,
        fairwayPercentage,
        greensInRegulation: girOpportunities > 0 ? greensInRegulation : null,
        girOpportunities,
        girPercentage,
        roundTrends,
      };
    },
    enabled: enabled && !!playerId && !!courseId,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });
}

function createEmptyCourseStatistics(courseId: string): CourseStatisticsData {
  const emptyParTypeStats = {
    holesPlayed: 0, averageScore: 0, scoreToPar: 0, girPercentage: null,
    birdiePercentage: 0, parPercentage: 0, bogeyPercentage: 0, doublePlusPercentage: 0,
  };

  return {
    courseId,
    courseName: '',
    timesPlayed: 0,
    averageGrossScore: 0,
    bestGrossScore: 0,
    worstGrossScore: 0,
    averageStablefordPoints: 0,
    averageScorePerHole: 0,
    parOrBetterPercentage: 0,
    scoreDistribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, triplePlus: 0 },
    totalScoreDistribution: 0,
    holeStats: [],
    par3Stats: emptyParTypeStats,
    par4Stats: emptyParTypeStats,
    par5Stats: emptyParTypeStats,
    recentRounds: [],
    shortGame: { scramblingPercentage: null, scrambleAttempts: 0, scramblesMade: 0, bogeyAvoidanceRate: 0, doubleBogeyOrWorseRate: 0 },
    puttingDepth: { onePuttPercentage: null, threePuttPercentage: null, puttsPerGIR: null },
    fairwayMissDirection: { leftCount: 0, rightCount: 0, longCount: 0, shortCount: 0, totalMisses: 0, leftPercentage: null, rightPercentage: null, longPercentage: null, shortPercentage: null },
    greenMissDirection: { leftCount: 0, rightCount: 0, longCount: 0, shortCount: 0, totalMisses: 0, leftPercentage: null, rightPercentage: null, longPercentage: null, shortPercentage: null },
    bunkerStats: { totalBunkerShots: 0, holesWithBunkers: 0, totalHolesTracked: 0, averageBunkerShotsPerRound: null, holesWithBunkersPercentage: null, sandSavePercentage: null, sandSaves: 0, sandSaveAttempts: 0 },
    hazardStats: { waterCount: 0, obCount: 0, lateralCount: 0, lostBallCount: 0, totalHazards: 0, averageHazardsPerRound: null, holesWithHazards: 0, totalHolesTracked: 0 },
    totalPutts: null,
    averagePuttsPerRound: null,
    averagePuttsPerHole: null,
    holesWithPuttsRecorded: 0,
    fairwaysHit: null,
    fairwayOpportunities: 0,
    fairwayPercentage: null,
    greensInRegulation: null,
    girOpportunities: 0,
    girPercentage: null,
    roundTrends: [],
  };
}
