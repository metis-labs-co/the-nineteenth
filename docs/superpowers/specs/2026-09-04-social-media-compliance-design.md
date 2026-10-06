# Social Media Compliance — Design

**Date:** 2026-09-04
**Branch:** `feature/under-13-social-gating`
**Status:** Revised after design review, pending implementation plan

Two coupled workstreams gating the same App Store submission:

- **Part A (§1–§11)** — under-13 social gating, so the age-rating declaration is truthful.
- **Part B (§12)** — UGC reporting and blocking, required by App Review Guideline 1.2 the
  moment that declaration is made.

They ship on one branch and one build. Part A needs a native change, so splitting them would
mean two rounds of provisioning, native builds and review for no benefit.

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
- Give every user a way to report content and block people, and give the operator a way to
  act on reports (Part B).

## 3. Non-goals

- Age *verification*. Apple requires a check, not proof. A determined child can lie to a
  neutral age screen; that is true of every app and is not what is being declared. See §6.2
  for what this does and does not guarantee.
- An in-app moderation console. Reports are actioned from the Supabase dashboard for now;
  see §12.6 for why that is sufficient and what the upgrade path is.
- Any change to the Contests/Gambling answers covering Skins, Wolf and prize pools.

## 4. Decisions

| Question | Decision |
|---|---|
| Under-13 experience | **Restricted mode** — golf features stay, social surfaces are removed |
| When the platform API gives no answer | **Ask for date of birth in-app**; social off until answered |
| Existing users | **Prompted on next launch**, social off until answered, rest of app usable |
| Gated surfaces | **All eight** — feed, comments, likes, photos, player search, public leagues, global leaderboard, **social push notifications** |
| Fallback age input | **Full date of birth**, classified client-side and discarded |
| Reported content | Hidden from the reporter immediately, queued for review — **no automatic global takedown** |
| Report handling | **Email alert + Supabase dashboard**, no in-app console |

>  **On date of birth vs birth year:** confirmed as full DOB. This makes no difference to
> Apple — the requirement is that the Declared Age Range API is called; the fallback is our
> own design and is neither specified nor inspected. It is a correctness choice: a birth year
> alone cannot tell whether someone born 13 years ago has had their birthday yet, forcing a
> deliberate error in one direction or the other at exactly the boundary that matters. The
> DOB is classified client-side and discarded (§6.2).

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
8. Update the privacy policy and Terms — age-band collection (Part A) and the 24-hour
   content-removal commitment (Part B, §12.7).

Part B carries no kill switch and needs none: it is purely additive — new tables, new
affordances, and SELECT policies that only ever hide more. It deploys with Migration A and is
live the moment the client ships. The `notify-content-report` edge function must be deployed
before step 5, or the first reports will queue silently with no alert.

The App Store answer can be given at step 5: the API is called and the gating ships with that
build. Steps 6–7 exist so that users who have not yet updated are not punished for it.

Note: this is a native change (new pod + entitlement). It cannot ship as an OTA update.

## 11. Open risks

- ~~**Compilation against `expo-modules-core@3.0.29` is unverified.**~~ **RESOLVED
  2026-09-05.** `expo-age-range@0.2.1` resolves into `Podfile.lock` with no conflict against
  `ExpoModulesCore`, and all three Swift sources compile to object files (arm64 + x86_64)
  against the iOS 26.2 SDK under Xcode 26.3 — including `AgeRangeModule.swift`, which carries
  `import DeclaredAgeRange`. **No Expo SDK upgrade is required.** Note: `expo prebuild` must
  never be run on this repo; it would destroy the committed watchOS targets. Autolinking plus
  `pod install` is sufficient.
- ~~**Android behaviour in 0.2.1 is unverified.**~~ **RESOLVED 2026-09-05** by reading
  `AgeRangeModule.kt`. Android does **not** fake an adult: `checkAgeSignals` failures reach
  `promise.reject(...)` and cancellation throws `AgeRangeTaskCancelledException`. A device
  without Play Age Signals therefore throws, which maps to `unknown` and the DOB fallback —
  so `ANDROID_SIGNAL_TRUSTED = true`. The `lowerBound: 18` trap is **iOS-only**.
  Two caveats: Android discards the request options entirely (`_: Any`), so `threshold1` is
  ignored there and Play returns whatever bands it has — harmless, since classification works
  off arbitrary bounds. And it pulls `com.google.android.play:age-signals:0.0.2`, a 0.0.x
  dependency that has not yet been built here.
- **The iOS 26 happy path has not been exercised at runtime.** Compilation and the
  below-26 and Android paths are settled from source, but a real age-range response on an
  iOS 26 device is still unobserved. Verify at first device run.
- **The entitlement may require Apple approval**, which would add lead time.
- **Adoption may stall**, leaving a long tail at `unknown`. The kill switch means this costs
  nothing operationally, but it delays the point at which the gate is actually enforcing.

## 12. Part B — UGC reporting and blocking (Guideline 1.2)

### 12.1 Requirement

App Review Guideline 1.2 applies to any app carrying user-generated content. Declaring
**Social Media = Yes** puts The Nineteenth squarely inside it. Four things are required:

| Requirement | Today | After Part B |
|---|---|---|
| Filter objectionable material from being posted | ❌ | §12.5 |
| Report offensive content, acted on promptly | ❌ | §12.3 |
| Block abusive users | ❌ | §12.4 |
| Published contact information | ✅ | unchanged |

