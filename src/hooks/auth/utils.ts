/**
 * Auth Hook Utilities
 *
 * Shared utility functions for auth hooks
 */

import { supabase } from '@/services/supabase/client';
import type { Player } from '@/types/database.types';

// Use Omit<Player, 'created_at' | 'updated_at'> instead of the Supabase-generated
// PlayerInsert type, since the generated types may not include newer columns
// (gender, handicap_index, handicap_index_updated_at, push_league_updates)
type PlayerInsert = Omit<Player, 'created_at' | 'updated_at'>;

/**
 * Fetch the signed-in user's own full player row, including private columns
 * (email, phone, country, age_*, push_*).
 *
 * Other users' rows are read with PUBLIC_PLAYER_COLUMNS only; private columns
 * are reachable solely through the `get_my_player` RPC, which is scoped to
 * auth.uid() on the server. See services/api/playerColumns.ts.
 */
export async function fetchMyPlayer(): Promise<Player | null> {
  // get_my_player isn't in the generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_my_player').maybeSingle();
  if (error) {
    throw error;
  }
  return (data as Player | null) ?? null;
}

interface UserMetadata {
  name?: string;
  handicap?: number;
  phone?: string;
  country?: string;
}

/**
 * Ensure player profile exists in the database
 *
 * This is a fallback for when the database trigger (on_auth_user_created)
 * fails to create the player profile. Creates the profile if it doesn't exist.
 *
 * @param userId - The auth user ID
 * @param userEmail - The user's email
 * @param userMetadata - Optional metadata from auth.users (name, handicap, etc.)
 * @returns The player profile (existing or newly created)
 */
export async function ensurePlayerProfile(
  userId: string,
  userEmail: string | undefined,
  userMetadata?: UserMetadata
): Promise<Player | null> {
  if (!userId) return null;

  // First, try to fetch existing profile
  let existingProfile: Player | null = null;
  try {
    existingProfile = await fetchMyPlayer();
  } catch {
    existingProfile = null;
  }

  if (existingProfile && existingProfile.id === userId) {
    const existing = existingProfile;
    // Backfill country once when missing — pre-2026-05 users and any social
    // signups predating the country capture have country=NULL until they
    // log in from a device with a detectable region.
    if (userMetadata?.country && !existing.country) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('players') as any)
        .update({ country: userMetadata.country })
        .eq('id', userId);
      if (!updateError) return { ...existing, country: userMetadata.country };
    }
    return existing;
  }

  // Profile doesn't exist - create it
  const email = userEmail || '';
  const defaultName = userMetadata?.name || email.split('@')[0] || 'Player';

  const playerData: PlayerInsert = {
    id: userId,
    email: email,
    name: defaultName,
    handicap: userMetadata?.handicap ?? 0,
    phone: userMetadata?.phone || null,
    country: userMetadata?.country ?? null,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: null,
    gender: null,
    handicap_index: null,
    handicap_index_updated_at: null,
    home_club_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
    push_league_updates: true,
    equipped_badge_id: null,
    equipped_frame_id: null,
    equipped_title_id: null,
    is_placeholder: false,
    created_by: null,
    linked_player_id: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Insert-if-missing (ON CONFLICT DO NOTHING). A DO UPDATE upsert that
  // sets private columns (email, phone, country, ...) is rejected under the
  // players column grants, and if the signup trigger created the row in the
  // meantime its values win, same as reading the existing row above.
  const { error: insertError } = await (supabase.from('players') as any)
    .upsert(playerData, { onConflict: 'id', ignoreDuplicates: true });

  if (insertError) {
    console.error('[ensurePlayerProfile] Failed to create fallback player profile:', insertError);
    return null;
  }

  // Re-read through the own-row RPC (private columns aren't selectable directly)
  try {
    return (await fetchMyPlayer()) ?? null;
  } catch (fetchError) {
    console.error('[ensurePlayerProfile] Failed to read created player profile:', fetchError);
    return null;
  }
}
