#!/usr/bin/env node
/**
 * Injects the Google Maps iOS API key into the committed native files at build
 * time, so the secret never lives in git. The committed files hold the
 * placeholder `__GMS_KEY__`; this script swaps in GOOGLE_MAPS_API_KEY_IOS.
 *
 *   - On EAS: the value comes from the EAS environment (process.env). Wired via
 *     the `eas-build-post-install` npm script, which runs on the builder after
 *     dependency install and before the native build.
 *   - Locally: the value is read from `.env` (via dotenv). Run
 *     `pnpm inject-maps-key` before building in Xcode / `expo run:ios`.
 *
 * NOTE: locally this rewrites the tracked native files with the real key. Do NOT
 * commit them — the .git/hooks/pre-commit guard blocks it.
 */
const fs = require('fs');
const path = require('path');

// Load .env for local runs (no-op on EAS, where the var is already in env).
try {
  require('dotenv').config();
} catch {
  /* dotenv unavailable here — env must already be populated (e.g. on EAS) */
}

const PLACEHOLDER = '__GMS_KEY__';
const isEasBuild = process.env.EAS_BUILD === 'true';
const key = process.env.GOOGLE_MAPS_API_KEY_IOS;

const root = path.resolve(__dirname, '..');
const targets = [
  {
    file: path.join(root, 'ios/TheNineteenth/AppDelegate.swift'),
    // GMSServices.provideAPIKey("...")
    pattern: /(GMSServices\.provideAPIKey\(")[^"]*("\))/,
  },
  {
    file: path.join(root, 'ios/TheNineteenth/Info.plist'),
    // <key>GMSApiKey</key> <string>...</string>
    pattern: /(<key>GMSApiKey<\/key>\s*<string>)[^<]*(<\/string>)/,
  },
];

if (!key) {
  const msg = 'inject-maps-key: GOOGLE_MAPS_API_KEY_IOS is not set.';
  if (isEasBuild) {
    console.error(`${msg} Set it in the EAS environment. Refusing to build with a placeholder.`);
    process.exit(1);
  }
  console.warn(`${msg} Leaving placeholder "${PLACEHOLDER}" (maps will not load locally).`);
  process.exit(0);
}

if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) {
  console.error('inject-maps-key: GOOGLE_MAPS_API_KEY_IOS does not look like a Google API key.');
  process.exit(1);
}

let changed = 0;
for (const { file, pattern } of targets) {
  const src = fs.readFileSync(file, 'utf8');
  if (!pattern.test(src)) {
    console.error(
      `inject-maps-key: could not find injection point in ${path.relative(root, file)}`
    );
    process.exit(1);
  }
  const out = src.replace(pattern, `$1${key}$2`);
  if (out !== src) {
    fs.writeFileSync(file, out);
    changed += 1;
  }
}

console.log(`inject-maps-key: injected Google Maps iOS key into ${changed} file(s).`);
