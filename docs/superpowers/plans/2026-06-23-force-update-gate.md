# Force-Update Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a remote, server-controlled gate that hard-blocks app clients below a minimum version and softly nudges clients below the latest version.

**Architecture:** A Supabase table (`app_version_config`, one row per platform) is the source of truth. A TanStack Query hook (`useVersionGate`) reads it on app foreground, compares against the running app version with a semver-aware util, and returns a status (`ok` / `soft` / `hard`). A root-mounted overlay component (`ForceUpdateModal`) renders a non-dismissable screen for `hard` and a once-per-version dismissable prompt for `soft`. All checks fail open (offline / error / timeout → `ok`).

**Tech Stack:** React Native (Expo SDK 54), TypeScript, Supabase (`@/services/supabase/client`), TanStack Query, AsyncStorage, `expo-constants`, `react-native` `Linking` + `BackHandler`, Jest.

## Global Constraints

- **Fail open always:** any fetch error, timeout (~3.5s), offline, or missing row resolves to status `ok`. Never lock out on uncertainty.
- **Running version source:** `Constants.expoConfig?.version` (mirror `APP_VERSION` in `src/constants/app.ts`). Current shipped version is `1.13.1`.
- **Platform rows:** exactly `'ios'` and `'android'`.
- **Semver rule:** comparison must satisfy `1.9.0 < 1.10.0`; missing parts treated as `0` (`'1.9'` == `'1.9.0'`).
- **Soft prompt cadence:** once per install per `latest_version` — store the dismissed version in AsyncStorage; re-show only when `latest_version` rises above it.
- **Hard gate:** no close control, no backdrop dismiss, Android hardware back disabled.
- **Store URLs:** held in the table as placeholders for the owner to fill — do NOT invent real App Store / Play Store IDs.
- **Modal legibility:** the card content must render on a solid surface — wrap content in `<SystemModalTheme>` from `@/components/common`, using the outer-wrapper / inner-content split (never call `useThemeColors()` above the wrap).
- **Theming:** use `useThemeColors()` for colors, import static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) from `@/constants/theme`. Do NOT use Paper's `Button`; use `TouchableOpacity`.
- Migration must be deployable to staging + prod; seed both rows with current version so the gate is inert until raised.

---

### Task 1: Database migration — `app_version_config` table

**Files:**
- Create: `supabase/migrations/20260623000000_app_version_config.sql`

**Interfaces:**
- Produces: table `public.app_version_config` with columns `platform` (text PK, check `in ('ios','android')`), `minimum_version` (text not null), `latest_version` (text not null), `store_url` (text not null), `message` (text null), `updated_at` (timestamptz default now()). Public `SELECT` via RLS for `anon` + `authenticated`. Two seeded rows.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260623000000_app_version_config.sql`:

```sql
-- Remote force-update gate configuration.
-- One row per platform. Edited via Supabase dashboard / service role only;
-- clients have read-only access.

create table if not exists public.app_version_config (
  platform        text primary key check (platform in ('ios', 'android')),
  minimum_version text not null,
  latest_version  text not null,
  store_url       text not null,
  message         text,
  updated_at      timestamptz not null default now()
);

comment on table public.app_version_config is
  'Remote force-update gate: minimum/latest app version per platform.';
comment on column public.app_version_config.minimum_version is
  'Clients below this version are hard-blocked (must update).';
comment on column public.app_version_config.latest_version is
  'Clients below this (but at/above minimum) get a dismissable soft prompt.';

alter table public.app_version_config enable row level security;

-- Public read: anyone (signed in or not) can read the gate config.
create policy "app_version_config_read"
  on public.app_version_config
  for select
  to anon, authenticated
  using (true);

-- Seed both platforms inert (minimum == latest == current shipped version).
-- TODO(owner): replace store_url placeholders with real listing URLs.
insert into public.app_version_config
  (platform, minimum_version, latest_version, store_url, message)
