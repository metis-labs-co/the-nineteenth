# End round early — 1.15.0 QA and rollout runbook

**Status: C3 narrowed and local database compatibility testing added; staging,
production, native/device QA and rollout remain pending.**
The [scope decision and evidence](END_ROUND_SCORING_SCOPE.md) supersede the
earlier controller-contract acceptance claim. The local suite uses a disposable
PostgreSQL container with networking disabled; it is separate from staging or
production rollout. Mocked Jest boundaries still do not establish native SQLite
crash/interleaving guarantees. No push, merge, deployment or store/OTA release
has run. Historical source-review passes are not release approval.

Use this current runbook alongside the historical
[plan](../superpowers/plans/2026-10-07-end-round-early.md) and
[spec](../superpowers/specs/2026-10-07-end-round-early-design.md). Final client
contracts are described in [scoring architecture](SCORING_ARCHITECTURE.md),
[offline architecture](OFFLINE_ARCHITECTURE.md) and
[database schema](../database/DATABASE_SCHEMA.md). Superseded snippets in the
historical plan do not replace the reviewed C1–C5/B6 interfaces.

## Results record

Record each future operation's environment, operator, timestamp, exact command,
exit, complete log location, before/after evidence and decision in the PR or
release record. Leave unperformed rows pending; a successful Jest run is not
evidence for any row below. Do not paste credentials into logs or notes.

| Item | Staging | Production / store | Evidence / Sam decision |
|---|---|---|---|
| C1–C5/000300 scope and ordinary competition compatibility | Target-environment check pending | Pending evidence review | Local exit 0: 234 migrations, 21 checks, 3 SQL scripts, 14 pre-C3 controls; [evidence](END_ROUND_SCORING_SCOPE.md) |
| UGC/age-gate prerequisite and go/no-go | Pending | Pending | Pending |
| A7 dry-run report, apply and after report | Pending | Pending | Pending |
| B1 then C3 dry run and apply, `migrated_at` | Pending | Pending | Pending |
| Four SQL verification scripts | Pending | Pending | Pending |
| Two-session disposable concurrency schedules | Pending | Pending staging evidence review | Pending |
| Part A QA and Sam-only stuck-round procedure | Pending | Pending | Pending |
| Native/device Part B QA and race checks | Pending | Pending staging evidence review | Pending |
| Local whole-branch source review | Historical source pass | Not release approval | Scope/compatibility review reopened; see build handoff |
| Merge / push | Pending | Pending | Pending |
| Store release 1.15.0 on both platforms | Pending | Pending | Pending |
| Post-live force-update minimum check | Pending | Pending | Pending |
| 48-hour error / legacy-write audit | Pending | Pending | Pending |

## Prerequisites and release order (manual)

- [ ] Review the [C1–C5 scope decision](END_ROUND_SCORING_SCOPE.md) and local
  database evidence, then repeat relevant compatibility checks on the approved
  target before rollout. Independent competition writers now use compatible
  parent key-share locks. The local suite covers simultaneous groups without
  ending, legacy writes, completion, rollback/retry and persistence; staging and
  production execution still require their own rollout authorization.
- [ ] Sam checks UGC/age-gate prerequisites on the target, decides go/no-go
  before each real apply, and records the decision. B1 recreates feed functions
  from `20260905000150_ugc_moderation_feed.sql`; absent/null/false results below
  stop this rollout. UGC has its own rollout/blockers; do not apply it as part of
  this procedure without Sam's separate decision. Defer 1.15.0 if prerequisites
  are absent.
- [ ] Record the target/environment independently of migration history. This
  repository's Supabase CLI is linked to prod; `supabase db push` is not a
  staging recipe. Hand-applied `schema_migrations` history is unreliable; check
  actual objects, privileges and function bodies.
- [ ] Review A6d-2 Step 5 (Part A rollout + QA) in the historical plan: A7 before
  report, staging/prod apply and zero incomplete differentials, Part A device QA,
  plus the stuck social rounds. All remain pending unless actual evidence exists.
  **Sam alone** executes the service-role stuck-round runner; an agent never
  requests/reads that key. The historical procedure uses interactive `read -rs`
  and `finalizeSubmittedRound` for active-skins rounds (status/results plus skins).
  Stuck rounds without an active skins game use the separately approved manual
  status-only path in A6d-2 Step 5. Sam rotates a key
  if it was pasted anywhere. This runbook does not execute or supply that runner.
