# CI & Gates

Automated verification runs on **push** (not per response) and in **CI**, via a
single shared script so the two never drift.

## The gate: `pnpm verify:gate`

`scripts/verify-gate.mjs` runs three checks and exits non-zero on any failure.
Shell-out for user/CI-influenced values (base ref, changed filenames) goes
through `execFileSync` with argv arrays rather than a shell string, so branch
names and filenames can never be interpreted as shell — the script is
shell-injection-safe by construction.

1. **`pnpm type-check`** — full `tsc --noEmit` (project-wide).
2. **Green test subset** — the currently-trustworthy-green Jest paths
   (`golden`, `services/scoring`, `components/scorecard`, and the scoring
   utils). This is a curated subset because the FULL suite still has a red
   baseline (~163 failures) — Sub-project B greens it, after which this
   expands to the full suite.
3. **Lint on changed files** — `eslint` on only the `.ts/.tsx` files this
   branch changed (base = `git merge-base main HEAD` by default). Fails on
   eslint **errors** only (warnings don't fail). This blocks NEW lint errors
   while the 61-error baseline is deferred to Sub-project B. Override the
   base with `--base=<ref>` or `GATE_BASE=<ref>`.

## Pre-push hook (husky)

`.husky/pre-push` runs `pnpm verify:gate` before every push and **blocks**
the push on failure. Bypass for intentional WIP: `git push --no-verify`.

`.husky/pre-commit` carries the pre-existing Maps-key guard (blocks committing
a real Google Maps API key into the native iOS files). It's ported into husky
— rather than left as a native `.git/hooks/pre-commit` script — because husky
sets `core.hooksPath=.husky`, which redirects git's hook lookup for **all**
hook types away from `.git/hooks/`. Left in place, that would have silently
disabled the old native pre-commit guard the moment husky was introduced.

Hooks are activated per-clone (and per-worktree checkout) by `pnpm install`
(the `prepare` script runs `husky`, which sets `core.hooksPath`). That setting
is a git-config value, so it applies to all worktrees of this repo, not just
the one where `pnpm install` was run.

## CI (GitHub Actions)

`.github/workflows/verify.yml` runs `pnpm verify:gate` on push + PR. It is
currently a **status report**, not a required merge check. Promote it to
required (repo Settings → Branches → protection rules) once Sub-project B
greens the baseline and the gate is upgraded to the full suite + full lint.

## Upgrade path (after Sub-project B)

Once the full suite is green and lint errors are zero:
- change the test step to `pnpm test` (full suite),
- change lint to `pnpm lint` (whole project),
- promote CI to a required check.
