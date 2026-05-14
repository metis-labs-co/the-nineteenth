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
  const { data: existingProfile, error: _fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    const existing = existingProfile as Player;
    // Social signups: the auth trigger defaults country to 'AU' because no
    // metadata is passed. Overwrite once with the detected device country
    // when a caller supplies one for a freshly-created profile.
    if (userMetadata?.country && existing.country !== userMetadata.country) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated } = await (supabase.from('players') as any)
        .update({ country: userMetadata.country })
        .eq('id', userId)
        .select()
        .single();
      if (updated) return updated as Player;
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
  const { data: newProfile, error: insertError } = await (supabase.from('players') as any)
    .upsert(playerData, { onConflict: 'id' })
    .select()
    .single();

  if (insertError) {
    console.error('[ensurePlayerProfile] Failed to create fallback player profile:', insertError);
    return null;
  }

  return newProfile as Player;
}
