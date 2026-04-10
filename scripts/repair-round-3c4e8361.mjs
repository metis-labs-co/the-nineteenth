#!/usr/bin/env node
/**
 * One-off repair for round 3c4e8361-a51f-4798-b769-66ab6cd84157
 * (St Andrews Beach Main, 2026-04-09, Sam Kay + Ben).
 *
 * Fixes two independent bugs that corrupted this round's stored data:
 * 1. The round was saved with Blue tee (wizard auto-selected first tee)
 *    but both players physically played the White tee.
 * 2. The scoring pipeline used raw profile handicap instead of WHS DHC,
 *    so total_points was written using a wrong handicap. Sync also
 *    never populated the handicap snapshot fields (ga_handicap_used,
 *    daily_handicap_used, course_rating_used, slope_rating_used,
 *    handicap_differential) because teeData was missing at sync time.
 *
 * This script:
 * 1. Sets the White tee override on `round_players` for both players.
 * 2. Recomputes the WHS daily handicap and stableford points for each
 *    scorecard using the stored scores + White tee ratings + course par.
 * 3. Writes back ga_handicap_used, daily_handicap_used,
 *    course_rating_used, slope_rating_used, handicap_differential,
 *    total_net, and total_points via a single PATCH per scorecard.
 *
 * Usage:
 *   node scripts/repair-round-3c4e8361.mjs           # DRY RUN (default)
 *   node scripts/repair-round-3c4e8361.mjs --apply   # actually writes
 *
 * Requires env vars:
 *   EXPO_PUBLIC_SUPABASE_URL_PROD
 *   SUPABASE_SECRET_KEY_PROD
 *
 * Delete this script after the repair is confirmed in the UI.
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

// -----------------------------------------------------------------------------
// Constants for this specific round
// -----------------------------------------------------------------------------
const ROUND_ID = '3c4e8361-a51f-4798-b769-66ab6cd84157';
const COURSE_PAR = 70;
const PLAYERS = [
  { id: '6257e002-aba8-49a2-9fc4-36034a516c62', name: 'Sam',
    scorecardId: 'ce444078-f62a-4ad7-becf-44bd31b62948' },
  { id: '39aed993-beba-40c6-816f-e743b5b76731', name: 'Ben',
    scorecardId: '7bc4a9c1-d079-4f2a-9a21-6aa6d47b48b0' },
];

// White tee JSONB to set on round_players for both players.
const WHITE_TEE = {
  name: 'White',
  color: '#FFFFFF',
  tee_id: '1203b711-cf95-48ea-a294-5ce2f9cffa32',
  slopeRating: 135,
  courseRating: 71,
  slopeRatingFront9: 135,
  courseRatingFront9: 71,
  slopeRatingBack9: 135,
  courseRatingBack9: 71,
  totalYardage: 6050,
};

// Hole metadata (par + SI) from St Andrews Beach Main, num_holes=18.
const HOLES = [
  { n: 1, par: 5, si: 16 },
  { n: 2, par: 4, si: 18 },
  { n: 3, par: 4, si: 2 },
  { n: 4, par: 3, si: 6 },
  { n: 5, par: 4, si: 4 },
  { n: 6, par: 3, si: 12 },
  { n: 7, par: 4, si: 8 },
  { n: 8, par: 4, si: 14 },
  { n: 9, par: 4, si: 10 },
  { n: 10, par: 4, si: 3 },
  { n: 11, par: 3, si: 15 },
  { n: 12, par: 4, si: 7 },
  { n: 13, par: 4, si: 1 },
  { n: 14, par: 4, si: 13 },
  { n: 15, par: 4, si: 11 },
  { n: 16, par: 3, si: 9 },
  { n: 17, par: 5, si: 17 },
  { n: 18, par: 4, si: 5 },
];

const PICKUP_SCORE = 10;

// -----------------------------------------------------------------------------
// Scoring helpers (mirrors src/utils/dailyHandicap.ts + src/utils/scoring.ts)
// -----------------------------------------------------------------------------

/** WHS/GA Daily Handicap for non-9-hole rounds. */
function calculateDailyHandicap({ gaHandicap, slopeRating, courseRating, par, gender }) {
  const consistency = gender === 'female' ? 1.0483 : 0.9986;
  const courseHandicap = (gaHandicap * slopeRating) / 113;
  const adjustment = courseRating - par;
  const raw = (courseHandicap + adjustment) * 0.93 * consistency;
  return Math.round(raw);
}