- [ ] Apply dependencies in order **A7 → B1 → C3**, staging before prod and
  before any 1.15.0 client reaches that target. Missing `rounds.holes_played`
  breaks new-client selects (`42703`); missing C3 leaves the expected-shape
  protection/patch APIs incomplete.

Future read-only prerequisite query (must return true for every field):

```sql
select to_regclass('public.age_gate_config') is not null as age_gate,
       to_regclass('public.content_reports') is not null as ugc_schema,
       to_regprocedure('public.is_blocked_pair(uuid,uuid)') is not null as ugc_policies,
       (select p.prosrc ilike '%is_blocked_pair%'
          from pg_proc p where p.oid = to_regprocedure('public.get_round_feed_card(uuid)')) as ugc_feed,
       to_regprocedure('public.moderate_content(uuid,text)') is not null as ugc_ops;
```

## Migration rehearsal and verification (manual; never during implementation)

Pooler sessions default to read-only. Known-working access is port **6543**.
Every write starts a heredoc with `SET default_transaction_read_only = off;`
and `show transaction_read_only;` **before BEGIN**; stop unless SHOW prints off.
Do not use PGOPTIONS or combine `-c SET` with `--single-transaction`.
The operator supplies an approved target URL privately; none is obtained here.

- [ ] On a disposable scratch/staging database (original B11 Step 10 item 9,
  deferred), rehearse A7 then B1 then C3. A7's before report must be captured
  inside its rolled-back transaction as documented in
  `supabase/scripts/full_scorecards_only_report.sql`.
- [ ] At a quiet time, dry-run the required migrations in order with ROLLBACK,
  inspect complete output and actual exit, then repeat with COMMIT only after
  Sam's go/no-go. This example is for a target needing all three; for a target
  already on A7, omit its reapply after verifying A7 objects and evidence.

```bash
psql "$TARGET_DB_URL" -p 6543 -v ON_ERROR_STOP=1 <<'SQL'
SET default_transaction_read_only = off;
show transaction_read_only;
BEGIN;
SET LOCAL lock_timeout = '5s';
\i supabase/migrations/20261007000100_full_scorecards_only_handicap.sql
\i supabase/scripts/full_scorecards_only_report.sql
\i supabase/migrations/20261007000200_end_round_early.sql
\i supabase/migrations/20261007000300_guard_round_scoring_writes.sql
ROLLBACK; -- real apply: COMMIT, only after Sam's go/no-go
SQL
```

Reapplying A7 after B1 removes the ended-handicap eligibility rule; reapplying
B1 after C3 replaces C3's guarded end RPC. If a prior migration is re-run,
reapply **B1 then C3** immediately after A7, or **C3** immediately after B1,
within the same approved transaction. Never leave the target on an older body.
The A7 commented UNDO is manual/Sam-only, not a B1/C3 rollback strategy: its
index restore compares current index null-safely with audited `new_handicap_index`.
C3 also guards protected differential restoration; review any post-C3 restore
separately rather than disabling guards blindly.

- [ ] After real apply, record `select now();` as that target's `migrated_at`,
  and run each verification script separately with the same SET/SHOW preflight.
  The fixture scripts own their BEGIN/ROLLBACK; do not wrap them in another
  transaction. This example may be repeated with each path in the table.

```bash
psql "$TARGET_DB_URL" -p 6543 -v ON_ERROR_STOP=1 <<'SQL'
SET default_transaction_read_only = off;
show transaction_read_only;
\i supabase/tests/round_scoring_writes_verify.sql
SQL
```

| Script | Expected future evidence |
|---|---|
| `supabase/tests/full_scorecards_only_handicap.verify.sql` | Exit 0, no failure, fixture transaction rolls back |
| `supabase/tests/end_round_early_verify.sql` | Exit 0, all 16 C3-adapted regression groups, no failure, rolls back |
| `supabase/tests/round_scoring_writes_verify.sql` | Exit 0, shape/stats/patch/RLS/context controls, no failure, rolls back |
| `supabase/tests/activity_feed_verify.sql` | Exit 0, catalog checks without fixture transaction; every row OK (some OK (n)) |

- [ ] Confirm `rounds.holes_played` and its standalone/range CHECK; authenticated
  EXECUTE on `end_round_early(uuid,integer)`, the four-argument snapshot and both
  BOOLEAN patch APIs; private helper denial; both feed functions return
  holes_played and nine_type; the expected-shape guard/entry triggers and fresh
  B1/C3 function bodies are installed. Preserve ordinary competition scorer,
  legacy-unended omission and completed/confirmed narrow-patch controls.
