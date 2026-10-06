# CI & Gates

Two layers of automated verification:

- **Local push gate** (`pnpm verify:gate` via the husky pre-push hook) — a fast,
  **scoped-green** gate that runs before every push and passes on today's
  baseline.
- **Server CI** (`.github/workflows/ci.yml`) — the exhaustive gate (full
  type-check + lint + full test suite).

They are intentionally different right now: the local gate is scoped so it stays
green today; CI is exhaustive and will go green once **Sub-project B** clears the
red baseline (~163 test failures, 61 lint errors).

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

Server CI is `.github/workflows/ci.yml` (added separately). It runs the
**exhaustive** gate on push to `main` + PR: `pnpm type-check`, `pnpm lint:ci`
(`eslint … --max-warnings 128`), and the **full** `pnpm test` suite.

Because the full suite (~163 failures) and lint (61 errors) still have red
baselines, this CI is currently expected to **fail** — it is not yet a reliable
signal and should not be a required merge check. **Sub-project B** exists to
green those baselines, after which `ci.yml` passes and can be promoted to a
required check.

> This sub-project deliberately did **not** add a second workflow. A scoped
> `verify.yml` was prototyped but dropped to avoid two competing CI files; the
> exhaustive `ci.yml` is the single server gate, greened by Sub-project B, and
> the fast scoped gate lives locally as the pre-push hook.

## Upgrade path (after Sub-project B)

Once the full suite is green and lint errors are zero:
- `ci.yml` goes green — promote it to a required check
  (repo Settings → Branches → protection rules);
- optionally widen the **local** `verify:gate` test step from the green subset
  to the full `pnpm test`, so the pre-push gate matches CI.
