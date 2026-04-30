/**
 * useInProgressRounds - returns the user's in-progress rounds in the
 * RoundWithCourse shape required by the shared InProgressRoundSection
 * carousel (the same one used on the competition Details tab).
 *
 * Scope:
 *   - Standalone rounds (no competition) where the user is the round owner.
 *   - Competition rounds where the user is an accepted player.
 *
 * Each round is returned with its competition name (when applicable) so the
 * carousel card can label which competition the round belongs to.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useAuth } from '@/hooks/useAuth';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

const ROUND_SELECT = `
  *,
  course:courses!course_id(
    *,
    clubs(name, city, state)
  ),
  competition:competitions(id, name)
`;

export function useInProgressRounds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['home', 'inProgressRounds', user?.id],
    queryFn: async (): Promise<RoundWithCourse[]> => {
      if (!user?.id) return [];

      // Step 1: find all competition IDs the user is an accepted player in.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
      const { data: cpData, error: cpError } = await (supabase
        .from('competition_players') as any)
        .select('competition_id')
        .eq('player_id', user.id)
        .eq('status', 'accepted');

      if (cpError) {
        console.error(
          '[useInProgressRounds] Error fetching competition players:',
          cpError
        );
      }

      const competitionIds = ((cpData ?? []) as { competition_id: string }[])
        .map((cp) => cp.competition_id)
        .filter(Boolean);

      // Step 2: fetch in-progress rounds.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
      let query = (supabase.from('rounds') as any)
        .select(ROUND_SELECT)
        .eq('status', 'in-progress')
        .order('updated_at', { ascending: false });

      if (competitionIds.length > 0) {
        // user_id = me (standalone owned by user) OR competition rounds in
        // accepted comps. The empty-comp-list path skips the OR branch.
        query = query.or(
          `user_id.eq.${user.id},competition_id.in.(${competitionIds.join(',')})`
        );
      } else {
        query = query.eq('user_id', user.id).is('competition_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useInProgressRounds] Error fetching rounds:', error);
        throw error;
      }

      const rounds = (data ?? []) as RoundWithCourse[];
      const roundIds = rounds.map((r) => r.id);
      if (roundIds.length === 0) return rounds;

      // Standalone-round players for the home carousel. Competition rounds
      // already show their roster on the comp detail screen, so we only
      // populate `players` for standalone rounds (competition_id === null).
      const standaloneIds = rounds
        .filter((r) => !r.competition_id)
        .map((r) => r.id);
      if (standaloneIds.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
          const { data: rpData, error: rpError } = await (supabase
            .from('round_players') as any)
            .select('round_id, player:players!player_id(id, name)')
            .in('round_id', standaloneIds);

          if (rpError && rpError.code !== 'PGRST205') {
            console.error('[useInProgressRounds] round_players error:', rpError);
          } else if (rpData) {
            const playersByRound = new Map<string, { id: string; name: string }[]>();
            for (const row of rpData as Array<{
              round_id: string;
              player: { id: string; name: string } | null;
            }>) {
              if (!row.player) continue;
              if (!playersByRound.has(row.round_id)) {
                playersByRound.set(row.round_id, []);
              }
              playersByRound.get(row.round_id)!.push(row.player);
            }
            for (const round of rounds) {
              if (!round.competition_id && playersByRound.has(round.id)) {
                round.players = playersByRound.get(round.id);
              }
            }
          }
        } catch {
          // round_players table may not exist on older deployments
        }
      }

      // Skins games: mark `has_skins` for rounds with active/completed games.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
        const { data: skinsData, error: skinsError } = await (supabase
          .from('skins_games') as any)
          .select('round_id')
          .in('round_id', roundIds)
          .in('status', ['active', 'completed']);

        if (skinsError && skinsError.code !== 'PGRST205') {
          console.error('[useInProgressRounds] skins_games error:', skinsError);
        } else if (skinsData) {
          const set = new Set(
            (skinsData as { round_id: string }[]).map((r) => r.round_id)
          );
          for (const round of rounds) {
            round.has_skins = set.has(round.id);
          }
        }
      } catch {
        // skins_games table may not exist on older deployments
      }

      // Wolf games: mark `has_wolf` for rounds with active/completed games.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
        const { data: wolfData, error: wolfError } = await (supabase
          .from('wolf_games') as any)
          .select('round_id')
          .in('round_id', roundIds)
          .in('status', ['active', 'completed']);

        if (wolfError && wolfError.code !== 'PGRST205') {
          console.error('[useInProgressRounds] wolf_games error:', wolfError);
        } else if (wolfData) {
          const set = new Set(
            (wolfData as { round_id: string }[]).map((r) => r.round_id)
          );
          for (const round of rounds) {
            round.has_wolf = set.has(round.id);
          }
        }
      } catch {
        // wolf_games table may not exist on older deployments
      }

      return rounds;
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
