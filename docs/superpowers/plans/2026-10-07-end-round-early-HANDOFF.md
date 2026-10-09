# End Round Early: build handoff

**Checkpoint:** 2026-10-09, Part A complete; Part B reviewed through B6b-1 (48 of 76 tasks complete).
**Worktree:** `.claude/worktrees/end-round-early`, branch `worktree-end-round-early`.
**Plan:** `docs/superpowers/plans/2026-10-07-end-round-early.md`, 76 tasks run in Task Index order.
**Spec:** `docs/superpowers/specs/2026-10-07-end-round-early-design.md`. Revision 3 and R22 override everything earlier in the spec.

## Where it stands
- **Task 0 is done.** Local `main` was merged at `ee923d79` and `pnpm install` has run. Baseline: type-check clean; TEST_SUBSET 160 suites, 3327 passed, 15 skipped, 0 failed.
- **All 29 Part A tasks are complete and reviewed**, through A6d-2 at `90aba372`. A5c-2's previously pending review passed. The resumed tasks each passed separate spec and code-quality reviews; review corrections have their own commits. See `git log 935760c9..HEAD` and the ledger for details.
- **Part A verification passed:** TEST_SUBSET 193 suites, 3629 passed, 15 skipped; `pnpm type-check`; changed-file ESLint; and `pnpm verify:gate`. The subset count dropped after the two obsolete hook test suites were deleted. Existing Jest worker-exit warnings and nonblocking lint warnings remain.
- **Part B is complete and reviewed through B6b-1** at `f536d69a`: the earlier persistence, scoring, match and screen work plus preview/confirmation components and passive RPC, queue, repair and coordinator foundations. Its spec and quality review fixes are `4ed8ce66` (reject inconsistent local-card/player identities before revision merging) and `f536d69a` (bound the conflict fallback read). Both independent review gates passed after correction.
- **Next: correction C1**, the passive source/lease barrier and ordinary local persistence. Complete C1, C2a, C2b, C3, C4 and C5 as staged in `B6-persistence-controller-ruling.md` before B6b-2 activates owned intents. Continue the original Task Index through B11 afterwards. The confirmation hook, active sync integration and remaining display integrations are still ahead.
- **Latest validation:** B6b-1 TEST_SUBSET 219 suites, 4217 passed, 15 skipped, 30 snapshots; type-check and changed-file ESLint passed. Existing lint/Jest warnings remain. SQL has only been statically reviewed; runtime and concurrency verification are deferred.
- **No database has been touched.** The A7 SQL files exist but are not applied. All apply, verify and dry-run steps are deferred to the rollout checklists in A6d-2 Step 5 and B11. Never apply migrations during the build.

## Corrections made during Part A review

- `ab770740`: message-only `42501` and `RLS` refusals remain permanent even when they mention a timeout; regression tests cover both.
- `89ff505c`: app-wide sync uses `session.user.id`, not the cached auth user. Signup can cache a user before email confirmation creates a session. Tests cover this state, stale cached identity and session removal, and prove startup waits for database initialization.
- `1acd6744`: after a finalisation queue entry is persisted, failures reading local card state or removing the queue entry preserve the queued work and settled skins result, request a drain, and do not reject submission. This follows the interface contract where the sample implementation was narrower.

## Part B corrections and upcoming requirements

