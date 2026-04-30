/**
 * Player Statistics Hooks - Query Hooks
 *
 * TanStack Query hooks for fetching player statistics.
 *
 * Hooks:
 * - usePlayerStatistics: Fetch comprehensive player statistics
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
  CourseStats,
  RoundSummary,
  RoundStatPoint,
  PlayerStatistics,
  UsePlayerStatisticsOptions,
} from './types';

/**
 * Query hook to fetch comprehensive player statistics
 *
 * Fetches and calculates:
 * - Total rounds played
 * - Total competitions entered/won
 * - Score distribution (eagles, birdies, pars, bogeys, double bogeys)
 * - Favourite course (most played)
 * - Average scores and points
 * - Best/worst rounds
 * - Scoring trends
 */
export function usePlayerStatistics(
  playerId: string | undefined,
  options: UsePlayerStatisticsOptions = {}
) {
  const { enabled = true, leagueId, competitionId } = options;

  const hasFilters = !!leagueId || !!competitionId;
  const queryKey = hasFilters
    ? statisticsKeys.playerFiltered(playerId ?? '', { leagueId, competitionId })
    : statisticsKeys.player(playerId ?? '');

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PlayerStatistics> => {
      if (!playerId) {
        throw new Error('Player ID is required');
      }

      // When filtering by league, first get the scorecard IDs from league_rounds
      let leagueScorecardIds: string[] | null = null;
      if (leagueId) {
        const { data: leagueRoundsData, error: lrError } = await supabase
          .from('league_rounds')
          .select('scorecard_id')
          .eq('league_id', leagueId)
          .eq('player_id', playerId);

        if (lrError) {
          console.error('Error fetching league rounds:', lrError);
          throw lrError;
        }

        leagueScorecardIds = ((leagueRoundsData || []) as unknown as { scorecard_id: string }[]).map((lr) => lr.scorecard_id);

        // If no scorecards match the league filter, return zeroed-out stats
        if (leagueScorecardIds.length === 0) {
          return createEmptyStatistics();
        }
      }

      // Fetch all scorecards for the player with round and competition data
      // Uses left join for competitions to include practice/standalone rounds
      let scorecardsQuery = supabase
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
              holes
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
        .in('status', ['completed', 'confirmed']);

      // Apply filters
      if (leagueScorecardIds) {
        scorecardsQuery = scorecardsQuery.in('id', leagueScorecardIds);
      }
      if (competitionId) {
        scorecardsQuery = scorecardsQuery.eq('rounds.competition_id', competitionId);
      }

      const { data: scorecardsData, error: scorecardsError } = await scorecardsQuery;

      if (scorecardsError) {
        console.error('Error fetching scorecards:', scorecardsError);
        throw scorecardsError;
      }

      const scorecards = scorecardsData || [];

      // If filtering returned no results, return empty stats
      if (hasFilters && scorecards.length === 0) {
        return createEmptyStatistics();
      }

      // Fetch competitions where player is a participant
      // Skip when filtering by league (not meaningful in league context)
      // Define type for the query result since Supabase can't infer join types
      interface CompetitionPlayerResult {
        competition_id: string;
        status: string;
        competitions: {
          id: string;
          name: string;
          status: string;
        } | null;
      }

      let competitionPlayers: CompetitionPlayerResult[] = [];

      if (!leagueId) {
        let cpQuery = supabase
          .from('competition_players')
          .select(
            `
            competition_id,
            status,
            competitions (
              id,
              name,
              status
            )
          `
          )
          .eq('player_id', playerId)
          .eq('status', 'accepted');

        // When filtering by competition, only fetch that one
        if (competitionId) {
          cpQuery = cpQuery.eq('competition_id', competitionId);
        }

        const { data: competitionPlayersData, error: cpError } = await cpQuery;

        if (cpError) {
          console.error('Error fetching competition players:', cpError);
          throw cpError;
        }

        competitionPlayers = (competitionPlayersData || []) as CompetitionPlayerResult[];
      }

      // Calculate statistics
      const roundsPlayed = scorecards.length;
      const competitionsEntered = competitionPlayers.length;

      // Calculate score distribution across all scorecards
      const totalDistribution: ScoreDistribution = {
        eagles: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 0,
        triplePlus: 0,
      };

      let totalHolesPlayed = 0;
      let totalGrossScoreSum = 0;
      let totalPointsSum = 0;

      // Year-to-date accumulators (current calendar year)
      const currentYear = new Date().getFullYear();
      let ytdRoundsCount = 0;
      let ytdGrossScoreSum = 0;

      // Putting, FIR, GIR tracking
      let totalPutts = 0;
      let holesWithPuttsRecorded = 0;
      let fairwaysHit = 0;
      let fairwayOpportunities = 0; // Par 4s and 5s where FIR was recorded
      let greensInRegulation = 0;
      let girOpportunities = 0; // Holes where GIR was recorded

      // Collect all hole scores for par type and short game calculations
      const allHoleScores: EnrichedHoleScore[] = [];

      // Track course stats
      const courseStatsMap = new Map<
        string,
        {
          courseId: string;
          courseName: string;
          timesPlayed: number;
          totalScore: number;
          bestScore: number;
        }
      >();

      // Round summaries for best/worst calculations
      const roundSummaries: RoundSummary[] = [];

      // Track practice vs competition rounds and game type breakdown
      let practiceRoundsCount = 0;
      let matchPlayRoundsCount = 0;
      let handicapRoundsCount = 0;
      const gameTypeCounts = new Map<string, number>();

      // Per-round stat tracking for sparklines
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex Supabase join response type
      scorecards.forEach((scorecard: any) => {
        const round = scorecard.rounds;
        const course = round?.courses;
        const competition = round?.competitions; // Can be null for practice rounds

        // Only require round and course - competition can be null for practice rounds
        if (!round || !course) return;

        const isPracticeRound = !competition;

        // Count match play rounds
        if (round.game_type === 'match-play') {
          matchPlayRoundsCount++;
        }

        // Resolve effective handicap source: round > competition > default 'profile'
        const effectiveHandicapSource = round.handicap_source ?? competition?.handicap_source ?? 'profile';
        if (effectiveHandicapSource !== 'none') {
          handicapRoundsCount++;
        }

        // Count game types
        gameTypeCounts.set(round.game_type, (gameTypeCounts.get(round.game_type) || 0) + 1);

        const holes = parseAndTransformHoles(course.holes);
        const scores = scorecard.scores as Record<string, HoleScore>;

        // Count holes played in this scorecard
        const holesInScorecard = Object.values(scores).filter((s) => s?.strokes).length;
        totalHolesPlayed += holesInScorecard;

        // Calculate distribution for this scorecard
        const cardDistribution = countScoreDistribution(scores, holes);
        totalDistribution.eagles += cardDistribution.eagles;
        totalDistribution.birdies += cardDistribution.birdies;
        totalDistribution.pars += cardDistribution.pars;
        totalDistribution.bogeys += cardDistribution.bogeys;
        totalDistribution.doubleBogeys += cardDistribution.doubleBogeys;
        totalDistribution.triplePlus += cardDistribution.triplePlus;

        // Create a map of hole numbers to par values for FIR calculation
        const parMap = new Map<number, number>();
        holes.forEach((hole) => {
          parMap.set(hole.number, hole.par);
        });

        // Calculate putting, FIR, and GIR stats for this scorecard
        Object.entries(scores).forEach(([holeNum, holeScore]) => {
          if (!holeScore) return;

          const holeNumber = parseInt(holeNum, 10);
          const par = parMap.get(holeNumber) || 4;

          // Putting stats
          if (typeof holeScore.putts === 'number' && holeScore.putts >= 0) {
            totalPutts += holeScore.putts;
            holesWithPuttsRecorded++;
          }

          // FIR stats (only applicable for par 4s and 5s)
          if (par >= 4 && typeof holeScore.fairwayHit === 'boolean') {
            fairwayOpportunities++;
            if (holeScore.fairwayHit) {
              fairwaysHit++;
            }
          }

          // GIR stats (applicable to all holes)
          if (typeof holeScore.greenInRegulation === 'boolean') {
            girOpportunities++;
            if (holeScore.greenInRegulation) {
              greensInRegulation++;
            }
          }

          // Collect hole data for par type and short game stats
          if (holeScore.strokes) {
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
          }
        });

        // Sum up totals
        totalGrossScoreSum += scorecard.total_gross || 0;
        totalPointsSum += scorecard.total_points || 0;

        // Accumulate YTD aggregates from rounds dated this calendar year.
        // `round.date` is the canonical source; falling back to submitted_at
        // would let undated drafts leak into the YTD slice.
        if (round.date) {
          const roundYear = new Date(round.date).getFullYear();
          if (roundYear === currentYear) {
            ytdRoundsCount++;
            ytdGrossScoreSum += scorecard.total_gross || 0;
          }
        }

        // Track course stats
        const existingCourseStats = courseStatsMap.get(course.id);
        if (existingCourseStats) {
          existingCourseStats.timesPlayed++;
          existingCourseStats.totalScore += scorecard.total_gross || 0;
          if (scorecard.total_gross < existingCourseStats.bestScore) {
            existingCourseStats.bestScore = scorecard.total_gross;
          }
        } else {
          courseStatsMap.set(course.id, {
            courseId: course.id,
            courseName: course.name,
            timesPlayed: 1,
            totalScore: scorecard.total_gross || 0,
            bestScore: scorecard.total_gross || 0,
          });
        }

        // Track practice round count
        if (isPracticeRound) {
          practiceRoundsCount++;
        }

        // Create round summary
        roundSummaries.push({
          roundId: round.id,
          courseId: course.id,
          competitionId: competition?.id ?? null,
          competitionName: competition?.name ?? 'Practice Round',
          courseName: course.name,
          date: round.date || scorecard.submitted_at || '',
          totalGross: scorecard.total_gross || 0,
          totalPoints: scorecard.total_points || 0,
          holesPlayed: holesInScorecard,
          isPracticeRound,
          gameType: round.game_type,
        });

        // Collect per-round stats for sparklines
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
          firHit: roundFirHit,
          firOpps: roundFirOpps,
          girHit: roundGirHit,
          girOpps: roundGirOpps,
          totalPutts: roundPutts,
          puttsHoles: roundPuttsHoles,
          missedGirs: roundMissedGirs,
          scrambles: roundScrambles,
        });
      });

      // Convert course stats to array and calculate averages
      const courseStats: CourseStats[] = Array.from(courseStatsMap.values()).map((cs) => ({
        courseId: cs.courseId,
        courseName: cs.courseName,
        timesPlayed: cs.timesPlayed,
        averageScore: cs.timesPlayed > 0 ? Math.round((cs.totalScore / cs.timesPlayed) * 10) / 10 : 0,
        bestScore: cs.bestScore,
      }));

      // Sort by times played to find favourite course
      courseStats.sort((a, b) => b.timesPlayed - a.timesPlayed);
      const favouriteCourse = courseStats.length > 0 ? courseStats[0] : null;

      // Find best/worst rounds (by gross score - lower is better for stroke play)
      const sortedByGross = [...roundSummaries].sort((a, b) => a.totalGross - b.totalGross);
      const bestRound = sortedByGross.length > 0 ? sortedByGross[0] : null;
      const worstRound = sortedByGross.length > 0 ? sortedByGross[sortedByGross.length - 1] : null;

      // Find best Stableford round (higher is better)
      const sortedByPoints = [...roundSummaries].sort((a, b) => b.totalPoints - a.totalPoints);
      const bestStablefordRound = sortedByPoints.length > 0 ? sortedByPoints[0] : null;

      // Calculate competitions won
      // A player wins if they have the highest points in a completed competition
      let competitionsWon = 0;

      // Get all completed competition IDs the player entered
      const completedCompetitionIds = competitionPlayers
        .filter((cp) => cp.competitions?.status === 'completed')
        .map((cp) => cp.competition_id);

      if (completedCompetitionIds.length > 0) {
        // FIXED: Batch fetch all scorecards for all completed competitions in ONE query
        // This replaces the N+1 query pattern that was making one query per competition
        const { data: allCompScorecards } = await supabase
          .from('scorecards')
          .select(
            `
            player_id,
            total_points,
            rounds!inner (
              competition_id
            )
          `
          )
          .in('rounds.competition_id', completedCompetitionIds)
          .in('status', ['completed', 'confirmed']);

        if (allCompScorecards && allCompScorecards.length > 0) {
          // Group scorecards by competition
          const scoresByCompetition = new Map<string, Map<string, number>>();

          allCompScorecards.forEach(
            (scorecard: {
              player_id: string;
              total_points: number | null;
              rounds: { competition_id: string };
            }) => {
              const compId = scorecard.rounds.competition_id;
              if (!scoresByCompetition.has(compId)) {
                scoresByCompetition.set(compId, new Map());
              }
              const playerPointsMap = scoresByCompetition.get(compId)!;
              const current = playerPointsMap.get(scorecard.player_id) || 0;
              playerPointsMap.set(scorecard.player_id, current + (scorecard.total_points || 0));
            }
          );

          // Check each competition for wins
          scoresByCompetition.forEach((playerPointsMap) => {
            const currentPlayerPoints = playerPointsMap.get(playerId) || 0;
            const maxPoints = Math.max(...Array.from(playerPointsMap.values()));

            if (currentPlayerPoints === maxPoints && currentPlayerPoints > 0) {
              competitionsWon++;
            }
          });
        }
      }

      // Calculate averages
      const averageGrossScore =
        roundsPlayed > 0 ? Math.round((totalGrossScoreSum / roundsPlayed) * 10) / 10 : 0;

      const averageGrossScoreYtd =
        ytdRoundsCount > 0
          ? Math.round((ytdGrossScoreSum / ytdRoundsCount) * 10) / 10
          : null;

      const averageStablefordPoints =
        roundsPlayed > 0 ? Math.round((totalPointsSum / roundsPlayed) * 10) / 10 : 0;

      const averageScorePerHole =
        totalHolesPlayed > 0 ? Math.round((totalGrossScoreSum / totalHolesPlayed) * 100) / 100 : 0;

      // Calculate percentages
      const totalScoreDistribution =
        totalDistribution.eagles +
        totalDistribution.birdies +
        totalDistribution.pars +
        totalDistribution.bogeys +
        totalDistribution.doubleBogeys +
        totalDistribution.triplePlus;

      const parOrBetter =
        totalDistribution.eagles + totalDistribution.birdies + totalDistribution.pars;
      const parOrBetterPercentage =
        totalScoreDistribution > 0
          ? Math.round((parOrBetter / totalScoreDistribution) * 1000) / 10
          : 0;

      const birdieOrBetter = totalDistribution.eagles + totalDistribution.birdies;
      const birdieOrBetterPercentage =
        totalScoreDistribution > 0
          ? Math.round((birdieOrBetter / totalScoreDistribution) * 1000) / 10
          : 0;

      // Get recent rounds (last 5)
      const recentRounds = [...roundSummaries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Calculate putting averages
      const averagePuttsPerRound =
        holesWithPuttsRecorded > 0 && roundsPlayed > 0
          ? Math.round((totalPutts / roundsPlayed) * 10) / 10
          : null;
      const averagePuttsPerHole =
        holesWithPuttsRecorded > 0
          ? Math.round((totalPutts / holesWithPuttsRecorded) * 100) / 100
          : null;

      // Calculate FIR percentage
      const fairwayPercentage =
        fairwayOpportunities > 0
          ? Math.round((fairwaysHit / fairwayOpportunities) * 1000) / 10
          : null;

      // Calculate GIR percentage
      const girPercentage =
        girOpportunities > 0
          ? Math.round((greensInRegulation / girOpportunities) * 1000) / 10
          : null;

      // Calculate par type stats
      const par3Stats = calculateParTypeStats(allHoleScores, 3);
      const par4Stats = calculateParTypeStats(allHoleScores, 4);
      const par5Stats = calculateParTypeStats(allHoleScores, 5);

      // Calculate short game stats
      const shortGame = calculateShortGameStats(allHoleScores);

      // Calculate putting depth stats
      const puttingDepth = calculatePuttingDepthStats(allHoleScores);

      // Calculate advanced stats
      const fairwayMissDirection = calculateFairwayMissDirectionStats(allHoleScores);
      const greenMissDirection = calculateGreenMissDirectionStats(allHoleScores);
      const bunkerStats = calculateBunkerStats(allHoleScores, roundsPlayed);
      const hazardStats = calculateHazardStats(allHoleScores, roundsPlayed);

      // Convert game type counts map to plain object
      const gameTypeBreakdown: Record<string, number> = {};
      gameTypeCounts.forEach((count, gameType) => {
        gameTypeBreakdown[gameType] = count;
      });

      // Build sparkline trend data (last 10 rounds)
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
        roundsPlayed,
        practiceRoundsPlayed: practiceRoundsCount,
        competitionRoundsPlayed: roundsPlayed - practiceRoundsCount,
        matchPlayRoundsPlayed: matchPlayRoundsCount,
        handicapRoundsPlayed: handicapRoundsCount,
        competitionsEntered,
        competitionsWon,
        holesPlayed: totalHolesPlayed,
        scoreDistribution: totalDistribution,
        totalScoreDistribution,
        averageGrossScore,
        averageStablefordPoints,
        averageScorePerHole,
        roundsPlayedYtd: ytdRoundsCount,
        averageGrossScoreYtd,
        bestRound,
        worstRound,
        bestStablefordRound,
        favouriteCourse,
        courseStats,
        lowestGrossScore: bestRound?.totalGross ?? null,
        highestStablefordPoints: bestStablefordRound?.totalPoints ?? null,
        recentRounds,
        gameTypeBreakdown,
        parOrBetterPercentage,
        birdieOrBetterPercentage,
        // Putting stats
        totalPutts: holesWithPuttsRecorded > 0 ? totalPutts : null,
        averagePuttsPerRound,
        averagePuttsPerHole,
        holesWithPuttsRecorded,
        // Fairway stats
        fairwaysHit: fairwayOpportunities > 0 ? fairwaysHit : null,
        fairwayOpportunities,
        fairwayPercentage,
        // GIR stats
        greensInRegulation: girOpportunities > 0 ? greensInRegulation : null,
        girOpportunities,
        girPercentage,
        // Par Type Stats
        par3Stats,
        par4Stats,
        par5Stats,
        // Short Game Stats
        shortGame,
        // Putting Depth Stats
        puttingDepth,
        // Advanced Stats
        fairwayMissDirection,
        greenMissDirection,
        bunkerStats,
        hazardStats,
        roundTrends,
      };
    },
    enabled: enabled && !!playerId,
    staleTime: CACHE_TIMES.STANDARD, // 5 minutes
    gcTime: GC_TIMES.STANDARD, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Create a zeroed-out PlayerStatistics object for when filters match no data
 */
