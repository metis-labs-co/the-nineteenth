#!/usr/bin/env node
/**
 * Backfill WHS Adjusted Gross Score differentials.
 *
 * Root cause: every `calculateScoreDifferential` call site historically passed
 * the RAW total gross as `adjustedGrossScore`. WHS requires the ADJUSTED gross
 * — each hole capped at net double bogey (par + 2 + strokes received) — so any
 * round containing a hole worse than net double bogey received an inflated
 * differential, and therefore an inflated handicap index.
 *
 * The app is fixed going forward (see src/utils/adjustedGross.ts and the seven
 * call sites that consume it). This script re-derives the differential for
 * historical scorecards so a player's best-8-of-20 window is not computed from
 * a mix of the two formulas.
 *
 * For each completed/confirmed scorecard with a non-null handicap_differential
 * the script:
 * 1. Loads the round's course holes and filters them by nine_type.
 * 2. Caps each hole at par + 2 + strokesReceived(daily_handicap_used).
 * 3. Recomputes the differential as (113 / slope) × (adjustedGross − courseRating).
 * 4. Compares against the stored value and writes the fix if it moved.
 *
 * Skipped deliberately:
 * - Shared-ball team formats (scramble, alt-shot): total_gross is the team's
 *   single-ball score, so these never carry a handicap-eligible differential.
 * - Scorecards with no hole data, no stored ratings, or a non-positive gross.
 * - Scorecards with a null daily_handicap_used — without it the cap cannot be
 *   computed and guessing would be worse than leaving the row alone.
 *
 * The report prints a per-player before/after index delta so the blast radius
 * is visible BEFORE anything is written. Always run the dry run against
 * staging first and read that table.
 *
 * Scope:
 * - `--player <uuid>`   narrow to one player
 * - `--limit <n>`       process at most N scorecards
 * - `--staging`         target staging instead of prod
 * - `--apply`           actually write changes (default is dry-run)
 *
 * Usage:
 *   node scripts/backfill-adjusted-gross-differentials.mjs --staging
 *   node scripts/backfill-adjusted-gross-differentials.mjs --staging --apply
 *   node scripts/backfill-adjusted-gross-differentials.mjs                  # prod dry run
 *   node scripts/backfill-adjusted-gross-differentials.mjs --apply          # prod write
 *
 * Delete this script after the sweep is complete.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load env vars from .env at repo root
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envText = readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2];
  }
}

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------
const APPLY = process.argv.includes('--apply');
const STAGING = process.argv.includes('--staging');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const PLAYER_FILTER = argValue('--player');
const LIMIT_RAW = argValue('--limit');
const LIMIT = LIMIT_RAW ? parseInt(LIMIT_RAW, 10) : Infinity;

const SUPABASE_URL = STAGING
  ? process.env.EXPO_PUBLIC_SUPABASE_URL
  : process.env.EXPO_PUBLIC_SUPABASE_URL_PROD;
const SUPABASE_KEY = STAGING
  ? process.env.SUPABASE_SECRET_KEY
  : process.env.SUPABASE_SECRET_KEY_PROD;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    STAGING
      ? 'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY'
      : 'Missing EXPO_PUBLIC_SUPABASE_URL_PROD or SUPABASE_SECRET_KEY_PROD',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// -----------------------------------------------------------------------------
// Pure helpers — mirror src/utils/adjustedGross.ts and handicapDifferential.ts
// -----------------------------------------------------------------------------
const PICKUP_SCORE = 10;
const NET_DOUBLE_BOGEY_OFFSET = 2;
const STANDARD_SLOPE_RATING = 113;
const WHS_MULTIPLIER = 0.96;
const MAX_HANDICAP = 54;

/** Formats where total_gross is a shared team ball, not the player's own play. */
const SHARED_BALL_GAME_TYPES = new Set(['scramble', 'alt-shot']);

function strokesReceived(dhc, strokeIndex) {
  if (dhc == null || dhc <= 0) return 0;
  return Math.floor(dhc / 18) + (strokeIndex <= (dhc % 18) ? 1 : 0);
}

function readHoleScore(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return { strokes: raw };
  if (typeof raw !== 'object') return null;
  // Multi-ball cards carry a `balls` array and no top-level strokes.
  if (Array.isArray(raw.balls)) return null;
  return raw;
}

function isPickedUp(score) {
  if (!score) return false;
  if (score.didNotAttempt) return false;
  if (typeof score.pickedUp === 'boolean') return score.pickedUp;
  return (score.strokes ?? 0) >= PICKUP_SCORE;
}

