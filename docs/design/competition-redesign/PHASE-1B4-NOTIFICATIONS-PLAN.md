# Phase 1B.4 — Competition Notification Settings — Spec & Implementation Plan

> **For workers:** implement task-by-task; `- [ ]` steps. Two cheap organiser toggles that gate
> **existing** notifications. The third mock toggle (live score alerts) is **deferred** — do not build it.

**Goal:** Give organisers two competition-wide notification toggles in Settings — **Round reminders** and
**Results summary** — that control whether *this competition* emits those pushes, layered on top of each
member's existing account-level preferences.

**Decisions (owner):**
- **Defer "Live score alerts"** — it's fully net-new (new type + trigger on the scoring write path +
  account pref + throttling; spam/perf risk). Its own later project. Optionally show a disabled
  "Live score alerts — coming soon" row.
- **Results summary = the existing round-complete notice** (`round_completed`), not a new standings digest.
- **Model = organiser-set competition-wide emission flags, AND-gated with per-user prefs:** a push fires
  only if `competition flag = TRUE AND user_preferences.push_<category> = TRUE`. **Do not touch
  `user_preferences`** — reuse `push_round_reminders` (reminders) and `push_competition_updates` (results).

## Grounding — verified send path & anchors (from the notifications map)

- Send path: DB trigger → `create_notification` (in-app row) + `send_push_notification` (pg_net → Edge
  Function) → Edge Function checks `should_send_push(user_id, type)` against `user_preferences` → Expo.
- **Round reminders** → `tee_time_reminder`, a **pg_cron** sweep `send_tee_time_reminders()`
  (`migrations/20260422000000_tee_time_reminders.sql:196`). Covers **both** competition and standalone
  rounds; gated today only by `push_round_reminders`. Single-function gate point (a `WHERE` in its
  `candidate_rounds` CTE).
- **Results summary** → `notify_round_completed()`
  (`migrations/20260301000000_league_notification_triggers.sql:595`), fires once when all scorecards for a
  round hit completed/confirmed, race-guarded via `rounds.completion_notified`. Sends one "Round Complete"
  push to accepted players. Also covers standalone rounds. Gated today by `push_competition_updates`.
- **No per-competition notification config exists** (`competitions` has zero notification columns;
  `knockout_config JSONB` is the only per-competition flexible-settings precedent).
- Update path: add flags to `useUpdateCompetitionField`'s `Pick` (organiser RLS already allows the write).

## Storage choice

