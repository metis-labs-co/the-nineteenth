# End-round scoring scope and competition compatibility

This resolves the C1–C5 scope review requested on 2026-10-10. The original
[design through R22](../superpowers/specs/2026-10-07-end-round-early-design.md)
and Sam's request to prove ordinary competition compatibility govern this
decision. Earlier agent-written controller rulings are implementation history,
not additional user requirements.

## Scope decisions

| Area | Decision and reason | Ordinary-round contract |
|---|---|---|
| C1 local persistence barrier | Keep the per-round admission/drain mechanism. R12 says removed holes never return; R14–R15 require a durable offline end. An already-running save must not overwrite that transaction afterward. | With no end/adoption transition, admission stays open. No server lock or cross-device serialization comes from this process-local mechanism. |
| C2 context and authoritative adoption | Keep one repair path for disk, queued payloads and current state. R15–R16 require another device to adopt the end on load/sync; retained scores and the original planned handicap basis must survive. | Ordinary cards keep their existing active context. Historical reconstruction requirements apply when rebuilding an ended card, not as a new eligibility policy for ordinary competitions. |
| C3 server write guard | Narrow it to protecting an early end against in-flight/older writes. Keep shape-aware snapshots, ended stats exceptions and narrow mismatch/handicap patches. Remove the exclusive parent writer lock and conflict-card probe. Remove new range validation on rounds without `holes_played`. | Independent writers take compatible `FOR KEY SHARE` locks only where a missing-card/entry race needs an interlock with ending. Existing same-card locking, RLS, revisions, terminal status and legacy payload behavior remain. Competition scorers need no round UPDATE permission. |
| C4 common upload and mismatch adapters | Keep one upload operation covering pending-end prerequisite, current preparation, snapshot, entries and acknowledgment. Otherwise a snapshot/entry retry can restore removed holes or acknowledge a newer local edit as uploaded. | Queue, fallback and direct submissions use the same existing snapshot RPC/revision contract. A busy retry is not the compatibility strategy for independent competition groups: their writes must succeed while the other transaction is open. |
| C5 stats, Quick Score and tee adapters | Keep these reachable writers connected to the same ended-round rules. R8, R12, R16 and R21 apply when these screens edit a card too. | Stats remain a field delta; ordinary Quick Score remains supported; tee recalculation retains planned-hole handicap inputs. No new competition eligibility or scoring formula is introduced. |

The retained coordination supports this feature's durability and existing write
paths. It does not authorize a general sync redesign, per-hole multi-device
merge, a new ordinary-round validation policy or additional gameplay rules.
R12 explicitly defers multi-scorer coordination. The three large client files
remain maintainability debt; the SQL scope correction does not claim to have
completed the separate eight-item standards cleanup. The later merge with
main integrates its separately approved social multi-scorer feature, below.

The all-card submitted/combined checks in the end operation remain as interlocks
on ending a social round: a stale device must not invalidate another device's
submitted card or a stored handicap combination. They do not reject ordinary
competition writes. Server handicap-index recalculation remains the separate
plan-v2.1 decision, outside this scope correction.

## Why the lock is still needed

Skipping the guard solely because `competition_id` is currently non-null would
leave a race when a round is reclassified. A compatible parent key-share lock
protects a new scorecard or entry until its transaction commits. Ending takes
`FOR UPDATE`, waits for those writers, then reads their committed rows before
trimming. Existing-card updates already own their card lock; ending's all-card
`NOWAIT` check avoids the reverse lock order. Entry updates use key-share NOWAIT
so an entry-row-first/end-round-first schedule cannot deadlock.

The end RPC rejects a competition before requesting the round lock. For a
social round, it re-reads and rechecks under lock so a concurrent change of
competition membership cannot bypass the restriction.

Ordinary completion updates non-key round fields. That lock is compatible with
key-share, so a legacy upsert can wait for its own card without blocking the
card holder's completion trigger. The old exclusive writer lock made this unsafe
and led to the extra conflict-card refusal. Both are removed.