/** Mirrors calculateAdjustedGrossScore in src/utils/adjustedGross.ts. */
function adjustedGrossFor(holes, scores, dailyHandicap) {
  let adjustedGross = 0;
  let rawGross = 0;
  let holesCounted = 0;
  let multiBall = false;

  for (const hole of holes) {
    const raw = scores?.[String(hole.number)];
    if (raw && typeof raw === 'object' && Array.isArray(raw.balls)) multiBall = true;

    const score = readHoleScore(raw);
    if (!score) continue;
    if (score.didNotAttempt) continue;

    const received = strokesReceived(dailyHandicap, hole.strokeIndex);
    const netDoubleBogey = hole.par + NET_DOUBLE_BOGEY_OFFSET + received;

    if (isPickedUp(score)) {
      holesCounted += 1;
      adjustedGross += netDoubleBogey;
      rawGross += score.strokes ?? netDoubleBogey;
      continue;
    }

    if (!score.strokes || score.strokes <= 0) continue;

    holesCounted += 1;
    rawGross += score.strokes;
    adjustedGross += Math.min(score.strokes, netDoubleBogey);
  }

  return { adjustedGross, rawGross, holesCounted, multiBall };
}

function scoreDifferential(adjustedGross, courseRating, slopeRating) {
  if (!slopeRating || slopeRating <= 0 || !courseRating || courseRating <= 0) return null;
  const differential =
    (STANDARD_SLOPE_RATING / slopeRating) * (adjustedGross - courseRating);
  return Math.round(differential * 10) / 10;
}

const WHS_COUNTING_TABLE = [
  { maxRounds: 5, count: 1 },
  { maxRounds: 8, count: 2 },
  { maxRounds: 11, count: 3 },
  { maxRounds: 14, count: 4 },
  { maxRounds: 16, count: 5 },
  { maxRounds: 18, count: 6 },
  { maxRounds: 19, count: 7 },
  { maxRounds: Infinity, count: 8 },
];

function qualifyingCount(totalRounds) {
  if (totalRounds <= 0) return 0;
  for (const tier of WHS_COUNTING_TABLE) {
    if (totalRounds <= tier.maxRounds) return tier.count;
  }
  return 8;
}

/** Mirrors calculateHandicapIndex in src/utils/handicapDifferential.ts. */
function handicapIndex(differentials) {
  if (!differentials.length) return null;
  const count = qualifyingCount(differentials.length);
  const best = [...differentials].sort((a, b) => a - b).slice(0, count);
  const average = best.reduce((acc, d) => acc + d, 0) / count;
  return Math.round(Math.min(average * WHS_MULTIPLIER, MAX_HANDICAP) * 10) / 10;
}

