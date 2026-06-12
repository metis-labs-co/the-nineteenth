/**
 * Scheduled Round Hooks
 *
 * TanStack Query hooks for upcoming standalone rounds with invitation
 * tracking. Covers:
 *  - Fetching a single scheduled round with course + invited players
 *  - Responding to an invitation (accept / decline)
 *  - Inviting additional partners
 *  - Editing the round date / tee time
 *  - Cancelling the round (owner only; DB trigger notifies invitees)
 *
 * Mutations follow the same error-propagation pattern as friends/mutations.ts:
 * raw Supabase errors are re-thrown so the caller's onError handler receives
 * the full error object.
 *
 * Join syntax: `players!player_id(...)` mirrors the FK-hint pattern already
 * used in useRoundList (`player:players!player_id(...)`) which is the
 * relation name that Supabase's PostgREST resolves correctly on this schema.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { scheduledRoundKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type { RoundInvitationStatus } from '@/types/database/enums';
import type { TeeBox } from '@/types/database/base';

// =====================================================
// TYPES
// =====================================================

/**
 * Minimal player shape returned with each round_players row.
 * Use photo_url (the actual column name in the players table).
 */
export interface ScheduledRoundPlayer {
  player_id: string;
  added_by: string | null;
  invitation_status: RoundInvitationStatus;
  responded_at: string | null;
  selected_tee: TeeBox | null;
  player: {
    id: string;
    name: string;
    handicap: number | null;
    photo_url: string | null;
  } | null;
}

/**
 * Course summary nested in a scheduled round detail.
 */
export interface ScheduledRoundCourse {
  id: string;
  name: string;
  holes: unknown[] | null;
  num_holes: number | null;
  /** Tees from the tees table (may be empty for courses entered before the tees migration). */
  tees: unknown[] | null;
}

/**
 * Full detail shape returned by useScheduledRound.
 * Typed pragmatically: includes every column used by the ScheduledRoundScreen
 * plus the joined course + players.
 */
export interface ScheduledRoundDetail {
  id: string;
  user_id: string | null;
  course_id: string;
  date: string | null;
  tee_time: string | null;
  status: string;
  game_type: string;
  nine_type: string | null;
  selected_tee: TeeBox | null;
  is_team_round: boolean;
  team_format: string | null;
  course: ScheduledRoundCourse | null;
  players: ScheduledRoundPlayer[];
}

// =====================================================
// DATA FETCHING
// =====================================================

async function fetchScheduledRound(roundId: string): Promise<ScheduledRoundDetail> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types don't cover round_players join
  const { data, error } = await (supabase.from('rounds') as any)
    .select(`
      id,
      user_id,
      course_id,
      date,
      tee_time,
      status,
      game_type,
      nine_type,
      selected_tee,
      is_team_round,
      team_format,
      courses!course_id (
        id,
        name,
        holes,
        num_holes,
        tees_from_table:tees ( id, name, color, course_rating, slope_rating )
      ),
      round_players (
        player_id,
        added_by,
        invitation_status,
        responded_at,
        selected_tee,
        players!player_id (
          id,
          name,
          handicap,
          photo_url
        )
      )
    `)
    .eq('id', roundId)
    .is('deleted_at', null)
    .single();

  if (error) {
    throw new Error(`Failed to fetch scheduled round: ${error.message}`);
  }

  const raw = data as Record<string, unknown>;
  const courseRaw = raw.courses as Record<string, unknown> | null;

  let course: ScheduledRoundCourse | null = null;
  if (courseRaw) {
    const { tees_from_table, ...courseRest } = courseRaw;
    course = {
      ...(courseRest as Omit<ScheduledRoundCourse, 'tees'>),
      tees: (tees_from_table as unknown[] | null) ?? null,
    };
  }

  const roundPlayersRaw = (raw.round_players as Record<string, unknown>[] | null) ?? [];
  const players: ScheduledRoundPlayer[] = roundPlayersRaw.map((rp) => ({
    player_id: rp.player_id as string,
    added_by: (rp.added_by as string | null) ?? null,
    invitation_status: (rp.invitation_status as RoundInvitationStatus) ?? 'pending',
    responded_at: (rp.responded_at as string | null) ?? null,
    selected_tee: (rp.selected_tee as TeeBox | null) ?? null,
    player: (rp.players as ScheduledRoundPlayer['player']) ?? null,
  }));

  return {
    id: raw.id as string,
    user_id: (raw.user_id as string | null) ?? null,
    course_id: raw.course_id as string,
    date: (raw.date as string | null) ?? null,
    tee_time: (raw.tee_time as string | null) ?? null,
    status: raw.status as string,
    game_type: raw.game_type as string,
    nine_type: (raw.nine_type as string | null) ?? null,
    selected_tee: (raw.selected_tee as TeeBox | null) ?? null,
    is_team_round: (raw.is_team_round as boolean) ?? false,
    team_format: (raw.team_format as string | null) ?? null,
    course,
    players,
  };
}

// =====================================================
// QUERY HOOK
// =====================================================

/**
 * Fetch a single scheduled (upcoming) round with its course and invited
 * players (including their invitation status).
 *
 * @param roundId - UUID of the round to fetch
 */
export function useScheduledRound(roundId: string) {
  return useQuery({
    queryKey: scheduledRoundKeys.detail(roundId),
    queryFn: () => fetchScheduledRound(roundId),
    enabled: !!roundId,
    staleTime: CACHE_TIMES.MODERATE,
    gcTime: GC_TIMES.STANDARD,
  });
}

