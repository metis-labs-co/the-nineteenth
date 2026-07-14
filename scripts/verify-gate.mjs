#!/usr/bin/env node
// Single source of truth for the push/CI gate: type-check + green test subset
// + eslint on changed files. Reused by the husky pre-push hook and CI.
import { execSync, execFileSync } from 'node:child_process';
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

// Like run(), but invokes a binary with an argv array (no shell) so that
// untrusted values (branch names, filenames) can never be interpreted as shell.
function runArgv(label, file, args) {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    execFileSync(file, args, { stdio: 'inherit' });
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
    // argv array (no shell): base can be a user/CI-influenced branch name, so it
    // must never be interpolated into a shell command string.
    out = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
      { encoding: 'utf8' }
    );
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
  results.push([
    'lint (changed files)',
    runArgv(`lint (${changed.length} changed file(s), base ${base})`, 'pnpm', [
      'exec',
      'eslint',
      ...changed,
    ]),
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
