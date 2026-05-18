/**
 * Supabase Edge Function: send-push-notification
 *
 * Sends push notifications via Expo Push API.
 * Called by database triggers when notification events occur.
 *
 * Request body:
 * {
 *   user_id: string,           // Target user ID
 *   notification_type: string, // Type from NotificationType enum
 *   title: string,             // Notification title
 *   body: string,              // Notification body message
 *   data?: object              // Optional custom data payload for deep linking
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   sent: number,              // Number of notifications sent successfully
 *   failed: number,            // Number of notifications that failed
 *   skipped: number,           // Skipped due to preferences
 *   errors?: string[]          // Error details if any
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// =====================================================
// TYPES
// =====================================================

interface SendPushRequest {
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface SendPushResponse {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors?: string[];
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
  badge?: number;
  // iOS 15+: bypasses Focus modes (DND, Sleep, Work, etc.) so the
  // notification actually surfaces instead of silently landing in
  // Notification Center.
  interruptionLevel?: 'passive' | 'active' | 'time-sensitive' | 'critical';
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

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notification category mapping for iOS actions
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
  tee_time_reminder: 'ROUND_REMINDER',
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
  tee_time_reminder: 'round-reminders',
};

// iOS interruption level per notification type.
// 'time-sensitive' bypasses Focus modes (DND, Sleep, Work) — use for things
// the user needs to act on or be alerted to in the moment.
// 'active' is the default level — Focus modes silently file these into
// Notification Center, which is the right behaviour for informational
// notifications (someone joined a league you're in, a game completed, etc).
const INTERRUPTION_LEVEL_MAP: Record<string, 'time-sensitive' | 'active'> = {
  // Action / invitation / reminder — break through Focus
  competition_player_added: 'time-sensitive',
  new_round_created: 'time-sensitive',
  friend_request_received: 'time-sensitive',
  social_round_invitation: 'time-sensitive',
  scorecard_submitted: 'time-sensitive',
  tee_time_reminder: 'time-sensitive',
  league_round_tagged: 'time-sensitive',
  partnership_round_tagged: 'time-sensitive',
  partnership_created: 'time-sensitive',
  prize_pool_settled: 'time-sensitive',

  // Informational — respect Focus
  competition_player_joined: 'active',
  competition_status_changed: 'active',
  round_completed: 'active',
  friend_request_accepted: 'active',
  league_player_joined: 'active',
  league_player_left: 'active',
  league_player_removed: 'active',
  league_leaderboard_changed: 'active',
  skins_game_completed: 'active',
  skins_game_cancelled: 'active',
  wolf_game_completed: 'active',
  wolf_game_cancelled: 'active',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate request body
 */
function validateRequest(body: unknown): { valid: true; data: SendPushRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const request = body as Record<string, unknown>;

  if (!request.user_id || typeof request.user_id !== 'string') {
    return { valid: false, error: 'user_id is required and must be a string' };
  }

  if (!request.notification_type || typeof request.notification_type !== 'string') {
    return { valid: false, error: 'notification_type is required and must be a string' };
  }

  if (!request.title || typeof request.title !== 'string') {
    return { valid: false, error: 'title is required and must be a string' };
  }

  if (!request.body || typeof request.body !== 'string') {
    return { valid: false, error: 'body is required and must be a string' };
  }

  if (request.data !== undefined && (typeof request.data !== 'object' || request.data === null)) {
    return { valid: false, error: 'data must be an object if provided' };
  }

  return {
    valid: true,
    data: {
      user_id: request.user_id as string,
      notification_type: request.notification_type as string,
      title: request.title as string,
      body: request.body as string,
      data: request.data as Record<string, unknown> | undefined,
    },
  };
}

/**
 * Check if auth header contains a recognised admin key.
 *
 * Accepts either:
 *  - `SUPABASE_SERVICE_ROLE_KEY` — auto-populated by Supabase. May be the
 *    legacy JWT or the new `sb_secret_...` value depending on project
 *    migration state.
 *  - `ADMIN_API_KEY` — optional user-set override. Use this if the value you
 *    need to match (e.g. the one stored in Vault) doesn't match the
 *    auto-populated `SUPABASE_SERVICE_ROLE_KEY`. We use an un-prefixed name
 *    because Supabase CLI blocks user secrets beginning with `SUPABASE_`.
 */
function isServiceRole(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);

  const candidates = [
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    Deno.env.get('ADMIN_API_KEY'),
  ].filter((k): k is string => typeof k === 'string' && k.length > 0);

  return candidates.some((k) => k === token);
}

/**
 * Resolve the admin key to use when instantiating the Supabase client.
 * Prefers the explicit override if configured, falls back to auto-populated.
 */
function getAdminKey(): string {
  const override = Deno.env.get('ADMIN_API_KEY');
  if (override && override.length > 0) return override;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRole && serviceRole.length > 0) return serviceRole;
  throw new Error('Neither ADMIN_API_KEY nor SUPABASE_SERVICE_ROLE_KEY is set');
}

/**
 * Build Expo push message from request
 */
