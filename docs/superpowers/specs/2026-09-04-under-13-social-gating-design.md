# Under-13 Social Gating — Design

**Date:** 2026-09-04
**Branch:** `feature/under-13-social-gating`
**Status:** Revised after design review, pending implementation plan

## 1. Problem

Apple's age-rating questionnaire asks two coupled questions:

- **Social Media** — "Redistribution, amplification, or interaction with user-generated
  content through a social feed or similar discovery method that visibly spreads content
  to many users."
- **Social Media Disabled for Users Under 13** — "Users under 13 don't have access to
  social media capabilities. At a minimum, the Declared Age Range API is called to check
  users' age ranges before enabling social media features. Only age-appropriate UGC is
  delivered."

The Nineteenth must answer **Yes** to the first: it ships an infinite-scroll activity feed
(`src/screens/activity/ActivityScreen.tsx`), round comments, likes, comment likes, shared
round photo albums, name-based player search across all users, publicly searchable leagues,
and a global achievement leaderboard.

In App Store Connect the second question must also be **Yes** when the first is Yes.
Today that answer would be false: the codebase collects no age signal of any kind — no
birthdate column, no Declared Age Range call, nothing in auth or onboarding.

This project makes the second answer true.

## 2. Goals

- Obtain an age signal for every user, on every platform.
- Deny **eight** social surfaces to users under 13, enforced server-side.
- Keep the core golf product (scoring, competitions, leagues, stats) fully available to
  under-13 users.
- Reach that state without degrading the experience of the existing user base at any point
  during rollout.
- Collect and retain the minimum data necessary — a derived age band, never a birthdate.

## 3. Non-goals

- Age *verification*. Apple requires a check, not proof. A determined child can lie to a
  neutral age screen; that is true of every app and is not what is being declared. See §6.2
  for what this does and does not guarantee.
- Guideline 1.2 moderation tooling (in-app report and block). Required for the same
  submission, but tracked separately — see §12.
- Any change to the Contests/Gambling answers covering Skins, Wolf and prize pools.

## 4. Decisions

| Question | Decision |
|---|---|
| Under-13 experience | **Restricted mode** — golf features stay, social surfaces are removed |
| When the platform API gives no answer | **Ask for date of birth in-app**; social off until answered |
| Existing users | **Prompted on next launch**, social off until answered, rest of app usable |
| Gated surfaces | **All eight** — feed, comments, likes, photos, player search, public leagues, global leaderboard, **social push notifications** |

> **Refinement worth confirming:** the approved option was phrased "ask for birth year".
> This spec specifies a full date of birth instead, because a birth year alone cannot tell
> whether someone born 13 years ago has actually had their birthday yet — leaving up to a
> year of misclassification in both directions, right at the threshold that matters. The DOB
> is used only to compute the band and is then discarded (§6.2). Reverting to birth year is
> a one-line change to `classifyDateOfBirth` if the extra field is not worth it.

### Revisions from design review

Design review found two defects that changed the architecture, and four gaps:

1. **Push notifications were a missing eighth surface.** `round_commented` notifications
   carry a `comment_preview` field (migration `20260521000300`) — literal user-generated
   text delivered to the lock screen — and `notificationHandler.ts:124-125` deep-links
   `round_liked` / `round_commented` to `RoundActivity`, a gated screen. Gating seven
   in-app surfaces while still pushing UGC would have contradicted the declaration
   directly. Now §6.4.
2. **The original rollout ordering would have disabled social for the entire live user
   base** for the duration of App Review and staged rollout. Enforcement is now decoupled
   from schema via a two-phase migration and a kill switch. Now §6.3 and §10.
3. Recovery path after prompt dismissal (§6.7), reclassified users' existing content and
   friendships (§6.5), honest framing of tamper-resistance (§6.3), and RLS performance
   verification (§6.3) were all under-specified and are now addressed.

## 5. Verified platform findings

These were confirmed by inspecting the published package, not from documentation, and they
drive the design.

**Pin `expo-age-range@0.2.1`.** It is the last release built on the SDK-54 toolchain
(`expo-module-scripts@^5.0.7`); 0.2.2 onward moved to the SDK-55 toolchain. It ships both an
iOS Swift and an Android Kotlin implementation, and exposes exactly one function:

```ts
requestAgeRangeAsync(options: { threshold1: number; threshold2?: number; threshold3?: number })
  : Promise<AgeRangeResponse>
```

The later `requestAgeSignalsAccessAsync()` / `isEligibleForAgeFeaturesAsync()` helpers
documented for SDK 56+ **do not exist** in 0.2.1. No Expo SDK upgrade is required.

