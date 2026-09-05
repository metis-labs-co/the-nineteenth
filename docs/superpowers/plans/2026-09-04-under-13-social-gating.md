# Under-13 Social Gating Implementation Plan (Part A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate eight social surfaces behind an age signal so the App Store "Social Media Disabled for Users Under 13" declaration is truthful, without degrading the experience of any existing user during rollout.

**Architecture:** A small `src/services/age/` module resolves an `AgeStatus` from Apple's Declared Age Range API (iOS 26+) or a date-of-birth fallback, and persists only the derived band to `players.age_status`. Enforcement lives in Postgres — RLS policies and RPCs consult a `social_enabled()` helper — and is deployed inert behind an `age_gate_config.enforce` kill switch so the migration is a no-op until adoption is sufficient.

**Tech Stack:** Expo SDK 54 / React Native 0.81.5, TypeScript, Supabase (PostgreSQL + RLS), TanStack Query, Jest, `expo-age-range@0.2.1`.

**Spec:** `docs/superpowers/specs/2026-09-04-social-media-compliance-design.md` (Part A, §1–§11)

## Global Constraints

- **Dependency pin: `expo-age-range@0.2.1` exactly.** It is the last release on the SDK-54 toolchain (`expo-module-scripts@^5.0.7`); 0.2.2+ moved to SDK 55. Do not upgrade, do not use `^`.
- **iOS deployment target stays 15.1.** The module's podspec is already `:ios => '15.1'` and guards internally with `#available(iOS 26.0, *)`.
- **Never trust the module's return value below iOS 26.** It returns `lowerBound: 18` — a fake adult. Always check the OS version first.
- **Never persist a date of birth.** DOB is classified in memory and discarded. It must not reach the database, analytics, or any log line.
- **Never put `social_enabled()` inside `can_view_round()`.** That helper is shared with round-visibility logic; gating it there breaks scorecard visibility for every user. The check goes on each individual policy.
- **The kill switch ships `false`.** Every migration in this plan must be a behavioural no-op on deploy.
- Player profile rows are **snake_case at runtime** (`photo_url`, not `photoUrl`), despite the `Player` interface in `src/types/index.ts`. Use `age_status`.
- Migration filenames follow `YYYYMMDDHHMMSS_name.sql`.
- **The client never reads `age_gate_config.enforce`.** Client gating keys off `age_status`
  alone; the switch is a server-side concern only. Wiring the client to it would let an
  un-updated client re-enable gated UI and reintroduce the rollout hole the switch exists to
  close. Do not "helpfully" connect them.
- **`useSocialAccess` has three states, not two.** `isLoading` must never be collapsed into
  "restricted" — doing so breaks cold-start deep links and flashes lock UI at eligible users.
- Verification commands: `pnpm type-check`, `pnpm lint`, `pnpm test`.

---

### Task 1: Build spike — verify `expo-age-range@0.2.1` and wire the native side

Everything downstream assumes this pod compiles against `expo-modules-core@3.0.29` and that we know what Android does. Both are unverified. This task answers them and leaves the native wiring in place.

**Files:**
- Modify: `package.json`
- Create: `plugins/withDeclaredAgeRange.js`
- Modify: `app.json` (plugins array)
- Modify: `ios/TheNineteenth/TheNineteenth.entitlements`
- Modify: `eas.json`
- Modify: `docs/superpowers/specs/2026-09-04-social-media-compliance-design.md` (§11, record findings)

**Interfaces:**
- Consumes: nothing
- Produces: `ANDROID_SIGNAL_TRUSTED` — a boolean fact consumed by Task 4's `isPlatformSignalTrusted()`. Record it in §11 of the spec.

- [x] **Step 1: Apple Developer portal capability — DONE 2026-09-05**

Declared Age Range is enabled on `com.the.nineteenth.golf` (team `TMB3988D5Z`), and the
production provisioning profile was regenerated: `VC45BP49YB` → **`UPP7W83YD2`**. Verified by
decoding the downloaded profile:

```bash
security cms -D -i <profile>.mobileprovision | plutil -p - | grep -i declared-age-range
# "com.apple.developer.declared-age-range" => 1
```

The two watchOS targets (`…watchkitapp`, `…TheNineteenthWatchComplication`) kept their
existing profiles — they do not call the API and do not need the capability.

Note for Step 5: EAS reported `Synced capabilities: No updates` during that run, because the
entitlement was not yet in the local `.entitlements` file. Once Step 5 lands it, EAS manages
the capability automatically on future builds and this manual round trip is not repeated.

- [ ] **Step 2: Install the pinned dependency**

```bash
pnpm add expo-age-range@0.2.1
```

Verify the exact version landed (no caret):

```bash
node -p "require('./package.json').dependencies['expo-age-range']"
```

Expected: `0.2.1`

- [ ] **Step 3: Create the config plugin**

`expo prebuild` regenerates the entitlements file, so the entitlement must be applied by a plugin or it will be silently dropped. This follows the existing `plugins/withWearOs` pattern.

```js
// plugins/withDeclaredAgeRange.js
const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Adds the Declared Age Range entitlement to the iOS app.
 * Required by expo-age-range on iOS 26+; harmless on earlier versions.
 */
module.exports = function withDeclaredAgeRange(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.declared-age-range'] = true;
    return cfg;
  });
};
```

- [ ] **Step 4: Register the plugin**

In `app.json`, append to `expo.plugins` (after `"./plugins/withWearOs"`):

```json
"./plugins/withDeclaredAgeRange"
```

- [ ] **Step 5: Add the entitlement to the committed native file**

`ios/` is committed for the watchOS target, so the entitlement belongs in the checked-in file too — the plugin covers prebuild, this covers direct Xcode builds. Add inside the top-level `<dict>` of `ios/TheNineteenth/TheNineteenth.entitlements`:

```xml
<key>com.apple.developer.declared-age-range</key>
<true/>
```

- [ ] **Step 6: Pin an Xcode 26 image for EAS**

`eas.json` currently pins no image. Add `"image": "macos-sequoia-16.0-xcode-26.0"` to the `ios` block of the `preview`, `staging` and `production` build profiles so cloud builds match local Xcode 26.3.

- [ ] **Step 7: Prebuild and install pods**

```bash
npx expo prebuild -p ios --clean && (cd ios && pod install)
```

Expected: `ExpoAgeRange` appears in the pod install output with no version conflict against `ExpoModulesCore`.

**⚠️ If this fails**, the SDK-54 assumption is wrong. Stop and report — the options are a custom native module or an Expo SDK upgrade, and both change the plan. Do not attempt a workaround unprompted.

- [ ] **Step 8: Verify on iOS 26**

Build to an iOS 26+ simulator or device. From a scratch screen, call:

```ts
import * as AgeRange from 'expo-age-range';
const r = await AgeRange.requestAgeRangeAsync({ threshold1: 13 });
console.log('[spike] ios26', JSON.stringify(r));
```

Expected: a system sheet appears; sharing returns real bounds; declining **throws** `AgeRangeUserDeclinedException`.

- [ ] **Step 9: Verify the iOS < 26 fake-adult behaviour**

Run the same call on an iOS 15–25 simulator.

Expected: **no sheet**, resolves to `{ lowerBound: 18, upperBound: null }`. This confirms the trap the resolver must defend against. If it does *not* return 18, record what it actually returns — Task 4's test changes.

- [ ] **Step 10: Verify Android**

Run the same call on an Android device or emulator **without** Play Age Signals support.

Record whether it returns real bounds, throws, or also fakes an adult. If it fakes an adult, `ANDROID_SIGNAL_TRUSTED` is `false` and Android always uses the DOB fallback.

