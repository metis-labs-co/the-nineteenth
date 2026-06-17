#!/usr/bin/env node
/**
 * Commit the build-number bump that EAS writes during a production build.
 *
 * Why this exists:
 *   eas.json sets `appVersionSource: "local"` and `autoIncrement: true` on the
 *   production profile, so every production `eas build` increments the build
 *   number locally and writes it into app.json + the iOS Info.plist files.
 *   Those then show up as uncommitted changes. This script commits ONLY those
 *   version files, so unrelated working-tree changes are never swept in.
 *
 * Usage:
 *   node scripts/commit-version-bump.js          (run after an eas build)
 *   pnpm build:prod / build:prod:ios / ...       (wrappers that call this)
 *
 * Safe to run anytime: if none of the version files changed, it does nothing.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// The exact set of files EAS touches when bumping the build number.
const VERSION_FILES = [
  'app.json',
  'ios/TheNineteenth/Info.plist',
  'ios/TheNineteenthWatch Watch App/Info.plist',
  'ios/TheNineteenthWatchComplication/Info.plist',
];

const repoRoot = path.resolve(__dirname, '..');

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', ...opts });
}

// Which of the version files actually have unstaged/staged changes?
const changed = VERSION_FILES.filter((file) => {
  try {
    // `git status --porcelain <file>` prints a line only when the file differs.
    return git(['status', '--porcelain', '--', file]).trim().length > 0;
  } catch {
    return false;
  }
});

if (changed.length === 0) {
  console.log('commit-version-bump: no build-number changes to commit.');
  process.exit(0);
}

// Read the new build/version numbers for a descriptive commit message.
let summary = 'bump build number';
try {
  const app = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
  const buildNumber = app?.expo?.ios?.buildNumber;
  const versionCode = app?.expo?.android?.versionCode;
  const parts = [];
  if (buildNumber) parts.push(`iOS ${buildNumber}`);
  if (versionCode) parts.push(`Android ${versionCode}`);
  if (parts.length) summary = `bump build number (${parts.join(', ')})`;
} catch {
  // Fall back to the generic summary.
}

git(['add', '--', ...changed]);
git(['commit', '-m', `chore(release): ${summary}`]);

console.log(`commit-version-bump: committed ${changed.length} file(s) — ${summary}.`);
