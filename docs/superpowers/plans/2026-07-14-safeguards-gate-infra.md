# Safeguards Sub-project A — Gate Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A universal push+CI gate (`type-check` + green test subset + changed-file lint) that verifies every push regardless of tool/session — via a shared script, a husky pre-push hook, and GitHub Actions.

**Architecture:** One Node script (`scripts/verify-gate.mjs`, run as `pnpm verify:gate`) is the single source of truth; the husky `pre-push` hook and the CI workflow both invoke it so they cannot drift. It runs full `pnpm type-check`, the proven-green Jest subset, and `eslint` on only the files this branch changed (default base `git merge-base main HEAD`). Ships on the current green baseline; upgraded to full-suite/full-lint after Sub-project B.

**Tech Stack:** Node 20, pnpm 10.29.2, Jest, ESLint 8 (`.eslintrc.js`), husky v9, GitHub Actions.

## Global Constraints

- Package manager is **pnpm** (10.29.2). Never `npm`/`yarn`.
- Jest subset form: `pnpm test --testPathPattern='<regex>'` (NO stray `--`).
- Typecheck script is **`pnpm type-check`** (hyphen; `pnpm typecheck` does not exist).
- The proven-green test subset regex is exactly:
  `(golden|services/scoring|components/scorecard|utils/(scoring|dailyHandicap|teamHandicap|competitionPoints|matchMargin))`
- ESLint config is `.eslintrc.js`; run via `pnpm exec eslint <files>`. Gate fails on eslint **errors only** (warnings do not fail).
- Changed-file base default = `git merge-base main HEAD` (this branch's own changes), overridable via `--base=<ref>` arg or `GATE_BASE` env. An unresolvable/invalid base ⇒ lint nothing (pass), never error.
- Work in the worktree `.claude/worktrees/safeguards-gate-infra`. Run `pnpm install` in-worktree once (Task 0); do NOT symlink `node_modules` (project memory).
- CI is **status-report only** initially (not a required merge check).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 0: Prereqs — install + confirm the green subset is actually green

**Files:** none (environment + baseline check).

- [ ] **Step 1: Install deps in the worktree**

Run: `pnpm install`
Expected: completes; `ls -ld node_modules` shows a real directory (not a symlink).

- [ ] **Step 2: Confirm the green test subset passes on current HEAD**

Run: `pnpm test --testPathPattern='(golden|services/scoring|components/scorecard|utils/(scoring|dailyHandicap|teamHandicap|competitionPoints|matchMargin))' --silent`
Expected: 0 failures. (This is the exact subset the gate will enforce — it MUST be green before we build a gate on it. If any suite fails here, STOP and report; do not proceed.)

- [ ] **Step 3: Confirm type-check is clean**

Run: `pnpm type-check`
Expected: exits 0, no errors.

No commit (no file changes).

---

### Task 1: `verify-gate.mjs` + `verify:gate` script

**Files:**
- Create: `scripts/verify-gate.mjs`
- Modify: `package.json` (add `"verify:gate"` script)

**Interfaces:**
- Produces: `pnpm verify:gate` — runs type-check + green subset + changed-file lint; exits non-zero on any failure. Accepts `--base=<ref>`; honors `GATE_BASE` env. Consumed by Task 2 (hook) and Task 3 (CI).

- [ ] **Step 1: Write the script**

Create `scripts/verify-gate.mjs`:

```javascript
#!/usr/bin/env node
// Single source of truth for the push/CI gate: type-check + green test subset
// + eslint on changed files. Reused by the husky pre-push hook and CI.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const GREEN_SUBSET =
  '(golden|services/scoring|components/scorecard|utils/(scoring|dailyHandicap|teamHandicap|competitionPoints|matchMargin))';

function run(label, cmd) {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function resolveBase() {
  const arg = process.argv.find((a) => a.startsWith('--base='));
  if (arg) return arg.slice('--base='.length);
  if (process.env.GATE_BASE) return process.env.GATE_BASE;
  try {
    return execSync('git merge-base main HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function changedTsFiles(base) {
  if (!base) return [];
  let out;
  try {
    out = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
      encoding: 'utf8',
    });
  } catch {
    return []; // unresolvable base -> lint nothing (never error the gate on this)
  }
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter((f) => /\.tsx?$/.test(f) && existsSync(f));
}

const results = [];

results.push(['type-check', run('type-check', 'pnpm type-check')]);
results.push([
  'tests (green subset)',
  run('tests (green subset)', `pnpm test --testPathPattern='${GREEN_SUBSET}' --silent`),
]);

const base = resolveBase();
const changed = changedTsFiles(base);
if (changed.length === 0) {
  process.stdout.write('\n▶ lint (changed files): none to lint — skipping\n');
  results.push(['lint (changed files)', true]);
} else {
  const fileArgs = changed.map((f) => JSON.stringify(f)).join(' ');
  results.push([
    'lint (changed files)',
    run(`lint (${changed.length} changed file(s), base ${base})`, `pnpm exec eslint ${fileArgs}`),
  ]);
}

process.stdout.write('\n── verify:gate summary ──\n');
for (const [label, ok] of results) process.stdout.write(`${ok ? '✓' : '✗'} ${label}\n`);
const failed = results.filter(([, ok]) => !ok);
if (failed.length) {
  process.stdout.write(`\nGate FAILED: ${failed.map(([l]) => l).join(', ')}\n`);
  process.exit(1);
}
process.stdout.write('\nGate PASSED\n');
process.exit(0);
```

- [ ] **Step 2: Add the `verify:gate` script to package.json**

In `package.json` `"scripts"`, add after the `"lint:fix"` line:

```json
    "verify:gate": "node scripts/verify-gate.mjs",
```

- [ ] **Step 3: Run the gate on a clean tree (should PASS)**

Run: `pnpm verify:gate`
Expected: type-check ✓, tests ✓, lint of this branch's changed `.ts/.tsx` (the new script has none yet / only `.mjs` which isn't matched) ✓ → `Gate PASSED`, exit 0.
Verify exit code: `pnpm verify:gate; echo "exit=$?"` → `exit=0`.

