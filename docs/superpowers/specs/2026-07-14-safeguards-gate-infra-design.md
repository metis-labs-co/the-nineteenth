# Safeguards — Sub-project A: Gate Infrastructure — Design Spec

**Date:** 2026-07-14
**Status:** Approved (brainstorming); pending implementation plan
**Part of:** Codebase Safeguards buildout (A = gate infra now; B = green-baseline campaign, separate spec later)

---

## Problem

Automated verification in this repo is **session-scoped**: the only gate was a
Claude Code `Stop` hook (now removed — it fired per-response, ~43s each turn,
wrong mechanism). There is **no CI** (GitHub Actions absent) and **no git hooks**
(husky/pre-commit/pre-push absent). Anything committed manually, by another tool,
or by a teammate gets **zero** checks. `pnpm lint` exists but runs in no gate.

Both the full test suite and lint carry **red baselines**:
- Full suite: ~163 failures / 25 suites (of ~8900 tests, ~98% green).
- Lint: 61 errors + 128 warnings.

So a gate cannot naively run `pnpm test` (full) or `pnpm lint` (full) as blocking
— it would fail on inherited debt. Cleaning that up is **Sub-project B**.

## Goal

Ship a **universal, shareable gate** that runs on **push** (not per-turn) and in
**CI**, enforcing what is *already green* today, so every push/teammate/tool is
verified. Zero baseline cleanup required to ship. Designed to be **upgraded** to
the full suite + full lint once Sub-project B greens the baseline.

## Non-goals

- Fixing the 163 test failures or 61 lint errors (that is Sub-project B).
- Blocking PR merges yet (CI starts as a status report; promote to required
  check after the baseline is green and trusted).
- pre-commit hooks (too slow/noisy per-commit; push is the right granularity).

## Decisions (confirmed)

- **Gate scope (phase 1):** `type-check` (full, already clean) + curated **green
  test subset** + **eslint on changed files only** (blocks NEW lint errors,
  ignores the 61 inherited). Upgrade to full-suite + full-lint after Sub-project B.
- **Pre-push mechanism:** **husky** (committed → shareable), bypassable with
  `git push --no-verify`.
- **Green test subset:** reuse the proven-green pattern from the removed Stop hook:
  `(golden|services/scoring|components/scorecard|utils/(scoring|dailyHandicap|teamHandicap|competitionPoints|matchMargin))`.

## Design — three artifacts, one shared check definition

### 1. `scripts/verify-gate.mjs` (single source of truth)

A Node script (runnable via `pnpm verify:gate`) so hook and CI never drift. It:

1. Runs `pnpm type-check` (full `tsc --noEmit`). Fail → gate fails.
2. Runs the green test subset:
   `pnpm test --testPathPattern='(golden|services/scoring|components/scorecard|utils/(scoring|dailyHandicap|teamHandicap|competitionPoints|matchMargin))' --silent`.
   Fail → gate fails.
3. Computes changed `.ts/.tsx` files vs a base ref (default `origin/main`, override
   via `--base <ref>` or `GATE_BASE` env), then runs `eslint` on **only those
   files**. Any eslint **error** → gate fails. (Warnings do not fail the gate.)
   - Changed set: `git diff --name-only --diff-filter=ACMR <base>...HEAD` filtered
     to `\.tsx?$` and existing files. Empty set → skip lint step (pass).
4. Prints a concise per-step PASS/FAIL summary; exits non-zero on any failure.

Rationale: full `type-check` (types are interconnected; ~28s, clean); green subset
as the regression net; lint scoped to changed files to avoid the 61-error baseline
while still catching new violations.

### 2. Husky pre-push hook

- Add `husky` dev dependency + `"prepare": "husky"` script (husky v9 style).
- `.husky/pre-push` runs `pnpm verify:gate` (base `origin/main`).
- **Blocks the push** on failure; bypass with `git push --no-verify` for WIP.
- Committed so it is shareable; activated per-clone by `pnpm install` (runs
  `prepare`). Note: husky sets `core.hooksPath=.husky`, which applies across all
  git worktrees of this repo.

### 3. GitHub Actions CI — `.github/workflows/verify.yml`

- Triggers: `on: [push, pull_request]`.
- Runner: `ubuntu-latest`, Node 20, pnpm via `pnpm/action-setup` + `actions/setup-node`
  with pnpm cache. `pnpm install --frozen-lockfile`.
- Step runs `pnpm verify:gate`. For PRs, base = the PR base branch
  (`GATE_BASE=origin/${{ github.base_ref }}`); for pushes, base = `origin/main`
  (or the commit's parent) so lint scopes to the push's changes.
- **Status report only** initially (do not mark as a required check). A comment
  in the workflow documents how to promote it to a required check after Sub-project B.

## Deliverables

1. `scripts/verify-gate.mjs` + `verify:gate` package.json script.
2. `husky` devDep, `prepare` script, `.husky/pre-push`.
3. `.github/workflows/verify.yml`.
4. Short `docs/guides/CI_AND_GATES.md` documenting the gate, the `--no-verify`
   bypass, the changed-file lint policy, and the planned upgrade after Sub-project B.

## Risks / open questions

- **Husky + worktrees:** `core.hooksPath=.husky` is repo-global — expected and fine,
  but worth a line in the doc.
- **CI runs while suite/lint are red baselines:** mitigated — CI runs `verify:gate`
  (green subset + changed-file lint), not the full suite. It will pass on a clean
  push. Document that CI is intentionally scoped until Sub-project B.
- **`--frozen-lockfile` in CI:** requires `pnpm-lock.yaml` to be current; verify it is.
- **Base-ref edge cases:** first push of a new branch with no `origin/main` diff, or
  a shallow CI clone. The script must handle an unresolvable base gracefully (fall
  back to linting nothing rather than erroring) — spelled out in the plan.
- **Node version:** confirm the repo's expected Node (Expo SDK 54 → Node 20) for CI.
