#!/usr/bin/env node
/**
 * One-off wolf-leaderboard backfill for round 896ebaca-1958-4851-9eb3-392ac841deda.
 *
 * Background: This round was played as a 3-player Wolf game (Sam / Ben / Marc)
 * but every wolf_hole_decisions row is missing (see scripts/inspect-round-wolf.mjs).
 * Inspection confirmed:
 *   - wolf_games row exists and is well-formed (status=active, participants OK)
 *   - All 3 scorecards have strokes entered for all 18 holes
 *   - Zero wolf_hole_decisions rows ever landed in prod
 *   - wolf_games.status still 'active' (auto-finalize gates on ≥18 decisions)
 * Root cause: the in-scoring Wolf decision prompt was never engaged per hole
 * (H1) and wolf mutations are not in the offline sync queue (H4 as contributing
 * factor), so nothing was ever persisted.
 *
 * Partner picks are unrecoverable from hole_scores alone. Per user direction,
 * we default every hole to "Lone Wolf" — deterministic, defensible, no points
 * awarded on anyone else's invented choices.
 *
 * What this script does:
 *   1. For each hole 1..18:
 *      a. Determine wolf_id from wolf_games.wolf_order (rotation).
 *      b. Read gross strokes for all 3 participants from their scorecards.scores JSON.
 *      c. Compute determineWolfHoleResult (lone wolf vs pack, gross scoring).
 *      d. Compute calculateWolfPoints (lone wolf: win=4pts, lose=1pt/opponent, tie=0).
 *      e. INSERT wolf_hole_decisions with decided_at+calculated_at=now, partner_id=null,
 *         is_blind_wolf=false, hole_scores, wolf_team_won/is_tie, points_awarded.
 *   2. Sum points_awarded across all 18 holes to compute final standings.
 *   3. INSERT 3 wolf_payouts rows (pot disabled → winnings=0, net_result=0).
 *   4. UPDATE wolf_games SET status='completed', completed_at=now.
 *
 * Scoring logic is ported verbatim from src/utils/wolf/scoring.ts (determineWolfHoleResult)
 * and src/utils/wolf/points.ts (calculateWolfPoints). DO NOT diverge — they must match
 * live scoring exactly.
 *
 * Usage:
 *   node scripts/backfill-wolf-round-896ebaca.mjs           # DRY RUN (default)
 *   node scripts/backfill-wolf-round-896ebaca.mjs --apply   # actually writes
 *
 * Requires env vars (read from .env at repo root):
 *   EXPO_PUBLIC_SUPABASE_URL_PROD
 *   SUPABASE_SECRET_KEY_PROD
 *
 * Delete this script after the fix is verified in the UI.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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

const ROUND_ID = '896ebaca-1958-4851-9eb3-392ac841deda';
const HOLE_COUNT = 18;

// Point values — mirror DEFAULT_WOLF_POINT_VALUES in src/utils/wolf/points.ts
const LONE_WOLF_WIN = 4;
const LONE_WOLF_LOSE_OPPONENT = 1;

// ---------------------------------------------------------------------------
// Ported logic (verbatim from src/utils/wolf/scoring.ts + points.ts)
// ---------------------------------------------------------------------------

/**
 * Lone-wolf variant: partnerId=null, scoring_type='gross'.
 * Wolf wins if wolf's gross is strictly < min(pack). Tie if equal to min. Else pack wins.
 */
function determineLoneWolfResult(wolfId, holeScores) {
  const playerIds = Object.keys(holeScores);
  if (playerIds.length < 3) throw new Error('Wolf requires 3+ players');

  const wolfScore = holeScores[wolfId];
  const packIds = playerIds.filter((id) => id !== wolfId);
  const packBest = Math.min(...packIds.map((id) => holeScores[id]));

  if (wolfScore === packBest) return { wolfTeamWon: false, isTie: true };
  return { wolfTeamWon: wolfScore < packBest, isTie: false };
}

function calculateLoneWolfPoints(wolfId, participantIds, wolfTeamWon, isTie) {
  const points = {};
  for (const id of participantIds) points[id] = 0;
  if (isTie) return points;

  if (wolfTeamWon) {
    points[wolfId] = LONE_WOLF_WIN;
  } else {
    for (const id of participantIds) {
      if (id !== wolfId) points[id] = LONE_WOLF_LOSE_OPPONENT;
    }
  }
  return points;
}