- [ ] **Step 11: Record findings in the spec**

Replace the two "unverified" bullets in §11 of the spec with what you actually observed, and state the resolved value of `ANDROID_SIGNAL_TRUSTED`. Task 4 depends on this being written down.

- [ ] **Step 12: Commit**

```bash
git add package.json pnpm-lock.yaml plugins/withDeclaredAgeRange.js app.json eas.json ios/ docs/superpowers/specs/
git commit -m "feat(age): wire expo-age-range 0.2.1 and verify platform behaviour"
```

---

### Task 2: Date-of-birth classification

Pure functions, no native, no network. TDD in full.

**Files:**
- Create: `src/services/age/types.ts`
- Create: `src/services/age/classify.ts`
- Test: `src/__tests__/services/age/classify.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type AgeStatus = 'unknown' | 'under13' | 'eligible'`
  - `AGE_THRESHOLD: 13`
  - `classifyDateOfBirth(dob: Date, now?: Date): AgeStatus`
  - `classifyAgeRangeResponse(r: { lowerBound: number | null; upperBound: number | null }): AgeStatus`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/services/age/classify.test.ts
import {
  classifyDateOfBirth,
  classifyAgeRangeResponse,
} from '@/services/age/classify';

const NOW = new Date('2026-09-04T12:00:00Z');

describe('classifyDateOfBirth', () => {
  it('returns under13 the day before the 13th birthday', () => {
    expect(classifyDateOfBirth(new Date('2013-09-05'), NOW)).toBe('under13');
  });

  it('returns eligible on the 13th birthday', () => {
    expect(classifyDateOfBirth(new Date('2013-09-04'), NOW)).toBe('eligible');
  });

  it('returns eligible the day after the 13th birthday', () => {
    expect(classifyDateOfBirth(new Date('2013-09-03'), NOW)).toBe('eligible');
  });

  it('returns under13 for a 12-year-old', () => {
    expect(classifyDateOfBirth(new Date('2015-01-01'), NOW)).toBe('under13');
  });

  it('handles a 29 February birthday without throwing', () => {
    expect(classifyDateOfBirth(new Date('2012-02-29'), NOW)).toBe('eligible');
  });

  it('returns unknown for a future date', () => {
    expect(classifyDateOfBirth(new Date('2030-01-01'), NOW)).toBe('unknown');
  });

  it('returns unknown for an invalid date', () => {
    expect(classifyDateOfBirth(new Date('nonsense'), NOW)).toBe('unknown');
  });
});

