/**
 * Supabase Edge Function: test-push
 *
 * Developer/QA tool for testing push notifications in TestFlight.
 * Sends a test push to a user by email or user_id and returns
 * diagnostic info about tokens, preferences, and Expo API results.
 *
 * Request body:
 * {
 *   email?: string,              // Target user email (lookup from players table)
 *   user_id?: string,            // Target user ID (at least one of email/user_id required)
 *   title?: string,              // Custom title (default: "Test Push from The Nineteenth")
 *   body?: string,               // Custom body (default: "If you see this, push notifications are working!")
 *   notification_type?: string,  // Notification type (default: "friend_request_received")
 *   skip_preferences?: boolean,  // Bypass preference checks (default: false)
 *   data?: object                // Optional custom data payload
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   debug: { ... },              // Rich diagnostic info
 *   errors?: string[]
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// =====================================================
// TYPES
// =====================================================

interface TestPushRequest {
  email?: string;
  user_id?: string;
  title: string;
  body: string;
  notification_type: string;
  skip_preferences: boolean;
  data?: Record<string, unknown>;
}

interface PushToken {
  expo_token: string;
  platform: string | null;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | string;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  categoryId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
    [key: string]: unknown;
  };
}

// =====================================================
// CONSTANTS
// =====================================================

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// iOS notification categories
const NOTIFICATION_CATEGORY_MAP: Record<string, string> = {
  competition_player_added: 'COMPETITION',
  competition_player_joined: 'COMPETITION',
  new_round_created: 'COMPETITION',
  competition_status_changed: 'COMPETITION',
  round_completed: 'COMPETITION',
  friend_request_received: 'FRIEND_REQUEST',
  friend_request_accepted: 'FRIEND_REQUEST',
  scorecard_submitted: 'SCORECARD',
  social_round_invitation: 'COMPETITION',
  league_player_joined: 'LEAGUE',
  league_player_left: 'LEAGUE',
  league_player_removed: 'LEAGUE',
  league_round_tagged: 'LEAGUE',
  league_leaderboard_changed: 'LEAGUE',
  partnership_created: 'LEAGUE',
  partnership_round_tagged: 'LEAGUE',
  skins_game_completed: 'SIDE_GAME',
  skins_game_cancelled: 'SIDE_GAME',
  wolf_game_completed: 'SIDE_GAME',
  wolf_game_cancelled: 'SIDE_GAME',
  prize_pool_settled: 'SIDE_GAME',
};

// Android notification channels
const ANDROID_CHANNEL_MAP: Record<string, string> = {
  competition_player_added: 'competition-updates',
  competition_player_joined: 'competition-updates',
  new_round_created: 'competition-updates',
  competition_status_changed: 'competition-updates',
  round_completed: 'competition-updates',
  friend_request_received: 'friend-requests',
  friend_request_accepted: 'friend-requests',
  scorecard_submitted: 'scorecard-updates',
  social_round_invitation: 'competition-updates',
  league_player_joined: 'league-updates',
  league_player_left: 'league-updates',
  league_player_removed: 'league-updates',
  league_round_tagged: 'league-updates',
  league_leaderboard_changed: 'league-updates',
  partnership_created: 'league-updates',
  partnership_round_tagged: 'league-updates',
  skins_game_completed: 'side-game-updates',
  skins_game_cancelled: 'side-game-updates',
  wolf_game_completed: 'side-game-updates',
  wolf_game_cancelled: 'side-game-updates',
  prize_pool_settled: 'side-game-updates',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isServiceRole(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  const candidates = [
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    Deno.env.get('ADMIN_API_KEY'),
  ].filter((k): k is string => typeof k === 'string' && k.length > 0);
  return candidates.some((k) => k === token);
}

function getAdminKey(): string {
  const override = Deno.env.get('ADMIN_API_KEY');
  if (override && override.length > 0) return override;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRole && serviceRole.length > 0) return serviceRole;
  throw new Error('Neither ADMIN_API_KEY nor SUPABASE_SERVICE_ROLE_KEY is set');
}

/**
 * Mask an Expo push token for safe display: ExponentPushToken[abc...xyz]
 */