**Podspec declares `:ios => '15.1'`** — identical to the project's current deployment
target. No deployment-target bump. The native module guards internally with
`guard #available(iOS 26.0, *)`.

**⚠️ The critical trap.** On iOS below 26 the module returns a default-constructed response:

```swift
public init() {
  // limited response used by iOS < 26, simulating an adult
  self.lowerBound = 18
}
```

A resolver that trusted `lowerBound` would classify **every user below iOS 26 as an adult**,
the date-of-birth fallback would never run, and the gate would silently be a no-op for the
majority of the user base while appearing to function. The resolver must therefore perform
its own OS-version check and trust the module's answer **only** on iOS 26+.

**Declining is an error, not a value.** The module throws `AgeRangeUserDeclinedException`
when the user declines, and `AgeRangeNotAvailableException` / `AgeRangeNoViewControllerException`
in other failure modes. All are caught and mapped to `unknown`.

## 6. Architecture

### 6.1 Age signal module — `src/services/age/`

A deep module whose entire public surface is:

```ts
export type AgeStatus = 'unknown' | 'under13' | 'eligible';
export function resolveAgeStatus(): Promise<AgeStatus>;
export function classifyDateOfBirth(dob: Date, now?: Date): AgeStatus;
```

Callers never see `AgeRangeResponse`, thresholds, or platform branching.

Resolution order:

1. `isPlatformSignalTrusted()` — `true` for iOS 26+. On Android it stays `false` until the
   §11 spike confirms the module reports honestly on devices without Play Age Signals; if it
   also simulates an adult, Android routes to the fallback permanently. Web and iOS < 26
   return `false` without calling the module at all, defeating the `lowerBound: 18` trap
   described in §5.
2. On a trusted platform, call `requestAgeRangeAsync({ threshold1: 13 })`:
   - `lowerBound >= 13` → `eligible`
   - `upperBound < 13` → `under13`
   - anything else, or any thrown exception → `unknown`
3. `unknown` hands off to the date-of-birth prompt (§6.6).

### 6.2 Data model

Migration adds to `players`:

| Column | Type | Notes |
|---|---|---|
| `age_status` | `TEXT NOT NULL DEFAULT 'unknown'` | `CHECK (age_status IN ('unknown','under13','eligible'))` |
| `age_source` | `TEXT` | `'declared_age_range'` \| `'self_declared'`, for audit |
| `age_resolved_at` | `TIMESTAMPTZ` | drives re-checking (§6.7) |

Plus a single-row `age_gate_config` table holding the enforcement kill switch (§6.3).

**No date of birth is persisted.** The DOB entered in the fallback prompt is held in memory,
classified client-side by `classifyDateOfBirth`, and discarded; only the resulting band is
sent to the server. It must never reach the database or any log line.

Writes go through a `SECURITY DEFINER` RPC `set_age_status(p_status, p_source)`. A trigger on
`players` rejects any `age_status` change that does not originate from that RPC, guarded by a
transaction-local GUC.

**What that trigger does and does not buy.** It prevents the ordinary profile-update path
from clobbering the flag, and it gives every transition a single auditable entry point. It is
**not** an anti-spoofing measure: the RPC accepts a band computed on the client, so a
determined user can still assert `eligible`. That is acceptable and expected — §3 states
that verification is a non-goal, and Apple's requirement is that the check is performed, not
that it is unforgeable. The spec should not be read as claiming more than this.

### 6.3 Server-side enforcement

One helper, with the enforcement kill switch built in:

```sql
CREATE OR REPLACE FUNCTION social_enabled(p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT
    NOT COALESCE((SELECT enforce FROM age_gate_config WHERE id = 1), false)
    OR EXISTS (
      SELECT 1 FROM players WHERE id = p_user AND age_status = 'eligible'
    );
$$;
```

While `enforce` is false the function returns true for everyone, so the policies can be
deployed inert and switched on later without a client release (§10). This mirrors the
existing force-update gate, which is already configured from a table row rather than a deploy.

Applied per surface:

| Surface | Enforcement point |
|---|---|
| Activity feed | `get_activity_feed`, `get_round_feed_card` return zero rows |
| Comments | `round_comments` SELECT + INSERT policies |
| Likes | `round_likes`, `round_comment_likes` SELECT + INSERT policies |
| Round photos | `round_photos` SELECT + INSERT policies |
| Player search | Searcher must be eligible **and** under-13 players are excluded from results |
| Friend requests | `friendships` INSERT requires both parties eligible |
| Public leagues | Public listing gated; joining by invite code is unaffected |
| **Social notifications** | `round_liked` / `round_commented` triggers skip non-eligible recipients (§6.4) |
| Global leaderboard | `global` scope returns empty; `friends` scope unaffected |

