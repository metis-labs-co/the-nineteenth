# Remote Force-Update Gate — Design

**Date:** 2026-06-23
**Status:** Approved
**Current app version:** 1.13.1 (iOS build 0, Android versionCode 50)

## Problem

When a new app version is released, there is currently no way to require users
to update. JS-only changes ship silently via EAS Update (OTA), but native binary
releases (App Store / Play Store) cannot be forced, and there is no remote
kill-switch to block clients running a known-bad old build. We need a remote,
server-controlled gate that can (a) hard-block clients below a minimum version
and (b) softly nudge clients below the latest version.

## Goals

- **Hard gate:** clients below `minimum_version` see a non-dismissable
  "Update Required" screen and cannot use the app until they update.
- **Soft prompt:** clients below `latest_version` (but at/above minimum) see a
  dismissable "Update Available" prompt, shown once per install per version.
- **Remote control:** minimums are editable from the Supabase dashboard with no
  app deploy.
- **Fail open:** offline or failed checks never lock a user out (offline-first
  app — on-course scoring must always work).

## Non-Goals

- Replacing or gating EAS OTA updates.
- In-app update download (we deep-link to the stores).
- Per-user / per-cohort targeting (single minimum per platform only).

## Severity model (decided: option B)

| Running version vs config        | Result   | UI                                   |
|----------------------------------|----------|--------------------------------------|
| `< minimum_version`              | `hard`   | Full-screen, non-dismissable         |
| `>= minimum` and `< latest`      | `soft`   | Dismissable, once per install/version|
| `>= latest_version`              | `ok`     | Nothing                              |

## Data layer (Supabase)

New table `app_version_config`, one row per platform.

| column            | type        | notes                                            |
|-------------------|-------------|--------------------------------------------------|
| `platform`        | text PK     | `'ios'` \| `'android'` (check constraint)        |
| `minimum_version` | text NOT NULL | semver; below → hard gate                       |
| `latest_version`  | text NOT NULL | semver; below (≥min) → soft prompt              |
| `store_url`       | text NOT NULL | App Store / Play Store deep link (placeholder)  |
| `message`         | text NULL   | optional custom copy for both prompts            |
| `updated_at`      | timestamptz DEFAULT now() | bump on edit                        |

- **RLS:** enable RLS; one policy granting `SELECT` to `anon` and
  `authenticated`. No client write policies (edited via dashboard / service role).
- **Seed:** both rows seeded with `minimum_version = '1.13.1'` and
  `latest_version = '1.13.1'` (inert until raised) and placeholder `store_url`
  values for the project owner to fill with real store IDs.

## Client layer

### `src/utils/compareVersions.ts`
- `compareVersions(a: string, b: string): -1 | 0 | 1` — semver-aware numeric
  comparison of dot-separated parts. Missing parts treated as `0`
  (`'1.9' === '1.9.0'`). Must satisfy `1.9.0 < 1.10.0`.
- Pure, no dependencies. Fully unit-tested.

### `src/hooks/queries/useVersionGate.ts` (TanStack Query)
- Reads running version from `Constants.expoConfig?.version` and
  `Platform.OS` to pick the row.
- Fetches `app_version_config` for the platform with a **~3.5s timeout**.
- Computes status via `compareVersions`:
  - running `< minimum_version` → `'hard'`
  - running `< latest_version` → `'soft'`
  - else → `'ok'`
- **Fails open:** any error, timeout, offline, or missing row → `'ok'`.
- Re-runs on app foreground (AppState `active`), not blocking initial render.
- Returns `{ status, config }`.

### `src/components/common/ForceUpdateModal.tsx`
- Driven by `useVersionGate()` status. Wrapped in `<SystemModalTheme>` (project
  modal-surface rule).
- `hard`: full-screen overlay; no close button, no backdrop dismiss, Android
  hardware back disabled; single **"Update Now"** button → `Linking.openURL(store_url)`.
- `soft`: dismissable; **"Update"** (opens store) + **"Later"**. "Later" writes
  the seen `latest_version` to AsyncStorage under a fixed key; the soft prompt is
  suppressed until `latest_version` increases beyond the stored value.
- Shows `config.message` when present, else default copy.

### Mount point
- Mounted at app root, above navigation, so it overlays everything while the app
  still loads and renders underneath. Exact root component confirmed by reading
  `App.tsx` during planning.

## Behaviour summary

- **Offline golfer mid-round:** check fails → `'ok'` → never locked out.
- **Broken build shipped:** bump `minimum_version` in dashboard → old clients get
  hard gate on next foreground.
- **Routine release:** bump `latest_version` only → one-time soft nudge per install.

## Testing

- **Unit — `compareVersions`:** `1.9.0 < 1.10.0`, equality, missing patch
  (`'1.9'` vs `'1.9.0'`), larger major/minor/patch, leading-zero safety.
- **Unit — hook status logic:** ok / soft / hard mapping; fail-open on thrown
  error and on timeout; missing row → ok.
- **Unit — soft dedupe:** "Later" stores version; suppressed until `latest_version`
  rises.
- **Component — modal:** renders correct variant per status; hard variant exposes
  no dismiss path (no close, back disabled); buttons call `Linking.openURL` with
  `store_url`.

## Files

- `supabase/migrations/<ts>_app_version_config.sql`
- `src/types/models.ts` (+ `AppVersionConfig`)
- `src/utils/compareVersions.ts` (+ test)
- `src/hooks/queries/useVersionGate.ts` (+ test)
- `src/components/common/ForceUpdateModal.tsx` (+ test)
- root mount edit (`App.tsx` or root provider)

## Deployment notes

- Migration must be applied to staging + prod (per project deploy practice).
- Project owner fills real `store_url` values post-migration.
- Gate stays inert until `minimum_version` / `latest_version` are raised above the
  shipped app version.

### Reach caveat (important)

The gate logic ships as JS. It can only ever block a client that has actually
received this JS bundle — i.e. this app version (or a later OTA on the same
runtime channel). Consequences:

- It protects users **from this release forward**. A previously-shipped,
  genuinely-broken native build that never receives this bundle cannot be
  gated retroactively — the gate is a forward-looking kill-switch, not a
  retroactive one.
- `app.json` currently pins `runtimeVersion` (`1.12.7`) separately from
  `version` (`1.13.1`). Confirm the live OTA runtime channel actually delivers
  this bundle to current users, otherwise the gate never mounts on them.
- The gate compares the native `version` string; the real "force a native
  update" power comes from raising `minimum_version` once a new binary is on
  the stores.