// =====================================================
// MUTATION: RESPOND TO INVITATION
// =====================================================

export interface RespondToRoundInvitationInput {
  roundId: string;
  response: 'accepted' | 'declined';
}

/**
 * Accept or decline a round invitation.
 *
 * Updates the caller's own round_players row (RLS: player_id = auth.uid()).
 * The DB trigger fires automatically when response = 'declined' to notify
 * the round owner — no notification code needed here.
 *
 * Invalidates:
 * - scheduledRoundKeys.detail(roundId) — so the invitation status refreshes
 * - scheduledRoundKeys.all — other screens listing upcoming rounds
 * - ['rounds', user.id] — the RoundListScreen's upcoming list
 */
export function useRespondToRoundInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ roundId, response }: RespondToRoundInvitationInput): Promise<void> => {
      if (!user?.id) {
        throw new Error('Must be logged in to respond to an invitation');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
      const { error } = await (supabase.from('round_players') as any)
        .update({
          invitation_status: response,
          responded_at: new Date().toISOString(),
        })
        .eq('round_id', roundId)
        .eq('player_id', user.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.all });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['rounds', user.id] });
      }
    },
    onError: (error) => {
      console.error('[useRespondToRoundInvitation] Failed:', error);
    },
  });
}

// =====================================================
// MUTATION: INVITE PARTNERS
// =====================================================

export interface InvitePartnerInput {
  /** Player ID to invite */
  id: string;
  /** Optional per-player tee override */
  selectedTee?: TeeBox;
}

export interface InviteToScheduledRoundInput {
  roundId: string;
  partners: InvitePartnerInput[];
}

/**
 * Add one or more players to a scheduled round as pending invitees.
 *
 * Inserts new round_players rows with invitation_status = 'pending'. The
 * existing DB trigger (notify_round_player_invited) fires automatically to
 * push notifications — no notification code needed here.
 *
 * Duplicate inserts (same round_id + player_id) are rejected by the DB:
 * round_players has UNIQUE(round_id, player_id) (confirmed in migration
 * 20250131000000_round_players_and_notifications.sql). The caller should
 * filter already-invited players before calling this hook to get a clear
 * error rather than a silent no-op.
 *
 * Invalidates detail and all, but NOT ['rounds', user.id] because adding
 * a partner doesn't change the list of rounds the caller can see.
 */
export function useInviteToScheduledRound() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ roundId, partners }: InviteToScheduledRoundInput): Promise<void> => {
      if (!user?.id) {
        throw new Error('Must be logged in to invite partners');
      }
      if (partners.length === 0) return;

      const rows = partners.map((p) => ({
        round_id: roundId,
        player_id: p.id,
        added_by: user.id,
        invitation_status: 'pending' as RoundInvitationStatus,
        responded_at: null as string | null,
        selected_tee: p.selectedTee ?? null,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
      const { error } = await (supabase.from('round_players') as any)
        .insert(rows);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.all });
    },
    onError: (error) => {
      console.error('[useInviteToScheduledRound] Failed:', error);
    },
  });
}

// =====================================================
// MUTATION: UPDATE DATE / TEE TIME
// =====================================================

export interface UpdateScheduledRoundInput {
  roundId: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** HH:MM:SS or null to clear */
  teeTime: string | null;
}

/**
 * Update the date and/or tee time of an upcoming round.
 *
 * Accepted invitees can update the round (RLS: is_accepted_round_participant).
 * The protect_round_ownership_fields trigger blocks ownership-column changes.
 *
 * Invalidates detail, all, and ['rounds', user.id] (the upcoming list card
 * shows date/time, so it needs refreshing).
 */
export function useUpdateScheduledRound() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ roundId, date, teeTime }: UpdateScheduledRoundInput): Promise<void> => {
      if (!user?.id) {
        throw new Error('Must be logged in to update a round');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
      const { error } = await (supabase.from('rounds') as any)
        .update({ date, tee_time: teeTime })
        .eq('id', roundId);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, { roundId }) => {
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.all });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['rounds', user.id] });
      }
    },
    onError: (error) => {
      console.error('[useUpdateScheduledRound] Failed:', error);
    },
  });
}

// =====================================================
// MUTATION: CANCEL ROUND
// =====================================================

/**
 * Cancel (hard-delete) an upcoming scheduled round.
 *
 * Only the round owner can delete (RLS: user_id = auth.uid() on rounds).
 * The BEFORE DELETE trigger `notify_scheduled_round_cancelled` fires
 * automatically to push notifications to every pending/accepted invitee —
 * no notification code needed here.
 *
 * FK cascade: round_players.round_id REFERENCES rounds(id) ON DELETE CASCADE
 * (confirmed in migration 20250131000000_round_players_and_notifications.sql),
 * so deleting the round row also removes all round_players rows in a single
 * server-side cascade — no client-side pre-delete of round_players required.
 *
 * Invalidates all + ['rounds', user.id]. Removes the detail key from cache.
 */
export function useCancelScheduledRound() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (roundId: string): Promise<void> => {
      if (!user?.id) {
        throw new Error('Must be logged in to cancel a round');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
      const { error } = await (supabase.from('rounds') as any)
        .delete()
        .eq('id', roundId);

      if (error) {
        throw error;
      }
    },
    onSuccess: (_, roundId) => {
      queryClient.removeQueries({ queryKey: scheduledRoundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.all });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['rounds', user.id] });
      }
    },
    onError: (error) => {
      console.error('[useCancelScheduledRound] Failed:', error);
    },
  });
}
