/**
 * UI failsafe for round-data hooks.
 *
 * The hooks in this directory wrap raw Supabase calls with `useState(true)`
 * for loading. If a request hangs with no response and no error (TCP socket
 * waiting indefinitely on a flaky network), `setIsLoading(false)` is never
 * called, leaving the score-entry screen stuck on the spinner forever.
 *
 * `scheduleFetchTimeout` arms a fallback that surfaces an error and clears
 * the spinner after `FETCH_TIMEOUT_MS`. The underlying request is NOT
 * aborted — Supabase JS doesn't expose a clean abort path through its
 * builder API — so a late-resolving response can still update state via
 * the normal success/error code path.
 *
 * Callers must invoke the returned `cancel()` (typically in a `finally`
 * block) so a fast response doesn't fire the fallback.
 */
export const FETCH_TIMEOUT_MS = 15_000;

export function scheduleFetchTimeout(
  label: string,
  onTimeout: (message: string) => void
): () => void {
  const timer = setTimeout(() => {
    onTimeout(
      `Loading ${label} is taking too long — check your connection and try again.`
    );
  }, FETCH_TIMEOUT_MS);
  return () => clearTimeout(timer);
}