## Evidence and limits

Recorded local run on **2026-10-11 (Australia/Melbourne)**: exit 0 on PostgreSQL
17.4, arm64. `python3 supabase/tests/competition_compatibility/run.py` applied
**234 repository migrations** with `ON_ERROR_STOP` and a single transaction per
migration, passed **21 compatibility/end-race checks**, all **three C3/B1/A7 SQL
verification scripts**, and **14 ordinary-write controls** with the pre-C3
snapshot RPC and C3 guards removed. The runner removed its container afterward;
the earlier diagnostic container was also removed. The two historical replay
adjustments and platform bootstrap are documented with the runner.

The pre-commit rerun includes the change moving competition rejection before
the end RPC's lock in B1 and C3. Its regression check holds an ordinary snapshot
or entry writer open while attempting to end its competition round and passed:
the social-only rejection arrives before the writer commits. Migrations ran
only in the disposable local test container, which was removed afterward.

The reproducible [local database suite](../../supabase/tests/competition_compatibility/README.md)
uses real PostgreSQL sessions and repository RLS/functions/triggers. It accepts
no database URL and starts its own container with networking disabled. No
production or staging connection is involved.

The original C3 migration first failed compilation at an unparenthesized CASE
expression. After fixing compilation alone, 10 of the initial 12 compatibility
checks failed: independent inserts/upserts/entries and completion collided on
the round; legacy nine-hole payloads were newly rejected; same-card upserts were
refused instead of waiting. The revised lock/range behavior passed those checks
and the end-versus-write schedules.

Executing A7's existing verification also exposed a separate empty-history bug:
PostgreSQL `LEAST(NULL, 54)` produces 54, so the projected index failed Test 10f
after all qualifying cards were removed. The projection now explicitly returns
NULL for no qualifying differentials. This is a correction to its existing
documented behavior, not a new handicap formula or proof of complete app/server
formula parity. C3's verification fixture also now restores the owner's JWT
claims before testing owner-only soft deletion; RESET ROLE alone was insufficient.
A7's audit fixture now explicitly supplies the 18 course holes its assertion
expects, instead of relying on the schema's empty-array default.

The targeted C1–C5 client regression run passed **25 suites, 696 tests**, with
15 existing skips. This covers queue/fallback/direct/remote uploads, current
source selection, acknowledgment, persistence/adoption, mismatch and tee paths.
These Jest tests mock native/database adapters; they do not establish native
SQLite crash behavior. Device QA and staging/production rollout remain separate.

The source reviews identified stale lock instructions, runner configuration
and migration transaction flags; those were corrected before the recorded run.
These reviews are not release approval.

The SQL completion tests distinguish score persistence from notification delivery.
The existing completion trigger can miss the notification when two final cards
complete before either transaction commits: each sees the other's older status.
The pre-C3 control checks this same limitation. Both scorecards must still commit.
Fixing that notification race is separate work; it is not evidence that ordinary
scoring should be serialized with an exclusive parent-round lock.

## Local integration with main

Sam subsequently requested committing all work and merging to local main.
Main at `94e84139` already included social-round per-hole merging; the merge
preserves that behavior alongside early-end durability. Remote merges retain
the played-hole cutoff and captured session, remote synced revisions stay
inside the persistence lease, and social conflict retries use the common
upload boundary. Shape recovery still merges the other phone's retained scores
before retrying. SQLite keeps main's `edited_at` migration 19 and appends the
early-end metadata columns as versions 20–24.

The combined source passed TypeScript, lint on 352 changed TypeScript files
(zero errors, 22 warnings), and the affected scoring/store/offline/hook/screen
subset: **145 suites, 3,348 tests and 15 snapshots**, with 15 existing skips.
New regressions cover full/back-nine cutoffs during live and final remote merges,
delayed pulls after a same-round reset, late realtime callbacks, remote
acknowledgment across a source change, and conflict merging after shape recovery.
These local checks do not replace the device and rollout checks above.