The exposure is concrete: `round_comments` accepts up to 2000 characters of free text and
`round_photos` accepts arbitrary images, both visible to everyone who passes
`can_view_round()` — which includes friends-of-participants, not just the people who played.
There is currently no report, block, hide or filter affordance anywhere in the codebase.
Reviewers test this deliberately on UGC apps.

### 12.2 Data model

```sql
CREATE TABLE content_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('round_comment','round_photo','player')),
  content_id   UUID NOT NULL,
  author_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL CHECK (reason IN ('offensive','harassment','spam','nudity','other')),
  note         TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  UNIQUE (reporter_id, content_type, content_id)
);

CREATE TABLE user_blocks (
  blocker_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
```

`author_id` is denormalised onto the report so a takedown decision survives the author
deleting their account. The `UNIQUE` constraint makes reporting idempotent — a user cannot
inflate a count by tapping twice.

### 12.3 Report flow

Reporting is available on round comments, round photos, and player profiles via an overflow
action, opening a `ReportSheet` with the reason list above and an optional note.

On submit:

1. A row is written to `content_reports`.
2. **The content is hidden from the reporter immediately** — enforced in the SELECT policies
   (§12.5), not by local state, so it stays hidden across devices and reinstalls.
3. An email alert fires to the operator (§12.6).

**No automatic global takedown at a report threshold.** Within friend groups a count-based
auto-hide is trivially abusable as a censorship button, and the volume here does not justify
the risk. Global removal is an operator decision. Apple's requirement is that reports are
acted on promptly, not that removal is automatic — and from the reporting user's point of
view the response *is* immediate, because the content disappears for them on submit.

### 12.4 Block flow

Blocking is available from `PlayerDetailScreen` and from the same overflow actions.
Blocking is one-directional in intent but symmetric in effect — neither party sees the other:

- Their comments, photos and likes become invisible to you, and yours to them.
- Neither can send the other a friend request.
- Neither appears in the other's player search results.
- **Any existing friendship between the two is deleted.** Without this the blocked user
  would keep round visibility through `is_friend()` and keep appearing in the activity feed,
  which is exactly what the person blocking them is trying to stop.

An unblock list lives in Settings. Unblocking does not restore the deleted friendship.

### 12.5 Enforcement

One helper, mirroring the shape of `social_enabled()`:

```sql
CREATE OR REPLACE FUNCTION is_blocked_pair(a UUID, b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;
```

Applied to:

| Surface | Rule |
|---|---|
| `round_comments` SELECT | Hide if reported by viewer, or author blocked, or `deleted_at` set |
| `round_photos` SELECT | Same, keyed on `uploader_id` |
| `round_likes`, `round_comment_likes` SELECT | Hide blocked users' rows |
| `friendships` INSERT | Denied for a blocked pair |
| Player search | Blocked users excluded from results |

**Operator takedown reuses `deleted_at`.** Both tables already soft-delete and every read
path already filters on it, so a takedown needs no new query changes — it sets `deleted_at`
and marks the report `actioned`. The audit trail lives in `content_reports`, which is where
the distinction between author-deleted and moderator-removed belongs.

**Posting filter.** A shared blocklist check (`src/utils/contentFilter.ts`) rejects comment
bodies matching a profanity/slur list at submit time, with a database trigger on
`round_comments` as the backstop so it cannot be bypassed by a modified client. This is the
"filter objectionable material" limb of 1.2; it is deliberately a simple word list, not
classification — the goal is a good-faith filter, not moderation AI.

### 12.6 Operations

Reports are actioned from the Supabase dashboard, not an in-app console:

- A `notify-content-report` edge function fires on insert and emails the operator with the
  report, the content, and the author.
- Two SQL helpers, `moderate_content(report_id, 'actioned'|'dismissed')` and a
  `pending_reports` view, make the dashboard workflow a two-command job.

Apple requires prompt action, not a particular tool for taking it. At current volume a
console would be building infrastructure for traffic that does not exist. The upgrade path
is a super-admin screen reading the same table — deferred until report volume justifies it.

### 12.7 Terms of Service

`TERMS_OF_SERVICE.md` §5.3 already prohibits objectionable content but makes no commitment
about response. Reviewers look for the commitment. Add: objectionable content is removed and
abusive accounts ejected within 24 hours of a report. This is the standard EULA language
Guideline 1.2 expects, and it must be a promise the operator can actually keep — which the
email alerting in §12.6 is what makes possible.

### 12.8 Testing

- Policy tests: reported content is invisible to the reporter and still visible to everyone
  else; blocked pairs cannot see each other's comments, photos or likes.
- Blocking deletes an existing friendship, in both directions.
- Duplicate reports are rejected by the `UNIQUE` constraint rather than erroring the UI.
- The content filter rejects on the server even when the client check is bypassed.
- Takedown via `deleted_at` removes content from every read path, including the feed RPCs.

### 12.9 Interaction with Part A

The two parts touch the same tables and must not fight:

- A restricted (under-13) user cannot see comments or photos at all, so report and block
  affordances are simply absent for them — no dead buttons.
- `social_enabled()` and `is_blocked_pair()` both land on the `round_comments` /
  `round_photos` SELECT policies. They compose as `social_enabled() AND NOT blocked AND NOT
  reported-by-viewer`, and the §9 performance check must be run against the **combined**
  policy, not Part A's in isolation.
