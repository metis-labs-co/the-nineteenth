#!/usr/bin/env node
/**
 * Repair scorecards whose stored totals (total_gross / total_net /
 * total_points) have drifted from the `scores` JSON.
 *
 * Root cause: `applyResolvedScoreToScorecard` (and its caller
 * `applyBypassScores` in the multi-scorer mismatch flow) historically wrote
 * the updated scores JSON without recomputing totals. That left the
 * scorecards table with stale gross/net/points while the scorecard view —
 * which live-sums from scores JSON via `calculatePlayerStats` — displayed
 * the correct values. The round list and anything else reading stored
 * totals showed drifted numbers.
 *
 * The service is fixed going forward (see
 * src/services/scoreMismatch/resolution.ts), but any round that went
 * through a mismatch resolution or bypass before the fix still has stale
 * totals on disk. This script scans for them and writes corrected values.
 *
 * For each completed/confirmed scorecard the script:
 * 1. Live-sums `total_gross` from the scores JSON (single-ball only).
 * 2. Derives `total_net = total_gross - daily_handicap_used` (when DHC set).
 * 3. For stableford rounds, recomputes `total_points` via the per-hole
 *    stableford formula using the scorecard's `daily_handicap_used` + the
 *    course hole data.
 * 4. Compares against stored values. If any field drifted, writes the fix.
 *
 * Scope:
 * - `--round <uuid>`      repair every scorecard for a specific round
 * - `--player <uuid>`     narrow to one player (combine with --round)
 * - `--limit <n>`         process at most N scorecards
 * - `--apply`             actually write changes (default is dry-run)
 *
 * Usage:
 *   node scripts/repair-drifted-scorecard-totals.mjs                          # dry run, all drifted
 *   node scripts/repair-drifted-scorecard-totals.mjs --round <uuid>           # one round, dry run
 *   node scripts/repair-drifted-scorecard-totals.mjs --round <uuid> --apply   # one round, write
 *   node scripts/repair-drifted-scorecard-totals.mjs --apply --limit 20       # 20 fixes, write
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

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------
const APPLY = process.argv.includes('--apply');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const ROUND_FILTER = argValue('--round');
const PLAYER_FILTER = argValue('--player');
const LIMIT_RAW = argValue('--limit');
const LIMIT = LIMIT_RAW ? parseInt(LIMIT_RAW, 10) : Infinity;

// -----------------------------------------------------------------------------
// Pure scoring helpers (mirror src/utils/scoring.ts)
// -----------------------------------------------------------------------------
const PICKUP_SCORE = 10;

function strokesReceived(dhc, strokeIndex) {
  if (dhc == null || dhc <= 0) return 0;
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

function isSingleBallScore(score) {
  return score && typeof score === 'object' && typeof score.strokes === 'number';
}

function computeTotals(scores, holes, gameType, dhc) {
  let totalGross = 0;
  let totalPoints = 0;
  const canComputePoints = gameType === 'stableford' && dhc != null && holes.length > 0;

  if (holes.length > 0) {
    for (const hole of holes) {
      const score = scores?.[String(hole.number)];
      if (!isSingleBallScore(score) || !score.strokes || score.strokes <= 0) continue;
      totalGross += score.strokes;
      if (canComputePoints) {
        totalPoints += stablefordPoints(
          score.strokes,
          hole.par,
          strokesReceived(dhc, hole.strokeIndex),
        );
      }
    }
  } else {
    // No hole metadata — sum what we can.
    for (const key of Object.keys(scores ?? {})) {
      const score = scores[key];
      if (!isSingleBallScore(score) || !score.strokes || score.strokes <= 0) continue;
      totalGross += score.strokes;
    }
  }

  const totalNet = dhc != null ? totalGross - dhc : null;
  return {
    totalGross,
    totalNet,
    totalPoints: canComputePoints ? totalPoints : null,
  };
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
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function patch(path, body) {
  if (!APPLY) return null;
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PATCH ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Cache courses so we don't refetch per scorecard on the same course.
const courseCache = new Map();
async function getCourseHoles(courseId) {
  if (courseCache.has(courseId)) return courseCache.get(courseId);
  const rows = await getJSON(`/rest/v1/courses?id=eq.${courseId}&select=holes`);
  const holes = Array.isArray(rows[0]?.holes) ? rows[0].holes : [];
  courseCache.set(courseId, holes);
  return holes;
}

const roundCache = new Map();
async function getRound(roundId) {
  if (roundCache.has(roundId)) return roundCache.get(roundId);
  const rows = await getJSON(
    `/rest/v1/rounds?id=eq.${roundId}&select=id,course_id,game_type`,
  );
  const round = rows[0] ?? null;
  roundCache.set(roundId, round);
  return round;
}

// -----------------------------------------------------------------------------
// Per-scorecard repair
// -----------------------------------------------------------------------------
async function checkAndRepair(sc) {
  const round = await getRound(sc.round_id);
  if (!round) {
    return { status: 'skipped', reason: 'round missing' };
  }

  const holes = await getCourseHoles(round.course_id);

  const expected = computeTotals(sc.scores, holes, round.game_type, sc.daily_handicap_used);

  const drift = {
    gross: expected.totalGross !== sc.total_gross,
    net: expected.totalNet != null && expected.totalNet !== sc.total_net,
    points:
      expected.totalPoints != null && expected.totalPoints !== sc.total_points,
  };

  if (!drift.gross && !drift.net && !drift.points) {
    return { status: 'clean' };
  }

  // Drift doesn't necessarily mean corruption: e.g. a legacy stroke-play
  // row where total_net was written with a raw profile HC rather than DHC.
  // For this sweep we only want to fix the total_gross drift and its
  // dependent total_net — that's the specific post-resolution bug. Skip
  // total_points drift on non-stableford and total_net drift when gross
  // itself is clean (would mean DHC changed elsewhere — out of scope).
  if (!drift.gross) {
    return {
      status: 'skipped',
      reason: 'net/points drift without gross drift — not our bug',
      before: {
        gross: sc.total_gross,
        net: sc.total_net,
        points: sc.total_points,
      },
      after: expected,
    };
  }

  const updatePayload = {
    total_gross: expected.totalGross,
  };
  if (expected.totalNet != null) {
    updatePayload.total_net = expected.totalNet;
  }
  if (expected.totalPoints != null) {
    updatePayload.total_points = expected.totalPoints;
  }

  await patch(`/rest/v1/scorecards?id=eq.${sc.id}`, updatePayload);

  return {
    status: 'fixed',
    before: {
      gross: sc.total_gross,
      net: sc.total_net,
      points: sc.total_points,
    },
    after: expected,
    gameType: round.game_type,
  };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log('=== Scorecard total drift repair ===');
  console.log(APPLY ? '(APPLYING changes)' : '(DRY RUN — use --apply to write)');
  if (ROUND_FILTER) console.log(`Round filter: ${ROUND_FILTER}`);
  if (PLAYER_FILTER) console.log(`Player filter: ${PLAYER_FILTER}`);
  if (LIMIT !== Infinity) console.log(`Limit: ${LIMIT}`);
  console.log('');

  // Build query — scope to completed/confirmed scorecards so we don't
  // touch in-progress rounds.
  const filters = ['status=in.(completed,confirmed)'];
  if (ROUND_FILTER) filters.push(`round_id=eq.${ROUND_FILTER}`);
  if (PLAYER_FILTER) filters.push(`player_id=eq.${PLAYER_FILTER}`);

  const selectCols =
    'id,round_id,player_id,scores,total_gross,total_net,total_points,daily_handicap_used';
  const path = `/rest/v1/scorecards?${filters.join('&')}&select=${selectCols}&order=updated_at.desc`;

  console.log('Fetching candidate scorecards...');
  const rows = await getJSON(path);
  console.log(`Found ${rows.length} scorecards in scope`);
  console.log('');

  const results = { clean: 0, fixed: 0, skipped: 0, failed: 0, reasons: {} };
  let processed = 0;

  for (const sc of rows) {
    if (processed >= LIMIT) break;
    processed++;
    const tag = `[${processed}] ${sc.id.slice(0, 8)} round=${sc.round_id.slice(0, 8)}`;
    try {
      const r = await checkAndRepair(sc);
      if (r.status === 'clean') {
        results.clean++;
        // Quiet on clean rows unless we're narrowed to one round.
        if (ROUND_FILTER) console.log(`${tag} CLEAN`);
      } else if (r.status === 'fixed') {
        results.fixed++;
        const b = r.before;
        const a = r.after;
        console.log(
          `${tag} FIX  — gross ${b.gross}→${a.totalGross}` +
            (a.totalNet != null ? `  net ${b.net}→${a.totalNet}` : '') +
            (a.totalPoints != null ? `  pts ${b.points}→${a.totalPoints}` : '') +
            `  (${r.gameType})`,
        );
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
  console.log(`  Processed: ${processed}`);
  console.log(`  Clean:     ${results.clean}`);
  console.log(`  Fixed:     ${results.fixed}`);
  console.log(`  Skipped:   ${results.skipped}`);
  if (results.skipped > 0) {
    for (const [reason, count] of Object.entries(results.reasons)) {
      console.log(`    - ${reason}: ${count}`);
    }
  }
  console.log(`  Failed:    ${results.failed}`);
  if (!APPLY) {
    console.log('\n(DRY RUN — nothing was written. Re-run with --apply to commit.)');
  }
}

main().catch((err) => {
  console.error('REPAIR FAILED:', err);
  process.exit(1);
});
