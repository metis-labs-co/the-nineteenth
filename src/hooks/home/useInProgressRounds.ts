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
import { isSingleBallScore } from '@/types/database/base';
import type { ScorecardStatus } from '@/types/database/enums';
import type {
  Hole,
  HoleScore,
  MultiBallHoleScore,
  TeeBox,
} from '@/types/database/base';
import type { HandicapSource } from '@/types/database/enums';
import {
  calculatePlayerStats,
  type ScorecardPlayerInfo,
} from '@/utils/scorecardCalculations';
import {
  fetchAcceptedCompetitionIds,
  applyUserRoundScope,
} from './roundScope';
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
      const competitionIds = await fetchAcceptedCompetitionIds(
        user.id,
        'useInProgressRounds'
      );

      // Step 2: fetch in-progress rounds, scoped to standalone rounds the user
      // owns OR competition rounds in accepted comps.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
      const baseQuery = (supabase.from('rounds') as any)
        .select(ROUND_SELECT)
        .eq('status', 'in-progress')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      const query = applyUserRoundScope(baseQuery, user.id, competitionIds);

      const { data, error } = await query;

      if (error) {
        console.error('[useInProgressRounds] Error fetching rounds:', error);
        throw error;
      }

      const rounds = (data ?? []) as RoundWithCourse[];
      const roundIds = rounds.map((r) => r.id);
      if (roundIds.length === 0) return rounds;

      // Competition rounds the signed-in user has personally finished — their
      // own scorecard is terminal (completed/confirmed). Populated from the
      // scorecard fetch below and used to drop these rounds from the carousel.
      const userTerminalRoundIds = new Set<string>();

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
            .select('round_id, player:players!player_id(id, name, photo_url)')
            .in('round_id', standaloneIds);

          if (rpError && rpError.code !== 'PGRST205') {
            console.error('[useInProgressRounds] round_players error:', rpError);
          } else if (rpData) {
            const playersByRound = new Map<
              string,
              { id: string; name: string; photo_url?: string | null }[]
            >();
            for (const row of rpData as Array<{
              round_id: string;
              player: {
                id: string;
                name: string;
                photo_url?: string | null;
              } | null;
            }>) {
              // The card shows companions ("with 2") — leave the signed-in
              // user out of the avatar stack.
              if (!row.player || row.player.id === user.id) continue;
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

      // Live progress for the carousel card ("Hole 7 · +2 · 21 pts"): the
      // user's scorecard per round, with the player profile joined so the
      // daily handicap can be recomputed — in-progress scorecards don't have
      // the stored handicap snapshot yet (that's only written on completion).
      try {
        const { data: scData, error: scError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed-row workaround
          .from('scorecards') as any)
          .select(
            'round_id, status, scores, daily_handicap_used, ga_handicap_used, total_points, player:players!player_id(id, name, handicap, handicap_index, gender)'
          )
          .eq('player_id', user.id)
          .in('round_id', roundIds);

        if (scError) {
          console.error('[useInProgressRounds] scorecards error:', scError);
        } else if (scData) {
          const scorecardByRound = new Map<string, ProgressScorecardRow>();
          for (const sc of scData as ProgressScorecardRow[]) {
            scorecardByRound.set(sc.round_id, sc);
            if (isTerminalScorecardStatus(sc.status)) {
              userTerminalRoundIds.add(sc.round_id);
            }
          }
          for (const round of rounds) {
            const sc = scorecardByRound.get(round.id);
            round.user_progress = sc ? computeUserProgress(round, sc) : null;
          }
        }
      } catch {
        // Progress is decorative — the card falls back to course/format info.
        // (If this fetch fails, no rounds are filtered out below, so the
        // carousel degrades to the previous status-only behaviour.)
      }

      // Drop competition rounds this user has personally finished. Competition
      // rounds stay `in-progress` until EVERY player submits, so without this
      // an organiser who has already scored and submitted their own group keeps
      // getting nagged on Home to "continue scoring" a round they're done with.
      // Standalone rounds are left untouched — the owner drives the whole group
      // from one device, so their own card being terminal doesn't mean the
      // round is finished.
      return rounds.filter(
        (round) => shouldShowInProgressRound(round, userTerminalRoundIds)
      );
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/** Scorecard statuses that mean the user has nothing left to score. */
const TERMINAL_SCORECARD_STATUSES: ReadonlySet<ScorecardStatus> = new Set([
  'completed',
  'confirmed',
]);

/** True when the user's scorecard is submitted (completed or confirmed). */
export function isTerminalScorecardStatus(
  status: ScorecardStatus | null | undefined
): boolean {
  return status != null && TERMINAL_SCORECARD_STATUSES.has(status);
}

/**
 * Whether an in-progress round should still appear in the Home "Continue
 * scoring" carousel. It should, UNLESS it is a competition round the
 * signed-in user has personally finished (their own scorecard is terminal):
 * competition rounds stay `in-progress` until every player submits, but this
 * user has nothing left to score. Standalone rounds always stay visible while
 * in-progress — the owner scores the whole group, so their own card being
 * terminal does not mean the round is done.
 */
export function shouldShowInProgressRound(
  round: { id: string; competition_id?: string | null },
  userTerminalRoundIds: ReadonlySet<string>
): boolean {
  if (round.competition_id && userTerminalRoundIds.has(round.id)) {
    return false;
  }
  return true;
}

/** Slice of the scorecards row needed to compute live round progress. */
interface ProgressScorecardRow {
  round_id: string;
  status: ScorecardStatus | null;
  scores: Record<string, HoleScore | MultiBallHoleScore> | null;
  daily_handicap_used: number | null;
  ga_handicap_used: number | null;
  total_points: number | null;
  player: ScorecardPlayerInfo | null;
}

/**
 * Derive the user's live progress for an in-progress round from their
 * scorecard: the hole to resume on, gross-to-par over scored holes, and
 * (for stableford rounds) points so far. Stableford points reuse
 * calculatePlayerStats so the carousel never disagrees with the scorecard
 * view. Returns null when no holes have been scored yet.
 */
function computeUserProgress(
  round: RoundWithCourse,
  scorecard: ProgressScorecardRow
): RoundWithCourse['user_progress'] {
  const scores = scorecard.scores;
  if (!scores || typeof scores !== 'object') return null;

  const holes = Array.isArray(round.course?.holes)
    ? (round.course!.holes as Hole[])
    : [];
  const holesByNumber = new Map<number, Hole>(
    holes.map((h) => [h.number, h])
  );

  let holesScored = 0;
  let maxScoredHole = 0;
  let gross = 0;
  let scoredPar = 0;
  // Multi-ball (team) scores have no single-player gross, and holes missing
  // from the course data leave the par sum incomplete — suppress to-par and
  // points in both cases rather than show a wrong number.
  let computable = true;

  for (const [key, score] of Object.entries(scores)) {
    if (!score || typeof score !== 'object') continue;
    const holeNumber = Number(key);
    if (isSingleBallScore(score)) {
      if (!score.strokes || score.strokes <= 0) continue;
      holesScored++;
      maxScoredHole = Math.max(maxScoredHole, holeNumber);
      const hole = holesByNumber.get(holeNumber);
      if (hole) {
        gross += score.strokes;
        scoredPar += hole.par;
      } else {
        computable = false;
      }
    } else {
      const balls = (score as MultiBallHoleScore).balls;
      if (
        Array.isArray(balls) &&
        balls.some((b) => b.strokes != null && b.strokes > 0)
      ) {
        holesScored++;
        maxScoredHole = Math.max(maxScoredHole, holeNumber);
        computable = false;
      }
    }
  }

  if (holesScored === 0) return null;

  const lastHole =
    holes.length > 0 ? Math.max(...holes.map((h) => h.number)) : 18;
  const currentHole = Math.min(maxScoredHole + 1, lastHole);
  const toPar = computable && scoredPar > 0 ? gross - scoredPar : null;

  let points: number | null = null;
  if (round.game_type === 'stableford' && computable && holes.length > 0) {
    const [stats] = calculatePlayerStats(
      [
        {
          id: scorecard.player?.id ?? round.id,
          playerId: scorecard.player?.id ?? round.id,
          player: scorecard.player,
          scores,
          hasScorecard: true,
          storedGaHandicap: scorecard.ga_handicap_used,
          storedDailyHandicap: scorecard.daily_handicap_used,
          storedTotalPoints: scorecard.total_points,
        },
      ],
      holes,
      (round.selected_tee as TeeBox | null) ?? null,
      (round.handicap_source as HandicapSource | null) ?? 'profile'
    );
    points = stats?.totalStableford ?? null;
  }

  return { holesScored, currentHole, toPar, points };
}