function buildExpoPushMessage(
  token: string,
  request: SendPushRequest,
  platform: string | null
): ExpoPushMessage {
  const message: ExpoPushMessage = {
    to: token,
    title: request.title,
    body: request.body,
    sound: 'default',
    priority: 'high',
    interruptionLevel: INTERRUPTION_LEVEL_MAP[request.notification_type] ?? 'active',
  };

  // Add notification data for deep linking
  if (request.data) {
    message.data = {
      ...request.data,
      type: request.notification_type,
    };
  } else {
    message.data = { type: request.notification_type };
  }

  // Add iOS category for notification actions
  const categoryId = NOTIFICATION_CATEGORY_MAP[request.notification_type];
  if (categoryId) {
    message.categoryId = categoryId;
  }

  // Add Android channel
  if (platform === 'android') {
    const channelId = ANDROID_CHANNEL_MAP[request.notification_type];
    if (channelId) {
      message.channelId = channelId;
    }
  }

  return message;
}

/**
 * Send push notifications with retry logic
 */
async function sendPushNotifications(
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
        // Check for rate limiting
        if (response.status === 429) {
          lastError = 'Rate limited by Expo Push API';
          console.warn(`Attempt ${attempt}/${MAX_RETRIES}: Rate limited, retrying...`);
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }

        // Server error - may be transient
        if (response.status >= 500) {
          lastError = `Expo Push API error: ${response.status}`;
          console.warn(`Attempt ${attempt}/${MAX_RETRIES}: Server error, retrying...`);
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }

        // Client error - don't retry
        const errorText = await response.text();
        return { tickets: [], error: `Expo Push API error: ${response.status} - ${errorText}` };
      }

      const result = await response.json();

      // Expo returns { data: [...tickets] }
      if (result.data && Array.isArray(result.data)) {
        return { tickets: result.data };
      }

      return { tickets: [], error: 'Unexpected response format from Expo Push API' };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Attempt ${attempt}/${MAX_RETRIES}: ${lastError}`);

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const errors: string[] = [];

  try {
    // 1. Verify service role authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = getAdminKey();
    const authHeader = req.headers.get('Authorization');

    if (!isServiceRole(authHeader)) {
      const response: SendPushResponse = {
        success: false,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: ['Unauthorized: Service role required'],
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(body);

    if (!validation.valid) {
      const response: SendPushResponse = {
        success: false,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [validation.error],
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request = validation.data;
    console.log(`Processing push notification for user ${request.user_id}, type: ${request.notification_type}`);

    // 3. Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Check user's push preferences
    const { data: shouldSend, error: prefError } = await supabase.rpc('should_send_push', {
      p_user_id: request.user_id,
      p_notification_type: request.notification_type,
    });

    if (prefError) {
      console.error('Error checking push preferences:', prefError);
      errors.push(`Preference check failed: ${prefError.message}`);
    }

    if (shouldSend === false) {
      console.log(`Push notification skipped: User ${request.user_id} has disabled ${request.notification_type}`);
      const response: SendPushResponse = {
        success: true,
        sent: 0,
        failed: 0,
        skipped: 1,
        errors: errors.length > 0 ? errors : undefined,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Fetch user's enabled push tokens
    const { data: tokens, error: tokenError } = await supabase.rpc('get_user_push_tokens', {
      p_user_id: request.user_id,
    });

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      const response: SendPushResponse = {
        success: false,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [`Failed to fetch push tokens: ${tokenError.message}`],
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pushTokens = tokens as PushToken[];

    if (!pushTokens || pushTokens.length === 0) {
      console.log(`No enabled push tokens found for user ${request.user_id}`);
      const response: SendPushResponse = {
        success: true,
        sent: 0,
        failed: 0,
        skipped: 1,
        errors: errors.length > 0 ? errors : undefined,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pushTokens.length} push token(s) for user ${request.user_id}`);

    // 6. Build Expo push messages
    const messages: ExpoPushMessage[] = pushTokens.map((token) =>
      buildExpoPushMessage(token.expo_token, request, token.platform)
    );

    // 7. Send to Expo Push API
    const { tickets, error: sendError } = await sendPushNotifications(messages);

    if (sendError) {
      console.error('Error sending push notifications:', sendError);
      errors.push(sendError);
    }

    // 8. Process response and handle invalid tokens
    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = pushTokens[i]?.expo_token;

      if (ticket.status === 'ok') {
        sent++;
        console.log(`Push sent successfully to token: ${token?.substring(0, 20)}...`);
      } else {
        failed++;
        const errorDetail = ticket.details?.error || ticket.message || 'Unknown error';
        console.error(`Push failed for token ${token?.substring(0, 20)}...: ${errorDetail}`);
        errors.push(`Token ${token?.substring(0, 20)}...: ${errorDetail}`);

        // Mark token as invalid if device not registered
        if (ticket.details?.error === 'DeviceNotRegistered' && token) {
          invalidTokens.push(token);
        }
      }
    }

    // 9. Disable invalid tokens in database
    for (const token of invalidTokens) {
      console.log(`Disabling invalid token: ${token.substring(0, 20)}...`);
      const { error: disableError } = await supabase.rpc('disable_push_token', {
        p_token: token,
      });

      if (disableError) {
        console.error(`Failed to disable token: ${disableError.message}`);
        errors.push(`Failed to disable invalid token: ${disableError.message}`);
      }
    }

    // 10. Return response
    const response: SendPushResponse = {
      success: sent > 0 || (pushTokens.length === 0),
      sent,
      failed,
      skipped: 0,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`Push notification result: sent=${sent}, failed=${failed}, invalidTokensDisabled=${invalidTokens.length}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const response: SendPushResponse = {
      success: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