function determineWolfForHole(wolfOrder, holeNumber) {
  return wolfOrder[(holeNumber - 1) % wolfOrder.length];
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

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

async function post(path, body) {
  if (!APPLY) {
    console.log(`  [dry-run] POST ${path}`);
    console.log(`             body: ${JSON.stringify(body).slice(0, 300)}`);
    return null;
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function shortId(id) {
  return id ? `${id.slice(0, 8)}…` : 'null';
}

async function main() {
  console.log(`=== Backfill Wolf leaderboard for round ${ROUND_ID} ===`);
  console.log(APPLY ? '(APPLYING changes to prod DB)' : '(DRY RUN — no writes. Use --apply to commit.)');
  console.log('');

  // Load wolf game.
  const wolfGames = await getJSON(`/rest/v1/wolf_games?round_id=eq.${ROUND_ID}&select=*`);
  if (!wolfGames.length) throw new Error('No wolf_games row for this round');
  const game = wolfGames[0];
  console.log(`Wolf game id: ${game.id}`);
  console.log(`  status=${game.status} pot_enabled=${game.pot_enabled}`);
  console.log(`  wolf_order: ${game.wolf_order.map(shortId).join(' → ')}`);
  console.log('');

  // Safety: refuse to backfill if any decisions already exist.
  const existing = await getJSON(
    `/rest/v1/wolf_hole_decisions?wolf_game_id=eq.${game.id}&select=id`
  );
  if (existing.length > 0) {
    throw new Error(
      `ABORT: ${existing.length} wolf_hole_decisions row(s) already exist — refusing to overwrite.`
    );
  }

  // Load player names (for pretty logs).
  const players = await getJSON(
    `/rest/v1/players?id=in.(${game.participant_ids.join(',')})&select=id,name`
  );
  const nameById = new Map(players.map((p) => [p.id, p.name ?? '']));

  // Load scorecards for this round so we can read per-hole strokes.
  const scorecards = await getJSON(
    `/rest/v1/scorecards?round_id=eq.${ROUND_ID}&select=player_id,scores`
  );
  const scoresByPlayer = new Map();
  for (const sc of scorecards) {
    if (game.participant_ids.includes(sc.player_id)) {
      scoresByPlayer.set(sc.player_id, sc.scores ?? {});
    }
  }
  for (const pid of game.participant_ids) {
    if (!scoresByPlayer.has(pid)) {
      throw new Error(`Missing scorecard for participant ${pid}`);
    }
  }

  // Precompute per-hole decisions in memory.
  const decisionsToInsert = [];
  const standings = {};
  for (const id of game.participant_ids) standings[id] = 0;

  console.log('Per-hole calculation:');
  console.log('hole | wolf             | wolfScore | pack scores     | result      | points');
  console.log('-----+------------------+-----------+-----------------+-------------+----------------');

  for (let hole = 1; hole <= HOLE_COUNT; hole++) {
    const wolfId = determineWolfForHole(game.wolf_order, hole);

    // Gather strokes for every participant on this hole.
    const holeScores = {};
    for (const pid of game.participant_ids) {
      const playerScores = scoresByPlayer.get(pid);
      const entry = playerScores?.[String(hole)];
      const strokes = entry && typeof entry === 'object' ? entry.strokes : null;
      if (strokes == null || strokes <= 0) {
        throw new Error(
          `Missing strokes for player ${pid} on hole ${hole} — cannot backfill`
        );
      }
      holeScores[pid] = strokes;
    }

    // Run result + points through the ported logic.
    const result = determineLoneWolfResult(wolfId, holeScores);
    const pointsAwarded = calculateLoneWolfPoints(
      wolfId,
      game.participant_ids,
      result.wolfTeamWon,
      result.isTie
    );

    for (const [pid, pts] of Object.entries(pointsAwarded)) {
      standings[pid] += pts;
    }

    // Pretty print.
    const packTag = game.participant_ids
      .filter((id) => id !== wolfId)
      .map((id) => `${(nameById.get(id) ?? '').slice(0, 4)}=${holeScores[id]}`)
      .join(' ');
    const resultTag = result.isTie
      ? 'TIE'
      : result.wolfTeamWon
        ? 'WOLF WIN  '
        : 'PACK WIN  ';
    const pointsTag = Object.entries(pointsAwarded)
      .filter(([, p]) => p > 0)
      .map(([id, p]) => `${(nameById.get(id) ?? '').slice(0, 4)}+${p}`)
      .join(' ') || '—';
    console.log(
      `  ${String(hole).padStart(2)} | ${(nameById.get(wolfId) ?? '').padEnd(16)} |     ${holeScores[wolfId]}     | ${packTag.padEnd(15)} | ${resultTag} | ${pointsTag}`
    );

    decisionsToInsert.push({
      wolf_game_id: game.id,
      hole_number: hole,
      wolf_id: wolfId,
      partner_id: null,
      is_blind_wolf: false,
      hole_scores: holeScores,
      is_tie: result.isTie,
      wolf_team_won: result.isTie ? null : result.wolfTeamWon,
      points_awarded: pointsAwarded,
      decided_at: new Date().toISOString(),
      calculated_at: new Date().toISOString(),
    });
  }

  console.log('');
  console.log('Final standings:');
  for (const [pid, pts] of Object.entries(standings)) {
    console.log(`  ${(nameById.get(pid) ?? '').padEnd(16)} ${pts} pts`);
  }
  console.log('');

  // Step 1: insert all 18 decisions in one batch POST.
  console.log('Step 1: Insert wolf_hole_decisions (18 rows)');
  await post(`/rest/v1/wolf_hole_decisions`, decisionsToInsert);
  console.log('');

  // Step 2: insert payouts (pot disabled → winnings/net = 0).
  console.log('Step 2: Insert wolf_payouts');
  const nowIso = new Date().toISOString();
  const payoutRows = game.participant_ids.map((pid) => ({
    wolf_game_id: game.id,
    player_id: pid,
    total_points: standings[pid],
    total_winnings: 0,
    net_result: 0,
    calculated_at: nowIso,
  }));
  await post(`/rest/v1/wolf_payouts`, payoutRows);
  console.log('');

  // Step 3: mark game as completed.
  console.log('Step 3: Mark wolf_games as completed');
  await patch(`/rest/v1/wolf_games?id=eq.${game.id}`, {
    status: 'completed',
    completed_at: nowIso,
  });
  console.log('');

  console.log(APPLY ? 'DONE — re-run scripts/inspect-round-wolf.mjs to verify, then check the app.' : 'DRY RUN complete. Re-run with --apply to write.');
}

main().catch((err) => {
  console.error('BACKFILL FAILED:', err);
  process.exit(1);
});