- [ ] **Step 4: Prove the lint gate catches a NEW error (then revert)**

Create a temp file with a lint error, confirm the gate fails, then delete it:
```bash
printf 'const x: any = 1; export const y = x\n' > src/__gate_probe.ts
git add src/__gate_probe.ts
pnpm verify:gate; echo "exit=$?"   # expect lint FAIL, exit=1 (no-explicit-any / unused)
git rm -f src/__gate_probe.ts
```
Expected: with the probe staged/committed on the branch it appears in `merge-base main HEAD...HEAD` changes and eslint flags it → `Gate FAILED`, exit 1. After removal, re-run `pnpm verify:gate` → PASS.
> Note: the probe must be committed (or the base diff must see it). If `git diff base...HEAD` does not include an uncommitted file, commit it on a throwaway commit for the probe, then `git reset --hard` back. Keep the working tree clean afterward.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-gate.mjs package.json
git commit -m "feat(gate): verify-gate script (type-check + green subset + changed-file lint)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Husky pre-push hook

**Files:**
- Modify: `package.json` (add `husky` devDependency + `"prepare"` script)
- Create: `.husky/pre-push`

**Interfaces:**
- Consumes: `pnpm verify:gate` (Task 1).
- Produces: a blocking-but-bypassable pre-push gate.

- [ ] **Step 1: Add husky**

Run: `pnpm add -D husky`
Expected: `husky` appears in `devDependencies`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add the `prepare` script**

In `package.json` `"scripts"`, add:
```json
    "prepare": "husky",
```

- [ ] **Step 3: Initialize husky and create the pre-push hook**

Run: `pnpm exec husky init` (creates `.husky/` and sets `core.hooksPath`). If it created a `.husky/pre-commit`, delete it: `rm -f .husky/pre-commit`.

Create/overwrite `.husky/pre-push` with:
```sh
pnpm verify:gate
```
Make it executable: `chmod +x .husky/pre-push`.

- [ ] **Step 4: Verify the hook fires and blocks**

```bash
# Simulate: the hook script runs verify:gate on the current tree
sh .husky/pre-push; echo "exit=$?"
```
Expected: runs the gate; `exit=0` on a clean tree. (A non-zero exit is what makes `git push` abort.) Document that `git push --no-verify` bypasses it.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .husky/pre-push
git commit -m "chore(gate): husky pre-push hook runs verify:gate (bypass: --no-verify)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: `pnpm verify:gate` (Task 1).
- Produces: CI status on push + PR (status-report only).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/verify.yml`:

```yaml
name: verify

