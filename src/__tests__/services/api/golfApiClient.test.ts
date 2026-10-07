/**
 * Unit tests for golfApiClient.
 *
 * The client no longer calls GolfAPI.io directly: every request goes through
 * the `golfapi-proxy` Supabase edge function (which holds the API key). These
 * tests mock supabase.functions.invoke and verify the request shape plus the
 * mapping of proxy/GolfAPI responses onto the client's public error classes.
 */

import {
  GolfApiClient,
  GOLFAPI_PROXY_FUNCTION,
  GolfApiClientError,
  RateLimitError,
  NotFoundError,
  AuthenticationError,
  NetworkError,
} from '@/services/api/golfApiClient';

const mockInvoke = jest.fn();
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

/** Minimal stand-in for the fetch Response carried by FunctionsHttpError.context */
function fakeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    status,
    statusText: `Status ${status}`,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

/** Shape of supabase-js FunctionsHttpError (non-2xx from the function) */
function httpError(status: number, body: unknown, headers?: Record<string, string>) {
  const error = new Error('Edge Function returned a non-2xx status code') as Error & {
    context: unknown;
  };
  error.name = 'FunctionsHttpError';
  error.context = fakeResponse(status, body, headers);
  return { data: null, error, response: error.context };
}

/** Shape of supabase-js FunctionsFetchError (network failure / abort) */
function fetchError(cause: Error) {
  const error = new Error('Failed to send a request to the Edge Function') as Error & {
    context: unknown;
  };
  error.name = 'FunctionsFetchError';
  error.context = cause;
  return { data: null, error };
}