function maskToken(token: string): string {
  const match = token.match(/^ExponentPushToken\[(.+)\]$/);
  if (!match) return token.substring(0, 10) + '...';
  const inner = match[1];
  if (inner.length <= 6) return token;
  return `ExponentPushToken[${inner.substring(0, 3)}...${inner.substring(inner.length - 3)}]`;
}

function parseRequest(body: unknown): { valid: true; data: TestPushRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const req = body as Record<string, unknown>;

  if (!req.email && !req.user_id) {
    return { valid: false, error: 'At least one of email or user_id is required' };
  }

  if (req.email && typeof req.email !== 'string') {
    return { valid: false, error: 'email must be a string' };
  }

  if (req.user_id && typeof req.user_id !== 'string') {
    return { valid: false, error: 'user_id must be a string' };
  }

  return {
    valid: true,
    data: {
      email: req.email as string | undefined,
      user_id: req.user_id as string | undefined,
      title: (req.title as string) || 'Test Push from The Nineteenth',
      body: (req.body as string) || 'If you see this, push notifications are working! 🏌️',
      notification_type: (req.notification_type as string) || 'friend_request_received',
      skip_preferences: (req.skip_preferences as boolean) || false,
      data: req.data as Record<string, unknown> | undefined,
    },
  };
}

