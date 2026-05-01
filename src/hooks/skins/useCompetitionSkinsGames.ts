/**
 * Skins Hooks - useCompetitionSkinsGames
 *
 * Aggregates every skins game across the rounds of a competition (round-
 * level + per-sub-match) and resolves a one-line "X wins $Y" headline for
 * each, plus enough metadata for the competition-level Skins tab to render
 * cards and tap-through to the right destination (round skins tab or sub-
 * match detail screen).
 *
 * Designed for the Skins tab on `CompetitionDetailScreen`. We deliberately
 * issue one batched query per concern (rounds → games → players → teams →
 * payouts) rather than N round-keyed queries so the cost scales with
 * competition size, not round count.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type { SkinsGame, SkinsGameStatus } from '@/types/database/skins.types';

export interface CompetitionSkinsCard {
  /** Skins game id. */
  gameId: string;
  /** Round the game belongs to. */
  roundId: string;
  /** Round number for display (e.g. "Round 2"). */
  roundNumber: number | null;
  /** Round name when set (e.g. "Day 2"); used as a subtitle. */
  roundName: string | null;
  /** Sub-match id when scoped to a sub-match; null for round-level games. */
  subMatchId: string | null;
  /** 1-based display position of the sub-match within the round. */
  subMatchOrder: number | null;
  /** Game status — drives the "Active" / "Completed" pill. */
  status: SkinsGameStatus;
  /** Whether this is a team skins game. */
  isTeamSkins: boolean;
  /** Pot type (per-hole vs total pot) — drives the headline subtitle. */
  potType: SkinsGame['pot_type'];
  /** Pot value (per hole when potType === 'per_hole', else total). */
  potValue: number;
  /** Currency symbol metadata. */
  currency: string;
  /** Display name for the leading participant (player or team). null when
   *  no payout has been computed yet (game still in progress). */
  topName: string | null;
  /** Net winnings for the leading participant. null when no payouts yet. */
  topNetResult: number | null;
  /** Number of remaining participants for the "+N other" line on the card. */
  otherParticipantCount: number;
}

interface RoundRow {
  id: string;
  round_number: number | null;
  name: string | null;
  competition_id: string | null;
}

interface SkinsGameRow extends SkinsGame {
  round_id: string;
}

interface SubMatchRow {
  id: string;
  sort_order: number;
}

interface SkinsPayoutRow {
  skins_game_id: string;
  player_id: string | null;
  team_id: string | null;
  is_team_payout: boolean;
  net_result: number;
  total_winnings: number;
  holes_won: number;
}

interface PlayerRow {
  id: string;
  name: string;
}

interface TeamRow {
  id: string;
  name: string;
}

/**
 * Pick the "headline" payout for a card — the participant with the highest
 * `net_result`. Falls back to `total_winnings` to break ties.
 */
function pickTopPayout(payouts: SkinsPayoutRow[]): SkinsPayoutRow | null {
  if (payouts.length === 0) return null;
  return [...payouts].sort((a, b) => {
    if (b.net_result !== a.net_result) return b.net_result - a.net_result;
    return b.total_winnings - a.total_winnings;
  })[0];
}

