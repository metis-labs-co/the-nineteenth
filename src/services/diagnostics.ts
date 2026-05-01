/**
 * Client diagnostics — fire-and-forget event log to Supabase.
 *
 * Use this for instrumenting code paths we can't observe via console logs
 * (TestFlight production builds, hard-to-repro cold-start states). Events
 * are written to the `client_diagnostics` table; query by user_id and
 * created_at from the Supabase dashboard to read them back.
 *
 * Design rules:
 *  - Never throw. Never block the caller. Diagnostics must not become the
 *    very thing that's causing the issue we're trying to diagnose.
 *  - Don't `await` from call sites. The function returns synchronously and
 *    the network insert is dispatched in the background.
 *  - Log small payloads only. This is a debugging tool, not analytics.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase/client';

const APP_BUILD = (() => {
  const platform = Platform.OS;
  const version = Constants.expoConfig?.version ?? 'unknown';
  const ios = Constants.expoConfig?.ios?.buildNumber;
  const android = Constants.expoConfig?.android?.versionCode;
  const build = ios ?? (android != null ? String(android) : 'unknown');
  return `${platform}-${version}-${build}`;
})();

export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Record a diagnostic event. Returns immediately; the actual insert runs in
 * the background and silently swallows any error.
 */
export function pushDiagnostic(
  eventName: string,
  payload?: Record<string, unknown>,
  level: DiagnosticLevel = 'info'
): void {
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
      await (supabase.from('client_diagnostics') as any).insert({
        event_name: eventName,
        level,
        payload: payload ?? null,
        app_build: APP_BUILD,
        client_timestamp: new Date().toISOString(),
      });
    } catch {
      // Best-effort. Swallow errors so a hung/failed diagnostic insert never
      // cascades into the calling flow.
    }
  })();
}