on:
  push:
  pull_request:

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # need history to diff changed files

      - uses: pnpm/action-setup@v4
        with:
          version: 10.29.2

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Resolve changed-file base
        run: |
          if [ -n "${{ github.base_ref }}" ]; then
            git fetch --no-tags --depth=1 origin "${{ github.base_ref }}"
            echo "GATE_BASE=origin/${{ github.base_ref }}" >> "$GITHUB_ENV"
          elif [ -n "${{ github.event.before }}" ] && [ "${{ github.event.before }}" != "0000000000000000000000000000000000000000" ]; then
            echo "GATE_BASE=${{ github.event.before }}" >> "$GITHUB_ENV"
          fi
          # else: GATE_BASE unset -> script falls back to merge-base main HEAD

      - name: Run gate (type-check + green subset + changed-file lint)
        run: pnpm verify:gate
```

- [ ] **Step 2: Validate the YAML**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/verify.yml','utf8'); if(!/verify:gate/.test(y)||!/pnpm\/action-setup/.test(y)) throw new Error('missing keys'); console.log('workflow references verify:gate + pnpm setup')"`
Expected: prints the confirmation (a lightweight structural check; full YAML lint not required).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/verify.yml
git commit -m "ci(gate): GitHub Actions runs verify:gate on push + PR (status-report)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Documentation

**Files:**
- Create: `docs/guides/CI_AND_GATES.md`
- Modify: `CLAUDE.md` (one-line pointer in Developer Guides list)

- [ ] **Step 1: Write the guide**

Create `docs/guides/CI_AND_GATES.md`:

```markdown
# CI & Gates

Automated verification runs on **push** (not per response) and in **CI**, via a
single shared script so the two never drift.

## The gate: `pnpm verify:gate`

`scripts/verify-gate.mjs` runs three checks and exits non-zero on any failure:

1. **`pnpm type-check`** — full `tsc --noEmit` (project-wide).
2. **Green test subset** — the currently-trustworthy-green Jest paths
   (`golden`, `services/scoring`, `components/scorecard`, and the scoring utils).
   This is a curated subset because the FULL suite still has a red baseline
   (~163 failures) — Sub-project B greens it, after which this expands to the
   full suite.
3. **Lint on changed files** — `eslint` on only the `.ts/.tsx` files this branch
   changed (base = `git merge-base main HEAD` by default). Fails on eslint
   **errors** only (warnings don't fail). This blocks NEW lint errors while the
   61-error baseline is deferred to Sub-project B. Override the base with
   `--base=<ref>` or `GATE_BASE=<ref>`.

## Pre-push hook (husky)

`.husky/pre-push` runs `pnpm verify:gate` before every push and **blocks** the
push on failure. Bypass for intentional WIP: `git push --no-verify`.
Activated per-clone by `pnpm install` (the `prepare` script). husky sets
`core.hooksPath=.husky`, which applies to all git worktrees of this repo.

## CI (GitHub Actions)

`.github/workflows/verify.yml` runs `pnpm verify:gate` on push + PR. It is
currently a **status report**, not a required merge check. Promote it to
required (repo Settings → Branches → protection rules) once Sub-project B greens
the baseline and the gate is upgraded to the full suite + full lint.

## Upgrade path (after Sub-project B)

Once the full suite is green and lint errors are zero:
- change the test step to `pnpm test` (full suite),
- change lint to `pnpm lint` (whole project),
- promote CI to a required check.
```

- [ ] **Step 2: Add the CLAUDE.md pointer**

In `CLAUDE.md`, under "### Developer Guides", add after the SCORING_ARCHITECTURE line:
```markdown
- **[CI_AND_GATES.md](docs/guides/CI_AND_GATES.md)** - Push/CI gate: verify:gate, husky pre-push, GitHub Actions
```

- [ ] **Step 3: Commit**

```bash
git add docs/guides/CI_AND_GATES.md CLAUDE.md
git commit -m "docs(gate): CI_AND_GATES guide + CLAUDE.md pointer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: End-to-end verification + finish

**Files:** none.

- [ ] **Step 1: Full gate run, confirm PASS + exit 0**

Run: `pnpm verify:gate; echo "exit=$?"`
Expected: all three steps pass; `Gate PASSED`; `exit=0`.

- [ ] **Step 2: Confirm the hook path works end to end**

Run: `sh .husky/pre-push; echo "exit=$?"` → `exit=0`.

- [ ] **Step 3: Confirm no unintended source changes**

Run: `git diff --name-only main HEAD`
Expected: only `scripts/verify-gate.mjs`, `package.json`, `pnpm-lock.yaml`,
`.husky/pre-push`, `.github/workflows/verify.yml`, `docs/guides/CI_AND_GATES.md`,
`CLAUDE.md`, and the spec/plan docs. No `src/**` changes.

- [ ] **Step 4: Summary**

Report the gate's three-step result, the husky activation note, and that CI is
status-only pending Sub-project B.
```
