/**
 * usePlayerStatistics - Hook for fetching comprehensive player statistics
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

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { statisticsKeys } from './queryKeys';
import type { Hole, HoleScore } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface ScoreDistribution {
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeys: number;
  triplePlus: number;
}

export interface CourseStats {
  courseId: string;
  courseName: string;
  timesPlayed: number;
  averageScore: number;
  bestScore: number;
}

export interface RoundSummary {
  roundId: string;
  competitionId: string | null;
  competitionName: string;
  courseName: string;
  date: string;
  totalGross: number;
  totalPoints: number;
  holesPlayed: number;
  isPracticeRound: boolean;
}

export interface PlayerStatistics {
  // Overview Stats
  roundsPlayed: number;
  practiceRoundsPlayed: number;
  competitionRoundsPlayed: number;
  competitionsEntered: number;
  competitionsWon: number;
  holesPlayed: number;

  // Score Distribution
  scoreDistribution: ScoreDistribution;
  totalScoreDistribution: number;

  // Averages
  averageGrossScore: number;
  averageStablefordPoints: number;
  averageScorePerHole: number;

  // Best/Worst Performance
  bestRound: RoundSummary | null;
  worstRound: RoundSummary | null;
  bestStablefordRound: RoundSummary | null;

  // Course Stats
  favouriteCourse: CourseStats | null;
  courseStats: CourseStats[];

  // Scoring Records
  lowestGrossScore: number | null;
  highestStablefordPoints: number | null;

  // Recent Activity
  recentRounds: RoundSummary[];

  // Scoring Percentages
  parOrBetterPercentage: number;
  birdieOrBetterPercentage: number;

  // Putting Stats (only populated if user has recorded putts)
  totalPutts: number | null;
  averagePuttsPerRound: number | null;
  averagePuttsPerHole: number | null;
  holesWithPuttsRecorded: number;

  // Fairway Stats (only populated if user has recorded FIR)
  fairwaysHit: number | null;
  fairwayOpportunities: number; // Par 4s and Par 5s where FIR was recorded
  fairwayPercentage: number | null;

  // Green in Regulation Stats (only populated if user has recorded GIR)
  greensInRegulation: number | null;
  girOpportunities: number; // Holes where GIR was recorded
  girPercentage: number | null;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate score relative to par and categorize
 */
function getScoreCategory(strokes: number, par: number): keyof ScoreDistribution {
  const diff = strokes - par;
  if (diff <= -2) return 'eagles';
  if (diff === -1) return 'birdies';
  if (diff === 0) return 'pars';
  if (diff === 1) return 'bogeys';
  if (diff === 2) return 'doubleBogeys';
  return 'triplePlus';
}

/**
 * Parse holes from course data (could be JSONB or string)
 */
function parseHoles(holesData: Hole[] | string | null): Hole[] {
  if (!holesData) return [];
  if (typeof holesData === 'string') {
    try {
      return JSON.parse(holesData);
    } catch {
      return [];
    }
  }
  return holesData;
}

/**
 * Count scores in each hole of a scorecard
 */
function countScoreDistribution(
  scores: Record<string, HoleScore>,
  holes: Hole[]
): ScoreDistribution {
  const distribution: ScoreDistribution = {
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeys: 0,
    triplePlus: 0,
  };

  // Create a map of hole numbers to par values
  const parMap = new Map<number, number>();
  holes.forEach((hole) => {
    parMap.set(hole.number, hole.par);
  });

  // Process each score
  Object.entries(scores).forEach(([holeNum, holeScore]) => {
    if (!holeScore?.strokes) return;

    const par = parMap.get(parseInt(holeNum, 10)) || 4; // Default to par 4
    const category = getScoreCategory(holeScore.strokes, par);
    distribution[category]++;
  });

  return distribution;
}

// =====================================================
// MAIN HOOK
// =====================================================

interface UsePlayerStatisticsOptions {
  enabled?: boolean;
}

