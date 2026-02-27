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

  if (req.method !== 'GET') {
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

    // Query all user data in parallel
    const [
      playerResult,
      scorecardsResult,
      holeScoresResult,
      competitionPlayersResult,
      friendshipsResult,
      subscriptionResult,
      notificationsResult,
      favoriteCoursesResult,
      achievementsResult,
      skinsPayoutsResult,
      wolfPayoutsResult,
      handicapDifferentialsResult,
      preferencesResult,
    ] = await Promise.all([
      supabaseAdmin.from('players').select('*').eq('id', userId).single(),
      supabaseAdmin.from('scorecards').select('*, hole_scores(*)').eq('player_id', userId),
      supabaseAdmin.from('hole_scores').select('*').eq('player_id', userId),
      supabaseAdmin.from('competition_players').select('*, competitions(name, status)').eq('player_id', userId),
      supabaseAdmin.from('friendships').select('*').or(`user_id.eq.${userId},friend_id.eq.${userId}`),
      supabaseAdmin.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('favorite_courses').select('*, courses(name)').eq('user_id', userId),
      supabaseAdmin.from('player_achievements').select('*, achievements(name, description)').eq('player_id', userId),
      supabaseAdmin.from('skins_payouts').select('*').eq('player_id', userId),
      supabaseAdmin.from('wolf_payouts').select('*').eq('player_id', userId),
      supabaseAdmin.from('handicap_differentials').select('*').eq('player_id', userId),
      supabaseAdmin.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: user.email,
      profile: playerResult.data,
      scorecards: scorecardsResult.data ?? [],
      hole_scores: holeScoresResult.data ?? [],
      competitions: competitionPlayersResult.data ?? [],
      friendships: friendshipsResult.data ?? [],
      subscription: subscriptionResult.data,
      notifications: notificationsResult.data ?? [],
      favorite_courses: favoriteCoursesResult.data ?? [],
      achievements: achievementsResult.data ?? [],
      skins_payouts: skinsPayoutsResult.data ?? [],
      wolf_payouts: wolfPayoutsResult.data ?? [],
      handicap_differentials: handicapDifferentialsResult.data ?? [],
      preferences: preferencesResult.data,
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