/** WHS handicap differential (for the `handicap_differential` column). */
function calculateDifferential(adjustedGross, courseRating, slopeRating) {
  return Math.round(((113 / slopeRating) * (adjustedGross - courseRating)) * 10) / 10;
}

/** Strokes received on a hole, per WHS stroke-index allocation. */
function strokesReceived(dhc, strokeIndex) {
  if (dhc <= 0) return 0;
  return Math.floor(dhc / 18) + (strokeIndex <= (dhc % 18) ? 1 : 0);
}

/** Stableford points for a single hole. Pickups (gross === PICKUP_SCORE) = 0. */
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
  if (!APPLY) {
    console.log(`  [dry-run] PATCH ${path}`);
    console.log(`             body: ${JSON.stringify(body)}`);
    return null;
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log(`=== Repair round ${ROUND_ID} ===`);
  console.log(APPLY ? '(APPLYING changes to prod DB)' : '(DRY RUN — no writes. Use --apply to commit.)');
  console.log('');

  // 1. Override tee on round_players for both players.
  console.log('Step 1: Set White tee override on round_players');
  for (const p of PLAYERS) {
    const path = `/rest/v1/round_players?round_id=eq.${ROUND_ID}&player_id=eq.${p.id}`;
    console.log(`  ${p.name} (${p.id.slice(0, 8)}…)`);
    await patch(path, { selected_tee: WHITE_TEE });
  }
  console.log('');

  // 2. Recalculate each scorecard with the White tee.
  console.log('Step 2: Recalculate scorecards with White tee');
  for (const p of PLAYERS) {
    // Fetch current scorecard + player profile.
    const [scRows, playerRows] = await Promise.all([
      getJSON(`/rest/v1/scorecards?id=eq.${p.scorecardId}&select=total_gross,scores`),
      getJSON(`/rest/v1/players?id=eq.${p.id}&select=handicap,gender`),
    ]);
    const sc = scRows[0];
    const player = playerRows[0];
    if (!sc || !player) {
      console.log(`  ${p.name}: MISSING scorecard or player, skipping`);
      continue;
    }
    const hc = player.handicap;
    if (hc == null) {
      console.log(`  ${p.name}: no profile handicap, skipping`);
      continue;
    }

    const dhc = calculateDailyHandicap({
      gaHandicap: hc,
      slopeRating: WHITE_TEE.slopeRating,
      courseRating: WHITE_TEE.courseRating,
      par: COURSE_PAR,
      gender: player.gender ?? null,
    });

    // Recalculate total_gross (excluding pickups) + total_points.
    let totalGross = 0;
    let totalPoints = 0;
    for (const h of HOLES) {
      const s = sc.scores?.[String(h.n)];
      const strokes = s?.strokes ?? 0;
      if (!strokes || strokes <= 0) continue;
      if (strokes < PICKUP_SCORE) totalGross += strokes;
      const rec = strokesReceived(dhc, h.si);
      totalPoints += stablefordPoints(strokes, h.par, rec);
    }

    const differential = calculateDifferential(totalGross, WHITE_TEE.courseRating, WHITE_TEE.slopeRating);
    const totalNet = totalGross - dhc;

    console.log(`  ${p.name}: HC=${hc}, DHC=${dhc}, gross=${totalGross}, pts=${totalPoints}, diff=${differential}`);
    console.log(`    (was stored: gross=${sc.total_gross})`);

    await patch(`/rest/v1/scorecards?id=eq.${p.scorecardId}`, {
      ga_handicap_used: hc,
      daily_handicap_used: dhc,
      course_rating_used: WHITE_TEE.courseRating,
      slope_rating_used: WHITE_TEE.slopeRating,
      handicap_differential: differential,
      total_gross: totalGross,
      total_net: totalNet,
      total_points: totalPoints,
    });
  }

  console.log('');
  console.log(APPLY ? 'DONE — verify in the app.' : 'DRY RUN complete. Re-run with --apply to write.');
}

main().catch((err) => {
  console.error('REPAIR FAILED:', err);
  process.exit(1);
});