export function useCompetitionSkinsGames(competitionId: string | undefined) {
  return useQuery({
    queryKey: [...skinsKeys.all, 'competition', competitionId ?? ''] as const,
    queryFn: async (): Promise<CompetitionSkinsCard[]> => {
      if (!competitionId) return [];

      // 1. Rounds in the competition.
      const { data: rawRounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id, round_number, name, competition_id')
        .eq('competition_id', competitionId)
        .order('round_number', { ascending: true });

      if (roundsError) {
        throw new Error(`Failed to fetch competition rounds: ${roundsError.message}`);
      }
      const rounds = (rawRounds ?? []) as unknown as RoundRow[];
      if (rounds.length === 0) return [];
      const roundIds = rounds.map((r) => r.id);

      // 2. Skins games for all rounds (round-level + per sub-match).
      const { data: rawGames, error: gamesError } = await supabase
        .from('skins_games')
        .select('*')
        .in('round_id', roundIds)
        .order('created_at', { ascending: true });

      if (gamesError) {
        throw new Error(`Failed to fetch skins games: ${gamesError.message}`);
      }
      const games = (rawGames ?? []) as unknown as SkinsGameRow[];
      if (games.length === 0) return [];

      // 3. Resolve sub-match sort order for any sub-match-scoped games.
      const subMatchIds = [...new Set(games.map((g) => g.sub_match_id).filter(Boolean) as string[])];
      let subMatchById = new Map<string, SubMatchRow>();
      if (subMatchIds.length > 0) {
        const { data: rawSubMatches } = await supabase
          .from('sub_matches')
          .select('id, sort_order')
          .in('id', subMatchIds);
        const subMatches = (rawSubMatches ?? []) as unknown as SubMatchRow[];
        subMatchById = new Map(subMatches.map((sm) => [sm.id, sm]));
      }

      // 4. Payouts for the games we found.
      const gameIds = games.map((g) => g.id);
      const { data: rawPayouts } = await supabase
        .from('skins_payouts')
        .select('skins_game_id, player_id, team_id, is_team_payout, net_result, total_winnings, holes_won')
        .in('skins_game_id', gameIds);
      const payouts = (rawPayouts ?? []) as unknown as SkinsPayoutRow[];

      const payoutsByGame = new Map<string, SkinsPayoutRow[]>();
      for (const p of payouts) {
        const list = payoutsByGame.get(p.skins_game_id) ?? [];
        list.push(p);
        payoutsByGame.set(p.skins_game_id, list);
      }

      // 5. Resolve display names for the headline payout (player or team).
      const playerIds = new Set<string>();
      const teamIds = new Set<string>();
      for (const list of payoutsByGame.values()) {
        const top = pickTopPayout(list);
        if (!top) continue;
        if (top.is_team_payout && top.team_id) teamIds.add(top.team_id);
        else if (top.player_id) playerIds.add(top.player_id);
      }

      const playerNameById = new Map<string, string>();
      if (playerIds.size > 0) {
        const { data: rawPlayers } = await supabase
          .from('players')
          .select('id, name')
          .in('id', Array.from(playerIds));
        for (const row of (rawPlayers ?? []) as unknown as PlayerRow[]) {
          playerNameById.set(row.id, row.name);
        }
      }

      const teamNameById = new Map<string, string>();
      if (teamIds.size > 0) {
        const { data: rawTeams } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', Array.from(teamIds));
        for (const row of (rawTeams ?? []) as unknown as TeamRow[]) {
          teamNameById.set(row.id, row.name);
        }
      }

      const roundById = new Map(rounds.map((r) => [r.id, r]));

      return games.map<CompetitionSkinsCard>((g) => {
        const round = roundById.get(g.round_id);
        const subMatch = g.sub_match_id ? subMatchById.get(g.sub_match_id) : null;
        const gamePayouts = payoutsByGame.get(g.id) ?? [];
        const top = pickTopPayout(gamePayouts);

        let topName: string | null = null;
        if (top) {
          if (top.is_team_payout && top.team_id) {
            topName = teamNameById.get(top.team_id) ?? null;
          } else if (top.player_id) {
            topName = playerNameById.get(top.player_id) ?? null;
          }
        }

        return {
          gameId: g.id,
          roundId: g.round_id,
          roundNumber: round?.round_number ?? null,
          roundName: round?.name ?? null,
          subMatchId: g.sub_match_id ?? null,
          subMatchOrder: subMatch ? subMatch.sort_order + 1 : null,
          status: g.status,
          isTeamSkins: g.is_team_skins,
          potType: g.pot_type,
          potValue: Number(g.pot_value),
          currency: g.currency,
          topName,
          topNetResult: top ? Number(top.net_result) : null,
          otherParticipantCount: Math.max(0, gamePayouts.length - 1),
        };
      });
    },
    enabled: !!competitionId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: false,
  });
}