values
  ('ios',     '1.13.1', '1.13.1',
   'https://apps.apple.com/app/idREPLACE_ME', null),
  ('android', '1.13.1', '1.13.1',
   'https://play.google.com/store/apps/details?id=REPLACE_ME', null)
on conflict (platform) do nothing;
```

- [ ] **Step 2: Verify SQL parses (lint)**

Run: `grep -c "create policy" supabase/migrations/20260623000000_app_version_config.sql`
Expected: `1`

(Local `supabase db reset` is optional; if the local stack is running, run it and confirm no errors. Otherwise rely on review — migration is applied during deployment.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260623000000_app_version_config.sql
git commit -m "feat(db): app_version_config table for force-update gate"
```

---

### Task 2: `AppVersionConfig` type

**Files:**
- Modify: `src/types/models.ts` (append near other config/model types)

**Interfaces:**
- Produces: exported `type GatePlatform = 'ios' | 'android'`; exported `interface AppVersionConfig { platform: GatePlatform; minimumVersion: string; latestVersion: string; storeUrl: string; message: string | null; }`

- [ ] **Step 1: Add the type**

Append to `src/types/models.ts`:

```typescript
// Remote force-update gate configuration (mirrors public.app_version_config).
export type GatePlatform = 'ios' | 'android';

export interface AppVersionConfig {
  platform: GatePlatform;
  minimumVersion: string;
  latestVersion: string;
  storeUrl: string;
  message: string | null;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: no new errors referencing `models.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/models.ts
git commit -m "feat(types): AppVersionConfig for force-update gate"
```

---

### Task 3: `compareVersions` util (TDD)

**Files:**
- Create: `src/utils/compareVersions.ts`
- Test: `src/utils/__tests__/compareVersions.test.ts`

**Interfaces:**
- Produces: `compareVersions(a: string, b: string): -1 | 0 | 1` and `isBelow(running: string, target: string): boolean` (`=== compareVersions(running, target) < 0`).

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/compareVersions.test.ts`:

```typescript
import { compareVersions, isBelow } from '../compareVersions';

describe('compareVersions', () => {
  it('treats equal versions as 0', () => {
    expect(compareVersions('1.13.1', '1.13.1')).toBe(0);
  });

  it('treats missing patch as zero', () => {
    expect(compareVersions('1.9', '1.9.0')).toBe(0);
  });

  it('orders numerically, not lexically (1.9.0 < 1.10.0)', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('compares major then minor then patch', () => {
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
    expect(compareVersions('1.13.0', '1.13.1')).toBe(-1);
  });

  it('handles leading zeros safely', () => {
    expect(compareVersions('1.08.0', '1.8.0')).toBe(0);
  });
});

describe('isBelow', () => {
  it('is true when running is older than target', () => {
    expect(isBelow('1.13.0', '1.13.1')).toBe(true);
  });
  it('is false when running equals or exceeds target', () => {
    expect(isBelow('1.13.1', '1.13.1')).toBe(false);
    expect(isBelow('1.14.0', '1.13.1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/utils/__tests__/compareVersions.test.ts`
Expected: FAIL — cannot find module `../compareVersions`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/compareVersions.ts`:

```typescript
/**
 * Semver-aware comparison of dot-separated version strings.
 *
 * Compares major.minor.patch numerically (so 1.9.0 < 1.10.0). Missing
 * trailing parts are treated as 0, so '1.9' === '1.9.0'. Non-numeric or
 * malformed parts coerce to 0 rather than throwing — callers treat an
 * unparseable version as "equal" and the gate fails open elsewhere.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.');
  const pb = b.split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = parseInt(pa[i] ?? '0', 10) || 0;
    const nb = parseInt(pb[i] ?? '0', 10) || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/** True when `running` is strictly older than `target`. */