async function sendToExpo(
  messages: ExpoPushMessage[]
): Promise<{ tickets: ExpoPushTicket[]; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          lastError = `Expo Push API: ${response.status}`;
          console.warn(`[test-push] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}, retrying...`);
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        const errorText = await response.text();
        return { tickets: [], error: `Expo Push API error: ${response.status} - ${errorText}` };
      }

      const result = await response.json();
      if (result.data && Array.isArray(result.data)) {
        return { tickets: result.data };
      }
      return { tickets: [], error: 'Unexpected response format from Expo Push API' };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[test-push] Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  return { tickets: [], error: lastError || 'Failed after max retries' };
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const errors: string[] = [];

  try {
    // 1. Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = getAdminKey();

    if (!isServiceRole(req.headers.get('Authorization'))) {
      return new Response(
        JSON.stringify({ success: false, errors: ['Unauthorized: Service role required'] }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // 2. Parse request
    const body = await req.json();
    const validation = parseRequest(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, errors: [validation.error] }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const request = validation.data;
    console.log(`[test-push] Request: email=${request.email}, user_id=${request.user_id}, type=${request.notification_type}`);

    // 3. Init Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Resolve user
    let userId: string;
    let userEmail: string;
    let userName: string;

    if (request.user_id) {
      userId = request.user_id;

      // Get email from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

      if (authError || !authUser?.user) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [`Auth user not found with id: ${userId}${authError ? ` (${authError.message})` : ''}`],
          }),
          { status: 404, headers: jsonHeaders }
        );
      }

      userEmail = authUser.user.email || '';
    } else {
      // Look up user in auth.users by email using the admin API
      const { data: listResult, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [`Auth user lookup failed: ${listError.message}`],
          }),
          { status: 500, headers: jsonHeaders }
        );
      }

      const targetEmail = request.email!.toLowerCase();
      const authUser = listResult.users.find((u) => u.email?.toLowerCase() === targetEmail);

      if (!authUser) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [`Auth user not found with email: ${request.email}`],
          }),
          { status: 404, headers: jsonHeaders }
        );
      }

      userId = authUser.id;
      userEmail = authUser.email || request.email!;
    }

    // Fetch player profile (optional — user may exist in auth but not players)
    const { data: player } = await supabase
      .from('players')
      .select('name')
      .eq('id', userId)
      .maybeSingle();

    userName = player?.name || 'Unknown';

    console.log(`[test-push] Resolved user: ${userName} (${userId})`);

    // 5. Fetch preferences
    const { data: preferences, error: prefError } = await supabase.rpc('get_user_push_preferences', {
      p_user_id: userId,
    });

    if (prefError) {
      errors.push(`Preference fetch failed: ${prefError.message}`);
    }

    const { data: shouldSend, error: shouldSendError } = await supabase.rpc('should_send_push', {
      p_user_id: userId,
      p_notification_type: request.notification_type,
    });

    if (shouldSendError) {
      errors.push(`should_send_push check failed: ${shouldSendError.message}`);
    }

    // 6. Check preferences (with skip option)
    const preferencesSkipped = request.skip_preferences;
    const willSend = preferencesSkipped || shouldSend !== false;

    if (!willSend) {
      console.log(`[test-push] Push blocked by preferences for ${request.notification_type}`);
      errors.push(`User has disabled notifications for type: ${request.notification_type}. Use skip_preferences: true to bypass.`);
    }

    // 7. Fetch tokens
    const { data: tokens, error: tokenError } = await supabase.rpc('get_user_push_tokens', {
      p_user_id: userId,
    });

    if (tokenError) {
      errors.push(`Token fetch failed: ${tokenError.message}`);
    }

    const pushTokens = (tokens as PushToken[]) || [];
    console.log(`[test-push] Found ${pushTokens.length} token(s)`);

    // Also fetch total tokens (including disabled) for diagnostics
    const { data: allTokens } = await supabase
      .from('push_tokens')
      .select('expo_token, platform, enabled')
      .eq('user_id', userId);

    const disabledTokenCount = (allTokens || []).filter((t: { enabled: boolean }) => !t.enabled).length;

    // Build debug response
    const debug: Record<string, unknown> = {
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      tokens_found: pushTokens.length,
      tokens_disabled: disabledTokenCount,
      tokens: pushTokens.map((t) => ({
        expo_token: maskToken(t.expo_token),
        platform: t.platform,
      })),
      preferences: preferences || null,
      should_send: shouldSend,
      preferences_skipped: preferencesSkipped,
      notification_sent: null as unknown,
      expo_tickets: [] as unknown[],
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    // 8. Send if we have tokens and preferences allow it
    if (pushTokens.length === 0) {
      debug.skipped = 1;
      const noTokenMsg = disabledTokenCount > 0
        ? `No enabled push tokens found (${disabledTokenCount} disabled). The user may need to re-register by reopening the app.`
        : 'No push tokens found. The user needs to open the app on a physical device and grant notification permissions.';
      errors.push(noTokenMsg);

      return new Response(
        JSON.stringify({ success: false, debug, errors }),
        { status: 200, headers: jsonHeaders }
      );
    }

    if (!willSend) {
      debug.skipped = pushTokens.length;
      return new Response(
        JSON.stringify({ success: false, debug, errors }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // 9. Build and send Expo messages
    const messages: ExpoPushMessage[] = pushTokens.map((token) => {
      const message: ExpoPushMessage = {
        to: token.expo_token,
        title: request.title,
        body: request.body,
        sound: 'default',
        priority: 'high',
        data: {
          type: request.notification_type,
          isTest: true,
          ...request.data,
        },
      };

      const categoryId = NOTIFICATION_CATEGORY_MAP[request.notification_type];
      if (categoryId) message.categoryId = categoryId;

      if (token.platform === 'android') {
        const channelId = ANDROID_CHANNEL_MAP[request.notification_type];
        if (channelId) message.channelId = channelId;
      }

      return message;
    });

    debug.notification_sent = {
      title: request.title,
      body: request.body,
      notification_type: request.notification_type,
    };

    const { tickets, error: sendError } = await sendToExpo(messages);

    if (sendError) {
      errors.push(sendError);
    }

    // 10. Process tickets (NO side effects - don't disable tokens)
    let sent = 0;
    let failed = 0;
    const ticketResults: unknown[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = pushTokens[i]?.expo_token;

      if (ticket.status === 'ok') {
        sent++;
        ticketResults.push({
          token: maskToken(token),
          status: 'ok',
          ticket_id: ticket.id,
        });
      } else {
        failed++;
        const errorDetail = ticket.details?.error || ticket.message || 'Unknown error';
        ticketResults.push({
          token: maskToken(token),
          status: 'error',
          error: errorDetail,
        });
        errors.push(`Token ${maskToken(token)}: ${errorDetail}`);
      }
    }

    debug.expo_tickets = ticketResults;
    debug.sent = sent;
    debug.failed = failed;

    console.log(`[test-push] Result: sent=${sent}, failed=${failed}`);

    return new Response(
      JSON.stringify({
        success: sent > 0,
        debug,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    console.error('[test-push] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