describe('classifyAgeRangeResponse', () => {
  it('returns eligible when the lower bound is at or above 13', () => {
    expect(classifyAgeRangeResponse({ lowerBound: 13, upperBound: 15 })).toBe('eligible');
    expect(classifyAgeRangeResponse({ lowerBound: 18, upperBound: null })).toBe('eligible');
  });

  it('returns under13 when the upper bound is below 13', () => {
    expect(classifyAgeRangeResponse({ lowerBound: null, upperBound: 12 })).toBe('under13');
  });

  it('returns unknown when both bounds are null', () => {
    expect(classifyAgeRangeResponse({ lowerBound: null, upperBound: null })).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='services/age/classify'
```

Expected: FAIL — cannot resolve `@/services/age/classify`.

- [ ] **Step 3: Write the types**

```ts
// src/services/age/types.ts

/**
 * Derived age band for the current user.
 * - 'unknown'  — no signal yet; social features stay closed
 * - 'under13'  — restricted mode
 * - 'eligible' — full access
 */
export type AgeStatus = 'unknown' | 'under13' | 'eligible';

/** Source of the resolved status, recorded for audit. */
export type AgeSource = 'declared_age_range' | 'self_declared';

/** The age gate this app checks against. */
export const AGE_THRESHOLD = 13;
```

- [ ] **Step 4: Write the implementation**

```ts
// src/services/age/classify.ts
import { AGE_THRESHOLD, type AgeStatus } from './types';

/**
 * Classify a date of birth into an age band.
 *
 * The DOB is never persisted — callers pass it in, take the band, and discard it.
 */
export function classifyDateOfBirth(dob: Date, now: Date = new Date()): AgeStatus {
  if (Number.isNaN(dob.getTime())) return 'unknown';
  if (dob.getTime() > now.getTime()) return 'unknown';

  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= AGE_THRESHOLD ? 'eligible' : 'under13';
}

/**
 * Classify a Declared Age Range / Play Age Signals response.
 *
 * Callers MUST only pass responses from a platform where the signal is trusted —
 * below iOS 26 the native module fabricates `lowerBound: 18`. See `platformSignal.ts`.
 */
export function classifyAgeRangeResponse(r: {
  lowerBound: number | null;
  upperBound: number | null;
}): AgeStatus {
  if (r.lowerBound != null && r.lowerBound >= AGE_THRESHOLD) return 'eligible';
  if (r.upperBound != null && r.upperBound < AGE_THRESHOLD) return 'under13';
  return 'unknown';
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='services/age/classify'
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/services/age src/__tests__/services/age
git commit -m "feat(age): add date-of-birth and age-range classification"
```

---

### Task 3: Platform trust check

The single most important defence in Part A. It gets its own task and its own named regression test.

**Files:**
- Create: `src/services/age/platformSignal.ts`
- Test: `src/__tests__/services/age/platformSignal.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `isPlatformSignalTrusted(): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/services/age/platformSignal.test.ts
import { Platform } from 'react-native';
import { isPlatformSignalTrusted } from '@/services/age/platformSignal';

describe('isPlatformSignalTrusted', () => {
  const setPlatform = (os: string, version: string | number) => {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
  };

  it('trusts iOS 26 and above', () => {
    setPlatform('ios', '26.0');
    expect(isPlatformSignalTrusted()).toBe(true);
    setPlatform('ios', 27);
    expect(isPlatformSignalTrusted()).toBe(true);
  });

  // REGRESSION: below iOS 26 the native module returns a fabricated lowerBound of 18.
  // Trusting it would silently classify every legacy-iOS user as an adult and the
  // date-of-birth fallback would never run.
  it('does NOT trust iOS below 26, where the module fakes an adult', () => {
    setPlatform('ios', '15.1');
    expect(isPlatformSignalTrusted()).toBe(false);
    setPlatform('ios', '25.4');
    expect(isPlatformSignalTrusted()).toBe(false);
  });

  it('does not trust web', () => {
    setPlatform('web', 0);
    expect(isPlatformSignalTrusted()).toBe(false);
  });

  it('returns a boolean for android', () => {
    setPlatform('android', 34);
    expect(typeof isPlatformSignalTrusted()).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='services/age/platformSignal'
```

Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Write the implementation**

Set `ANDROID_SIGNAL_TRUSTED` from the Task 1 Step 11 finding recorded in spec §11.

```ts
// src/services/age/platformSignal.ts
import { Platform } from 'react-native';

/** Minimum iOS version where DeclaredAgeRange returns a real answer. */
const MIN_TRUSTED_IOS_MAJOR = 26;

/**
 * Whether Android's Play Age Signals response can be trusted.
 * Set from the Task 1 build spike — see spec §11.
 */
const ANDROID_SIGNAL_TRUSTED = false;

/**
 * Whether the platform age signal can be believed.
 *
 * ⚠️ Below iOS 26 `expo-age-range` returns a fabricated `lowerBound: 18` rather than
 * an error, so the return value alone cannot distinguish "unsupported OS" from
 * "genuine adult". This check must run BEFORE the module is called.
 */
export function isPlatformSignalTrusted(): boolean {
  if (Platform.OS === 'ios') {
    const major = parseInt(String(Platform.Version), 10);
    return Number.isFinite(major) && major >= MIN_TRUSTED_IOS_MAJOR;
  }
  if (Platform.OS === 'android') {
    return ANDROID_SIGNAL_TRUSTED;
  }
  return false;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='services/age/platformSignal'
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/age/platformSignal.ts src/__tests__/services/age/platformSignal.test.ts
git commit -m "feat(age): gate platform signal on OS version, defeating the iOS<26 fake adult"
```

---

### Task 4: `resolveAgeStatus()` — the module's public entry point

**Files:**
- Create: `src/services/age/resolveAgeStatus.ts`
- Create: `src/services/age/index.ts`
- Test: `src/__tests__/services/age/resolveAgeStatus.test.ts`

**Interfaces:**
- Consumes: `classifyAgeRangeResponse`, `isPlatformSignalTrusted`
- Produces: `resolveAgeStatus(): Promise<AgeStatus>` — re-exported from `@/services/age`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/services/age/resolveAgeStatus.test.ts
import { resolveAgeStatus } from '@/services/age/resolveAgeStatus';
import { isPlatformSignalTrusted } from '@/services/age/platformSignal';
import * as AgeRange from 'expo-age-range';

jest.mock('expo-age-range', () => ({ requestAgeRangeAsync: jest.fn() }));
jest.mock('@/services/age/platformSignal', () => ({ isPlatformSignalTrusted: jest.fn() }));

const mockTrusted = isPlatformSignalTrusted as jest.Mock;
const mockRequest = AgeRange.requestAgeRangeAsync as jest.Mock;

describe('resolveAgeStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns unknown WITHOUT calling the module on an untrusted platform', async () => {
    mockTrusted.mockReturnValue(false);
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('returns eligible for an adult range', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockResolvedValue({ lowerBound: 18, upperBound: null });
    await expect(resolveAgeStatus()).resolves.toBe('eligible');
    expect(mockRequest).toHaveBeenCalledWith({ threshold1: 13 });
  });

  it('returns under13 when the upper bound is below the threshold', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockResolvedValue({ lowerBound: null, upperBound: 12 });
    await expect(resolveAgeStatus()).resolves.toBe('under13');
  });

  it('returns unknown when the user declines (the module throws)', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockRejectedValue(new Error('AgeRangeUserDeclinedException'));
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
  });

  it('returns unknown when the module is unavailable', async () => {
    mockTrusted.mockReturnValue(true);
    mockRequest.mockRejectedValue(new Error('AgeRangeNotAvailableException'));
    await expect(resolveAgeStatus()).resolves.toBe('unknown');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='services/age/resolveAgeStatus'
```

Expected: FAIL — cannot resolve the module.

- [ ] **Step 3: Write the implementation**

```ts
// src/services/age/resolveAgeStatus.ts
import * as AgeRange from 'expo-age-range';

import { classifyAgeRangeResponse } from './classify';
import { isPlatformSignalTrusted } from './platformSignal';
import { AGE_THRESHOLD, type AgeStatus } from './types';

/**
 * Resolve the current user's age band from the platform signal.
 *
 * Returns 'unknown' for every failure path — declined, unavailable, unsupported OS —
 * because 'unknown' is closed for social features. Failures deny rather than grant.
 * Callers fall back to the date-of-birth prompt on 'unknown'.
 */
export async function resolveAgeStatus(): Promise<AgeStatus> {
  if (!isPlatformSignalTrusted()) return 'unknown';

  try {
    const response = await AgeRange.requestAgeRangeAsync({ threshold1: AGE_THRESHOLD });
    return classifyAgeRangeResponse(response);
  } catch (error) {
    console.warn('[age] platform signal unavailable:', error);
    return 'unknown';
  }
}
```

```ts
// src/services/age/index.ts
export { classifyDateOfBirth, classifyAgeRangeResponse } from './classify';
export { isPlatformSignalTrusted } from './platformSignal';
export { resolveAgeStatus } from './resolveAgeStatus';
export { AGE_THRESHOLD, type AgeStatus, type AgeSource } from './types';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='services/age'
```

Expected: PASS — all three age suites green.

- [ ] **Step 5: Commit**

```bash
git add src/services/age src/__tests__/services/age
git commit -m "feat(age): add resolveAgeStatus with fail-closed error handling"
```

---

### Task 5: Migration — schema, kill switch, and write path

**Files:**
- Create: `supabase/migrations/20260904000000_age_gate_schema.sql`

**Interfaces:**
- Consumes: nothing
- Produces (SQL, relied on by Task 6 and the client):
  - `players.age_status`, `players.age_source`, `players.age_resolved_at`
  - `age_gate_config(id, enforce)` seeded `enforce = false`
  - `social_enabled(p_user UUID DEFAULT auth.uid()) RETURNS BOOLEAN`
  - `set_age_status(p_status TEXT, p_source TEXT) RETURNS VOID`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260904000000_age_gate_schema.sql
-- Under-13 social gating: schema, kill switch and write path.
-- Deployed with enforce = FALSE, so this migration is a behavioural no-op.

-- -----------------------------------------------------
-- 1. Age band on the player profile
-- -----------------------------------------------------
ALTER TABLE players
  ADD COLUMN age_status      TEXT NOT NULL DEFAULT 'unknown'
    CHECK (age_status IN ('unknown', 'under13', 'eligible')),
  ADD COLUMN age_source      TEXT
    CHECK (age_source IS NULL OR age_source IN ('declared_age_range', 'self_declared')),
  ADD COLUMN age_resolved_at TIMESTAMPTZ;

COMMENT ON COLUMN players.age_status IS
  'Derived age band. No date of birth is ever stored - only this band.';

-- Supports social_enabled()'s existence check.
CREATE INDEX idx_players_age_eligible ON players (id) WHERE age_status = 'eligible';

-- -----------------------------------------------------
-- 2. Enforcement kill switch
-- -----------------------------------------------------
-- Enforcement is decoupled from schema so the policies in the next migration can
-- deploy inert. Without this, every existing user would lose social features the
-- moment the migration lands - they are on a client with no age prompt, and stay
-- that way until they update.
CREATE TABLE age_gate_config (
  id      INT PRIMARY KEY DEFAULT 1,
  enforce BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT age_gate_config_singleton CHECK (id = 1)
);

INSERT INTO age_gate_config (id, enforce) VALUES (1, FALSE);

ALTER TABLE age_gate_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY age_gate_config_select ON age_gate_config FOR SELECT
  TO authenticated USING (TRUE);

-- -----------------------------------------------------
-- 3. The gate
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION social_enabled(p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    NOT COALESCE((SELECT enforce FROM age_gate_config WHERE id = 1), FALSE)
    OR EXISTS (
      SELECT 1 FROM players WHERE id = p_user AND age_status = 'eligible'
    );
$$;

COMMENT ON FUNCTION social_enabled IS
  'True when the user may use social features. Returns TRUE for everyone while
   age_gate_config.enforce is FALSE. Never call this from can_view_round().';

-- -----------------------------------------------------
-- 4. Write path
-- -----------------------------------------------------
-- All age_status writes funnel through this RPC, which gives every transition a
-- single auditable entry point. It is NOT an anti-spoofing measure: the band is
-- computed on the client. Verification is an explicit non-goal (spec section 3).
CREATE OR REPLACE FUNCTION set_age_status(p_status TEXT, p_source TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('unknown', 'under13', 'eligible') THEN
    RAISE EXCEPTION 'Invalid age status: %', p_status USING ERRCODE = '22023';
  END IF;

  IF p_source NOT IN ('declared_age_range', 'self_declared') THEN
    RAISE EXCEPTION 'Invalid age source: %', p_source USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.age_status_write', 'on', TRUE);

  UPDATE players
     SET age_status      = p_status,
         age_source      = p_source,
         age_resolved_at = NOW()
   WHERE id = auth.uid();
END;
$$;

-- Stop the ordinary profile-update path from clobbering the flag.
CREATE OR REPLACE FUNCTION players_guard_age_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.age_status IS DISTINCT FROM OLD.age_status
     AND COALESCE(current_setting('app.age_status_write', TRUE), '') <> 'on' THEN
    RAISE EXCEPTION 'age_status may only be changed via set_age_status()'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER players_guard_age_status_before_update
  BEFORE UPDATE OF age_status ON players
  FOR EACH ROW
  EXECUTE FUNCTION players_guard_age_status();
```

- [ ] **Step 2: Apply to a local/staging database and verify the no-op**

```bash
supabase db reset
```

Then confirm the switch is off and the gate is open for an unresolved user:

```sql
SELECT enforce FROM age_gate_config;                       -- expect: f
SELECT age_status FROM players LIMIT 1;                    -- expect: unknown
SELECT social_enabled('<any-player-uuid>');                -- expect: t  (switch off)
UPDATE age_gate_config SET enforce = TRUE;
SELECT social_enabled('<any-player-uuid>');                -- expect: f  (unknown user)
UPDATE age_gate_config SET enforce = FALSE;                -- restore
```

- [ ] **Step 3: Verify the trigger blocks direct writes**

```sql
UPDATE players SET age_status = 'eligible' WHERE id = '<uuid>';
```

Expected: `ERROR: age_status may only be changed via set_age_status()`

- [ ] **Step 4: Regenerate database types**

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

⚠️ The Supabase CLI is linked to **production**. Confirm the link target before running, and do not apply migrations from the CLI to prod as part of this task.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260904000000_age_gate_schema.sql src/types/database.types.ts
git commit -m "feat(age): add age_status schema, kill switch and guarded write path"
```

---

### Task 6: Migration — policy enforcement across the eight surfaces

Deploys inert because Task 5's switch is `false`. Existing policy names were read from the repo and are exact.

**Files:**
- Create: `supabase/migrations/20260904000100_age_gate_policies.sql`

**Interfaces:**
- Consumes: `social_enabled()` from Task 5
- Produces: `search_players(p_query TEXT)` — an RPC consumed by Task 9

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260904000100_age_gate_policies.sql
-- Under-13 social gating: enforcement across the eight social surfaces.
-- Inert until age_gate_config.enforce flips to TRUE.
--
-- NOTE: social_enabled() is applied to each policy individually and MUST NOT be
-- added to can_view_round() - that helper is shared with round-visibility logic
-- and gating it there would break scorecard visibility for every user.

-- -----------------------------------------------------
-- Comments, photos, likes: read and write
-- -----------------------------------------------------
DROP POLICY IF EXISTS round_comments_select ON round_comments;
CREATE POLICY round_comments_select ON round_comments FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_comments_insert ON round_comments;
CREATE POLICY round_comments_insert ON round_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_photos_select ON round_photos;
CREATE POLICY round_photos_select ON round_photos FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_photos_insert ON round_photos;
CREATE POLICY round_photos_insert ON round_photos FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid() AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_likes_select ON round_likes;
CREATE POLICY round_likes_select ON round_likes FOR SELECT
  TO authenticated
  USING (social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_likes_insert ON round_likes;
CREATE POLICY round_likes_insert ON round_likes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid() AND social_enabled() AND can_view_round(round_id));

DROP POLICY IF EXISTS round_comment_likes_select ON round_comment_likes;
CREATE POLICY round_comment_likes_select ON round_comment_likes FOR SELECT
  TO authenticated
  USING (social_enabled());

DROP POLICY IF EXISTS round_comment_likes_insert ON round_comment_likes;
CREATE POLICY round_comment_likes_insert ON round_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid() AND social_enabled());

-- -----------------------------------------------------
-- Friend requests
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND social_enabled(requester_id)
    AND social_enabled(addressee_id)
  );

-- -----------------------------------------------------
-- Player search
-- -----------------------------------------------------
-- The players SELECT policy is a blanket "Authenticated users can search players"
-- USING (TRUE) that competitions, leaderboards and pairings all depend on. Editing
-- it would break unrelated reads, so search enforcement moves into a dedicated RPC
-- and the blanket policy is left alone.
-- Returns an explicit column list, NOT `SETOF players`. A SECURITY DEFINER function
-- bypasses RLS, so `SELECT p.*` would hand every caller each player's email and phone.
-- The search UI (SearchResultCard) renders only name, photo and handicap.
CREATE OR REPLACE FUNCTION search_players(p_query TEXT)
RETURNS TABLE (
  id        UUID,
  name      TEXT,
  photo_url TEXT,
  handicap  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name::TEXT, p.photo_url::TEXT, p.handicap
  FROM players p
  WHERE social_enabled()                 -- the searcher must be eligible
    AND social_enabled(p.id)             -- under-13s are not discoverable
    AND p.id <> auth.uid()
    AND p.is_placeholder IS NOT TRUE
    AND p.name ILIKE '%' || p_query || '%'
  ORDER BY p.name
  LIMIT 25;
$$;

-- -----------------------------------------------------
-- Activity feed
-- -----------------------------------------------------
-- Wrap the existing feed RPCs rather than rewriting their bodies: an early return
-- keeps the (large) query untouched and reviewable.
CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit  INT DEFAULT 20,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  round_id         UUID,
  competition_id   UUID,
  course_name      TEXT,
  club_name        TEXT,
  club_location    TEXT,
  round_date       DATE,
  game_type        TEXT,
  is_team_round    BOOLEAN,
  activity_at      TIMESTAMPTZ,
  participants     JSONB,
  photos           JSONB,
  like_count       INT,
  comment_count    INT,
  viewer_has_liked BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT social_enabled() THEN
    RETURN;  -- restricted users get an empty feed
  END IF;
  RETURN QUERY SELECT * FROM get_activity_feed_unfiltered(p_limit, p_before);
END;
$$;
```

⚠️ **Before writing this step's final form**, read `supabase/migrations/20260521000200_activity_feed_rpc.sql` and rename the existing `get_activity_feed` body to `get_activity_feed_unfiltered`, preserving its signature and return table exactly. Apply the same wrap to `get_round_feed_card` and to `get_achievement_leaderboard`'s `global` scope. Do not retype the query bodies — move them.

- [ ] **Step 2: Verify the migration is inert**

```bash
supabase db reset
```

```sql
-- enforce is FALSE, so a user with age_status='unknown' still sees everything
SELECT COUNT(*) FROM round_comments;        -- expect: unchanged from before
SELECT COUNT(*) FROM get_activity_feed(20); -- expect: unchanged from before
```

- [ ] **Step 3: Verify enforcement when switched on**

```sql
UPDATE age_gate_config SET enforce = TRUE;
-- as an under13 user:
SELECT COUNT(*) FROM round_comments;        -- expect: 0
SELECT COUNT(*) FROM get_activity_feed(20); -- expect: 0
SELECT COUNT(*) FROM search_players('a');   -- expect: 0
-- as an eligible user: all three unchanged
UPDATE age_gate_config SET enforce = FALSE;
```

- [ ] **Step 4: Confirm scorecard visibility is untouched**

The single highest-risk regression. As an under-13 user with `enforce = TRUE`:

```sql
SELECT can_view_round('<a-round-the-user-played>');  -- expect: t
SELECT COUNT(*) FROM scorecards WHERE round_id = '<that-round>';  -- expect: > 0
```

Expected: unchanged. If either is 0, `social_enabled()` has leaked into `can_view_round()`.

- [ ] **Step 5: Confirm existing friendships are retained**

Spec §6.5 keeps existing friendships when a user is reclassified — only *new* ones are
blocked. This migration touches only the INSERT policy, so retention should be automatic;
verify it rather than assume. With `enforce = TRUE`, as an under-13 user who already has a
friendship:

```sql
SELECT COUNT(*) FROM friendships
 WHERE (requester_id = '<under13-uuid>' OR addressee_id = '<under13-uuid>')
   AND status = 'accepted';
-- expect: unchanged (rows retained)

INSERT INTO friendships (requester_id, addressee_id, status)
VALUES ('<under13-uuid>', '<other-uuid>', 'pending');
-- expect: ERROR - new row violates row-level security policy
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260904000100_age_gate_policies.sql
git commit -m "feat(age): enforce the age gate across the eight social surfaces"
```

---

### Task 7: `useSocialAccess()` hook

**Files:**
- Modify: `src/types/index.ts` (Player interface)
- Create: `src/hooks/useSocialAccess.ts`
- Test: `src/__tests__/hooks/useSocialAccess.test.ts`

**Interfaces:**
- Consumes: `AgeStatus` from `@/services/age`; the `player` object from `useAuth()`
- Produces: `useSocialAccess(): { status: AgeStatus; socialEnabled: boolean; isRestricted: boolean; isLoading: boolean }`

⚠️ **Three states, not two.** `socialEnabled` means "positively eligible"; `isRestricted`
means "positively known to be restricted". While the profile loads **both are false**.
Consumers that hide things must key off `isRestricted`, never off `!socialEnabled` — the
latter is true during every cold start and would break deep links (Task 9) and flash lock UI
at eligible users (Task 8).

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/useSocialAccess.test.ts
import { renderHook } from '@testing-library/react-native';
import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useAuth } from '@/hooks/useAuth';

jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.Mock;

describe('useSocialAccess', () => {
  it('enables social for an eligible player', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'eligible' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.socialEnabled).toBe(true);
  });

  it('disables social for an under13 player', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'under13' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.socialEnabled).toBe(false);
  });

  it('disables social while the status is unknown', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'unknown' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.socialEnabled).toBe(false);
  });

  it('disables social when the profile has not loaded', () => {
    mockUseAuth.mockReturnValue({ player: null, isLoading: true });
    const { result } = renderHook(() => useSocialAccess());
    expect(result.current.socialEnabled).toBe(false);
    expect(result.current.status).toBe('unknown');
  });

  // REGRESSION: "still loading" must not be mistaken for "restricted". Consumers hide
  // routes and content off isRestricted; if it were true during load, every cold start
  // would unregister the Activity routes and break notification deep links.
  it('is NOT restricted while the profile is still loading', () => {
    mockUseAuth.mockReturnValue({ player: null, isLoading: true });
    expect(renderHook(() => useSocialAccess()).result.current.isRestricted).toBe(false);
  });

  it('is restricted once an under13 status has actually loaded', () => {
    mockUseAuth.mockReturnValue({ player: { age_status: 'under13' }, isLoading: false });
    expect(renderHook(() => useSocialAccess()).result.current.isRestricted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='useSocialAccess'
```

Expected: FAIL — cannot resolve `@/hooks/useSocialAccess`.

- [ ] **Step 3: Widen the Player type**

In `src/types/index.ts`, add to the `Player` interface (snake_case, matching the runtime row):

```ts
  age_status?: AgeStatus;
  age_source?: 'declared_age_range' | 'self_declared' | null;
  age_resolved_at?: string | null;
```

Import the type at the top: `import type { AgeStatus } from '@/services/age';`

- [ ] **Step 4: Write the hook**

```ts
// src/hooks/useSocialAccess.ts
import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';
import type { AgeStatus } from '@/services/age';

/**
 * Whether the current user may use social features.
 *
 * Returns three distinguishable states. `socialEnabled` and `isRestricted` are BOTH false
 * while the profile loads, so callers can tell "not yet known" from "no".
 */
export function useSocialAccess(): {
  status: AgeStatus;
  socialEnabled: boolean;
  isRestricted: boolean;
  isLoading: boolean;
} {
  const { player, isLoading } = useAuth();

  return useMemo(() => {
    const status: AgeStatus = player?.age_status ?? 'unknown';
    return {
      status,
      // Positively eligible.
      socialEnabled: !isLoading && status === 'eligible',
      // Positively restricted. False while loading - "we don't know yet" is its own state.
      isRestricted: !isLoading && status !== 'eligible',
      isLoading,
    };
  }, [player?.age_status, isLoading]);
}
```

- [ ] **Step 5: Run the test and type-check**

```bash
pnpm test --testPathPattern='useSocialAccess' && pnpm type-check
```

Expected: PASS, 4 tests; 0 TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSocialAccess.ts src/types/index.ts src/__tests__/hooks/useSocialAccess.test.ts
git commit -m "feat(age): add useSocialAccess hook"
```

---

### Task 8: `AgeLock` component

Deliberately **not** a reuse of `FeatureLock` — that component is framed as "upgrade to unlock", and offering a 12-year-old a purchase they cannot make is both the wrong message and an App Review risk.

**Files:**
- Create: `src/components/common/AgeLock.tsx`
- Modify: `src/components/common/index.ts`
- Test: `src/__tests__/components/common/AgeLock.test.tsx`

**Interfaces:**
- Consumes: `useSocialAccess` from Task 7
- Produces: `<AgeLock>{children}</AgeLock>` — renders children when eligible, a neutral notice otherwise

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/common/AgeLock.test.tsx
import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AgeLock } from '@/components/common/AgeLock';
import { useSocialAccess } from '@/hooks/useSocialAccess';

jest.mock('@/hooks/useSocialAccess');
const mockAccess = useSocialAccess as jest.Mock;

describe('AgeLock', () => {
  it('renders children when the user is eligible', () => {
    mockAccess.mockReturnValue({ status: 'eligible', socialEnabled: true, isRestricted: false, isLoading: false });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.getByText('social content')).toBeTruthy();
  });

  // REGRESSION: without this, every eligible user sees the restriction notice flash
  // on each cold start while their profile loads.
  it('shows neither children nor the notice while loading', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: false, isLoading: true,
    });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.queryByText('social content')).toBeNull();
    expect(screen.queryByText(/not available/i)).toBeNull();
  });

  it('hides children and explains why when restricted', () => {
    mockAccess.mockReturnValue({ status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.queryByText('social content')).toBeNull();
    expect(screen.getByText(/not available/i)).toBeTruthy();
  });

  it('never offers an upgrade path', () => {
    mockAccess.mockReturnValue({ status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.queryByText(/upgrade/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='AgeLock'
```

Expected: FAIL — cannot resolve `@/components/common/AgeLock`.

- [ ] **Step 3: Write the component**

```tsx
// src/components/common/AgeLock.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useSocialAccess } from '@/hooks/useSocialAccess';

export interface AgeLockProps {
  children: React.ReactNode;
  /** Overrides the default explanation. */
  message?: string;
}

const DEFAULT_MESSAGE =
  'Social features are not available on this account. Confirm your age in Settings if this looks wrong.';

/**
 * Hides social content from users who are under 13 or whose age is unresolved.
 *
 * Unlike FeatureLock this offers no upgrade path — the restriction is not
 * something the user can purchase their way out of.
 */
export function AgeLock({ children, message = DEFAULT_MESSAGE }: AgeLockProps) {
  const colors = useThemeColors();
  const { isRestricted, isLoading } = useSocialAccess();

  // Neither content nor notice until we actually know - otherwise every eligible
  // user sees the restriction message flash on cold start.
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isRestricted) return <>{children}</>;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Icon source="lock-outline" size={24} color={colors.textSecondary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  loading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
```

Export it from `src/components/common/index.ts`:

```ts
export { AgeLock } from './AgeLock';
export type { AgeLockProps } from './AgeLock';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='AgeLock'
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/AgeLock.tsx src/components/common/index.ts src/__tests__/components/common/AgeLock.test.tsx
git commit -m "feat(age): add AgeLock with no upgrade path"
```

---

### Task 9: Client-side gating of the eight surfaces

Server enforcement is authoritative; this task removes dead ends from the UI.

**Files:**
- Modify: `src/navigation/RootNavigator.tsx` (Activity + AchievementLeaderboard routes)
- Modify: `src/components/social/AddFriendModal.tsx` (route search through the RPC)
- Modify: `src/hooks/friends/queries.ts:296` (`useSearchPlayers` → `search_players` RPC)
- Modify: `src/screens/leagues/JoinLeagueScreen.tsx` (hide the Public tab)
- Modify: `src/screens/profile/AchievementLeaderboardScreen.tsx` (drop the global scope option)
- Modify: `src/components/activity/RoundComments.tsx`, `RoundPhotoAlbum.tsx` (wrap in `AgeLock`)

**Interfaces:**
- Consumes: `useSocialAccess` (Task 7), `AgeLock` (Task 8), `search_players` RPC (Task 6)
- Produces: no new exports

- [ ] **Step 1: Switch player search to the RPC**

In `src/hooks/friends/queries.ts`, replace the direct table query at line 296:

```ts
// before: .from('players').select('*').ilike('name', `%${searchQuery}%`)
const { data, error } = await supabase.rpc('search_players', { p_query: searchQuery });
```

This is what makes search gating server-enforced rather than cosmetic.

- [ ] **Step 2: Conditionally register gated routes**

In `src/navigation/RootNavigator.tsx`, inside the root stack:

```tsx
const { isRestricted } = useSocialAccess();

// ...within the navigator's children (current registrations are at lines 768, 776, 852):
{!isRestricted && (
  <>
    <RootStack.Screen name="Activity" component={ActivityScreen} />
    <RootStack.Screen name="RoundActivity" component={RoundActivityScreen} />
    <RootStack.Screen name="AchievementLeaderboard" component={AchievementLeaderboardScreen} />
  </>
)}
```

⚠️ **`!isRestricted`, not `socialEnabled`.** The profile is still loading on every cold
start, so `socialEnabled` is false then — gating on it would unregister these routes during
exactly the window when a tapped push notification is trying to navigate to `RoundActivity`.
This codebase has already had to fix a cold-start deep-link bug once; do not reintroduce it.
Registering while status is unknown is safe because the screens self-protect: their content
is wrapped in `AgeLock` (Step 3), which resolves a moment later.

- [ ] **Step 3: Wrap in-place social sections**

Wrap the comment list and photo album bodies in `<AgeLock>` so a restricted user sees the neutral notice rather than an empty section.

- [ ] **Step 4: Hide the public-league tab**

In `JoinLeagueScreen.tsx`, when `isRestricted` is true force `mode` to `'private'` and hide
the Public/Private segmented control. Use `isRestricted`, not `!socialEnabled` — otherwise
the Public tab vanishes for a beat on every cold start for eligible users. Invite-code
joining must keep working; it is not a social surface.

- [ ] **Step 5: Verify**

```bash
pnpm type-check && pnpm lint && pnpm test
```

Expected: 0 type errors, 0 lint errors, no new test failures against the baseline.

- [ ] **Step 6: Commit**

```bash
git add src/navigation src/components src/hooks src/screens
git commit -m "feat(age): gate social surfaces in the client"
```

---

### Task 10: Onboarding age step

**Files:**
- Create: `src/screens/onboarding/components/AgeCheckStep.tsx`
- Modify: `src/screens/onboarding/OnboardingScreen.tsx`
- Create: `src/hooks/useSetAgeStatus.ts`
- Test: `src/__tests__/screens/onboarding/AgeCheckStep.test.tsx`

**Interfaces:**
- Consumes: `resolveAgeStatus`, `classifyDateOfBirth` (Tasks 2–4); `StepProps` from `OnboardingScreen`
- Produces: `useSetAgeStatus(): { setStatus: (s: AgeStatus, src: AgeSource) => Promise<void> }`

- [ ] **Step 1: Write the mutation hook**

```ts
// src/hooks/useSetAgeStatus.ts
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { authKeys } from '@/hooks/queryKeys';
import type { AgeStatus, AgeSource } from '@/services/age';

/** Persists the derived age band. The date of birth is never sent. */
export function useSetAgeStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const setStatus = useCallback(
    async (status: AgeStatus, source: AgeSource) => {
      const { error } = await supabase.rpc('set_age_status', {
        p_status: status,
        p_source: source,
      });
      if (error) throw error;
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: authKeys.player(user.id) });
      }
    },
    [queryClient, user?.id]
  );

  return { setStatus };
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/__tests__/screens/onboarding/AgeCheckStep.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { AgeCheckStep } from '@/screens/onboarding/components/AgeCheckStep';
import { resolveAgeStatus } from '@/services/age';

jest.mock('@/services/age', () => ({
  ...jest.requireActual('@/services/age'),
  resolveAgeStatus: jest.fn(),
}));
const mockResolve = resolveAgeStatus as jest.Mock;
const mockSetStatus = jest.fn();
jest.mock('@/hooks/useSetAgeStatus', () => ({
  useSetAgeStatus: () => ({ setStatus: mockSetStatus }),
}));

describe('AgeCheckStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists the platform result and advances without prompting', async () => {
    mockResolve.mockResolvedValue('eligible');
    const onNext = jest.fn();
    render(<AgeCheckStep onNext={onNext} />);
    await waitFor(() => expect(mockSetStatus).toHaveBeenCalledWith('eligible', 'declared_age_range'));
    expect(onNext).toHaveBeenCalled();
  });

  it('falls back to the date-of-birth picker when the platform says unknown', async () => {
    mockResolve.mockResolvedValue('unknown');
    render(<AgeCheckStep onNext={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/date of birth/i)).toBeTruthy());
    expect(mockSetStatus).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='AgeCheckStep'
```

Expected: FAIL — cannot resolve the component.

- [ ] **Step 4: Write the step component**

Follow the `NotificationsStep.tsx` structure for styling (`OnboardingCard` wrapper, `StepProps`, `useThemeColors`).

```tsx
// src/screens/onboarding/components/AgeCheckStep.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { OnboardingCard } from './OnboardingCard';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { classifyDateOfBirth, resolveAgeStatus } from '@/services/age';
import { useSetAgeStatus } from '@/hooks/useSetAgeStatus';
import type { StepProps } from '../OnboardingScreen';

export function AgeCheckStep({ onNext, isActive }: StepProps) {
  const colors = useThemeColors();
  const { setStatus } = useSetAgeStatus();
  const [needsDob, setNeedsDob] = useState(false);
  // DOB lives here and nowhere else. It is never persisted, logged or sent anywhere.
  const [dob, setDob] = useState<Date | null>(null);
  const hasRun = useRef(false);

  // ⚠️ Fires when this card BECOMES ACTIVE, never on mount. OnboardingScreen renders
  // every step eagerly (FlatList data={STEPS}, default initialNumToRender of 10), so a
  // mount effect would pop Apple's system age sheet while the user is still on the Name
  // card. The ref guard keeps it to one prompt even if isActive flickers.
  useEffect(() => {
    if (!isActive || hasRun.current) return;
    hasRun.current = true;

    let cancelled = false;
    (async () => {
      const status = await resolveAgeStatus();
      if (cancelled) return;
      if (status === 'unknown') {
        setNeedsDob(true);
        return;
      }
      await setStatus(status, 'declared_age_range');
      onNext();
    })();
    return () => { cancelled = true; };
  }, [isActive, setStatus, onNext]);

  const handleConfirmDob = useCallback(async () => {
    if (!dob) return;
    await setStatus(classifyDateOfBirth(dob), 'self_declared');
    onNext();
  }, [dob, setStatus, onNext]);

  if (!needsDob) {
    return (
      <OnboardingCard title="Checking your age" icon="shield-account">
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          One moment...
        </Text>
      </OnboardingCard>
    );
  }

  return (
    <OnboardingCard title="Your date of birth" icon="shield-account">
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        We ask so we can keep social features age-appropriate. We only store
        whether you are over 13 — never your date of birth.
      </Text>
      <View style={styles.picker}>
        {/* Date picker wired to setDob, confirm button calls handleConfirmDob */}
      </View>
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, textAlign: 'center' },
  picker: { marginTop: spacing.lg },
});
```

⚠️ **The DOB value must stay in component state.** It is never passed to `setStatus`, logged, or sent to analytics — only the derived band leaves this component.

- [ ] **Step 5: Register the step and thread `isActive` through**

`StepProps` does not currently carry an active flag, and every step is mounted at once, so
one must be added or the age sheet fires at the wrong time.

1. Add `isActive: boolean;` to the `StepProps` interface in `OnboardingScreen.tsx` (~line 52).
2. `OnboardingScreen` already tracks the visible index for `OnboardingDots` via
   `onViewableItemsChanged`. Pass it down in `renderStep`:

```tsx
const renderStep = ({ item, index }: { item: Step; index: number }) => (
  <item.component {...stepProps} isActive={index === currentIndex} />
);
```

3. Insert `AgeCheckStep` into the `STEPS` array immediately after `NameCaptureStep`.

Other steps ignore the new prop; only `AgeCheckStep` reads it.

- [ ] **Step 6: Run the test to verify it passes**

```bash
pnpm test --testPathPattern='AgeCheckStep'
```

Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/screens/onboarding src/hooks/useSetAgeStatus.ts src/__tests__/screens/onboarding
git commit -m "feat(age): add onboarding age check with DOB fallback"
```

---

### Task 11: Existing-user prompt, recovery, and re-checking

Without this task an existing user who dismisses the sheet is stranded at `unknown` forever with social off and no visible cause.

**Files:**
- Create: `src/hooks/useAgeCheckPrompt.ts`
- Create: `src/components/age/AgeCheckPrompt.tsx`
- Create: `src/components/age/AgeCheckSheet.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (mount alongside `BiometricEnrollPrompt`, line ~948)
- Modify: `src/screens/profile/ProfileScreen.tsx` (permanent "Confirm your age" row — this is the settings hub; there is no `SettingsScreen`)
- Test: `src/__tests__/hooks/useAgeCheckPrompt.test.ts`

**Interfaces:**
- Consumes: `useSocialAccess`, `useSetAgeStatus`, `resolveAgeStatus`
- Produces: `useAgeCheckPrompt(): { shouldShow: boolean; dismiss: () => void; confirm: (dob: Date) => Promise<void> }`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/useAgeCheckPrompt.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useAgeCheckPrompt } from '@/hooks/useAgeCheckPrompt';
import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useAgeGateStore } from '@/store/ageGateStore';

jest.mock('@/hooks/useSocialAccess');
jest.mock('@/hooks/useSetAgeStatus', () => ({ useSetAgeStatus: () => ({ setStatus: jest.fn() }) }));
const mockAccess = useSocialAccess as jest.Mock;

describe('useAgeCheckPrompt', () => {
  // The store is a persisted module-level singleton, so without this the dismissal
  // cases contaminate each other and the three-dismissal test can pass for the
  // wrong reason.
  beforeEach(() => {
    useAgeGateStore.setState({ dismissCount: 0, lastDismissedAt: null });
    jest.clearAllMocks();
  });

  it('shows for an unresolved user', () => {
    mockAccess.mockReturnValue({ status: 'unknown', socialEnabled: false, isRestricted: true, isLoading: false });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(true);
  });

  it('does not show for an eligible user', () => {
    mockAccess.mockReturnValue({ status: 'eligible', socialEnabled: true, isRestricted: false, isLoading: false });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(false);
  });

  it('does not show for a resolved under13 user', () => {
    mockAccess.mockReturnValue({ status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false });
    expect(renderHook(() => useAgeCheckPrompt()).result.current.shouldShow).toBe(false);
  });

  it('stops showing after three dismissals', () => {
    mockAccess.mockReturnValue({ status: 'unknown', socialEnabled: false, isRestricted: true, isLoading: false });
    const { result, rerender } = renderHook(() => useAgeCheckPrompt());
    for (let i = 0; i < 3; i += 1) {
      act(() => result.current.dismiss());
      rerender({});
    }
    expect(result.current.shouldShow).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test --testPathPattern='useAgeCheckPrompt'
```

Expected: FAIL — cannot resolve the hook.

- [ ] **Step 3: Implement the store and hook**

```ts
// src/store/ageGateStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AgeGateState {
  dismissCount: number;
  lastDismissedAt: string | null;
  recordDismissal: () => void;
  reset: () => void;
}

export const useAgeGateStore = create<AgeGateState>()(
  persist(
    (set) => ({
      dismissCount: 0,
      lastDismissedAt: null,
      recordDismissal: () =>
        set((s) => ({
          dismissCount: s.dismissCount + 1,
          lastDismissedAt: new Date().toISOString(),
        })),
      reset: () => set({ dismissCount: 0, lastDismissedAt: null }),
    }),
    { name: 'age-gate-prompt', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

```ts
// src/hooks/useAgeCheckPrompt.ts
import { useCallback } from 'react';

import { useSocialAccess } from '@/hooks/useSocialAccess';
import { useSetAgeStatus } from '@/hooks/useSetAgeStatus';
import { useAgeGateStore } from '@/store/ageGateStore';
import { classifyDateOfBirth } from '@/services/age';

const MAX_DISMISSALS = 3;
const REPROMPT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function useAgeCheckPrompt() {
  const { status } = useSocialAccess();
  const { setStatus } = useSetAgeStatus();
  const { dismissCount, lastDismissedAt, recordDismissal } = useAgeGateStore();

  const dueForReprompt =
    lastDismissedAt === null ||
    Date.now() - new Date(lastDismissedAt).getTime() > REPROMPT_AFTER_MS;

  const shouldShow =
    status === 'unknown' && dismissCount < MAX_DISMISSALS && dueForReprompt;

  const confirm = useCallback(
    async (dob: Date) => {
      await setStatus(classifyDateOfBirth(dob), 'self_declared');
    },
    [setStatus]
  );

  return { shouldShow, dismiss: recordDismissal, confirm };
}
```

Dismissal is capped rather than permanent: after three dismissals the Settings row in Step 4 becomes the only route, which is why that row must not be conditional on dismissal state.

- [ ] **Step 4: Add the permanent Settings row**

In `ProfileScreen.tsx`, render a "Confirm your age" row whenever `status !== 'eligible'`. This is the guaranteed escape hatch and the only one independent of dismissal state — it must not be conditional on `dismissCount`.

- [ ] **Step 5: Add re-checking for users who turn 13**

In the same hook, when `status === 'under13'` and `age_resolved_at` is more than 30 days old, call `resolveAgeStatus()` on mount and persist any change. Without this an under-13 classification is permanent.

- [ ] **Step 6: Mount the prompt**

Add `<AgeCheckPrompt />` next to `<BiometricEnrollPrompt />` in `RootNavigator.tsx`.

- [ ] **Step 7: Run the tests**

```bash
pnpm test --testPathPattern='useAgeCheckPrompt' && pnpm type-check
```

Expected: PASS, 4 tests; 0 type errors.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useAgeCheckPrompt.ts src/components/age src/navigation src/screens/profile src/__tests__/hooks
git commit -m "feat(age): prompt existing users with a permanent recovery path"
```

---

### Task 12: Notification gating

Push is delivery, and `round_commented` notifications carry `comment_preview` — user-generated text on the lock screen. Gating the in-app surfaces while still pushing UGC would contradict the declaration.

**Files:**
- Create: `supabase/migrations/20260904000200_age_gate_notifications.sql`
- Modify: `src/services/notifications/notificationHandler.ts:123-125`
- Test: `src/__tests__/services/notifications/notificationHandler.test.ts`

**Interfaces:**
- Consumes: `social_enabled()` (Task 5), `useSocialAccess` (Task 7)
- Produces: no new exports

- [ ] **Step 1: Write the migration**

There are **four** social notification types routing to `RoundActivity`, spread across three
migrations. All four must be gated — missing one leaks UGC to a restricted user's lock screen:

| Type | Defined in |
|---|---|
| `round_liked` | `20260521000300_activity_notifications.sql` |
| `round_commented` | `20260521000300_activity_notifications.sql` |
| `round_also_commented` | `20260615010000_round_also_commented_notifications.sql` |
| `comment_liked` | `20260621000000_comment_likes.sql` |

Redefine each trigger function with a guard immediately before the insert:

```sql
-- Pattern applied to all four trigger functions.
-- v_recipient is whatever the existing function already computed as the target user.
IF NOT social_enabled(v_recipient) THEN
  RETURN NEW;  -- no notification row, and therefore no push
END IF;
```

Copy each existing function body forward rather than retyping it — the goal is a guard added,
nothing else changed.

- [ ] **Step 2: Verify no notification row is created**

```sql
UPDATE age_gate_config SET enforce = TRUE;
-- as an eligible user, comment on a round an under13 user played
SELECT COUNT(*) FROM notifications
 WHERE user_id = '<under13-uuid>' AND type = 'round_commented';
-- expect: 0
UPDATE age_gate_config SET enforce = FALSE;
```

- [ ] **Step 3: Make the deep-link handler fall back**

`RoundActivity` is not registered for restricted users (Task 9), so a notification queued
before reclassification would navigate to a missing route. `notificationHandler.ts` currently
resolves routes from a static `NOTIFICATION_ROUTES` map; add a function beside it:

```ts
// src/services/notifications/notificationHandler.ts

/** Social notification types whose destination screen is age-gated. */
const SOCIAL_NOTIFICATION_TYPES = new Set([
  'round_liked',
  'round_commented',
  'round_also_commented',
  'comment_liked',
]);

/**
 * Resolve a notification's destination screen.
 *
 * Restricted users have no RoundActivity route registered, so social
 * notifications that slipped through before reclassification fall back to the
 * round screen rather than navigating nowhere.
 */
export function resolveNotificationRoute(
  type: string,
  opts: { isRestricted: boolean }
): string | undefined {
  if (SOCIAL_NOTIFICATION_TYPES.has(type) && opts.isRestricted) {
    return 'ViewRound';
  }
  return NOTIFICATION_ROUTES[type];
}
```

⚠️ Takes `isRestricted`, not `socialEnabled`. Notifications are frequently handled at cold
start with no profile cached yet; diverting on "not yet known" would send eligible users to
the wrong screen on the most common deep-link path in the app. Pass `isRestricted: false`
when the cached profile is absent — the destination route is registered in that state
(Task 9) and `AgeLock` covers the content if the user does turn out to be restricted.

Update the handler's call site to `resolveNotificationRoute(type, { isRestricted })`, reading
the cached profile's `age_status`.

- [ ] **Step 4: Test the fallback**

```ts
const SOCIAL = ['round_liked', 'round_commented', 'round_also_commented', 'comment_liked'];

it.each(SOCIAL)('falls back to ViewRound for %s when positively restricted', (type) => {
  expect(resolveNotificationRoute(type, { isRestricted: true })).toBe('ViewRound');
});

it.each(SOCIAL)('routes %s to RoundActivity when not restricted', (type) => {
  expect(resolveNotificationRoute(type, { isRestricted: false })).toBe('RoundActivity');
});

// REGRESSION: cold start has no cached profile. Treating that as restricted would send
// eligible users to the wrong screen on the app's most common deep-link path.
it('routes to RoundActivity when the profile is not cached yet', () => {
  expect(resolveNotificationRoute('round_commented', { isRestricted: false })).toBe('RoundActivity');
});

it('leaves non-social notifications untouched', () => {
  expect(resolveNotificationRoute('tee_time_reminder', { isRestricted: true })).toBe('ViewRound');
  expect(resolveNotificationRoute('prize_pool_settled', { isRestricted: true })).toBe('CompetitionDetail');
});
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test --testPathPattern='notificationHandler'
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260904000200_age_gate_notifications.sql src/services/notifications src/__tests__/services/notifications
git commit -m "feat(age): stop social notifications reaching restricted users"
```

---

### Task 13: Fixture migration, performance check, and full-suite green

**Files:**
- Modify: `src/__tests__/mocks/**` (player fixtures)
- Modify: various existing activity/feed test suites

- [ ] **Step 1: Confirm the starting point is green**

The safeguards work greened the suite on `main` (374 suites, 0 failures, 15 legacy skips), so
this plan expects **0 failures** — not a diff against a baseline of known noise.

```bash
pnpm test 2>&1 | tail -5
```

Expected: 0 failed suites, apart from anything this plan's own tasks have yet to fix.

⚠️ Do **not** try to capture a baseline with `git stash` — by this task Tasks 1–12 are all
committed, so stashing changes nothing and would measure the same tree twice. If the suite is
unexpectedly red here, find out why before touching fixtures; a red starting point means
something earlier in the plan regressed and the fixture change would mask it.

- [ ] **Step 2: Add `age_status: 'eligible'` to the shared player fixture**

Every existing activity/feed suite assumes social access. Default the shared mock player to `eligible` so those suites keep passing — this is broad but mechanical.

- [ ] **Step 3: Run the full suite**

```bash
pnpm test 2>&1 | tail -5
```

Expected: 0 failures. Any failure is a real regression from this plan — fix it, do not accept
it as pre-existing noise.

- [ ] **Step 4: Run the performance check**

Against staging data, with `enforce = TRUE`:

```sql
EXPLAIN ANALYZE SELECT * FROM get_activity_feed(20);
EXPLAIN ANALYZE SELECT * FROM round_comments WHERE round_id = '<busy-round>';
```

Expected: `social_enabled()` evaluated once per statement, not once per row, and no change in plan shape. If it is per-row, confirm `idx_players_age_eligible` from Task 5 is present and being used.

- [ ] **Step 5: Full verification**

```bash
pnpm verify:gate
```

Expected: type-check, targeted tests and changed-file lint all pass.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__
git commit -m "test(age): default fixtures to eligible and green the suite"
```

---

## Deployment (after all tasks)

Follow spec §10 in order. The key property: **every migration in this plan deploys inert.** `enforce` stays `false` until the client has shipped and adoption is measured, then it is a single row update:

```sql
UPDATE age_gate_config SET enforce = TRUE;
```

Reversible the same way. Do not flip it before the Task 13 Step 4 performance check.
