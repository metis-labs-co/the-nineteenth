# End Round Early: build handoff

**Paused:** 2026-10-08, at 82% of the weekly Claude limit.
**Worktree:** `.claude/worktrees/end-round-early`, branch `worktree-end-round-early`.
**Plan:** `docs/superpowers/plans/2026-10-07-end-round-early.md`, 76 tasks run in Task Index order.
**Spec:** `docs/superpowers/specs/2026-10-07-end-round-early-design.md`. Revision 3 and R22 override everything earlier in the spec.

## Where it stands
- **Task 0 is done.** Local `main` was merged at `ee923d79` and `pnpm install` has run. Baseline: type-check clean; TEST_SUBSET 160 suites, 3327 passed, 15 skipped, 0 failed.
- **18 tasks are complete and reviewed:** A1a-1, A1a-2, A1b, A2a-1, A2a-2, A3-1, A3-2, A3-3, A3b, A4a, A4b, A4c, A7, A5a-1, A5a-2, A5b-1, A5b-2, A5c-1. Each one is a single commit; see `git log 935760c9..HEAD`.
- **A5c-2 (skins results card):** it was dispatched just before the pause. Check `git log -1`.
  - If its commit (`fix(skins): skins results card …`) is there, it is implemented but **not yet reviewed**. Review its diff against its plan section before continuing.
  - If it isn't there, implement A5c-2 from scratch.
- **Next tasks:** A5d-1, A5d-2, A6a-1, A6a-2, A6a-3, A6b-1, A6b-2, A6c, A6d-1, A6d-2 (Part A ends here; run `pnpm verify:gate`), then Part B, B1a-1 through B11.
- **No database has been touched.** The A7 SQL files exist but are not applied. All apply, verify and dry-run steps are deferred to the rollout checklists in A6d-2 Step 5 and B11. Never apply migrations during the build.

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
5. Review the diff against the task section: is anything missing, extra, or misunderstood? Are the tests real, and is there no swallowed error?

## Workspace and ledger (git-ignored; Claude's working notes)
`.superpowers/sdd/2026-10-07-end-round-early/` contains:
- `progress.md`: the ledger, with completions, rulings and deferred minor findings;
- `header.md`: the plan header extract;
- `brief.py`: extracts one task with `python3 brief.py <plan> <TaskID>`;
- `impl-common.md` and `review-common.md`: the implementer and reviewer instructions;
- per-task brief, report and review-diff files.

## Rulings so far (decisions made on Sam's behalf)
- **Brief extraction:** briefs are extracted by `brief.py`, because the plan's task IDs aren't numeric.
- **SQL during the build:** A7 and B1a SQL is written but never run during the build. DB steps happen at rollout, so SQL errors will only show up at the staging dry run.
- **Commit attribution:** implementer commits carry their own model's attribution line.
- **TeamMatchPlayScoreView:** its inline N&M path was replaced in A1a-2, as planned.
- **SkinsIndicator:** for a round ended early it shows holes played as the denominator ("6/6"). Sam may prefer planned holes ("6/9"); that is a one-word change.

## Deferred minor findings to fix before rollout (see `progress.md` for the full list)
- **A7 comments:** the apply, dry-run and UNDO comments use `--single-transaction` and `PGOPTIONS`. Align them with the header's recipe: port 6543, a heredoc with `SET default_transaction_read_only = off;` then `BEGIN … COMMIT`.
- **A7 UNDO:** it restores `old_handicap_index` unconditionally. Add `WHERE handicap_index IS NOT DISTINCT FROM new_handicap_index`.

## Open items for Sam (not blocking)
- Whether the UGC / age-gate migrations are on prod. This is a prerequisite for B1a's rollout.
- Step-by-step instructions for the stuck-round fix (A6d-2 Step 5), to be written after the build.
- Release: Part A and Part B ship together in 1.15.0.