- `638200d6`: ending locks all scorecards without waiting and refuses submitted cards or existing handicap combinations. A separate combination trigger locks and rechecks submission/eligibility after waiting. Existing combination history is preserved. See `B1a-review-ruling.md` in the ignored working notes; B11 must document the added guard and three refusal hints.
- `2eb6d5eb`: the manual two-session verification fixture now distinguishes stale eligible state from freshly committed ended state. Executable verification SQL remains rollback-only; manual concurrency checks require separate disposable staging fixtures at rollout.
- `7a78869a`: the planner stops at missing leading/interior course-hole numbers rather than counting later array entries as a contiguous prefix. Existing hole-filter behavior is unchanged; nonmutation tests were added.
- `102232bc` / `802c0788`: the end-specific DAO commits marker, tee, nine context and removals together; stale full-card saves preserve authoritative shape. Session generation and loading guards prevent an older action from changing a reopened round. This boundary uses native exclusive SQLite transactions and explicitly rejects web; iOS/Android crash/interleaving QA is still required.
- `fcb6b32b` / `54386b35`: init resolves server/local shape, retains cached ended scores/tees/revisions, safely rebuilds memory when cleanup fails, and always recomputes ended totals even when persisted marker/keys already agree. Metadata-save failure can leave stale stored totals after the atomic end; recovery tests cover that case.
- `2e4ed836`: hook hydration drops post-end keys; shape guards adopt server ends. The existing round-only reset cap now keys by shape so an earlier nine-type recovery cannot suppress a later end update.
- `0325732a`: display and sync net count played holes with planned DHC. Sync repairs stale retained gross/points/Par, filters snapshot/entry keys, and excludes ended differentials; positive-integer markers agree across paths. Normal and missing-context fallbacks remain explicit.
- `bda46e13`: mismatch totals respect played shape; normalized course metadata and fallback planned-range guards prevent removed-hole corrections. Local mirroring follows the service's boolean result. Existing single-ball gross/points/net conventions remain coupled.
- `6c3763f0` / `886d7781`: match engines truncate physical holes before counting decisions, preserve genuine planned-count close-outs, and settle complete ended matches on the lead. Table utilities normalize cutoff validity consistently; default order and competition finalizers stay unchanged.
- `abaf7753` / `105e5b79`: scoring and finish screens forward cutoff while preserving planned-hole context. Sparse live team callers share a retained-results helper with explicit missing-hole placeholders. Parent counts keep their original behavior without a valid marker. Tests cover back-nine numbering, stale later results, cutoff-only rerenders and manual-result precedence. See `B5-cutoff-ruling.md` and `impact-B5.md`.
- `15037147` / `bed15c5c`: the preview uses existing scoring math and actual planned metadata; the common bottom sheet blocks dismissal during confirmation through current callbacks. The footer follows React Native's disabled-button contract. Physical-nine courses with legacy `nineType='full'` remain supported; do not fabricate 18 holes or require absent unplayed metadata.
- **B6 integration corrections are mandatory:** read **`B6-durability-and-ordering-ruling.md`** and `impact-B6.md`, alongside B1a/B3 rulings. Persist owned end intent atomically with local ending; process ends before dependent queued/fallback/direct card uploads, then finalize. Reconcile authoritative shape into disk/queue/store with queue revision protection. The server currently accepts stale post-end snapshots/entries, so local ordering alone is insufficient: add the narrow expected-shape RPC/guard correction, including the mismatch write adapter, before activating B6. SQL/runtime concurrency checks remain deferred. These corrections supersede affected original B6 snippets; no server scoring math or database execution is authorized.
- **B6 server contract:** `B6-server-contract-proposal.md` is accepted with the controller decisions in the ruling. Keep snapshot SECURITY INVOKER and existing-card locks; an unconditional invoker round lock would break competition scorers' permissions. Private insert/entry guards need their own interlocks. Add expected shape inside the existing snapshot payload and a dedicated mismatch patch RPC; preserve existing confirmed-card permissions and mismatch revision behavior. New entry guard errors must preserve any already-committed snapshot revision and block acknowledgment; unrelated best-effort entry errors retain their current behavior.
- **B6 passive local contracts:** read `B6-local-contract-proposal.md` and the accepted sections of the durability ruling. The correction owns one shared adoption implementation; queued ends and UI consume it. Accepted-write IDs are local card IDs, guarded by round/player, not server RPC UUIDs. Preserve failed queue status and use revision increments/CAS during repair. Closed/submitted cards need frozen context; missing context blocks repair.
- **B6 repair context:** before C2a/C2b read `B6-adoption-context-proposal.md` and `B6-known-zero-handicap-amendment.md`, with the controller ruling taking precedence. Reuse existing math with frozen inputs and preserve original player/submission metadata. The optional local `syncHandicapSource` stamp makes explicit no-handicap rounds retain DHC0 across restart; it must persist atomically with ending. Absent-source legacy behavior stays unchanged. C2a owns passive context/metadata, C2b owns the one actual adoption service and all prepared-writer/transition integration.
- **B6 persistence races:** read `B6-persistence-controller-ruling.md` and `B6-persistence-barrier-proposal.md` before C1/C2. Whole local save chains need source provenance and admission leases; each shape transition drains earlier saves and rejects or rebases later stale sources. Init/load must repair queues using the prior cutoff before replacing it. A card-only N6-to-N8 marker update would lose the mask needed to discard old queued holes 7–8. These corrections remain required; the passive coordinator alone does not close that race.
- **B6 direct writers:** read `B6-writer-ruling.md` and `impact-B6-server-writers.md` before server/client guard work. Preserve exactly the accepted stats-only actual-delta exception and player-identity-only metadata changes; adapt ended Quick Score through snapshots and tee recalculation through the narrow handicap patch RPC. Coordinate the whole tee operation through its trailing local store update. Preserve existing RLS; no lifecycle RPC rewrites or broad privileged bypass.
- **Remaining preflight:** `impact-B6-ui.md` and `B6-ui-ruling.md` cover session revalidation, ended resume and actual-hole lookup. Semantic callback anchors are safe; the initial stale-line-number concern was retracted. `impact-B7-B8.md` covers display/submission work. `impact-B9.md`, `impact-B10.md` and `B9-controller-ruling.md` are complete: recompute the ended fixture's points as 8, and revalidate a pending nine-type change when its confirmation fires after a server end.

