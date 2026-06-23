/**
 * useVersionGate — reads the remote force-update config and reports whether
 * the running build is current (`ok`), behind latest (`soft`), or below the
 * hard minimum (`hard`).
 *
 * Fails open: any error, offline, timeout, or missing row → `ok`. The check
 * refetches whenever the app returns to the foreground so a freshly-raised
 * minimum takes effect without a cold start.
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import { isBelow } from '@/utils/compareVersions';
import type { AppVersionConfig, GatePlatform } from '@/types';

export type GateStatus = 'ok' | 'soft' | 'hard';

const FETCH_TIMEOUT_MS = 3500;

// Until supabase Database types are regenerated post-migration, the generated
// client doesn't know about `app_version_config`. Cast to bypass the `never` table.
const versionConfigTable = () =>
  (supabase as unknown as { from: (t: string) => any }).from('app_version_config');

export const versionGateKeys = {
  all: ['appVersionConfig'] as const,
  platform: (p: GatePlatform) => [...versionGateKeys.all, p] as const,
};

function runningVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

function gatePlatform(): GatePlatform {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

/** Pure status resolver — the testable core of the gate. */
export function resolveGateStatus(running: string, config: AppVersionConfig | null): GateStatus {
  if (!config) return 'ok';
  if (isBelow(running, config.minimumVersion)) return 'hard';
  if (isBelow(running, config.latestVersion)) return 'soft';
  return 'ok';
}

/** Fetch the config row for a platform. Returns null on any failure. */
export async function fetchVersionConfig(platform: GatePlatform): Promise<AppVersionConfig | null> {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), FETCH_TIMEOUT_MS)
    );
    const query = versionConfigTable()
      .select('platform, minimum_version, latest_version, store_url, message')
      .eq('platform', platform)
      .maybeSingle()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return null;
        const row = data as {
          platform: GatePlatform;
          minimum_version: string;
          latest_version: string;
          store_url: string;
          message: string | null;
        };
        return {
          platform: row.platform,
          minimumVersion: row.minimum_version,
          latestVersion: row.latest_version,
          storeUrl: row.store_url,
          message: row.message,
        } satisfies AppVersionConfig;
      });
    return await Promise.race([query, timeout]);
  } catch {
    return null; // fail open
  }
}

export function useVersionGate(): {
  status: GateStatus;
  config: AppVersionConfig | null;
} {
  const platform = gatePlatform();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: versionGateKeys.platform(platform),
    queryFn: () => fetchVersionConfig(platform),
    staleTime: CACHE_TIMES.STANDARD,
    retry: false,
  });

  // Re-check whenever the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: versionGateKeys.all });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  const config = data ?? null;
  return { status: resolveGateStatus(runningVersion(), config), config };
}