function createEmptyStatistics(): PlayerStatistics {
  const emptyParTypeStats = {
    holesPlayed: 0,
    averageScore: 0,
    scoreToPar: 0,
    girPercentage: null,
    birdiePercentage: 0,
    parPercentage: 0,
    bogeyPercentage: 0,
    doublePlusPercentage: 0,
  };

  return {
    roundsPlayed: 0,
    practiceRoundsPlayed: 0,
    competitionRoundsPlayed: 0,
    matchPlayRoundsPlayed: 0,
    handicapRoundsPlayed: 0,
    competitionsEntered: 0,
    competitionsWon: 0,
    holesPlayed: 0,
    scoreDistribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, triplePlus: 0 },
    totalScoreDistribution: 0,
    averageGrossScore: 0,
    averageStablefordPoints: 0,
    averageScorePerHole: 0,
    roundsPlayedYtd: 0,
    averageGrossScoreYtd: null,
    bestRound: null,
    worstRound: null,
    bestStablefordRound: null,
    favouriteCourse: null,
    courseStats: [],
    lowestGrossScore: null,
    highestStablefordPoints: null,
    recentRounds: [],
    gameTypeBreakdown: {},
    parOrBetterPercentage: 0,
    birdieOrBetterPercentage: 0,
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
    par3Stats: emptyParTypeStats,
    par4Stats: emptyParTypeStats,
    par5Stats: emptyParTypeStats,
    shortGame: {
      scramblingPercentage: null,
      scrambleAttempts: 0,
      scramblesMade: 0,
      bogeyAvoidanceRate: 0,
      doubleBogeyOrWorseRate: 0,
    },
    puttingDepth: {
      onePuttPercentage: null,
      threePuttPercentage: null,
      puttsPerGIR: null,
    },
    fairwayMissDirection: {
      leftCount: 0, rightCount: 0, totalMisses: 0,
      leftPercentage: null, rightPercentage: null,
    },
    greenMissDirection: {
      leftCount: 0, rightCount: 0, longCount: 0, shortCount: 0, totalMisses: 0,
      leftPercentage: null, rightPercentage: null, longPercentage: null, shortPercentage: null,
    },
    bunkerStats: {
      totalBunkerShots: 0, holesWithBunkers: 0, totalHolesTracked: 0,
      averageBunkerShotsPerRound: null, holesWithBunkersPercentage: null,
    },
    hazardStats: {
      waterCount: 0, obCount: 0, lateralCount: 0, lostBallCount: 0,
      totalHazards: 0, averageHazardsPerRound: null, holesWithHazards: 0, totalHolesTracked: 0,
    },
    roundTrends: [],
  };
}
