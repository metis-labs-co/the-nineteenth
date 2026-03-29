/**
 * useRoundList - Fetches and manages standalone rounds data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { RoundItem, RoundListData, RoundPlayerInfo, UseRoundListReturn } from '../types';
import type { UserScoreData } from '@/components/rounds/RoundListCard/types';
import type { WinnerInfo } from '@/components/common';
import type { HoleScore, MultiBallHoleScore } from '@/types/database/base';
import { isSingleBallScore } from '@/types/database/base';

export function useRoundList(): UseRoundListReturn {
  const { user } = useAuth();
  const { limits } = useSubscriptionContext();

  // Get tier limit for rounds played
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // Fetch count of completed standalone rounds for the user (for limit tracking)
  // Only counts standalone/social rounds, NOT competition rounds
  const { data: roundsPlayedCount = 0 } = useQuery<number>({
    queryKey: ['standaloneRoundsPlayedCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Count completed/confirmed scorecards for standalone rounds only
      // Join with rounds table to filter where competition_id IS NULL
      const { count, error } = await supabase
        .from('scorecards')
        .select('round_id, rounds!inner(competition_id)', { count: 'exact', head: true })
        .eq('player_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .is('rounds.competition_id', null);

      if (error) {
        console.error('Error fetching standalone rounds played count:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user?.id && !hasUnlimitedRounds,
  });

  // Fetch standalone/practice rounds for the user (both active and historical)
  // Competition rounds are accessed via the Competitions screen
  const {
    data: rounds,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<RoundListData>({
    queryKey: ['rounds', user?.id],
    queryFn: async () => {
      if (!user?.id) return { active: [], history: [] };

      const allRounds: RoundItem[] = [];

      // Define types for query results
      interface StandaloneRoundRow {
        id: string;
        round_number: number;
        game_type: string;
        is_team_round: boolean;
        status: string;
        date: string | null;
        tee_time: string | null;
        nine_type: string | null;
        handicap_source: string | null;
        selected_tee: { name: string; color?: string } | null;
        courses: {
          id: string;
          name: string;
          holes: unknown[] | null;
          club: {
            name: string;
            city: string | null;
            state: string | null;
          } | null;
        } | null;
      }

      // 1. Fetch standalone rounds (user's own rounds without competition)
      const { data: standaloneRounds, error: standaloneError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
        .from('rounds') as any)
        .select(`
          id,
          round_number,
          game_type,
          is_team_round,
          status,
          date,
          tee_time,
          nine_type,
          handicap_source,
          selected_tee,
          courses!course_id(
            id,
            name,
            holes,
            club:clubs(
              name,
              city,
              state
            )
          )
        `)
        .eq('user_id', user.id)
        .is('competition_id', null)
        .order('date', { ascending: false });

      // Collect standalone round IDs to fetch their players
      const standaloneRoundIds: string[] = [];

      if (standaloneError) {
        console.error('Error fetching standalone rounds:', standaloneError);
      } else {
        for (const round of (standaloneRounds || []) as StandaloneRoundRow[]) {
          standaloneRoundIds.push(round.id);
          allRounds.push({
            id: round.id,
            roundNumber: round.round_number,
            totalRounds: 1, // Standalone rounds don't have multiple rounds
            gameType: round.game_type,
            isTeamRound: round.is_team_round ?? false,
            status: round.status,
            date: round.date,
            teeTime: round.tee_time,
            isStandalone: true,
            competition: undefined,
            course: {
              id: round.courses?.id || '',
              name: round.courses?.name || 'Unknown Course',
              venueName: round.courses?.club?.name,
              city: round.courses?.club?.city ?? undefined,
              state: round.courses?.club?.state ?? undefined,
            },
            holesCompleted: 0,
            totalHoles: Array.isArray(round.courses?.holes) ? round.courses.holes.length : 18,
            players: [], // Will be populated below
            handicapSource: round.handicap_source,
            selectedTeeName: round.selected_tee?.name ?? null,
            nineType: round.nine_type ?? null,
          });
        }
      }

      // 2. Fetch standalone rounds where user is a participant (invited by friends)
      // This shows rounds synced from friends
      // Note: round_players table may not exist if migration hasn't been applied
      try {
        interface ParticipantRoundRow {
          round: StandaloneRoundRow & { user_id: string };
        }

        const { data: participantRounds, error: participantError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          .from('round_players') as any)
          .select(`
            round:rounds!inner(
              id,
              user_id,
              round_number,
              game_type,
              is_team_round,
              status,
              date,
              tee_time,
              nine_type,
              handicap_source,
              selected_tee,
              courses!course_id(
                id,
                name,
                holes,
                club:clubs(
                  name,
                  city,
                  state
                )
              )
            )
          `)
          .eq('player_id', user.id)
          .is('round.competition_id', null)
          .neq('round.user_id', user.id); // Exclude rounds user owns (already fetched above)

        if (participantError) {
          // Table might not exist yet - this is not a critical error
          if (participantError.code !== 'PGRST205') {
            console.error('Error fetching participant rounds:', participantError);
          }
        } else {
          for (const rp of (participantRounds || []) as ParticipantRoundRow[]) {
            const round = rp.round;
            if (!round) continue;

            // Check if this round is already in the list (shouldn't happen, but just in case)
            if (allRounds.some(r => r.id === round.id)) continue;

            allRounds.push({
              id: round.id,
              roundNumber: round.round_number,
              totalRounds: 1,
              gameType: round.game_type,
              isTeamRound: round.is_team_round ?? false,
              status: round.status,
              date: round.date,
              teeTime: round.tee_time,
              isStandalone: true,
              competition: undefined,
              course: {
                id: round.courses?.id || '',
                name: round.courses?.name || 'Unknown Course',
                venueName: round.courses?.club?.name,
                city: round.courses?.club?.city ?? undefined,
                state: round.courses?.club?.state ?? undefined,
              },
              holesCompleted: 0,
              totalHoles: Array.isArray(round.courses?.holes) ? round.courses.holes.length : 18,
              players: [], // Will be populated below
              handicapSource: round.handicap_source,
              selectedTeeName: round.selected_tee?.name ?? null,
              nineType: round.nine_type ?? null,
            });
          }
        }
      } catch (err) {
        // Silently ignore if round_players table doesn't exist yet
        console.log('round_players query skipped (table may not exist yet)');
      }

      // 3. Fetch players for all standalone rounds
      // Collect all standalone round IDs
      const allStandaloneRoundIds = allRounds
        .filter(r => r.isStandalone)
        .map(r => r.id);

      if (allStandaloneRoundIds.length > 0) {
        try {
          interface RoundPlayerRow {
            round_id: string;
            player: { id: string; name: string } | null;
          }

          const { data: roundPlayersData, error: playersError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('round_players') as any)
            .select(`
              round_id,
              player:players!player_id(
                id,
                name
              )
            `)
            .in('round_id', allStandaloneRoundIds);

          if (playersError) {
            if (playersError.code !== 'PGRST205') {
              console.error('Error fetching round players:', playersError);
            }
          } else if (roundPlayersData) {
            // Group players by round_id
            const playersByRound = new Map<string, RoundPlayerInfo[]>();
            for (const rp of roundPlayersData as RoundPlayerRow[]) {
              if (!rp.player) continue;
              const roundId = rp.round_id;
              if (!playersByRound.has(roundId)) {
                playersByRound.set(roundId, []);
              }
              playersByRound.get(roundId)!.push({
                id: rp.player.id,
                name: rp.player.name,
              });
            }

            // Update allRounds with player info
            for (const round of allRounds) {
              if (round.isStandalone && playersByRound.has(round.id)) {
                round.players = playersByRound.get(round.id);
              }
            }
          }
        } catch (err) {
          console.log('round_players fetch for player info skipped');
        }
      }

      // 4. Fetch progress for in-progress rounds (count scored holes)
      const inProgressRoundIds = allRounds
        .filter(r => r.status === 'in-progress')
        .map(r => r.id);

      if (inProgressRoundIds.length > 0) {
        try {
          interface ProgressScorecardRow {
            round_id: string;
            scores: Record<string, unknown> | null;
          }

          const { data: progressData, error: progressError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select('round_id, scores')
            .eq('player_id', user.id)
            .in('round_id', inProgressRoundIds);

          if (progressError) {
            console.error('Error fetching in-progress scorecards:', progressError);
          } else if (progressData) {
            // Map holes completed per round
            const progressByRound = new Map<string, number>();
            for (const sc of progressData as ProgressScorecardRow[]) {
              if (!sc.scores || typeof sc.scores !== 'object') continue;
              // Count holes with valid scores
              const holesScored = Object.values(sc.scores).filter(score => {
                if (!score || typeof score !== 'object') return false;
                const s = score as HoleScore | MultiBallHoleScore;
                if (isSingleBallScore(s)) {
                  return s.strokes != null && s.strokes > 0;
                }
                // MultiBallHoleScore - check if any ball has strokes
                const balls = (s as MultiBallHoleScore).balls;
                return Array.isArray(balls) && balls.some(b => b.strokes != null && b.strokes > 0);
              }).length;
              // Use the max holes scored across scorecards for this round
              const existing = progressByRound.get(sc.round_id) ?? 0;
              if (holesScored > existing) {
                progressByRound.set(sc.round_id, holesScored);
              }
            }

            // Update rounds with progress data
            for (const round of allRounds) {
              if (round.status === 'in-progress' && progressByRound.has(round.id)) {
                round.holesCompleted = progressByRound.get(round.id)!;
              }
            }
          }
        } catch (err) {
          console.log('in-progress scorecard progress fetch skipped');
        }
      }

      // 5. Fetch user's scorecards for completed rounds
      const completedRoundIds = allRounds
        .filter(r => r.status === 'completed')
        .map(r => r.id);

      if (completedRoundIds.length > 0) {
        try {
          interface ScorecardRow {
            round_id: string;
            total_gross: number | null;
            total_net: number | null;
            total_points: number | null;
            status: string;
          }

          const { data: scorecardsData, error: scorecardsError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select(`
              round_id,
              total_gross,
              total_net,
              total_points,
              status
            `)
            .eq('player_id', user.id)
            .in('round_id', completedRoundIds);

          if (scorecardsError) {
            console.error('Error fetching scorecards:', scorecardsError);
          } else if (scorecardsData) {
            // Map scorecards by round_id
            const scorecardsByRound = new Map<string, UserScoreData>();
            for (const sc of scorecardsData as ScorecardRow[]) {
              const isCompleted = sc.status === 'completed' || sc.status === 'confirmed';
              scorecardsByRound.set(sc.round_id, {
                totalGross: sc.total_gross,
                totalNet: sc.total_net,
                totalPoints: sc.total_points,
                hasScorecard: isCompleted,
                matchResult: null, // TODO: Add match play result fetching if needed
              });
            }

            // Attach userScore to completed rounds
            for (const round of allRounds) {
              if (round.status === 'completed') {
                const scorecard = scorecardsByRound.get(round.id);
                if (scorecard) {
                  round.userScore = scorecard;
                } else {
                  // No scorecard found for this round
                  round.userScore = { hasScorecard: false };
                }
              }
            }
          }
        } catch (err) {
          console.log('scorecards fetch for completed rounds skipped');
        }
      }

      // 6. Fetch skins games for all rounds to set hasSkins flag
      const allRoundIds = allRounds.map(r => r.id);
      if (allRoundIds.length > 0) {
        try {
          interface SkinsGameRow {
            round_id: string;
          }

          const { data: skinsGamesData, error: skinsGamesError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('skins_games') as any)
            .select('round_id')
            .in('round_id', allRoundIds)
            .in('status', ['active', 'completed']);

          if (skinsGamesError) {
            if (skinsGamesError.code !== 'PGRST205') {
              console.error('Error fetching skins games:', skinsGamesError);
            }
          } else if (skinsGamesData) {
            // Create a set of round IDs that have skins games
            const roundsWithSkins = new Set(
              (skinsGamesData as SkinsGameRow[]).map(sg => sg.round_id)
            );

            // Update hasSkins flag on rounds
            for (const round of allRounds) {
              round.hasSkins = roundsWithSkins.has(round.id);
            }
          }
        } catch (err) {
          console.log('skins_games fetch skipped (table may not exist yet)');
        }
      }

      // 7. Fetch wolf games for all rounds to set hasWolf flag
      if (allRoundIds.length > 0) {
        try {
          interface WolfGameRow {
            round_id: string;
          }

          const { data: wolfGamesData, error: wolfGamesError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('wolf_games') as any)
            .select('round_id')
            .in('round_id', allRoundIds)
            .in('status', ['active', 'completed']);

          if (wolfGamesError) {
            if (wolfGamesError.code !== 'PGRST205') {
              console.error('Error fetching wolf games:', wolfGamesError);
            }
          } else if (wolfGamesData) {
            // Create a set of round IDs that have wolf games
            const roundsWithWolf = new Set(
              (wolfGamesData as WolfGameRow[]).map(wg => wg.round_id)
            );

            // Update hasWolf flag on rounds
            for (const round of allRounds) {
              round.hasWolf = roundsWithWolf.has(round.id);
            }
          }
        } catch (err) {
          console.log('wolf_games fetch skipped (table may not exist yet)');
        }
      }

      // 8. Fetch winner for completed rounds
      // Get all scorecards for completed rounds to determine winner
      if (completedRoundIds.length > 0) {
        try {
          interface WinnerScorecardRow {
            round_id: string;
            player_id: string;
            total_gross: number | null;
            total_net: number | null;
            total_points: number | null;
            player: { id: string; name: string } | null;
          }

          const { data: allScorecardsData, error: allScorecardsError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select(`
              round_id,
              player_id,
              total_gross,
              total_net,
              total_points,
              player:players!player_id(
                id,
                name
              )
            `)
            .in('round_id', completedRoundIds)
            .in('status', ['completed', 'confirmed']);

          if (allScorecardsError) {
            console.error('Error fetching all scorecards for winners:', allScorecardsError);
          } else if (allScorecardsData) {
            // Group scorecards by round_id
            const scorecardsByRound = new Map<string, WinnerScorecardRow[]>();
            for (const sc of allScorecardsData as WinnerScorecardRow[]) {
              if (!scorecardsByRound.has(sc.round_id)) {
                scorecardsByRound.set(sc.round_id, []);
              }
              scorecardsByRound.get(sc.round_id)!.push(sc);
            }

            // Determine winner for each completed round
            for (const round of allRounds) {
              if (round.status !== 'completed') continue;

              const scorecards = scorecardsByRound.get(round.id);
              if (!scorecards || scorecards.length <= 1) continue;

              const winner = determineWinner(scorecards, round.gameType);
              if (winner) {
                round.winner = winner;
              }
            }
          }
        } catch (err) {
          console.log('winner calculation for completed rounds skipped');
        }
      }

      // Separate into active and historical
      const active = allRounds
        .filter(r => r.status !== 'completed')
        .sort((a, b) => {
          // In-progress first
          if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
          if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
          // Then by date (most recent first)
          if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return 0;
        });

      const history = allRounds
        .filter(r => r.status === 'completed')
        .sort((a, b) => {
          // Most recent first
          if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return 0;
        });

      return { active, history };
    },
    enabled: !!user?.id,
  });

  return {
    rounds,
    isLoading,
    isRefetching,
    refetch,
    roundsPlayedCount,
  };
}

/**
 * Determine the winner from a list of scorecards based on game type
 */