- [ ] Run [two-session schedules](../../supabase/tests/round_scoring_writes_two_session.md)
  with committed disposable fixtures and their explicit cleanup. A rollback
  fixture cannot exercise another connection. Cover both card/end orders,
  fresh shape after waiting, retained-only stale aggregates, missing-card insert/
  relocation/key-transfer/upsert conflict locks, entry-row-first/end deletion,
  real completion notification and ordinary competition scorer permissions,
  combination first/end first, stats/identity/metadata lifecycle and scoped
  context restoration. Record busy hints/actual waits/unchanged failed state;
  mocked schedules are not proof. The committed player2 membership in schedule8d
  is necessary for its valid other-player INSERT control.
- [ ] Re-run after checks below, expect zero/no rows, and review A7 report's
  legacy nine-type and preserved historical combination/league lists with Sam.

```sql
select count(*)
from scorecards s join rounds r on r.id = s.round_id
where s.handicap_differential is not null and r.deleted_at is null
  and (r.holes_played is not null
       or not scorecard_is_complete_for_handicap(s.scores, r.nine_type));

select r.id, r.nine_type, r.holes_played,
       count(*) filter (where s.handicap_differential is not null) as cards_with_differential
from rounds r join scorecards s on s.round_id = r.id
where r.holes_played is not null
group by r.id, r.nine_type, r.holes_played
having count(*) filter (where s.handicap_differential is not null) > 0;
```

## On-device QA (Sam; all pending)

Use a staging **1.15.0 store/native build**, Part A and Part B together, with
A7, B1 and C3 installed. Record results in the PR/release record, including
the device/OS/network and actual expected/observed behavior.

**Stroke play, 18 holes, 2 players, ended after 6:**
- [ ] ⋮ shows in the header once hole 1 is complete for everyone, and never before.
- [ ] Practice round (`handicap_source 'none'`): the sheet title is "End round early"; it reads "End round after hole 6?", lists a half-scored hole 7 under removed scores, and shows "This round won't count towards your handicap index."
- [ ] Handicap round (`handicap_source` not `'none'`): the same sheet shows "This is a handicap round. Ending it early makes it a practice round, and it won't count towards your handicap index." in place of the generic handicap line (R22).
- [ ] After confirming: the scoring screen shows "Ended after 6 of 18 · Finish", hole navigation stops at 6, and Submit goes to the finish screen.
- [ ] After submit: the round-list pill reads "Ended after 6 of 18"; the ViewRound scorecard shows holes 1–6 only with a sane to-par; net equals the per-hole net; Profile → handicap history has no new differential and the index is unchanged.
- [ ] The round reads "Practice Round" everywhere, even for a handicap round: the round-list card, the ViewRound header, the round-settings name placeholder and My Stats (R22).

**18 holes ended after exactly 9:**
- [ ] The label reads "Ended after 9 of 18"; no differential; the round is never offered as a combinable nine; `NINE_HOLE_SPECIALIST` (and `18_HOLES_OF_GLORY`) don't advance (Profile → achievements).

**Matches:**
- [ ] Singles match play, front 9, ended after 6 at 2 up → lands on the Match Play Scorecard screen; result and pill read "2 UP", never "2&3"; a level match reads "A/S".
- [ ] Team match play ended early → lands on Review; the ViewRound Match tab shows the final lead.

**Back 9, ended after 6:**
- [ ] Holes 10–15 everywhere: scorecard, Stats tab, player scorecard, Review shot log; never 1–6 or 19+.
- [ ] The label reads "Ended after 6 of 9".

**Pickup on the boundary:**
- [ ] A pickup on hole N is kept and N includes it; a lone pickup on hole N+1 is listed as removed.

**Multi-ball, ended early:**
- [ ] A multi-ball round ended after 6 → the end-round sheet shows no result preview; net is correct for holes 1–6; the card's `handicap_differential` is NULL in the database.

