#!/usr/bin/env node
/**
 * Read-only inspection of a round's Wolf side-game state in prod.
 *
 * Used to diagnose why round 896ebaca-1958-4851-9eb3-392ac841deda
 * has an empty Wolf leaderboard despite Wolf being enabled and played.
 *
 * Usage:
 *   node scripts/inspect-round-wolf.mjs
 *
 * Requires env vars (read from .env at repo root):
 *   EXPO_PUBLIC_SUPABASE_URL_PROD
 *   SUPABASE_SECRET_KEY_PROD
 *
 * This script only issues GET requests; no writes.
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

const ROUND_ID = '896ebaca-1958-4851-9eb3-392ac841deda';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function getJSON(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

function shortId(id) {
  return id ? `${id.slice(0, 8)}…` : 'null';
}

async function main() {
  console.log(`=== Inspect round ${ROUND_ID} (Wolf diagnosis) ===\n`);

  // 1. Round basics
  console.log('--- 1. Round ---');
  const round = await getJSON(
    `/rest/v1/rounds?id=eq.${ROUND_ID}&select=*`
  );
  if (!round.length) {
    console.log('  NOT FOUND');
    return;
  }
  const r = round[0];
  console.log(`  status=${r.status}`);
  console.log(`  nine_type=${r.nine_type}`);
  console.log(`  game_type=${r.game_type}`);
  console.log(`  created_at=${r.created_at}`);
  console.log(`  updated_at=${r.updated_at}`);
  console.log(`  tee_time=${r.tee_time}`);
  console.log(`  course_id=${r.course_id}`);
  console.log('');

  // 2. Round players
  console.log('--- 2. Round players ---');
  const roundPlayers = await getJSON(
    `/rest/v1/round_players?round_id=eq.${ROUND_ID}&select=*`
  );
  console.log(`  ${roundPlayers.length} row(s)`);
  for (const rp of roundPlayers) {
    console.log(`  - ${shortId(rp.player_id)}  keys=${Object.keys(rp).join(',')}`);
  }
  console.log('');

  // Fetch player names for pretty printing later.
  const playerIds = roundPlayers.map((rp) => rp.player_id);
  const players = playerIds.length
    ? await getJSON(
        `/rest/v1/players?id=in.(${playerIds.join(',')})&select=id,name`
      )
    : [];
  const nameById = new Map(players.map((p) => [p.id, p.name ?? '']));

  // 3. Wolf game
  console.log('--- 3. Wolf game ---');
  const wolfGames = await getJSON(
    `/rest/v1/wolf_games?round_id=eq.${ROUND_ID}&select=*`
  );
  if (!wolfGames.length) {
    console.log('  NO WOLF GAME ROW — H1/H4 candidate (game never created).');
    return;
  }
  const game = wolfGames[0];
  console.log(`  id=${game.id}`);
  console.log(`  status=${game.status}`);
  console.log(`  scoring_type=${game.scoring_type}`);
  console.log(`  blind_wolf_enabled=${game.blind_wolf_enabled}`);
  console.log(`  pot_enabled=${game.pot_enabled}`);
  console.log(`  created_at=${game.created_at}`);
  console.log(`  updated_at=${game.updated_at}`);
  console.log(`  completed_at=${game.completed_at}`);
  console.log(`  participant_ids (${game.participant_ids.length}):`);
  for (const id of game.participant_ids) {
    const tag = roundPlayers.find((rp) => rp.player_id === id) ? 'IN round_players' : 'NOT in round_players';
    console.log(`    - ${shortId(id)}  ${nameById.get(id) ?? ''}  [${tag}]`);
  }
  console.log(`  wolf_order (${game.wolf_order.length}):`);
  game.wolf_order.forEach((id, i) => {
    console.log(`    [${i}] ${shortId(id)}  ${nameById.get(id) ?? ''}`);
  });

  // Participant vs round_players set comparison.
  const rpSet = new Set(roundPlayers.map((rp) => rp.player_id));
  const missing = game.participant_ids.filter((id) => !rpSet.has(id));
  const extra = roundPlayers.filter((rp) => !game.participant_ids.includes(rp.player_id));
  if (missing.length) {
    console.log(`  ⚠️  ${missing.length} wolf participant(s) NOT in round_players:`);
    missing.forEach((id) => console.log(`      ${shortId(id)}`));
  }
  if (extra.length) {
    console.log(`  ℹ️  ${extra.length} round player(s) NOT in wolf game (expected if they opted out)`);
  }
  console.log('');

  // 4. Wolf hole decisions
  console.log('--- 4. Wolf hole decisions ---');
  const decisions = await getJSON(
    `/rest/v1/wolf_hole_decisions?wolf_game_id=eq.${game.id}&select=*&order=hole_number.asc`
  );
  console.log(`  ${decisions.length} row(s)`);
  if (decisions.length === 0) {
    console.log('  ⚠️  ZERO hole decision rows — H1 (modal never opened) or H4 (offline writes lost).');
  } else {
    const decided = decisions.filter((d) => d.decided_at).length;
    const calculated = decisions.filter((d) => d.calculated_at).length;
    console.log(`  decided_at set: ${decided}`);
    console.log(`  calculated_at set: ${calculated}`);
    console.log('');
    console.log('  Per-hole detail:');
    console.log('  hole | dec | calc | wolf | partner    | blind | won  | tie  | points');
    console.log('  -----+-----+------+------+------------+-------+------+------+----------------');
    for (const d of decisions) {
      const dec = d.decided_at ? '✓' : ' ';
      const calc = d.calculated_at ? '✓' : ' ';
      const wolfTag = shortId(d.wolf_id);
      const partnerTag = d.partner_id ? shortId(d.partner_id) : d.is_blind_wolf ? '(blind)' : '(lone)';
      const blind = d.is_blind_wolf ? 'Y' : 'N';
      const won = d.wolf_team_won === null ? '?' : d.wolf_team_won ? 'Y' : 'N';
      const tie = d.is_tie ? 'Y' : 'N';
      const pts = d.points_awarded
        ? Object.entries(d.points_awarded)
            .map(([id, p]) => `${shortId(id)}:${p}`)
            .join(' ')
        : '—';
      console.log(
        `  ${String(d.hole_number).padStart(4)} |  ${dec}  |  ${calc}   | ${wolfTag} | ${partnerTag.padEnd(10)} |   ${blind}   |  ${won}   |  ${tie}   | ${pts}`
      );
    }
  }
  console.log('');

  // 5. Payouts
  console.log('--- 5. Wolf payouts ---');
  const payouts = await getJSON(
    `/rest/v1/wolf_payouts?wolf_game_id=eq.${game.id}&select=*`
  );
  console.log(`  ${payouts.length} row(s)`);
  for (const p of payouts) {
    console.log(
      `  - ${shortId(p.player_id)}  pts=${p.total_points}  winnings=${p.total_winnings}  net=${p.net_result}`
    );
  }
  console.log('');

  // 6. Scorecards for the round (did players actually enter strokes?)
  console.log('--- 6. Scorecard strokes per player ---');
  const scorecards = await getJSON(
    `/rest/v1/scorecards?round_id=eq.${ROUND_ID}&select=*`
  );
  console.log(`  ${scorecards.length} scorecard(s)`);
  for (const sc of scorecards) {
    const holesScored = sc.scores
      ? Object.values(sc.scores).filter(
          (s) => s && typeof s === 'object' && typeof s.strokes === 'number' && s.strokes > 0
        ).length
      : 0;
    console.log(
      `  - ${shortId(sc.player_id)}  ${nameById.get(sc.player_id) ?? ''}  holes_scored=${holesScored}  gross=${sc.total_gross}  points=${sc.total_points}`
    );
  }

  // 7. Diagnosis hint
  console.log('');
  console.log('--- 7. Diagnosis hint ---');
  if (decisions.length === 0) {
    console.log('  → Zero wolf_hole_decisions. Most likely H1 (Wolf decision sheet never opened)');
    console.log('    or H4 (offline writes lost). Ask user if they were offline.');
  } else {
    const decided = decisions.filter((d) => d.decided_at).length;
    const calculated = decisions.filter((d) => d.calculated_at).length;
    if (decided > 0 && calculated < decided) {
      console.log(`  → ${decided - calculated} decided-but-uncalculated row(s). H2 confirmed`);
      console.log('    (result writer never fired). Safe to backfill with existing utils.');
    } else if (calculated === decisions.length && decisions.length > 0) {
      console.log('  → All rows calculated. If UI shows empty, suspect query/cache layer.');
    } else {
      console.log('  → Mixed state. See per-hole detail above.');
    }
    if (missing.length) {
      console.log(`  → participant_ids mismatch (${missing.length} missing from round_players). H3 possible.`);
    }
  }
}

main().catch((err) => {
  console.error('INSPECTION FAILED:', err);
  process.exit(1);
});
