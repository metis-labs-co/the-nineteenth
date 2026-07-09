#!/usr/bin/env node
/**
 * Publish an EAS Update (OTA) to the production branch — SAFELY.
 *
 * Why this exists (read before touching):
 *   `eas update` bundles JS *locally*, so it uses your machine's `.env` files,
 *   NOT the cloud `eas.json build.production.env` that `eas build` uses. On
 *   2026-06-26 this shipped a STAGING-pointed bundle to production users five
 *   times before it was understood. A second trap: an env source missing the
 *   `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values silently breaks Google Sign-In.
 *
 *   So this script never trusts the bundler blindly. It:
 *     1. Exports the production bundle once (`expo export`).
 *     2. Greps the exported bytecode to PROVE it contains prod backend config
 *        and does NOT contain staging config (and that Google IDs are present).
 *     3. Only if every check passes, publishes THAT EXACT bundle via
 *        `eas update --skip-bundler --input-dir <dist>` — no re-bundle, so we
 *        ship precisely what we verified.
 *
 *   Verification markers are derived from eas.json (build.production.env vs
 *   build.staging.env) so they never drift out of sync with the real config.
 *
 * Usage:
 *   node scripts/eas-update-prod.js -m "fix: scorecard sync"
 *   pnpm update:prod -- -m "fix: scorecard sync"
 *   pnpm update:prod -- -m "..." --platform ios --rollout 10 --yes
 *
 * Flags:
 *   -m, --message <msg>   Update message (required).
 *   -p, --platform <all|ios|android>   Default: all.
 *   --rollout <1-100>     Gradual rollout percentage (optional).
 *   --branch <name>       Target branch. Default: production. (Verification only
 *                         runs for the production branch.)
 *   -y, --yes             Skip the confirmation prompt.
 *
 * Requires: a machine `.env.production` (prod Supabase/RevenueCat) alongside
 * `.env` (which supplies the Google client IDs). The checks below fail loudly
 * if that composition is wrong, so a misconfigured machine cannot ship.
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const repoRoot = path.resolve(__dirname, '..');

// ---- args -----------------------------------------------------------------
function parseArgs(argv) {
  const out = { platform: 'all', branch: 'production', yes: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-m' || a === '--message') out.message = argv[++i];
    else if (a === '-p' || a === '--platform') out.platform = argv[++i];
    else if (a === '--rollout') out.rollout = argv[++i];
    else if (a === '--branch') out.branch = argv[++i];
    else if (a === '-y' || a === '--yes') out.yes = true;
    else if (a === '--') continue; // pnpm forwards this separator verbatim; ignore it
    else if (!a.startsWith('-')) positional.push(a);
    else {
      console.error(`Unknown flag: ${a}`);
      process.exit(2);
    }
  }
  if (!out.message && positional.length) out.message = positional.join(' ');
  return out;
}

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit', ...opts });
  if (r.status !== 0) die(`${cmd} ${args.join(' ')} exited with code ${r.status}`);
}

// grep -r -a -l -F <marker> <dir> → list of files containing the literal marker
function filesContaining(marker, dir) {
  const r = spawnSync('grep', ['-r', '-a', '-l', '-F', '--', marker, dir], {
    encoding: 'utf8',
  });
  if (r.status === 2) die(`grep failed while scanning bundle: ${r.stderr}`);
  return r.stdout.split('\n').filter(Boolean);
}

function refFromUrl(url) {
  const m = /https?:\/\/([^.]+)\./.exec(url || '');
  return m ? m[1] : null;
}

function confirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.message) die('A message is required. Use -m "your message".');
  if (!['all', 'ios', 'android'].includes(args.platform)) {
    die(`--platform must be all|ios|android (got "${args.platform}").`);
  }
  if (args.rollout !== undefined) {
    const n = Number(args.rollout);
    if (!Number.isInteger(n) || n < 1 || n > 100) die('--rollout must be an integer 1-100.');
  }

  // Warn if the working tree is dirty — the bundle reflects the working tree.
  const dirty = execFileSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  if (dirty) {
    console.warn(
      '⚠  Working tree has uncommitted changes — the OTA bundle will include them.\n'
    );
  }

  // Derive verification markers from eas.json so they never drift.
  const eas = JSON.parse(fs.readFileSync(path.join(repoRoot, 'eas.json'), 'utf8'));
  const prodEnv = eas.build?.production?.env || {};
  const stagingEnv = eas.build?.staging?.env || {};
  const prodRef = refFromUrl(prodEnv.EXPO_PUBLIC_SUPABASE_URL);
  const stagingRef = refFromUrl(stagingEnv.EXPO_PUBLIC_SUPABASE_URL);

  const distDir = path.join(os.tmpdir(), `nineteenth-ota-${process.pid}`);
  fs.rmSync(distDir, { recursive: true, force: true });

  console.log(`\n▸ Exporting production bundle → ${distDir}\n`);
  run('npx', ['expo', 'export', '--platform', args.platform, '--output-dir', distDir]);

  // Only the production branch gets the prod-vs-staging assertions.
  if (args.branch === 'production') {
    console.log('\n▸ Verifying bundle backend config…');
    const checks = [
      { label: 'prod Supabase project present', marker: prodRef, mustExist: true },
      { label: 'staging Supabase project ABSENT', marker: stagingRef, mustExist: false },
      { label: 'Google OAuth client IDs present', marker: 'apps.googleusercontent.com', mustExist: true },
      {
        label: 'prod RevenueCat Android key present',
        marker: prodEnv.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
        mustExist: true,
      },
      {
        label: 'staging RevenueCat Android key ABSENT',
        marker: stagingEnv.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
        mustExist: false,
      },
    ];

    const failures = [];
    for (const c of checks) {
      if (!c.marker) {
        failures.push(`${c.label}: marker could not be derived from eas.json`);
        continue;
      }
      // Skip a "must be absent" check when it equals a "must exist" marker.
      if (!c.mustExist && c.marker === prodRef) continue;
      const hits = filesContaining(c.marker, distDir).length;
      const ok = c.mustExist ? hits > 0 : hits === 0;
      console.log(`   ${ok ? '✓' : '✗'} ${c.label}  (${hits} file${hits === 1 ? '' : 's'})`);
      if (!ok) failures.push(c.label);
    }

    if (failures.length) {
      console.error(
        `\n✗ Bundle verification FAILED — refusing to publish:\n` +
          failures.map((f) => `    • ${f}`).join('\n') +
          `\n\nThe exported bundle is at ${distDir} for inspection.\n` +
          `Likely cause: .env / .env.production composition is wrong on this machine.\n` +
          `Prod must come from .env.production; Google IDs come from .env. See\n` +
          `docs / the eas-update env notes before retrying.\n`
      );
      process.exit(1);
    }
    console.log('\n✓ Verification passed — bundle is prod-clean.\n');
  } else {
    console.warn(
      `\n⚠  Branch is "${args.branch}" (not production) — skipping prod/staging verification.\n`
    );
  }

  // Confirm before publishing.
  if (!args.yes) {
    const summary =
      `About to publish OTA:\n` +
      `    branch    ${args.branch}\n` +
      `    platform  ${args.platform}\n` +
      (args.rollout ? `    rollout   ${args.rollout}%\n` : '') +
      `    message   ${args.message}\n\n` +
      `Proceed? (y/N) `;
    const ok = await confirm(`\n${summary}`);
    if (!ok) {
      console.log('Aborted.');
      fs.rmSync(distDir, { recursive: true, force: true });
      process.exit(0);
    }
  }

  console.log(`\n▸ Publishing verified bundle (no re-bundle)…\n`);
  const updateArgs = [
    'update',
    '--branch',
    args.branch,
    '--skip-bundler',
    '--input-dir',
    distDir,
    '--platform',
    args.platform,
    '--message',
    args.message,
  ];
  if (args.rollout) updateArgs.push('--rollout-percentage', String(args.rollout));
  run('eas', updateArgs);

  fs.rmSync(distDir, { recursive: true, force: true });
  console.log(`\n✓ OTA published to "${args.branch}".`);
}

main().catch((err) => die(err.stack || String(err)));
