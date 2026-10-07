/**
 * Export User Data Edge Function
 *
 * GDPR Article 20 (Right to Data Portability).
 * Returns all user data as a JSON download.
 *
 * - GET endpoint, JWT-authenticated
 * - Queries all user-related tables
 * - Returns JSON with Content-Disposition: attachment header
 *
 * Deploy: supabase functions deploy export-data
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Accept both GET and POST (supabase.functions.invoke defaults to POST)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`[export-data] Exporting data for user ${userId}`);

    // Use service-role client to bypass RLS for complete data export
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Helper to safely query a table (returns empty data if table doesn't exist or query fails)
    const safeQuery = async (queryFn: () => PromiseLike<{ data: unknown; error: unknown }>) => {
      try {
        const result = await queryFn();
        if (result.error) {
          console.warn('[export-data] Query error (table may not exist):', result.error);
          return { data: null, error: result.error };
        }
        return result;
      } catch (err) {
        console.warn('[export-data] Query threw:', err);
        return { data: null, error: err };
      }
    };

    // Query all user data in parallel
    const [
      playerResult,
      scorecardsResult,
      scoreEntriesResult,
      competitionPlayersResult,
      friendshipsResult,
      subscriptionResult,
      notificationsResult,
      favoriteCoursesResult,
      achievementsResult,
      skinsPayoutsResult,
      wolfPayoutsResult,
      preferencesResult,
      shotLogResult,
      roundPlayersResult,
      ownedRoundsResult,
      customHoleTeesResult,
    ] = await Promise.all([
      safeQuery(() => supabaseAdmin.from('players').select('*').eq('id', userId).single()),
      safeQuery(() => supabaseAdmin.from('scorecards').select('*').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('score_entries').select('*').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('competition_players').select('*, competitions(name, status)').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('friendships').select('*').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)),
      safeQuery(() => supabaseAdmin.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle()),
      safeQuery(() => supabaseAdmin.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)),
      safeQuery(() => supabaseAdmin.from('favorite_courses').select('*, courses(name)').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('player_achievements').select('*').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('skins_payouts').select('*').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('wolf_payouts').select('*').eq('player_id', userId)),
      safeQuery(() => supabaseAdmin.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()),
      // GPS position of every shot the user logged (shot tracking)
      safeQuery(() => supabaseAdmin.from('shot_log').select('round_id, hole_number, sequence, latitude, longitude, club_used, shot_type, created_at, updated_at').eq('player_id', userId).order('created_at', { ascending: true })),
      // Standalone (social) rounds the user played in
      safeQuery(() => supabaseAdmin.from('round_players').select('*, rounds(*)').eq('player_id', userId)),
      // Standalone rounds the user created/owns (rounds.user_id)
      safeQuery(() => supabaseAdmin.from('rounds').select('*').eq('user_id', userId)),
      // User-placed tee box GPS points
      safeQuery(() => supabaseAdmin.from('custom_hole_tees').select('*').eq('user_id', userId)),
    ]);

    // Handicap differentials are stored per scorecard (there is no separate
    // table); surface them explicitly alongside the profile's handicap_index.
    const scorecards = (scorecardsResult.data ?? []) as Array<Record<string, unknown>>;
    const handicapDifferentials = scorecards
      .filter((sc) => sc.handicap_differential !== null && sc.handicap_differential !== undefined)
      .map((sc) => ({
        scorecard_id: sc.id,
        round_id: sc.round_id,
        handicap_differential: sc.handicap_differential,
        daily_handicap_used: sc.daily_handicap_used ?? null,
        created_at: sc.created_at ?? null,
      }));

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: user.email,
      profile: playerResult.data,
      scorecards,
      handicap_differentials: handicapDifferentials,
      score_entries: scoreEntriesResult.data ?? [],
      competitions: competitionPlayersResult.data ?? [],
      friendships: friendshipsResult.data ?? [],
      subscription: subscriptionResult.data,
      notifications: notificationsResult.data ?? [],
      favorite_courses: favoriteCoursesResult.data ?? [],
      achievements: achievementsResult.data ?? [],
      skins_payouts: skinsPayoutsResult.data ?? [],
      wolf_payouts: wolfPayoutsResult.data ?? [],
      preferences: preferencesResult.data,
      shot_log: shotLogResult.data ?? [],
      round_participation: roundPlayersResult.data ?? [],
      owned_rounds: ownedRoundsResult.data ?? [],
      custom_hole_tees: customHoleTeesResult.data ?? [],
    };

    const filename = `the-nineteenth-data-export-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      }
    );
  } catch (err) {
    console.error('[export-data] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