function filterHolesByNine(holes, nineType) {
  if (nineType === 'front9') return holes.filter((h) => h.number <= 9);
  if (nineType === 'back9') return holes.filter((h) => h.number > 9);
  return holes;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  const target = STAGING ? 'STAGING' : 'PRODUCTION';
  console.log(`\n=== Adjusted Gross differential backfill (${target}) ===`);
  console.log(APPLY ? 'MODE: APPLY (writes enabled)\n' : 'MODE: DRY RUN (no writes)\n');

  let query = supabase
    .from('scorecards')
    .select(
      'id, player_id, round_id, total_gross, handicap_differential, daily_handicap_used, ' +
        'course_rating_used, slope_rating_used, scores, status, ' +
        'rounds!round_id (id, nine_type, game_type, courses!course_id (holes))',
    )
    .in('status', ['completed', 'confirmed'])
    .not('handicap_differential', 'is', null);

  if (PLAYER_FILTER) query = query.eq('player_id', PLAYER_FILTER);

  const { data, error } = await query;
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const changes = [];
  const skipped = { sharedBall: 0, noHoles: 0, noRatings: 0, noDhc: 0, multiBall: 0, noGross: 0 };
  let unchanged = 0;

  for (const sc of data ?? []) {
    if (changes.length >= LIMIT) break;

    const round = sc.rounds;
    const gameType = round?.game_type;

    if (SHARED_BALL_GAME_TYPES.has(gameType)) { skipped.sharedBall += 1; continue; }
    if (!sc.total_gross || sc.total_gross <= 0) { skipped.noGross += 1; continue; }
    if (sc.course_rating_used == null || sc.slope_rating_used == null) { skipped.noRatings += 1; continue; }
    if (sc.daily_handicap_used == null) { skipped.noDhc += 1; continue; }

    const allHoles = round?.courses?.holes;
    if (!Array.isArray(allHoles) || allHoles.length === 0) { skipped.noHoles += 1; continue; }

    const holes = filterHolesByNine(allHoles, round?.nine_type ?? 'full');
    if (holes.length === 0) { skipped.noHoles += 1; continue; }

    const { adjustedGross, rawGross, holesCounted, multiBall } = adjustedGrossFor(
      holes,
      sc.scores,
      sc.daily_handicap_used,
    );

    // Multi-ball (solo practice) cards are not represented by a single gross;
    // leave them entirely alone rather than guessing which ball counts.
    if (multiBall) { skipped.multiBall += 1; continue; }
    if (holesCounted === 0 || adjustedGross <= 0) { skipped.noGross += 1; continue; }

    const next = scoreDifferential(adjustedGross, sc.course_rating_used, sc.slope_rating_used);
    if (next === null) { skipped.noRatings += 1; continue; }

    const prev = Number(sc.handicap_differential);
    if (Math.abs(next - prev) < 0.05) { unchanged += 1; continue; }

    changes.push({
      id: sc.id,
      playerId: sc.player_id,
      roundId: sc.round_id,
      storedGross: sc.total_gross,
      rawGross,
      adjustedGross,
      prev,
      next,
    });
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------
  console.log(`Scorecards examined : ${data?.length ?? 0}`);
  console.log(`Unchanged           : ${unchanged}`);
  console.log(
    `Skipped             : ${Object.values(skipped).reduce((a, b) => a + b, 0)} ` +
      `(shared-ball ${skipped.sharedBall}, no holes ${skipped.noHoles}, ` +
      `no ratings ${skipped.noRatings}, no DHC ${skipped.noDhc}, ` +
      `multi-ball ${skipped.multiBall}, no gross ${skipped.noGross})`,
  );
  console.log(`WOULD CHANGE        : ${changes.length}\n`);

  if (changes.length === 0) {
    console.log('Nothing to do.\n');
    return;
  }

  // Per-player before/after index delta — the number that actually matters.
  const byPlayer = new Map();
  for (const sc of data ?? []) {
    if (sc.handicap_differential == null) continue;
    const entry = byPlayer.get(sc.player_id) ?? { before: [], after: [] };
    const change = changes.find((c) => c.id === sc.id);
    entry.before.push(Number(sc.handicap_differential));
    entry.after.push(change ? change.next : Number(sc.handicap_differential));
    byPlayer.set(sc.player_id, entry);
  }

  const affectedPlayers = new Set(changes.map((c) => c.playerId));
  const rows = [];
  for (const playerId of affectedPlayers) {
    const { before, after } = byPlayer.get(playerId) ?? { before: [], after: [] };
    // Most recent 20 only, matching the index calculation.
    const beforeIndex = handicapIndex(before.slice(-20));
    const afterIndex = handicapIndex(after.slice(-20));
    rows.push({
      playerId,
      rounds: before.length,
      changed: changes.filter((c) => c.playerId === playerId).length,
      beforeIndex,
      afterIndex,
      delta:
        beforeIndex != null && afterIndex != null
          ? Math.round((afterIndex - beforeIndex) * 10) / 10
          : null,
    });
  }
  rows.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  console.log('--- Per-player handicap index impact (largest movers first) ---');
  console.log('player_id                              rounds  chg   before   after   delta');
  for (const r of rows) {
    console.log(
      `${r.playerId}  ${String(r.rounds).padStart(6)}  ${String(r.changed).padStart(3)}  ` +
        `${String(r.beforeIndex ?? '-').padStart(7)}  ${String(r.afterIndex ?? '-').padStart(6)}  ` +
        `${String(r.delta ?? '-').padStart(6)}`,
    );
  }

  const moved = rows.filter((r) => r.delta != null && r.delta !== 0);
  console.log(
    `\nPlayers affected: ${rows.length} | indexes that move: ${moved.length} | ` +
      `largest move: ${moved.length ? moved[0].delta : 0}\n`,
  );

  if (!APPLY) {
    console.log('Dry run — re-run with --apply to write these changes.\n');
    return;
  }

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------
  let written = 0;
  let failed = 0;
  for (const c of changes) {
    const { error: updateError } = await supabase
      .from('scorecards')
      .update({ handicap_differential: c.next })
      .eq('id', c.id);

    if (updateError) {
      failed += 1;
      console.error(`  FAILED ${c.id}: ${updateError.message}`);
    } else {
      written += 1;
    }
  }

  console.log(`\nWritten: ${written} | Failed: ${failed}`);
  console.log(
    '\nNOTE: player handicap indexes are derived from these differentials on read,\n' +
      'but any cached index on players.handicap_index must be refreshed separately\n' +
      'via updatePlayerHandicapIndex for each affected player.\n',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