interface ScorecardForWinner {
  player_id: string;
  total_gross: number | null;
  total_net: number | null;
  total_points: number | null;
  player: { id: string; name: string } | null;
}

function determineWinner(
  scorecards: ScorecardForWinner[],
  gameType: string
): WinnerInfo | null {
  if (scorecards.length === 0) return null;

  // Filter out scorecards without player info
  const validScorecards = scorecards.filter(sc => sc.player);
  if (validScorecards.length === 0) return null;

  let winner: ScorecardForWinner | null = null;
  let winningScore = 0;

  switch (gameType) {
    case 'stableford':
    case 'fourball_bestball':
      // Highest points wins
      for (const sc of validScorecards) {
        const points = sc.total_points ?? 0;
        if (!winner || points > winningScore) {
          winner = sc;
          winningScore = points;
        }
      }
      break;

    case 'stroke':
    case 'scramble':
      // Lowest net score wins (use gross if net not available)
      for (const sc of validScorecards) {
        const score = sc.total_net ?? sc.total_gross ?? 999;
        if (!winner || score < winningScore) {
          winner = sc;
          winningScore = score;
        }
      }
      break;

    case 'match_play':
      // Match play doesn't have a traditional "winner" with points
      // Skip for now - match play results would be handled differently
      return null;

    default:
      // Default to stableford-style (highest points)
      for (const sc of validScorecards) {
        const points = sc.total_points ?? 0;
        if (!winner || points > winningScore) {
          winner = sc;
          winningScore = points;
        }
      }
  }

  if (!winner || !winner.player) return null;

  return {
    name: winner.player.name,
    points: winningScore,
    isTeam: false,
  };
}