export function isBelow(running: string, target: string): boolean {
  return compareVersions(running, target) < 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/utils/__tests__/compareVersions.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/utils/compareVersions.ts src/utils/__tests__/compareVersions.test.ts
git commit -m "feat(utils): semver-aware compareVersions for version gate"
```

---

### Task 4: `useVersionGate` hook (TDD)

**Files:**
- Create: `src/hooks/queries/useVersionGate.ts`
- Test: `src/hooks/queries/__tests__/useVersionGate.test.ts`

**Interfaces:**
- Consumes: `compareVersions` / `isBelow` from `@/utils/compareVersions`; `AppVersionConfig`, `GatePlatform` from `@/types/models`; `supabase` from `@/services/supabase/client`.
- Produces:
  - `export type GateStatus = 'ok' | 'soft' | 'hard';`
  - `export function resolveGateStatus(running: string, config: AppVersionConfig | null): GateStatus` — pure: `null`→`'ok'`; `isBelow(running, minimumVersion)`→`'hard'`; `isBelow(running, latestVersion)`→`'soft'`; else `'ok'`.
  - `export async function fetchVersionConfig(platform: GatePlatform): Promise<AppVersionConfig | null>` — selects the row, maps snake→camel, returns `null` on error.
  - `export function useVersionGate(): { status: GateStatus; config: AppVersionConfig | null }` — TanStack Query, refetches on app foreground, fails open.

The pure `resolveGateStatus` carries the testable logic; the hook is a thin wrapper. We unit-test `resolveGateStatus` directly (no React renderer needed).

- [ ] **Step 1: Write the failing test**

Create `src/hooks/queries/__tests__/useVersionGate.test.ts`:

```typescript
import { resolveGateStatus } from '../useVersionGate';
import type { AppVersionConfig } from '@/types/models';

const cfg = (min: string, latest: string): AppVersionConfig => ({
  platform: 'ios',
  minimumVersion: min,
  latestVersion: latest,
  storeUrl: 'https://example.com',
  message: null,
});

describe('resolveGateStatus', () => {
  it('fails open to ok when config is null', () => {
    expect(resolveGateStatus('1.0.0', null)).toBe('ok');
  });

  it('returns hard when running is below minimum', () => {
    expect(resolveGateStatus('1.12.0', cfg('1.13.0', '1.13.1'))).toBe('hard');
  });

  it('returns soft when at/above minimum but below latest', () => {
    expect(resolveGateStatus('1.13.0', cfg('1.13.0', '1.13.1'))).toBe('soft');
  });

  it('returns ok when at latest', () => {
    expect(resolveGateStatus('1.13.1', cfg('1.13.0', '1.13.1'))).toBe('ok');
  });

  it('returns ok when newer than latest', () => {
    expect(resolveGateStatus('1.14.0', cfg('1.13.0', '1.13.1'))).toBe('ok');
  });

  it('hard takes precedence (numeric, not lexical)', () => {
    expect(resolveGateStatus('1.9.0', cfg('1.10.0', '1.10.0'))).toBe('hard');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/hooks/queries/__tests__/useVersionGate.test.ts`
Expected: FAIL — cannot find module `../useVersionGate`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/queries/useVersionGate.ts`:

```typescript
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
import type { AppVersionConfig, GatePlatform } from '@/types/models';

export type GateStatus = 'ok' | 'soft' | 'hard';

const FETCH_TIMEOUT_MS = 3500;

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
export function resolveGateStatus(
  running: string,
  config: AppVersionConfig | null
): GateStatus {
  if (!config) return 'ok';
  if (isBelow(running, config.minimumVersion)) return 'hard';
  if (isBelow(running, config.latestVersion)) return 'soft';
  return 'ok';
}

/** Fetch the config row for a platform. Returns null on any failure. */
export async function fetchVersionConfig(
  platform: GatePlatform
): Promise<AppVersionConfig | null> {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), FETCH_TIMEOUT_MS)
    );
    const query = supabase
      .from('app_version_config')
      .select('platform, minimum_version, latest_version, store_url, message')
      .eq('platform', platform)
      .maybeSingle()
      .then(({ data, error }) => {
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
```

Note: if the generated Supabase `Database` type doesn't yet know `app_version_config`, mirror the existing pattern in `useBag.ts` (cast `supabase` for the `.from('app_version_config')` call) to avoid a `never` table type. Apply only if `pnpm type-check` complains.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/hooks/queries/__tests__/useVersionGate.test.ts`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: no new errors in `useVersionGate.ts` (apply the cast note above if needed, then re-run).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/queries/useVersionGate.ts src/hooks/queries/__tests__/useVersionGate.test.ts
git commit -m "feat(hooks): useVersionGate force-update status hook"
```

---

### Task 5: `ForceUpdateModal` component (TDD)

**Files:**
- Create: `src/components/common/ForceUpdateModal.tsx`
- Modify: `src/components/common/index.ts` (export it)
- Test: `src/components/common/__tests__/ForceUpdateModal.test.tsx`

**Interfaces:**
- Consumes: `useVersionGate` (`GateStatus`, config) from `@/hooks/queries/useVersionGate`; `SystemModalTheme` from `@/components/common`; `useThemeColors` from `@/context/ThemeContext`; theme tokens; `Linking`, `BackHandler` from `react-native`; `AsyncStorage`.
- Produces: default export `ForceUpdateModal` (no props — self-driving via `useVersionGate`). Renders nothing for `ok`. For `soft`, suppresses itself if the dismissed-version stored in AsyncStorage (`@nineteenth/version_gate_dismissed`) is >= the config `latestVersion`.

The visible/hidden decision is pure and lives in `shouldShowSoft(latestVersion, dismissedVersion)` — exported and unit-tested. The component is otherwise a thin presentational shell driven by the hook.

- [ ] **Step 1: Write the failing test**

Create `src/components/common/__tests__/ForceUpdateModal.test.tsx`:

```typescript
import { shouldShowSoft } from '../ForceUpdateModal';

describe('shouldShowSoft', () => {
  it('shows when nothing dismissed yet', () => {
    expect(shouldShowSoft('1.13.1', null)).toBe(true);
  });

  it('hides when dismissed version equals latest', () => {
    expect(shouldShowSoft('1.13.1', '1.13.1')).toBe(false);
  });

  it('hides when dismissed version is newer than latest', () => {
    expect(shouldShowSoft('1.13.1', '1.14.0')).toBe(false);
  });

  it('shows again when latest rises above dismissed', () => {
    expect(shouldShowSoft('1.14.0', '1.13.1')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/components/common/__tests__/ForceUpdateModal.test.tsx`
Expected: FAIL — cannot find module `../ForceUpdateModal`.

- [ ] **Step 3: Write the implementation**

Create `src/components/common/ForceUpdateModal.tsx`:

```typescript
/**
 * ForceUpdateModal — root-mounted overlay driven by useVersionGate().
 *
 *  - status 'hard': full-screen, non-dismissable. No close, no backdrop
 *    dismiss, Android hardware back swallowed. Single "Update Now" button.
 *  - status 'soft': dismissable card with "Update" + "Later". "Later" stores
 *    the latest version so the prompt stays quiet until a newer one ships.
 *  - status 'ok': renders nothing.
 *
 * Rendered as a plain absolutely-positioned overlay inside the RN tree (not a
 * system <Modal>), so the app's backdrop stays visible. The card content is
 * wrapped in <SystemModalTheme> for a solid, legible surface regardless of the
 * user's surface/backdrop settings (outer wrapper holds no theme reads).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SystemModalTheme } from './SystemModalTheme';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useVersionGate } from '@/hooks/queries/useVersionGate';
import { compareVersions } from '@/utils/compareVersions';
import type { AppVersionConfig } from '@/types/models';

const DISMISSED_KEY = '@nineteenth/version_gate_dismissed';

const HARD_TITLE = 'Update Required';
const HARD_BODY =
  'This version of The Nineteenth is no longer supported. Please update to keep playing.';
const SOFT_TITLE = 'Update Available';
const SOFT_BODY = 'A new version of The Nineteenth is available.';

/** Pure: should the soft prompt show given the last-dismissed version? */
export function shouldShowSoft(
  latestVersion: string,
  dismissedVersion: string | null
): boolean {
  if (!dismissedVersion) return true;
  return compareVersions(latestVersion, dismissedVersion) > 0;
}

export default function ForceUpdateModal() {
  const { status, config } = useVersionGate();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [loadedDismissed, setLoadedDismissed] = useState(false);

  // Load the last-dismissed soft version once.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((v) => {
        if (active) {
          setDismissedVersion(v);
          setLoadedDismissed(true);
        }
      })
      .catch(() => {
        if (active) setLoadedDismissed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const isHard = status === 'hard';

  // Swallow Android hardware back while the hard gate is up.
  useEffect(() => {
    if (!isHard) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isHard]);

  const openStore = useCallback(() => {
    if (config?.storeUrl) Linking.openURL(config.storeUrl).catch(() => {});
  }, [config]);

  const dismissSoft = useCallback(() => {
    if (config?.latestVersion) {
      AsyncStorage.setItem(DISMISSED_KEY, config.latestVersion).catch(() => {});
      setDismissedVersion(config.latestVersion);
    }
  }, [config]);

  if (status === 'ok' || !config) return null;
  if (status === 'soft') {
    if (!loadedDismissed) return null; // avoid a flash before we know
    if (!shouldShowSoft(config.latestVersion, dismissedVersion)) return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <SystemModalTheme>
        <ForceUpdateCard
          isHard={isHard}
          config={config}
          onUpdate={openStore}
          onLater={dismissSoft}
        />
      </SystemModalTheme>
    </View>
  );
}

interface CardProps {
  isHard: boolean;
  config: AppVersionConfig;
  onUpdate: () => void;
  onLater: () => void;
}

function ForceUpdateCard({ isHard, config, onUpdate, onLater }: CardProps) {
  const colors = useThemeColors();
  const title = isHard ? HARD_TITLE : SOFT_TITLE;
  const body = config.message ?? (isHard ? HARD_BODY : SOFT_BODY);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={onUpdate}
        accessibilityRole="button"
        accessibilityLabel="Update now"
      >
        <Text style={{ ...typography.bodyBold, color: colors.white }}>
          Update Now
        </Text>
      </TouchableOpacity>

      {!isHard && (
        <TouchableOpacity
          style={styles.laterButton}
          onPress={onLater}
          accessibilityRole="button"
          accessibilityLabel="Remind me later"
        >
          <Text style={{ ...typography.body, color: colors.textSecondary }}>
            Later
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    ...shadows.sm,
  },
  laterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: spacing.sm,
  },
});
```

Note: confirm `typography.h2`, `borderRadius.lg`, `shadows.lg`, and `colors.white` exist in `src/constants/theme.ts`; if a token name differs, use the nearest existing equivalent (e.g. `typography.h3`, `shadows.md`). Do not invent tokens.

- [ ] **Step 4: Export from the common barrel**

Modify `src/components/common/index.ts` — add:

```typescript
export { default as ForceUpdateModal, shouldShowSoft } from './ForceUpdateModal';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm jest src/components/common/__tests__/ForceUpdateModal.test.tsx`
Expected: PASS (all 4 cases).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: no new errors in `ForceUpdateModal.tsx` (fix any token-name mismatches per the note, then re-run).

- [ ] **Step 7: Commit**

```bash
git add src/components/common/ForceUpdateModal.tsx src/components/common/index.ts src/components/common/__tests__/ForceUpdateModal.test.tsx
git commit -m "feat(components): ForceUpdateModal overlay for version gate"
```

---

### Task 6: Mount the gate at app root

**Files:**
- Modify: `App.tsx` (inside `AppContent`, alongside `RootNavigator` / `UnifiedToastDisplay`)

**Interfaces:**
- Consumes: `ForceUpdateModal` from `@/components/common`.

The gate must render above navigation. `AppContent` already sits inside `QueryClientProvider` (App default export) and renders `RootNavigator` + `UnifiedToastDisplay` inside the themed root `View` — the modal goes there so it overlays everything, uses TanStack Query, and resolves theme.

- [ ] **Step 1: Import the component**

In `App.tsx`, add to the existing import from the common barrel (there is already `import { UnifiedToastDisplay } from '@/components/common/Toast';` — add a separate import):

```typescript
import { ForceUpdateModal } from '@/components/common';
```

- [ ] **Step 2: Render it as the last child of the root View**

In `AppContent`'s returned tree, add `<ForceUpdateModal />` immediately after `<UnifiedToastDisplay />`:

```tsx
            <RootNavigator theme={navigationTheme} />
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <UnifiedToastDisplay />
            <ForceUpdateModal />
          </View>
```

- [ ] **Step 3: Type-check + full test suite (diff vs baseline)**

Run: `pnpm type-check`
Expected: no new errors.

Run: `pnpm jest src/utils/__tests__/compareVersions.test.ts src/hooks/queries/__tests__/useVersionGate.test.ts src/components/common/__tests__/ForceUpdateModal.test.tsx`
Expected: all PASS. (The repo has a known ~243 pre-existing failures on `main`; only these three new files must pass.)

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(app): mount ForceUpdateModal version gate at root"
```

---

## Manual verification (post-implementation, on-device / simulator)

These are not automated — note them in the outstanding-work memory.

1. **Soft prompt:** in the dashboard set `ios` `latest_version` to `1.14.0` (above shipped `1.13.1`), leave `minimum_version` at `1.13.1`. Foreground the app → "Update Available" with Update + Later. Tap Later → it disappears and stays gone after re-foregrounding. "Update Now" opens the store URL.
2. **Hard gate:** set `minimum_version` to `1.14.0`. Foreground → non-dismissable "Update Required"; Android back does nothing; no way past it.
3. **Fail open:** airplane mode + cold start → app loads normally, no gate.
4. **Inert default:** with both values at `1.13.1`, no prompt ever appears.
5. Verify in both light and dark themes and with translucent + image backdrop (card stays solid/legible).

## Deployment

- Apply `20260623000000_app_version_config.sql` to **staging** then **prod**.
- Replace the `store_url` placeholders (`idREPLACE_ME` / `id=REPLACE_ME`) with the real listing URLs.
- Keep `minimum_version` / `latest_version` at the shipped version until you actually want to gate.

## Self-Review

- **Spec coverage:** table + RLS + seed (Task 1) ✓; `AppVersionConfig` type (Task 2) ✓; semver compare incl. `1.9.0<1.10.0` (Task 3) ✓; hook with fail-open, timeout, foreground refetch, status mapping (Task 4) ✓; modal hard/soft variants, once-per-version dedupe, SystemModalTheme, store deep-link (Task 5) ✓; root mount (Task 6) ✓; tests for all logic units ✓; fail-open + offline behaviour ✓; deployment notes ✓.
- **Placeholder scan:** the only intentional placeholders are the `store_url` values, explicitly flagged as owner TODO in spec + plan. No vague "add error handling" steps — fail-open is concretely coded.
- **Type consistency:** `AppVersionConfig` fields (`minimumVersion`/`latestVersion`/`storeUrl`/`message`) used identically in Tasks 4 & 5; `GateStatus` values (`ok`/`soft`/`hard`) consistent; `resolveGateStatus` / `shouldShowSoft` / `compareVersions` / `isBelow` signatures match across tasks.