Two explicit boolean columns (clean predicates in the trigger/cron `WHERE`), **default `true`** (opt-out,
preserves today's behaviour). Do **not** pre-add a live-score-alerts column — add it when that project
lands. (JSONB `notification_settings` was considered per the `knockout_config` precedent but booleans read
cleaner in SQL guards; either is fine.)

## Global constraints

- **No `user_preferences` schema change**; reuse the two existing account categories.
- Standalone rounds (no competition) must be **unaffected** — the gate only applies when a competition
  exists and its flag is `false` (`IS NOT FALSE` handles the NULL-competition case).
- Do not change any scoring calculation; this only adds gating predicates to notification triggers.
- Preserve the `round_completed` race guard (`completion_notified`) exactly.
- No tier gate. Colours via `useThemeColors()`; `ToggleSwitch`; Settings screen is pushed.

---

### Task 1: Migration — competition emission flags

**Files:** new `supabase/migrations/<ts>_competition_notification_flags.sql`.
- [ ] `ALTER TABLE competitions ADD COLUMN round_reminders_enabled BOOLEAN NOT NULL DEFAULT true;`
- [ ] `ALTER TABLE competitions ADD COLUMN results_summary_enabled BOOLEAN NOT NULL DEFAULT true;`
- [ ] No RLS change; regenerate committed Supabase types if applicable.
- [ ] Commit: `feat(db): competition notification emission flags (1B.4.1)`

### Task 2: Gate `send_tee_time_reminders()` on the competition flag

**Files:** new migration replacing `send_tee_time_reminders()` (copy the latest body from
`20260422000000_tee_time_reminders.sql`, add one predicate).
- [ ] In the `candidate_rounds` CTE (which already joins `rounds`→`competitions`), add
  `AND (comp.round_reminders_enabled IS NOT FALSE)` so competition rounds with the flag off are excluded,
  while **standalone rounds (NULL competition) still send**.
- [ ] Test: reminder suppressed for a competition with `round_reminders_enabled=false`; still sent when
  true (and still gated by `push_round_reminders`); standalone-round reminders unaffected.
- [ ] Commit: `feat(notifications): gate round reminders on competition flag (1B.4.2)`

### Task 3: Gate `notify_round_completed()` on the competition flag

**Files:** new migration replacing `notify_round_completed()` (copy latest body; add the guard).
- [ ] Inside the already-guarded block (right **after** the atomic `completion_notified` claim so the
  event is still consumed and never retried), if the round belongs to a competition whose
  `results_summary_enabled = false`, **skip the notify loop and return** (still leaving
  `completion_notified` set). Standalone rounds (no competition) are unaffected.
- [ ] Test: no round-complete push for a competition with `results_summary_enabled=false`; the completion
  is still marked (no re-fire); sent when true (gated by `push_competition_updates`); standalone unaffected.
- [ ] Commit: `feat(notifications): gate results summary on competition flag (1B.4.3)`

### Task 4: Types + update path

**Files:** `src/types/index.ts`, `src/types/database/competition.types.ts` (add both booleans);
`useUpdateCompetitionField.ts` (add `'round_reminders_enabled'`, `'results_summary_enabled'` to the Pick).
- [ ] Add fields to the `Competition` types.
- [ ] Extend `CompetitionUpdate`.
- [ ] Test: mutation updates each flag + invalidates.
- [ ] Commit: `feat(competition): notification flag types + update path (1B.4.4)`

### Task 5: Settings UI — Notifications group

**Files:** `CompetitionSettingsScreen` — a "Notifications" group with `ToggleSwitch` rows.
- [ ] Add "Round reminders" + "Results summary" toggles (organiser-only), bound to the flags, optimistic
  → `useUpdateCompetitionField`. Short helper copy. **No `checkFeature`.**
- [ ] Optionally a **disabled** "Live score alerts — Coming soon" row (per the deferral) — copy confirmed
  with owner.
- [ ] Test: toggles persist + reflect current values.
- [ ] `pnpm type-check` + `pnpm lint`; grep diff for colour literals.
- [ ] Commit: `feat(settings): competition notification toggles (1B.4.5)`

### Task 6: Regression

- [ ] AND-gate holds: a push fires only when competition flag AND the user's account pref are both on.
- [ ] Standalone-round reminders + round-complete notices unaffected.
- [ ] `round_completed` race guard intact (no double-send, no missed-consume when disabled).
- [ ] `pnpm verify:gate`; migrations to staging; on-device smoke (toggle off → no push; on → push).
- [ ] Commit: `test(notifications): competition-flag regression (1B.4.6)`

---

## Deferred (explicitly NOT in this pass)

- **Live score alerts:** new `NotificationType` + trigger on score/hole updates (or leaderboard-position
  change) + `notifications.type` CHECK entry + `should_send_push` branch + a **new account-level pref
  category** + **debounce/rate-limit** design to avoid spam. Its own project; scoring-write-path adjacent.
- **Standings/winner digest** for results summary (content extension of `notify_round_completed` payload,
  numbers from existing leaderboard utils) — only if the owner later wants a richer summary.

## Self-review checklist

- [ ] Two flags default `true`; only gate when competition present and flag `false`; standalone unaffected.
- [ ] No `user_preferences` change; AND-gate with existing per-user categories.
- [ ] `completion_notified` guard preserved. No scoring calc touched. No tier gate. Live alerts not built.
