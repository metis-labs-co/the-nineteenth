# Local competition compatibility test

Last local result: **2026-10-11, exit 0** — PostgreSQL 17.4; 234 migration
replays, 21 compatibility/end-race checks, three SQL verification scripts and
14 pre-C3 ordinary-write control checks passed. Containers were removed.

That result includes the B1/C3 change rejecting competitions before locking
the round and its regression check: competition rejection while a snapshot or
entry writer stays open. The 14 pre-C3 controls are unchanged.

From the repository root:

```sh
python3 supabase/tests/competition_compatibility/run.py
```

Requires Python 3, local Docker and the cached image
`public.ecr.aws/supabase/postgres:17.4.1.043`. The runner never pulls an image,
accepts no database URL, refuses a non-local Docker endpoint, exposes no ports,
mounts no host directories and disables container networking. It creates and
removes only its uniquely named container and anonymous test volumes.

The test replays the repository's top-level migrations using
`ON_ERROR_STOP=1 --single-transaction -f -`, with two explicit
historical setup exceptions: the achievement backfill dated 20251231 is delayed
until the `home_club_id` rename exists, and the data-only Eastern Golf Club
coordinate correction is omitted because that production course is absent.
Course-data seed files are not needed. The cached image's auth JWT helpers and
Storage bucket metadata are supplied by `bootstrap.sql`; the auth/Storage
services normally install them. Public tables, RLS, scoring functions and
notification triggers come from the unchanged repository migrations, including
A7, B1 and the current C3.

`checks.py` uses independent authenticated sessions, accepted competition
members in two different pairings, and different target cards. Each ordinary
concurrency check completes group A's SQL statement but holds its transaction
open while group B writes and commits. It then rolls A back, retries and checks
both persisted rows, totals and revisions. These overlapping group schedules
never call an early-end operation. They cover snapshot inserts/updates, legacy snapshots without shape,
legacy upserts and score-entry inserts/updates. Additional checks cover legacy
nine-hole payloads, completion, ordinary RLS, same-card waiting and simultaneous
completion. Five-second statement deadlines bound unexpected waits; intentional
waits are observed through `pg_stat_activity` before releasing the blocker.
The separate permissions control also checks that ending a competition is refused.

Separate social-round schedules verify missing/existing-card and entry writes
against ending, both orders, stale/fresh retries, entry-row-first deadlock
avoidance and competition-to-social reclassification. Three rollback-contained
SQL verification scripts cover the remaining C3/B1/A7 behavior. Finally the
ordinary tests repeat using the exact pre-C3 snapshot RPC with C3's triggers
removed, to check compatibility and distinguish existing notification behavior.

These are SQL/database tests, not PostgREST transport, device SQLite, load,
staging or production tests. See the [scope decision](../../../docs/guides/END_ROUND_SCORING_SCOPE.md)
for retained client scope and the existing simultaneous-completion notification
limitation. No claim of production migration-history replay is made by this
empty-database fixture.