**Two phones scoring everyone (both see every player):**
- [ ] Phone A ends after 6, then phone B (still showing hole 8) tries to end after 8 → B shows "This round was already ended after 6 holes on another device", its scores after 6 are removed, and it lands on the finish screen.
- [ ] Phone A ends after 6; phone B never opens the ⋮ menu. On B's next load of the round, ⋮ is hidden and holes after 6 are closed (B picks up `holes_played` from the server).
- [ ] Stroke play or Stableford (Review-finished; singles match play never runs the readiness check): submit readiness on both phones checks holes 1–6 only; a mismatch on hole 4 is still caught.
- [ ] Team match play: phone A ends after 6 while phone B has the same team match open on its scoring screen → when phone B reloads or reopens the round, it shows "Ended after 6 of 18 · Finish", holes after 6 are closed, and its scores after 6 are gone (B3c reconcile; B3c-2's guard on `TeamMatchPlayScoringScreen`). Any empty team-member cards created after the end are stamped on the next load (harmless).

**Who can't end:**
- [ ] A device that doesn't score every player, a round with scoring pairs on, and a competition round → ⋮ never shows.

**Offline:**
- [ ] Airplane mode on, end after 6, kill the app, relaunch with no signal → the round reopens ended ("Ended after 6 of 18 · Finish"), with removed scores still gone and the tee / daily handicap unchanged; holes after 6 can't be scored.
- [ ] Airplane mode on, end after 6, then trigger at least 3 drains while still offline (background/foreground the app 3 times) → the `'end_early'` item stays queued (not retained as failed). Reconnect → it applies, and the round finalises.
- [ ] Submit offline, then reconnect → the `'end_early'` item runs before finalise: the round is `completed`, `holes_played = 6`, and side-game rows after hole 6 are gone (check in staging with SQL).
- [ ] "Connected but no data" (Wi-Fi with no internet, or a captive portal): confirm the end → within about 8 s the sheet stops showing "Ending…", the round ends locally and the RPC is queued; it applies once the connection really works.

**Shared phone:**
- [ ] Sign in as a different user on the same phone with a pending sync item: user A ends a round after 6 in airplane mode (an `'end_early'` item and score uploads queued), then signs out; user B signs in on the same phone and reconnects → A's items don't run under B's session (the queue is owner-scoped from 1.15.0), B's own rounds sync normally, and nothing is retained as failed. A signs back in → A's items drain and the round ends and finalises.

**Old client:**
- [ ] A co-player on a 1.14.x build opens Home after the round was ended early → no crash; their card's `handicap_differential` stays NULL in the database (the trigger), and their index doesn't move.

**Leagues:**
- [ ] League tagging and partnership-league tagging never offer the ended-early round.

**Nine-type sheet:**
- [ ] On an ended-early round, the ViewRound nine-type sheet is locked.

**Side games:**
- [ ] Skins, $5 per hole, 4 players, ended after 6 → buy-in $7.50 each; net results sum to $0; no skin shows for hole 7+.
- [ ] Wolf, ended after 6 → the Wolf tab reads "of 6 holes"; standings and the results card ignore holes 7+.

**Normal 9-hole rounds (display changes that also reach them):**
- [ ] A 9-hole Wolf round on ViewRound: the Wolf tab reads "x of 9 holes" and draws 9 rows (B9e-2).
- [ ] A 9-hole standalone team match on ViewRound is decided over its 9 holes, and the board's playing handicaps match the Review screen's (B9c).

**Regression on Part A paths:**
- [ ] A split singles competition round (Ryder-cup singles) completes when the **organiser / round owner** submits the last sub-match (A6d). Non-organisers can't write `sub_matches` (RLS, the same as today): when a non-organiser submits last, record what happens (the round stays `in-progress` until the organiser submits or force-submits); it isn't a regression.

**Watch:**
- [ ] After ending, the Watch shows only holes 1–6; a score entered on the Watch for hole 7 reports a failure on the Watch instead of "saved".

**Display:**
- [ ] Activity feed card subtitle reads "<date> · Ended after 6 of 18 · <location>".
- [ ] My Stats: the round is in "Recent Activity" with an "Ended after 6 of 18" pill and a "Practice" pill (no "Handicap" pill); it is not on the Performance Trend chart; Rounds Played went up by one; the Handicap tile didn't; average score and the 9-Hole tile are unchanged; tapping Handicap / Practice / 9-Hole lists match the tile counts' treatment of the round.
- [ ] Home "continue scoring" carousel with a round ended but not yet submitted: note what it shows (it may read "hole 7"; Appendix B).
- [ ] Dark mode and translucent surfaces: the sheet and the banner are readable on solid surfaces; touch targets ≥ 44px.

## Native durability and writer races (all pending)

- [ ] Kill/relaunch at native end transaction boundaries: marker, trimmed holes,
  frozen tee/nine/source basis and owned intent are all present or all absent.
  No postcommit error may transfer owner or leave the new store session changed.
- [ ] Hold a local save chain while ending, then hold end/adoption while a queued,
  fallback, direct-submit, force-sync or tee writer waits. Verify CURRENT payload
  selection after admission and unrelated-round progress. No lease crosses RPC.
- [ ] Pending/failed/foreign/malformed canonical end gates uploads and finalize
  only for its round; explicit Retry revives end → cards → finalize. Repeated
  offline drains spend no end retry. Marker-only cache after discard/account
  switch cannot create a new owner's intent.
- [ ] Change queue id/raw/entity/recovery at equal revision during RPC/native
  acquisition and mutate retained disk/live content during acknowledgment.
  Exact native CAS refuses deletion/synced success and preserves accepted revision.
  Invalid JSON can be retained failed only; it is never acknowledged. Test safe
  Retained Uploads, provisional hydration and startup-cleanup preservation.
- [ ] Confirm bounded invalid-unscoped behavior: a parseable declared end without
  canonical key stays visible but cannot invent a prerequisite; noncanonical
  unidentifiable invalid JSON retains strict decoding. Do not infer broader recovery.
- [ ] Smaller/larger authoritative shape on CURRENT submitted cards repairs via
  shared adoption, preserving local N6 intersection when server N8. Missing
  historical context, unavailable shape and repair failure remain blocked;
  genuine database errors remain visible.
- [ ] Use a transport ignoring abort: confirm caller stops waiting around 8s,
  then let old RPC settle while a fresh operation/retry proceeds. Verify no stale
  acknowledgment/navigation and server locks/shape checks prevent stale whole
  snapshots or trailing entries. Do not report deadline as request cancellation.
- [ ] After cross-device end, stale mismatch/tee/Quick Score payloads are rebuilt
  from authorized fresh inputs or require fresh user review; confirmed narrow
  patches remain supported. Stats preserve opaque/multi-ball JSON and reject
  scoring deltas; a newer draft is not dismissed by an old save.
- [ ] Ordinary web upload/Quick Score success stays supported. Native-only shape
  repair/strict end guard modes return unavailable without unsafe fallback.

## Production/store rollout and monitoring (all pending)

- [ ] After staging SQL/concurrency/device evidence and Sam's go/no-go, repeat
  target prerequisite/dry-run/apply/verification/after checks for prod at a quiet
  time, **before** the build reaches prod. Record prod migrated_at separately.
- [ ] Ship **one store release 1.15.0**, Part A and Part B together. **No OTA**:
  existing 1.14.0 binaries use runtime 1.12.7. This build task changes neither
  deployment nor minimum-version config. Any later authorized OTA on compatible
  1.15.0 runtime uses `pnpm update:prod`, not bare `eas update` with staging env.
- [ ] Only after 1.15.0 is live on both platforms, verify/perform the manual
  force-update rollout step with Sam. The recorded minimum is already 1.15.0;
  confirm `app_version_config.minimum_version` for ios and android and record any
  required Sam-approved raise if actual target differs. Only 1.13.0+ sees the gate.
- [ ] Watch 48 hours: Sentry end RPC 22023/42501 errors, sync retained/failed work,
  new shape/entry/busy guards, unavailable context/repair, and PostgREST 42703.
  Spot-check `id, nine_type, holes_played, status` for latest ended rounds and
  rerun zero-differential after checks. Preserve legacy-client refusal visibility:
  with C3, legacy stale ended writes are rejected wholly, not accepted then trimmed.
- [ ] Audit cards changed since the actual target migrated_at. Both lists below
  should be empty; investigate any row manually. Repeat after 48 hours.

```bash
psql "$TARGET_DB_URL" -p 6543 -v ON_ERROR_STOP=1 -v migrated_at='<actual recorded timestamp>' <<'SQL'
select s.id, s.round_id, r.nine_type, r.holes_played, s.updated_at
from scorecards s join rounds r on r.id = s.round_id
where r.holes_played is not null and s.updated_at > :'migrated_at'::timestamptz
  and exists (
    select 1 from jsonb_object_keys(coalesce(s.scores, '{}'::jsonb)) as k
    where k ~ '^[0-9]+$'
      and k::int > (case r.nine_type when 'back9' then 9 else 0 end) + r.holes_played);

select s.id, s.round_id, s.updated_at, s.handicap_differential
from scorecards s join rounds r on r.id = s.round_id
where s.updated_at > :'migrated_at'::timestamptz
  and s.handicap_differential is not null and r.deleted_at is null
  and (r.holes_played is not null
       or not scorecard_is_complete_for_handicap(s.scores, r.nine_type));
SQL
```

The timestamp interpolation uses script input rather than `psql -c`.
Record final UGC decision, A7/B1/C3 staging/prod timestamps, all after/QA/concurrency
results, Sam-only stuck-round outcome, root review, merge/push status, both-store
availability, minimum check and 48-hour audit. Pending items remain open.

*Last Updated: October 2026*
