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

      // 1. Fetch standalone rounds (user's own rounds without competition)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: standaloneRounds, error: standaloneError } = await (supabase
        .from('rounds') as any)
        .select(`
          id,
          round_number,
          game_type,
          status,
          date,
          tee_time,
          courses!course_id(
            id,
            name,
            venue:venues(
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
        for (const round of (standaloneRounds || []) as any[]) {
          standaloneRoundIds.push(round.id);
          allRounds.push({
            id: round.id,
            roundNumber: round.round_number,
            totalRounds: 1, // Standalone rounds don't have multiple rounds
            gameType: round.game_type,
            status: round.status,
            date: round.date,
            teeTime: round.tee_time,
            isStandalone: true,
            competition: undefined,
            course: {
              id: round.courses?.id || '',
              name: round.courses?.name || 'Unknown Course',
              venueName: round.courses?.venue?.name,
              city: round.courses?.venue?.city,
              state: round.courses?.venue?.state,
            },
            holesCompleted: 0,
            totalHoles: 18,
            players: [], // Will be populated below
          });
        }
      }

      // 2. Fetch standalone rounds where user is a participant (invited by friends)
      // This shows rounds synced from friends
      // Note: round_players table may not exist if migration hasn't been applied
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: participantRounds, error: participantError } = await (supabase
          .from('round_players') as any)
          .select(`
            round:rounds!inner(
              id,
              user_id,
              round_number,
              game_type,
              status,
              date,
              tee_time,
              courses!course_id(
                id,
                name,
                venue:venues(
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
          for (const rp of (participantRounds || []) as any[]) {
            const round = rp.round;
            if (!round) continue;

            // Check if this round is already in the list (shouldn't happen, but just in case)
            if (allRounds.some(r => r.id === round.id)) continue;

            allRounds.push({
              id: round.id,
              roundNumber: round.round_number,
              totalRounds: 1,
              gameType: round.game_type,
              status: round.status,
              date: round.date,
              teeTime: round.tee_time,
              isStandalone: true,
              competition: undefined,
              course: {
                id: round.courses?.id || '',
                name: round.courses?.name || 'Unknown Course',
                venueName: round.courses?.venue?.name,
                city: round.courses?.venue?.city,
                state: round.courses?.venue?.state,
              },
              holesCompleted: 0,
              totalHoles: 18,
              players: [], // Will be populated below
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: roundPlayersData, error: playersError } = await (supabase
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
            for (const rp of roundPlayersData as any[]) {
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

      // 4. Fetch user's scorecards for completed rounds
      const completedRoundIds = allRounds
        .filter(r => r.status === 'completed')
        .map(r => r.id);

      if (completedRoundIds.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: scorecardsData, error: scorecardsError } = await (supabase
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
            for (const sc of scorecardsData as any[]) {
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

      // Separate into active and historical
      const active = allRounds
        .filter(r => r.status !== 'completed')
        .sort((a, b) => {
          // In-progress first
          if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
          if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
          // Then by date
          if (a.date && b.date) {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
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
