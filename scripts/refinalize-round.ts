/**
 * Re-finalize a single round's `round_results` on staging.
 *
 * Applies the same logic as the app's finalize pipeline for an
 * individual + pair-points split round (e.g. Pairs Better Ball):
 *   - Individual rows: each player's stableford total → position-based
 *     competition points (via the shared calculateCompetitionPoints).
 *   - Team rows: pair points per competition team, with sub-match outcomes
 *     resolved from scorecards via the shared pair-points helpers.
 *
 * Uses the secret key (bypasses RLS) — operational one-off, not the app client.
 *
 * Usage:
 *   npx tsx scripts/refinalize-round.ts <roundId>            # dry run
 *   npx tsx scripts/refinalize-round.ts <roundId> --confirm  # write rows
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

import { calculateCompetitionPoints } from '@/utils/competitionPoints/calculations';
import {
  resolveSubMatchOutcomeFromScores,
  deriveSideTeamIds,
} from '@/services/rounds/pairPointsCalculation';

const roundId = process.argv[2];
const CONFIRM = process.argv.includes('--confirm');

if (!roundId) {
  console.error('Usage: npx tsx scripts/refinalize-round.ts <roundId> [--confirm]');
  process.exit(1);
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY!;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY');
  process.exit(1);
}
if (url.includes('prod')) {
  console.error('Refusing to run against a prod-looking URL');
  process.exit(1);
}

const sb = createClient(url, key);

// ---- inlined scoring math (kept dependency-free for tsx) -------------------
function getStrokesReceived(handicap: number, strokeIndex: number): number {
  if (handicap <= 0) return 0;
  return Math.floor(handicap / 18) + (strokeIndex <= handicap % 18 ? 1 : 0);
}
function stablefordNet(strokes: number, par: number, strokesReceived: number): number {
  const rel = strokes - strokesReceived - par;
  if (rel <= -3) return 5;
  if (rel === -2) return 4;
  if (rel === -1) return 3;
  if (rel === 0) return 2;
  if (rel === 1) return 1;
  return 0;
}
const PICKUP_SCORE = 10;

type AnyHole = { number: number; par: number; strokeIndex: number };
function getHoleGross(scores: any, holeNumber: number): number | null {
  if (!scores) return null;
  const e = scores[String(holeNumber)];
  if (!e) return null;
  if ('balls' in e && Array.isArray(e.balls)) {
    const f = e.balls[0];
    return typeof f?.strokes === 'number' ? f.strokes : null;
  }
  return typeof e.strokes === 'number' ? e.strokes : null;
}

async function main() {
  console.log(`\n=== Re-finalize round ${roundId} ${CONFIRM ? '(LIVE)' : '(dry run)'} ===\n`);

  const { data: round } = await sb
    .from('rounds')
    .select('id, game_type, round_format, team1_id, team2_id, team_format, competition_id, course_id, rules_override')
    .eq('id', roundId)
    .single();
  if (!round) throw new Error('round not found');
  console.log('round:', { game_type: round.game_type, round_format: round.round_format, team_format: round.team_format });
  const override = round.rules_override as any;
  const pairPoints = override?.pair_points as { win: number; tie: number; loss: number } | undefined;

  const { data: comp } = await sb
    .from('competitions')
    .select('point_system')
    .eq('id', round.competition_id)
    .single();
  const pointSystem = (comp?.point_system as any) ?? { type: 'position', rules: { default: 0 } };
  // Convert the {1:10,2:8,...,default:0} position map into PointSystemRules
  // ({ positionPoints: number[], defaultPoints }) expected by the calculator.
  const rawRules = (pointSystem.rules ?? {}) as Record<string, number>;
  const positionPoints: number[] = [];
  for (let p = 1; rawRules[String(p)] !== undefined; p++) positionPoints.push(rawRules[String(p)]);
  const pointRules = { positionPoints, defaultPoints: rawRules.default ?? 0, matchPlay: pointSystem.matchPlay };

  const { data: scorecards } = await sb
    .from('scorecards')
    .select('player_id, scores, total_points, daily_handicap_used, status')
    .eq('round_id', roundId)
    .eq('status', 'completed');
  console.log(`completed scorecards: ${scorecards?.length ?? 0}`);

  const { data: course } = await sb
    .from('courses')
    .select('holes')
    .eq('id', round.course_id)
    .single();
  const holes = (course?.holes as AnyHole[]) ?? [];

  const { data: teamsRaw } = await sb
    .from('teams')
    .select('id, name, team_members(player_id)')
    .eq('competition_id', round.competition_id);
  const teams = (teamsRaw ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    memberIds: (t.team_members ?? []).map((m: any) => m.player_id),
  }));

  const { data: subMatches } = await sb
    .from('sub_matches')
    .select('*')
    .eq('round_id', roundId);

  // ---- INDIVIDUAL ROWS ----------------------------------------------------
  const indResults = (scorecards ?? []).map((sc: any) => ({
    participantId: sc.player_id as string,
    rawScore: sc.total_points as number,
    tied: false,
    position: 0,
  }));
  const scored = calculateCompetitionPoints(indResults as any, round.game_type as any, pointRules as any);
  const individualRows = scored.map((s: any) => ({
    round_id: roundId,
    player_id: s.participantId,
    team_id: null,
    raw_score: s.rawScore,
    raw_result_data: { stableford_points: s.rawScore },
    position: s.position,
    competition_points: s.competitionPoints,
    is_team_result: false,
  }));

  console.log('\nIndividual rows:');
  // diagnostic: confirm per-hole stableford (daily_handicap_used) reconstructs total_points
  for (const sc of scorecards ?? []) {
    let recomputed = 0;
    for (const h of holes) {
      const g = getHoleGross(sc.scores, h.number);
      if (g == null) continue;
      recomputed += stablefordNet(g, h.par, getStrokesReceived(sc.daily_handicap_used ?? 0, h.strokeIndex));
    }
    const tname = teams.find((t) => t.memberIds.includes(sc.player_id))?.name ?? '?';
    const match = recomputed === sc.total_points ? 'OK' : `MISMATCH(stored ${sc.total_points})`;
    console.log(`  ${sc.player_id.slice(0, 8)} [${tname}] total_points=${sc.total_points} recomputed=${recomputed} ${match}`);
  }
  individualRows
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .forEach((r) => console.log(`  pos ${r.position} player ${r.player_id.slice(0, 8)} pts ${r.competition_points} (stbl ${r.raw_score})`));

  // ---- TEAM (PAIR-POINTS) ROWS -------------------------------------------
  const teamRows: any[] = [];
  if (pairPoints && round.round_format === 'split') {
    const byPlayer = new Map<string, any>();
    for (const sc of scorecards ?? []) byPlayer.set(sc.player_id, sc);
    const higherBetter = round.game_type === 'stableford' || round.game_type === 'par';
    const getHoleValue = (playerId: string, hole: AnyHole): number | null => {
      const sc = byPlayer.get(playerId);
      if (!sc) return null;
      const strokes = getHoleGross(sc.scores, hole.number);
      if (strokes == null || strokes === PICKUP_SCORE) return null;
      const sr = getStrokesReceived(sc.daily_handicap_used ?? 0, hole.strokeIndex);
      if (round.game_type === 'stableford') return stablefordNet(strokes, hole.par, sr);
      return strokes - sr;
    };

    const teamPoints = new Map<string, number>();
    const add = (id: string, p: number) => teamPoints.set(id, (teamPoints.get(id) ?? 0) + p);
    let decided = 0;
    console.log('\nSub-matches:');
    for (const sm of subMatches ?? []) {
      const sides =
        round.team1_id && round.team2_id
          ? { sideATeamId: round.team1_id, sideBTeamId: round.team2_id }
          : deriveSideTeamIds({
              teamAPlayerIds: sm.team_a_player_ids,
              teamBPlayerIds: sm.team_b_player_ids,
              teams,
            });
      if (!sides) {
        console.log(`  SM#${sm.sort_order}: cannot resolve teams — skipped`);
        continue;
      }
      // persisted result first
      let outcome: 'a-wins' | 'b-wins' | 'halved' | null = null;
      if ((sm.status === 'completed' || sm.status === 'forfeited') && sm.result) {
        outcome = sm.result === 'a-wins' || sm.result === 'forfeit-b' ? 'a-wins'
          : sm.result === 'b-wins' || sm.result === 'forfeit-a' ? 'b-wins'
          : sm.result === 'halved' ? 'halved' : null;
      }
      if (!outcome) {
        outcome = resolveSubMatchOutcomeFromScores({
          teamAPlayerIds: sm.team_a_player_ids,
          teamBPlayerIds: sm.team_b_player_ids,
          holes: holes as any,
          getHoleValue: getHoleValue as any,
          higherIsBetter: higherBetter,
        });
      }
      const aName = teams.find((t) => t.id === sides.sideATeamId)?.name ?? sides.sideATeamId.slice(0, 8);
      const bName = teams.find((t) => t.id === sides.sideBTeamId)?.name ?? sides.sideBTeamId.slice(0, 8);
      console.log(`  SM#${sm.sort_order}: ${aName} vs ${bName} → ${outcome ?? 'undecided'}`);
      if (!outcome) continue;
      decided += 1;
      if (outcome === 'a-wins') { add(sides.sideATeamId, pairPoints.win); add(sides.sideBTeamId, pairPoints.loss); }
      else if (outcome === 'b-wins') { add(sides.sideATeamId, pairPoints.loss); add(sides.sideBTeamId, pairPoints.win); }
      else { add(sides.sideATeamId, pairPoints.tie); add(sides.sideBTeamId, pairPoints.tie); }
    }

    if (decided > 0) {
      const ranked = [...teamPoints.entries()].sort((a, b) => b[1] - a[1]);
      let position = 0, prev: number | null = null;
      ranked.forEach(([teamId, points], i) => {
        if (prev === null || points < prev) { position = i + 1; prev = points; }
        teamRows.push({
          round_id: roundId, player_id: null, team_id: teamId,
          raw_score: points, raw_result_data: { team_score: points },
          position, competition_points: points, is_team_result: true,
        });
      });
    }
    console.log('\nTeam rows:');
    teamRows.forEach((r) => {
      const tn = teams.find((t) => t.id === r.team_id)?.name ?? r.team_id.slice(0, 8);
      console.log(`  pos ${r.position} ${tn} pair-points ${r.competition_points}`);
    });
  }

  const allRows = [...individualRows, ...teamRows];
  console.log(`\nTotal rows to write: ${allRows.length} (${individualRows.length} individual + ${teamRows.length} team)`);

  if (!CONFIRM) {
    console.log('\nDry run — pass --confirm to write. No changes made.\n');
    return;
  }

  const { error: delErr } = await sb.from('round_results').delete().eq('round_id', roundId);
  if (delErr) throw delErr;
  const { error: insErr } = await sb.from('round_results').insert(allRows);
  if (insErr) throw insErr;
  console.log('\n✅ round_results rewritten.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