describe('golfApiClient (via golfapi-proxy)', () => {
  let client: GolfApiClient;

  beforeEach(() => {
    mockInvoke.mockReset();
    client = new GolfApiClient();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('is always available (key lives server-side)', () => {
    expect(client.isAvailable()).toBe(true);
  });

  describe('request shape', () => {
    it('searchClubs invokes the proxy with /clubs, mapped country and cleaned params', async () => {
      mockInvoke.mockResolvedValue({
        data: { apiRequestsLeft: 4321, clubs: [{ clubID: '1', clubName: 'Test GC' }] },
        error: null,
      });

      const clubs = await client.searchClubs({
        query: 'Kingston',
        country: 'United Kingdom',
        state: undefined,
        latitude: -37.9,
        longitude: 145.1,
        radius: 25,
      });

      expect(clubs).toEqual([{ clubID: '1', clubName: 'Test GC' }]);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      const [fnName, options] = mockInvoke.mock.calls[0];
      expect(fnName).toBe(GOLFAPI_PROXY_FUNCTION);
      expect(fnName).toBe('golfapi-proxy');
      expect(options.method).toBe('POST');
      expect(options.signal).toBeDefined();
      expect(options.body).toEqual({
        path: '/clubs',
        params: {
          country: 'UK',
          name: 'Kingston',
          latitude: '-37.9',
          longitude: '145.1',
          radius: '25',
        },
      });
      // No API key is ever sent from the client
      expect(JSON.stringify(options)).not.toMatch(/Bearer|apiKey/i);
    });

    it('defaults country to Australia', async () => {
      mockInvoke.mockResolvedValue({ data: { clubs: [] }, error: null });
      await client.searchClubs({ query: 'Royal' });
      expect(mockInvoke.mock.calls[0][1].body.params.country).toBe('Australia');
    });

    it.each([
      ['getClub', '/clubs/141520610397251566'],
      ['getCourse', '/courses/141520610397251566'],
      ['getCoordinates', '/coordinates/141520610397251566'],
    ] as const)('%s calls %s with no params', async (method, path) => {
      mockInvoke.mockResolvedValue({ data: { apiRequestsLeft: 10 }, error: null });
      await client[method]('141520610397251566');
      expect(mockInvoke.mock.calls[0][1].body).toEqual({ path, params: undefined });
    });

    it.each(['getClub', 'getCourse', 'getCoordinates'] as const)(
      '%s rejects an empty id without calling the proxy',
      async (method) => {
        await expect(client[method]('')).rejects.toThrow(/ID is required/);
        expect(mockInvoke).not.toHaveBeenCalled();
      }
    );
  });

  describe('quota tracking', () => {
    it('tracks apiRequestsLeft from the passed-through body', async () => {
      expect(client.apiRequestsLeft).toBeNull();
      expect(client.hasQuota()).toBe(true);

      mockInvoke.mockResolvedValue({ data: { apiRequestsLeft: '3' }, error: null });
      await client.getClub('1');

      expect(client.apiRequestsLeft).toBe(3);
      expect(client.getRemainingRequests()).toBe(3);
      expect(client.lastRequestTime).toBeInstanceOf(Date);
      expect(client.hasQuota(3)).toBe(true);
      expect(client.hasQuota(4)).toBe(false);
    });
  });

  describe('error mapping', () => {
    it('404 -> NotFoundError with resource info', async () => {
      mockInvoke.mockResolvedValue(httpError(404, { message: 'nope' }));
      const err = await client.getCourse('abc').catch((e) => e);
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.resourceType).toBe('course');
      expect(err.resourceId).toBe('abc');
    });

    it('429 -> RateLimitError using forwarded headers, quota set to 0', async () => {
      mockInvoke.mockResolvedValue(
        httpError(429, {}, { 'Retry-After': '30', 'X-RateLimit-Limit': '500' })
      );
      const err = await client.getClub('1').catch((e) => e);
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.retryAfter).toBe(30);
      expect(err.limit).toBe(500);
      expect(client.apiRequestsLeft).toBe(0);
    });

    it.each([401, 403] as const)('%s -> AuthenticationError', async (status) => {
      mockInvoke.mockResolvedValue(
        httpError(status, { error: 'Unauthorized', code: 'UNAUTHENTICATED' })
      );
      const err = await client.getClub('1').catch((e) => e);
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.status).toBe(status);
      expect(err.message).toBe('Unauthorized');
    });

    it('proxy 503 (secret unset) -> GolfApiClientError with proxy code', async () => {
      mockInvoke.mockResolvedValue(
        httpError(503, {
          error: 'Course search is temporarily unavailable',
          code: 'PROXY_NOT_CONFIGURED',
        })
      );
      const err = await client.getClub('1').catch((e) => e);
      expect(err).toBeInstanceOf(GolfApiClientError);
      expect(err).not.toBeInstanceOf(NotFoundError);
      expect(err.status).toBe(503);
      expect(err.code).toBe('PROXY_NOT_CONFIGURED');
      expect(err.message).toBe('Course search is temporarily unavailable');
    });

    it('proxy 400 (disallowed path) -> GolfApiClientError', async () => {
      mockInvoke.mockResolvedValue(
        httpError(400, { error: 'Path not allowed: /x', code: 'INVALID_REQUEST' })
      );
      const err = await client.getClub('1').catch((e) => e);
      expect(err).toBeInstanceOf(GolfApiClientError);
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_REQUEST');
    });

    it('upstream 500 -> GolfApiClientError with HTTP_ code', async () => {
      mockInvoke.mockResolvedValue(httpError(500, { message: 'boom' }));
      const err = await client.getClub('1').catch((e) => e);
      expect(err).toBeInstanceOf(GolfApiClientError);
      expect(err.code).toBe('HTTP_500');
      expect(err.message).toBe('boom');
    });

    it('fetch failure -> NetworkError', async () => {
      mockInvoke.mockResolvedValue(fetchError(new TypeError('Network request failed')));
      const err = await client.getClub('1').catch((e) => e);
      expect(err).toBeInstanceOf(NetworkError);
      expect(err.message).toMatch(/Network request failed/);
    });

    it('a thrown invoke error -> NetworkError', async () => {
      mockInvoke.mockRejectedValue(new TypeError('boom'));
      await expect(client.getClub('1')).rejects.toBeInstanceOf(NetworkError);
    });

    it('times out via AbortController -> NetworkError', async () => {
      jest.useFakeTimers();
      mockInvoke.mockImplementation(
        (_name: string, options: { signal: AbortSignal }) =>
          new Promise((resolve) => {
            options.signal.addEventListener('abort', () => {
              const abortErr = new Error('Aborted');
              abortErr.name = 'AbortError';
              resolve(fetchError(abortErr));
            });
          })
      );

      const promise = client.getClub('1').catch((e) => e);
      jest.advanceTimersByTime(20000);
      const err = await promise;

      expect(err).toBeInstanceOf(NetworkError);
      expect(err.message).toBe('Request timed out after 20000ms');
    });
  });
});