## How to run each task (the process used so far)
1. Read the plan header first: the Global Constraints, Interface Contract and Task Index, i.e. everything above `## Task 0`. Then read only the task's own `### Task <ID>:` section.
2. Follow the task's TDD steps exactly:
   1. Write the characterization tests; they should pass.
   2. Write the failing tests and record the RED output.
   3. Implement, then confirm GREEN.

   "Current (as X leaves it)" snippets describe intent. If the code has drifted, apply the same change to the code as it is now; the tests are the contract.
3. Before committing, run all three checks:
   - TEST_SUBSET, the command under "Test subset" in Global Constraints;
   - `pnpm type-check`;
   - `pnpm exec eslint <changed files>`.
4. Commit with the task's commit message. End it with a `Co-Authored-By:` line for the authoring model. Never push. Never deploy migrations.
5. Review the diff against the task section: is anything missing, extra, or misunderstood? Are the tests real, and is there no swallowed error? Finish the spec review before the separate code-quality review; fix important findings and re-review before continuing.

## Workspace and ledger (git-ignored working notes)
`.superpowers/sdd/2026-10-07-end-round-early/` contains:
- `progress.md`: the ledger, with completions, rulings and deferred minor findings;
- `header.md`: the plan header extract;
- `brief.py`: extracts one task with `python3 brief.py <plan> <TaskID>`;
- `impl-common.md` and `review-common.md`: the implementer and reviewer instructions;
- per-task brief, report and review-diff files.
- `impact-B2.md` through `impact-B10.md` (including the separately named UI/writer and B7-B8 reports), plus the rulings and proposals linked above: actual preflight findings and approved corrections beyond sample snippets. Follow the controller rulings where older proposal wording differs.

## Rulings so far (decisions made on Sam's behalf)
- **Brief extraction:** briefs are extracted by `brief.py`, because the plan's task IDs aren't numeric.
- **SQL during the build:** A7 and B1a SQL is written but never run during the build. DB steps happen at rollout, so SQL errors will only show up at the staging dry run.
- **Commit attribution:** Codex commits use `Co-Authored-By: Codex <noreply@openai.com>`, overriding the obsolete fallback in `impl-common.md`. Write message files separately and invoke `git commit` as its own command so the existing approved prefix applies.
- **TeamMatchPlayScoreView:** its inline N&M path was replaced in A1a-2, as planned.
- **SkinsIndicator:** for a round ended early it shows holes played as the denominator ("6/6"). Sam may prefer planned holes ("6/9"); that is a one-word change.

## Deferred minor findings to fix before rollout (see `progress.md` for the full list)
- **A7/B1a comments:** apply/dry-run/UNDO comments still use `--single-transaction` or `PGOPTIONS`, including B1a's migration header. Align them with the header's recipe: port 6543, a heredoc with `SET default_transaction_read_only = off;` then `BEGIN … COMMIT`. Correct A7's overstated trigger-disable lock comment as well.
- **A7 UNDO:** it restores `old_handicap_index` unconditionally. Add `WHERE handicap_index IS NOT DISTINCT FROM new_handicap_index`.

## Open items for Sam (not blocking)
- Whether the UGC / age-gate migrations are on prod. This is a prerequisite for B1a's rollout.
- Step-by-step instructions for the stuck-round fix (A6d-2 Step 5), to be written after the build.
- Release: Part A and Part B ship together in 1.15.0.
