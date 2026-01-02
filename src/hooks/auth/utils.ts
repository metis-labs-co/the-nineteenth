/**
 * Auth Hook Utilities
 *
 * Shared utility functions for auth hooks
 */

import { supabase } from '@/services/supabase/client';
import type { Player, Database } from '@/types/database.types';

type PlayerInsert = Database['public']['Tables']['players']['Insert'];

interface UserMetadata {
  name?: string;
  handicap?: number;
  phone?: string;
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
    return existingProfile as Player;
  }

  // Profile doesn't exist - create it
  if (__DEV__) {
    console.log('[ensurePlayerProfile] Player profile not found, creating fallback profile for:', userId);
  }

  const email = userEmail || '';
  const defaultName = userMetadata?.name || email.split('@')[0] || 'Player';

  const playerData: PlayerInsert = {
    id: userId,
    email: email,
    name: defaultName,
    handicap: userMetadata?.handicap ?? 0,
    phone: userMetadata?.phone || null,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: null,
    home_venue_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
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

  if (__DEV__) {
    console.log('[ensurePlayerProfile] Created fallback player profile:', newProfile?.id);
  }

  return newProfile as Player;
}