export function usePlayerStatistics(
  playerId: string | undefined,
  options: UsePlayerStatisticsOptions = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: statisticsKeys.player(playerId ?? ''),
    queryFn: async (): Promise<PlayerStatistics> => {
      if (!playerId) {
        throw new Error('Player ID is required');
      }

      // Fetch all scorecards for the player with round and competition data
      // Uses left join for competitions to include practice/standalone rounds
      const { data: scorecardsData, error: scorecardsError } = await supabase
        .from('scorecards')
        .select(`
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
            status,
            courses!inner (
              id,
              name,
              holes
            ),
            competitions (
              id,
              name,
              status
            )
          )
        `)
        .eq('player_id', playerId)
        .in('status', ['completed', 'confirmed']);

      if (scorecardsError) {
        console.error('Error fetching scorecards:', scorecardsError);
        throw scorecardsError;
      }

      const scorecards = scorecardsData || [];

      // Fetch competitions where player is a participant
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

      const { data: competitionPlayersData, error: cpError } = await supabase
        .from('competition_players')
        .select(`
          competition_id,
          status,
          competitions (
            id,
            name,
            status
          )
        `)
        .eq('player_id', playerId)
        .eq('status', 'accepted');

      if (cpError) {
        console.error('Error fetching competition players:', cpError);
        throw cpError;
      }

      const competitionPlayers = (competitionPlayersData || []) as CompetitionPlayerResult[];

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

      // Putting, FIR, GIR tracking
      let totalPutts = 0;
      let holesWithPuttsRecorded = 0;
      let fairwaysHit = 0;
      let fairwayOpportunities = 0; // Par 4s and 5s where FIR was recorded
      let greensInRegulation = 0;
      let girOpportunities = 0; // Holes where GIR was recorded

      // Track course stats
      const courseStatsMap = new Map<string, {
        courseId: string;
        courseName: string;
        timesPlayed: number;
        totalScore: number;
        bestScore: number;
      }>();

      // Round summaries for best/worst calculations
      const roundSummaries: RoundSummary[] = [];

      // Track practice vs competition rounds
      let practiceRoundsCount = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex Supabase join response type
      scorecards.forEach((scorecard: any) => {
        const round = scorecard.rounds;
        const course = round?.courses;
        const competition = round?.competitions; // Can be null for practice rounds

        // Only require round and course - competition can be null for practice rounds
        if (!round || !course) return;

        const isPracticeRound = !competition;

        const holes = parseHoles(course.holes);
        const scores = scorecard.scores as Record<string, HoleScore>;

        // Count holes played in this scorecard
        const holesInScorecard = Object.values(scores).filter(s => s?.strokes).length;
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
        });

        // Sum up totals
        totalGrossScoreSum += scorecard.total_gross || 0;
        totalPointsSum += scorecard.total_points || 0;

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
          competitionId: competition?.id ?? null,
          competitionName: competition?.name ?? 'Practice Round',
          courseName: course.name,
          date: round.date || scorecard.submitted_at || '',
          totalGross: scorecard.total_gross || 0,
          totalPoints: scorecard.total_points || 0,
          holesPlayed: holesInScorecard,
          isPracticeRound,
        });
      });

      // Convert course stats to array and calculate averages
      const courseStats: CourseStats[] = Array.from(courseStatsMap.values()).map(cs => ({
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
        .filter(cp => cp.competitions?.status === 'completed')
        .map(cp => cp.competition_id);

      if (completedCompetitionIds.length > 0) {
        // FIXED: Batch fetch all scorecards for all completed competitions in ONE query
        // This replaces the N+1 query pattern that was making one query per competition
        const { data: allCompScorecards } = await supabase
          .from('scorecards')
          .select(`
            player_id,
            total_points,
            rounds!inner (
              competition_id
            )
          `)
          .in('rounds.competition_id', completedCompetitionIds)
          .in('status', ['completed', 'confirmed']);

        if (allCompScorecards && allCompScorecards.length > 0) {
          // Group scorecards by competition
          const scoresByCompetition = new Map<string, Map<string, number>>();

          allCompScorecards.forEach((scorecard: { player_id: string; total_points: number | null; rounds: { competition_id: string } }) => {
            const compId = scorecard.rounds.competition_id;
            if (!scoresByCompetition.has(compId)) {
              scoresByCompetition.set(compId, new Map());
            }
            const playerPointsMap = scoresByCompetition.get(compId)!;
            const current = playerPointsMap.get(scorecard.player_id) || 0;
            playerPointsMap.set(scorecard.player_id, current + (scorecard.total_points || 0));
          });

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
      const averageGrossScore = roundsPlayed > 0
        ? Math.round((totalGrossScoreSum / roundsPlayed) * 10) / 10
        : 0;

      const averageStablefordPoints = roundsPlayed > 0
        ? Math.round((totalPointsSum / roundsPlayed) * 10) / 10
        : 0;

      const averageScorePerHole = totalHolesPlayed > 0
        ? Math.round((totalGrossScoreSum / totalHolesPlayed) * 100) / 100
        : 0;

      // Calculate percentages
      const totalScoreDistribution =
        totalDistribution.eagles +
        totalDistribution.birdies +
        totalDistribution.pars +
        totalDistribution.bogeys +
        totalDistribution.doubleBogeys +
        totalDistribution.triplePlus;

      const parOrBetter = totalDistribution.eagles + totalDistribution.birdies + totalDistribution.pars;
      const parOrBetterPercentage = totalScoreDistribution > 0
        ? Math.round((parOrBetter / totalScoreDistribution) * 1000) / 10
        : 0;

      const birdieOrBetter = totalDistribution.eagles + totalDistribution.birdies;
      const birdieOrBetterPercentage = totalScoreDistribution > 0
        ? Math.round((birdieOrBetter / totalScoreDistribution) * 1000) / 10
        : 0;

      // Get recent rounds (last 5)
      const recentRounds = [...roundSummaries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Calculate putting averages
      const averagePuttsPerRound = holesWithPuttsRecorded > 0 && roundsPlayed > 0
        ? Math.round((totalPutts / roundsPlayed) * 10) / 10
        : null;
      const averagePuttsPerHole = holesWithPuttsRecorded > 0
        ? Math.round((totalPutts / holesWithPuttsRecorded) * 100) / 100
        : null;

      // Calculate FIR percentage
      const fairwayPercentage = fairwayOpportunities > 0
        ? Math.round((fairwaysHit / fairwayOpportunities) * 1000) / 10
        : null;

      // Calculate GIR percentage
      const girPercentage = girOpportunities > 0
        ? Math.round((greensInRegulation / girOpportunities) * 1000) / 10
        : null;

      return {
        roundsPlayed,
        practiceRoundsPlayed: practiceRoundsCount,
        competitionRoundsPlayed: roundsPlayed - practiceRoundsCount,
        competitionsEntered,
        competitionsWon,
        holesPlayed: totalHolesPlayed,
        scoreDistribution: totalDistribution,
        totalScoreDistribution,
        averageGrossScore,
        averageStablefordPoints,
        averageScorePerHole,
        bestRound,
        worstRound,
        bestStablefordRound,
        favouriteCourse,
        courseStats,
        lowestGrossScore: bestRound?.totalGross ?? null,
        highestStablefordPoints: bestStablefordRound?.totalPoints ?? null,
        recentRounds,
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
      };
    },
    enabled: enabled && !!playerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

export default usePlayerStatistics;
