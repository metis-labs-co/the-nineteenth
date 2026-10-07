/**
 * GolfAPI.io Proxy Edge Function
 *
 * Keeps the GolfAPI.io API key server-side. The app calls this function via
 * `supabase.functions.invoke('golfapi-proxy', { body: { path, params } })`
 * and the function forwards an allowlisted GET request to GolfAPI.io with the
 * key attached, passing the upstream JSON body and status straight through.
 *
 * - POST endpoint, JWT-authenticated (gateway verify_jwt stays ON, and the
 *   user is re-verified here via supabase.auth.getUser())
 * - Only the endpoints the app uses are allowed:
 *     GET /clubs                (query: country, name, state, city, latitude, longitude, radius)
 *     GET /clubs/{clubId}
 *     GET /courses/{courseId}
 *     GET /coordinates/{courseId}
 * - Upstream rate-limit headers (Retry-After, X-RateLimit-*) are forwarded;
 *   the `apiRequestsLeft` quota field is part of the passed-through body.
 *
 * Responses produced by the proxy itself (not GolfAPI) carry the
 * `X-GolfApi-Proxy-Error: true` header and a `{ error, code }` body:
 *   401 UNAUTHENTICATED       — missing/invalid user JWT
 *   400 INVALID_REQUEST       — malformed body or disallowed path/params
 *   503 PROXY_NOT_CONFIGURED  — GOLFAPI_IO_KEY secret is unset
 *   504 UPSTREAM_TIMEOUT      — GolfAPI did not respond in time
 *   502 UPSTREAM_UNREACHABLE  — network failure reaching GolfAPI
 *
 * Secrets: GOLFAPI_IO_KEY (required), GOLFAPI_IO_URL (optional override)
 *   supabase secrets set GOLFAPI_IO_KEY=...
 *
 * Deploy: supabase functions deploy golfapi-proxy
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_GOLFAPI_BASE_URL = 'https://www.golfapi.io/api/v2.3';
const UPSTREAM_TIMEOUT_MS = 15000;

/** Upstream headers forwarded to the client (rate limiting / quota). */
const FORWARDED_HEADERS = [
  'Retry-After',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': [...FORWARDED_HEADERS, 'X-GolfApi-Proxy-Error'].join(', '),
};

/** Ids are opaque numeric strings today; allow a conservative safe charset. */
const ID_PATTERN = '[A-Za-z0-9_-]{1,64}';

interface AllowedRoute {
  pattern: RegExp;
  allowedParams: ReadonlySet<string>;
}

const ALLOWED_ROUTES: AllowedRoute[] = [
  {
    pattern: /^\/clubs$/,
    allowedParams: new Set(['country', 'name', 'state', 'city', 'latitude', 'longitude', 'radius']),
  },
  { pattern: new RegExp(`^/clubs/${ID_PATTERN}$`), allowedParams: new Set() },
  { pattern: new RegExp(`^/courses/${ID_PATTERN}$`), allowedParams: new Set() },
  { pattern: new RegExp(`^/coordinates/${ID_PATTERN}$`), allowedParams: new Set() },
];

const MAX_PARAM_LENGTH = 200;

function proxyError(status: number, code: string, error: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-GolfApi-Proxy-Error': 'true',
    },
  });
}

/**
 * Validate the requested path + params against the allowlist.
 * Returns the normalised path and string params, or an error message.
 */
function validateRequest(
  body: unknown
): { path: string; params: Record<string, string> } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Request body must be a JSON object' };
  }

  const { path: rawPath, params: rawParams } = body as { path?: unknown; params?: unknown };

  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    return { error: 'path is required' };
  }

  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const route = ALLOWED_ROUTES.find((r) => r.pattern.test(path));
  if (!route) {
    return { error: `Path not allowed: ${path}` };
  }

  const params: Record<string, string> = {};
  if (rawParams !== undefined && rawParams !== null) {
    if (typeof rawParams !== 'object' || Array.isArray(rawParams)) {
      return { error: 'params must be an object' };
    }
    for (const [key, value] of Object.entries(rawParams as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') continue;
      if (!route.allowedParams.has(key)) {
        return { error: `Query parameter not allowed: ${key}` };
      }
      if (typeof value !== 'string' && typeof value !== 'number') {
        return { error: `Query parameter ${key} must be a string or number` };
      }
      const str = String(value);
      if (str.length > MAX_PARAM_LENGTH) {
        return { error: `Query parameter ${key} is too long` };
      }
      params[key] = str;
    }
  }

  return { path, params };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return proxyError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // Verify JWT and get user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return proxyError(401, 'UNAUTHENTICATED', 'Missing authorization header');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    console.error('[golfapi-proxy] Missing SUPABASE_URL');
    return proxyError(500, 'SERVER_CONFIGURATION', 'Server configuration error');
  }

  const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    console.error('[golfapi-proxy] Auth error:', authError?.message);
    return proxyError(401, 'UNAUTHENTICATED', 'Unauthorized');
  }

  // Parse + validate request
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return proxyError(400, 'INVALID_REQUEST', 'Request body must be valid JSON');
  }

  const validated = validateRequest(body);
  if ('error' in validated) {
    return proxyError(400, 'INVALID_REQUEST', validated.error);
  }

  const apiKey = Deno.env.get('GOLFAPI_IO_KEY');
  if (!apiKey) {
    console.error('[golfapi-proxy] GOLFAPI_IO_KEY secret is not set');
    return proxyError(503, 'PROXY_NOT_CONFIGURED', 'Course search is temporarily unavailable');
  }

  const baseUrl = (Deno.env.get('GOLFAPI_IO_URL') || DEFAULT_GOLFAPI_BASE_URL).replace(/\/$/, '');
  const upstreamUrl = new URL(`${baseUrl}${validated.path}`);
  if (upstreamUrl.protocol !== 'https:') {
    console.error('[golfapi-proxy] GOLFAPI_IO_URL must be https');
    return proxyError(500, 'SERVER_CONFIGURATION', 'Server configuration error');
  }
  for (const [key, value] of Object.entries(validated.params)) {
    upstreamUrl.searchParams.append(key, value);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[golfapi-proxy] Upstream timeout: ${validated.path}`);
      return proxyError(504, 'UPSTREAM_TIMEOUT', `GolfAPI did not respond within ${UPSTREAM_TIMEOUT_MS}ms`);
    }
    console.error('[golfapi-proxy] Upstream fetch failed:', error);
    return proxyError(502, 'UPSTREAM_UNREACHABLE', 'Failed to reach GolfAPI');
  }

  let responseText: string;
  try {
    responseText = await upstream.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return proxyError(504, 'UPSTREAM_TIMEOUT', `GolfAPI did not respond within ${UPSTREAM_TIMEOUT_MS}ms`);
    }
    console.error('[golfapi-proxy] Failed to read upstream body:', error);
    return proxyError(502, 'UPSTREAM_UNREACHABLE', 'Failed to read GolfAPI response');
  }
  clearTimeout(timeoutId);

  console.log(`[golfapi-proxy] user=${user.id} GET ${validated.path} -> ${upstream.status}`);

  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) headers[name] = value;
  }

  // Pass through JSON verbatim; wrap a non-JSON body so the client can still parse it.
  let outBody = responseText;
  try {
    JSON.parse(responseText);
  } catch {
    outBody = JSON.stringify({ message: responseText || upstream.statusText });
  }

  return new Response(outBody, { status: upstream.status, headers });
});
