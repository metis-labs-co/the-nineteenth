/**
 * Delete Account Edge Function
 *
 * GDPR Article 17 (Right to Erasure) / UK GDPR / Apple App Store requirement.
 * Deletes all user data, anonymises historical scores, and removes the auth account.
 *
 * - POST endpoint, JWT-authenticated
 * - Calls delete_user_account() RPC (SECURITY DEFINER, service_role only)
 * - Deletes Supabase auth user
 * - Best-effort RevenueCat subscriber deletion
 *
 * Deploy: supabase functions deploy delete-account
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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[delete-account] Missing Supabase configuration');
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

    // Create a user-scoped client to verify the JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.error('[delete-account] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`[delete-account] Processing deletion for user ${userId}`);

    // Create service-role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Step 1: Call the database function to clean up user data
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('delete_user_account', {
      p_user_id: userId,
    });

    if (rpcError) {
      console.error('[delete-account] RPC error:', rpcError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user data', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-account] User data deleted for ${userId}`);

    // Step 2: Best-effort RevenueCat subscriber deletion
    const revenuecatApiKey = Deno.env.get('REVENUECAT_API_KEY');
    if (revenuecatApiKey) {
      try {
        const rcResponse = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${userId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${revenuecatApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (rcResponse.ok) {
          console.log(`[delete-account] RevenueCat subscriber deleted for ${userId}`);
        } else {
          console.warn(`[delete-account] RevenueCat deletion returned ${rcResponse.status}`);
        }
      } catch (rcError) {
        console.warn('[delete-account] RevenueCat deletion failed (best-effort):', rcError);
      }
    }

    // Step 3: Delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('[delete-account] Auth deletion error:', deleteAuthError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth account', details: deleteAuthError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-account] Auth account deleted for ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[delete-account] Unexpected error:', err);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