Player search and friend requests are one surface — stranger contact — split across two
enforcement points, which is why nine rows cover eight surfaces.

**⚠️ Guardrail:** the check goes on each individual policy, **never** inside
`can_view_round()`. That helper is shared with round-visibility logic; gating it there would
break scorecard visibility for every user. It is also referenced only by the social tables'
policies by design (see migration `20260521000000`) — that separation must be preserved.

**Performance is a verification step, not an assumption.** `social_enabled()` is added to
SELECT policies on the hottest social tables. It is `STABLE` with a constant argument, so
Postgres should evaluate it once per statement rather than per row — but this codebase has
prior form with RLS-related statement timeouts under contention, so the implementation must
confirm it with `EXPLAIN ANALYZE` on a realistic feed query before the kill switch is
flipped (§10 step 7), and add an index on `players (id) WHERE age_status = 'eligible'` if it does not.

### 6.4 Social notifications

Push is delivery, and Apple's wording is "only age-appropriate UGC is **delivered**". Two
changes:

- **Server:** the `round_liked` and `round_commented` notification triggers
  (migration `20260521000300`) check `social_enabled(recipient)` before inserting. A
  restricted user receives neither the row nor the push, so no `comment_preview` text ever
  reaches their lock screen.
- **Client:** `notificationHandler.ts` routes `round_liked` / `round_commented` to
  `RoundActivity`. For a restricted user that destination no longer exists in the navigator,
  so the handler must fall back to the round screen rather than attempting a dead route.
  This matters for notifications already queued when a user is reclassified.

### 6.5 Reclassification

A user's status can change in both directions — an existing adult account answering "12", or
an under-13 turning 13. The rules:

- **Existing comments, photos and likes are retained**, not deleted or hidden. They were
  authored when the account was unrestricted, deleting a user's content on a self-declaration
  is destructive and irreversible, and no requirement calls for it. This is a deliberate
  choice, recorded here so it is not mistaken for an oversight.
- **Existing friendships are retained.** They are inert for the gated surfaces anyway, and
  severing a child's existing connections is worse for them than leaving them dormant.
- **New friendships are blocked in both directions** while restricted — the under-13 cannot
  send a request and cannot be found in search, so no new stranger contact is possible.
- Because of the above, a user who is restricted *before* forming any friendships will have
  an empty friends-scope leaderboard. That is expected, not a bug.

### 6.6 Client gating and prompt UX

- `useSocialAccess()` — reads `age_status` from the existing profile query; returns
  `{ status, socialEnabled }`.
- `AgeLock` — a sibling to the existing `FeatureLock`, **not** a reuse of it. `FeatureLock`
  is framed as "upgrade to unlock"; showing a 12-year-old an upsell they cannot legally buy
  is the wrong message and an App Review risk in itself. `AgeLock` renders a neutral
  explanation with no purchase path.
- Gated routes are removed from navigation rather than rendered as locked shells.
- **New users:** an `AgeCheckStep` card in the existing onboarding flow
  (`src/screens/onboarding/components/`). It attempts the platform signal first and falls
  back to a date-of-birth picker in the same card when the result is `unknown`.
- **Existing users:** `age_status = 'unknown'` triggers a bottom sheet on next launch,
  following the `BiometricEnrollPrompt` pattern already established in the codebase.
  Dismissible. Social stays off until answered; nothing else is blocked — a user standing on
  the first tee can still score their round.

### 6.7 Recovery and re-checking

Every path out of `unknown` or `under13` must stay open, or users get silently stranded:

- **Permanent entry point.** A "Confirm your age" row in Settings is always available
  whenever status is not `eligible`. This is the guaranteed escape hatch for anyone who
  dismissed the sheet, and the only one that does not depend on timing.
- **Dismissed prompt.** Dismissal is not final. The sheet reappears after 7 days while
  status is `unknown`, capped at three showings, after which the Settings row is the only
  route. This avoids nagging while ensuring nobody is permanently stuck at `unknown` with
  social off and no visible cause.
- **Turning 13.** Status is re-resolved when `age_status = 'under13'` and `age_resolved_at`
  is more than 30 days old, and on demand from the same Settings row. Without this, an
  under-13 classification would be permanent.

## 7. Error handling

| Condition | Behaviour |
|---|---|
| User declines the system prompt | `unknown` → DOB fallback |
| iOS < 26 / web | `unknown` without calling the module |
| Module throws (unavailable, no view controller) | `unknown`, logged, DOB fallback |
| User dismisses the prompt | Stays `unknown`; re-prompted per §6.7; Settings row always available |
| `set_age_status` RPC fails | Status stays `unknown`; social remains off; prompt reappears |
| Network offline during onboarding | Classify locally, queue the write, retry on reconnect |
| Notification queued before reclassification | Handler falls back to the round screen (§6.4) |

