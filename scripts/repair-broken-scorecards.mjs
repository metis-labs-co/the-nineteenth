#!/usr/bin/env node
/**
 * Bulk repair for all completed scorecards with null handicap snapshot fields.
 *
 * Root causes (fixed in this PR going forward, but left a trail of bad
 * historical rows):
 * 1. Scoring used raw profile HC instead of WHS DHC → wrong total_points
 * 2. loadFromOffline dropped tee state → sync wrote null snapshot fields
 *
 * For each broken scorecard this script:
 * 1. Resolves the effective tee (round_players.selected_tee ∨
 *    rounds.selected_tee), pulls canonical slope/CR from the tees table
 *    if present, falls back to the JSONB tee on the round row.
 * 2. Computes the WHS daily handicap from the player profile HC + tee
 *    ratings + course par.
 * 3. Recomputes total_points for stableford (ignores non-stableford — we
 *    don't want to retroactively rewrite stroke/par totals).
 * 4. Recomputes handicap_differential.
 * 5. Writes ga_handicap_used, daily_handicap_used, course_rating_used,
 *    slope_rating_used, handicap_differential, and (for stableford)
 *    total_points + total_net.
 *
 * Scorecards that can't be recalculated (missing course/tee ratings,
 * missing player HC, no scores) are skipped with a logged reason.
 *
 * NOTE: This uses whatever tee is CURRENTLY recorded on the round. If a
 * round has a tee mismatch (like 3c4e8361 had), this script won't fix
 * that — the tee mismatch needs manual correction via the in-app edit
 * tees feature or a dedicated script.
 *
 * Usage:
 *   node scripts/repair-broken-scorecards.mjs                 # dry run
 *   node scripts/repair-broken-scorecards.mjs --apply         # write
 *   node scripts/repair-broken-scorecards.mjs --apply --limit 5  # 5 only
 *
 * Delete this script after the sweep is complete.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL_PROD;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY_PROD;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL_PROD or SUPABASE_SECRET_KEY_PROD');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const limitIndex = process.argv.indexOf('--limit');
const LIMIT = limitIndex >= 0 ? parseInt(process.argv[limitIndex + 1], 10) : Infinity;

const PICKUP_SCORE = 10;

// -----------------------------------------------------------------------------
// Pure scoring helpers (mirror src/utils/*)
// -----------------------------------------------------------------------------

function calculateDailyHandicap({ gaHandicap, slopeRating, courseRating, par, gender }) {
  const consistency = gender === 'female' ? 1.0483 : 0.9986;
  const courseHandicap = (gaHandicap * slopeRating) / 113;
  const adjustment = courseRating - par;
  return Math.round((courseHandicap + adjustment) * 0.93 * consistency);
}

function calculateDifferential(adjustedGross, courseRating, slopeRating) {
  return Math.round(((113 / slopeRating) * (adjustedGross - courseRating)) * 10) / 10;
}

function strokesReceived(dhc, strokeIndex) {
  if (dhc <= 0) return 0;
  return Math.floor(dhc / 18) + (strokeIndex <= (dhc % 18) ? 1 : 0);
}

function stablefordPoints(gross, par, received) {
  if (!gross || gross <= 0 || gross >= PICKUP_SCORE) return 0;
  const net = gross - received;
  const rel = net - par;
  if (rel <= -3) return 5;
  if (rel === -2) return 4;
  if (rel === -1) return 3;
  if (rel === 0) return 2;
  if (rel === 1) return 1;
  return 0;
}

// -----------------------------------------------------------------------------
// Supabase REST helpers
// -----------------------------------------------------------------------------
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function getJSON(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patch(path, body) {
  if (!APPLY) return null;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// -----------------------------------------------------------------------------
// Per-scorecard repair
// -----------------------------------------------------------------------------
async function repairScorecard(sc) {
  const scId = sc.id;
  const roundId = sc.round_id;
  const playerId = sc.player_id;

  if (!sc.total_gross || sc.total_gross <= 0) {
    return { status: 'skipped', reason: 'no total_gross' };
  }

  // Fetch round + round_player override + course holes + player profile in parallel.
  const [roundRows, roundPlayerRows, playerRows] = await Promise.all([
    getJSON(`/rest/v1/rounds?id=eq.${roundId}&select=id,course_id,game_type,selected_tee,nine_type`),
    getJSON(`/rest/v1/round_players?round_id=eq.${roundId}&player_id=eq.${playerId}&select=selected_tee`),
    getJSON(`/rest/v1/players?id=eq.${playerId}&select=handicap,gender`),
  ]);

  const round = roundRows[0];
  const roundPlayer = roundPlayerRows[0];
  const player = playerRows[0];

  if (!round) return { status: 'skipped', reason: 'round missing' };
  if (!player) return { status: 'skipped', reason: 'player missing' };
  if (player.handicap == null) return { status: 'skipped', reason: 'player has no handicap' };
  if (round.nine_type && round.nine_type !== 'full') {
    // 9-hole rounds need special handling (half DHC). Skip for safety — rare case.
    return { status: 'skipped', reason: '9-hole round, not handling' };
  }

  const effectiveTee = roundPlayer?.selected_tee ?? round.selected_tee;
  if (!effectiveTee) return { status: 'skipped', reason: 'no selected_tee' };

  const slopeRating = effectiveTee.slopeRating ?? effectiveTee.slope_rating;
  const courseRating = effectiveTee.courseRating ?? effectiveTee.course_rating;
  if (!slopeRating || !courseRating) {
    return { status: 'skipped', reason: 'tee has no slope/CR' };
  }

  // Fetch course holes to get par + stroke indexes.
  const courseRows = await getJSON(
    `/rest/v1/courses?id=eq.${round.course_id}&select=holes,num_holes`
  );
  const course = courseRows[0];
  if (!course?.holes || !Array.isArray(course.holes) || course.holes.length === 0) {
    return { status: 'skipped', reason: 'course has no hole data' };
  }
  const holes = course.holes;
  const coursePar = holes.reduce((sum, h) => sum + (h.par || 0), 0);
  if (coursePar <= 0) return { status: 'skipped', reason: 'coursePar is 0' };

  const dhc = calculateDailyHandicap({
    gaHandicap: player.handicap,
    slopeRating,
    courseRating,
    par: coursePar,
    gender: player.gender ?? null,
  });

  // For stableford, recompute total_points from stored scores + new DHC.
  // For other game types, leave total_points as-is.
  let totalPoints = sc.total_points;
  let totalGross = 0;
  if (round.game_type === 'stableford') {
    totalPoints = 0;
    for (const hole of holes) {
      const s = sc.scores?.[String(hole.number)];
      const strokes = s?.strokes ?? 0;
      if (!strokes || strokes <= 0) continue;
      if (strokes < PICKUP_SCORE) totalGross += strokes;
      totalPoints += stablefordPoints(strokes, hole.par, strokesReceived(dhc, hole.strokeIndex));
    }
  } else {
    // Use the stored gross as-is for non-stableford.
    totalGross = sc.total_gross;
  }

  const differential = calculateDifferential(totalGross, courseRating, slopeRating);
  const totalNet = totalGross - dhc;

  const updatePayload = {
    ga_handicap_used: player.handicap,
    daily_handicap_used: dhc,
    course_rating_used: courseRating,
    slope_rating_used: slopeRating,
    handicap_differential: differential,
  };
  if (round.game_type === 'stableford') {
    updatePayload.total_points = totalPoints;
    updatePayload.total_net = totalNet;
    updatePayload.total_gross = totalGross;
  }

  await patch(`/rest/v1/scorecards?id=eq.${scId}`, updatePayload);

  return {
    status: 'ok',
    gameType: round.game_type,
    hc: player.handicap,
    dhc,
    gross: totalGross,
    points: totalPoints,
    diff: differential,
  };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log(`=== Bulk scorecard snapshot repair ===`);
  console.log(APPLY ? '(APPLYING changes)' : '(DRY RUN — use --apply to write)');
  if (LIMIT !== Infinity) console.log(`LIMIT=${LIMIT}`);
  console.log('');

  // 1. Fetch all completed scorecards with null snapshot fields.
  console.log('Finding broken scorecards (completed, daily_handicap_used is null)...');
  const broken = await getJSON(
    `/rest/v1/scorecards?status=eq.completed&daily_handicap_used=is.null&select=id,round_id,player_id,total_gross,total_net,total_points,scores&order=created_at.desc`
  );
  console.log(`Found ${broken.length} broken scorecards`);
  console.log('');

  const results = { ok: 0, skipped: 0, failed: 0, reasons: {} };
  const toProcess = broken.slice(0, LIMIT);

  for (let i = 0; i < toProcess.length; i++) {
    const sc = toProcess[i];
    const tag = `[${i + 1}/${toProcess.length}] ${sc.id.slice(0, 8)}`;
    try {
      const r = await repairScorecard(sc);
      if (r.status === 'ok') {
        results.ok++;
        console.log(`${tag} OK — game=${r.gameType} HC=${r.hc} DHC=${r.dhc} pts=${r.points} diff=${r.diff}`);
      } else {
        results.skipped++;
        results.reasons[r.reason] = (results.reasons[r.reason] ?? 0) + 1;
        console.log(`${tag} SKIP — ${r.reason}`);
      }
    } catch (err) {
      results.failed++;
      console.log(`${tag} FAIL — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`  Processed: ${toProcess.length}`);
  console.log(`  OK:        ${results.ok}`);
  console.log(`  Skipped:   ${results.skipped}`);
  if (results.skipped > 0) {
    for (const [reason, count] of Object.entries(results.reasons)) {
      console.log(`    - ${reason}: ${count}`);
    }
  }
  console.log(`  Failed:    ${results.failed}`);
  if (!APPLY) console.log('\n(DRY RUN — nothing was written. Re-run with --apply to commit.)');
}

main().catch((err) => {
  console.error('BULK REPAIR FAILED:', err);
  process.exit(1);
});