Every failure path lands on `unknown`, which is closed for social features — failures deny
rather than grant.

## 8. Testing

- **Resolver unit tests** covering each response shape, each thrown exception, and — named
  explicitly as a regression test — that an iOS 15 device reporting `lowerBound: 18` resolves
  to `unknown`, not `eligible`.
- **`classifyDateOfBirth`** boundary tests: the day before, the day of, and the day after a
  13th birthday, plus leap-year birthdays.
- **SQL policy tests** for all eight surfaces, as an `under13` user and an `eligible` user,
  asserting both read and write are denied.
- **Kill-switch tests:** with `enforce = false`, an `under13` user retains full access to
  every surface — this is what makes the staged rollout in §10 safe, and it is the single
  most important test in the suite.
- **Migration tests:** existing rows land on `unknown`, and with `enforce = false` those
  users are unaffected on every surface. This is the exact scenario that made the original
  rollout ordering dangerous.
- **Notification tests:** `round_liked` / `round_commented` produce no row for a restricted
  recipient; the deep-link handler falls back cleanly when `RoundActivity` is absent.
- **Recovery tests:** dismissing the sheet three times leaves the Settings row functional and
  the user able to reach `eligible`.
- **Component tests** for `AgeLock` and for each gated screen's restricted rendering.
- **Fixture migration:** existing activity/feed suites need an `eligible` default player
  fixture. Broad but mechanical; expect a large, low-risk diff.

## 9. Performance verification

Before the kill switch is flipped in production, confirm with `EXPLAIN ANALYZE` against
staging data that adding `social_enabled()` to the social-table SELECT policies does not
change the plan shape for the feed query, and that per-statement evaluation is happening.
This project has previously hit 8-second statement timeouts from row-lock contention, so a
new function on a hot read path gets checked rather than assumed.

## 10. Rollout

Ordering matters, and enforcement is deliberately decoupled from schema so that no user
loses a working feature while waiting for an app update.

1. Enable the Declared Age Range capability on the App ID in the Apple Developer portal and
   regenerate the provisioning profile. **This blocks the build — do it first.**
2. Add `com.apple.developer.declared-age-range` to
   `ios/TheNineteenth/TheNineteenth.entitlements`, plus a `plugins/withDeclaredAgeRange.js`
   config plugin so `expo prebuild` does not drop it (follows the existing `withWearOs`
   pattern).
3. Pin an Xcode 26 image in `eas.json` (currently unpinned; local Xcode is 26.3).
4. **Migration A** — columns, `age_gate_config` seeded with `enforce = false`,
   `set_age_status`, `social_enabled()`, and all policy changes. Because the switch is off,
   this is a **no-op for every existing user**: `social_enabled()` returns true for
   everyone, and nothing changes behaviourally. Deploy to staging, then production.
5. Ship the client build. Existing users are prompted on next launch and begin resolving to
   `eligible` or `under13`.
6. Watch adoption: the share of active users still at `age_status = 'unknown'`.
7. **Flip `enforce = true`** once that share is small enough, after the §9 performance check.
   This is a single row update — no deploy, instantly reversible if anything misbehaves.
8. Update the privacy policy and Terms to describe age-band collection.

The App Store answer can be given at step 5: the API is called and the gating ships with that
build. Steps 6–7 exist so that users who have not yet updated are not punished for it.

Note: this is a native change (new pod + entitlement). It cannot ship as an OTA update.

## 11. Open risks

- **Android behaviour in 0.2.1 is unverified.** The iOS path was read end-to-end; the Kotlin
  module was not. First implementation task is a spike confirming what Android returns on a
  device without Play Age Signals, and whether it also simulates an adult.
- **Compilation against `expo-modules-core@3.0.29` is unverified.** 0.2.1 targets the SDK-54
  toolchain but has not been built here. The spike must run `expo prebuild` plus a device
  build before any further work depends on it.
- **The entitlement may require Apple approval**, which would add lead time.
- **Adoption may stall**, leaving a long tail at `unknown`. The kill switch means this costs
  nothing operationally, but it delays the point at which the gate is actually enforcing.

## 12. Out of scope, but required for the same submission

Answering Yes to Social Media brings the app under **Guideline 1.2**, which requires four
things. The app currently has two:

| Requirement | Status |
|---|---|
| EULA with objectionable-content clause | Present — `TERMS_OF_SERVICE.md` §5.2/5.3 |
| Published contact information | Present |
| In-app reporting of objectionable content | **Missing** |
| Ability to block abusive users | **Missing** |

There is no report, block, hide or filter affordance anywhere in the codebase. This is a
likely rejection reason independent of this project and should be scheduled before
submission.
