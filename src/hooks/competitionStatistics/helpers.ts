/**
 * Competition Statistics — Aggregation Helpers
 *
 * Pure functions that turn a list of scorecards into per-player accumulators,
 * then turn those accumulators into ranked categories for the Stats tab.
 *
 * Design notes:
 * - Scramble rounds are excluded upstream (no individual hole scores).
 * - Pickup scores (strokes >= PICKUP_SCORE) are excluded from birdie/par/bogey
 *   counts but DO contribute to the total stroke count for "Best Single Round".
 * - Rate-based categories (FIR%, GIR%, Avg Putts/Round) require a minimum
 *   number of opportunities to qualify, so a player with one tracked fairway
 *   doesn't appear at "100% FIR".
 */

import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole, HoleScore } from '@/types';
import { netStrokesForHole, bucketForNetScore, type ScoreBucket } from './netScore';
import type {
  Category,
  CategoryGroup,
  CategoryGroupKey,
  CategoryKey,
  PlayerEntry,
  RankGroup,
  ScoringMode,
} from './types';

/**
 * Minimum opportunities required for a rate-based category to qualify.
 * Roughly "half a round" — keeps partial-data players out of the leaderboards
 * while still including people who've only played one 9-hole round.
 */
const MIN_RATE_OPPORTUNITIES = 9;

/**
 * Per-player accumulator built up as we iterate over scorecards.
 * All fields reset to 0; we only record data for players who actually
 * appear in the competition's scorecards.
 */
export interface PlayerAccumulator {
  playerId: string;
  playerName: string;
  handicap: number;

  // Scoring — gross buckets
  grossBirdiesOrBetter: number;
  grossEaglesOrBetter: number;
  grossPars: number;
  grossBogeysOrWorse: number;

  // Scoring — net buckets
  netBirdiesOrBetter: number;
  netEaglesOrBetter: number;
  netPars: number;
  netBogeysOrWorse: number;

  // Best single round (lowest)
  bestRoundGross: number | null;
  bestRoundNet: number | null;

  // Putting
  totalPutts: number;
  holesWithPuttsRecorded: number;
  roundsWithPutts: Set<string>; // scorecard ids with any putts data
  onePutts: number;
  threePuttsOrWorse: number;

  // Fairways
  fairwaysHit: number;
  fairwayOpportunities: number;

  // Greens in regulation
  girHit: number;
  girOpportunities: number;

  // Bunkers
  bunkerShots: number;
  hasBunkerData: boolean;

  // Hazards
  hazardCount: number;
  hasHazardData: boolean;
}

/**
 * Minimal scorecard shape needed for aggregation. Kept loose so the Supabase
 * join response can be narrowed to it without a cast to `any`.
 */
export interface AggregatableScorecard {
  id: string;
  player_id: string;
  playerName: string;
  playerHandicap: number;
  holes: Hole[];
  scores: Record<string, HoleScore>;
}

/**
 * Bucket a gross strokes value vs par. Mirrors `bucketForNetScore` but for
 * gross — excludes pickup scores (strokes >= PICKUP_SCORE) from all buckets
 * so a picked-up hole doesn't look like a triple bogey.
 */
function bucketForGrossScore(strokes: number, par: number): ScoreBucket | null {
  if (strokes >= PICKUP_SCORE) return null;
  const diff = strokes - par;
  if (diff <= -2) return 'eagleOrBetter';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  return 'doublePlus';
}

/**
 * Walk a scorecard's hole scores, updating the per-player accumulator in place.
 */
export function accumulateScorecard(
  acc: PlayerAccumulator,
  scorecard: AggregatableScorecard
): void {
  const parByHole = new Map<number, Hole>();
  scorecard.holes.forEach((h) => parByHole.set(h.number, h));

  let roundGross = 0;
  let roundNet = 0;
  let roundHolesCounted = 0;
  let roundHasPutts = false;

  Object.entries(scorecard.scores).forEach(([holeNumStr, holeScore]) => {
    if (!holeScore || typeof holeScore.strokes !== 'number') return;
    const holeNum = parseInt(holeNumStr, 10);
    const hole = parByHole.get(holeNum);
    if (!hole) return;

    const strokes = holeScore.strokes;
    const par = hole.par;

    // Best single round — totals include pickups so partial cards still have
    // a meaningful gross. Players with fewer holes will naturally have lower
    // totals; we gate the "best single round" category to scorecards that
    // covered the full hole count of the round's course below.
    roundGross += strokes;
    roundNet += netStrokesForHole(strokes, acc.handicap, hole);
    roundHolesCounted += 1;

    // Gross buckets (skip pickups)
    const grossBucket = bucketForGrossScore(strokes, par);
    if (grossBucket === 'eagleOrBetter') {
      acc.grossEaglesOrBetter += 1;
      acc.grossBirdiesOrBetter += 1;
    } else if (grossBucket === 'birdie') {
      acc.grossBirdiesOrBetter += 1;
    } else if (grossBucket === 'par') {
      acc.grossPars += 1;
    } else if (grossBucket === 'bogey' || grossBucket === 'doublePlus') {
      acc.grossBogeysOrWorse += 1;
    }

    // Net buckets — always computed; pickups would be misleading here too,
    // so we skip them. A pickup hole doesn't count as a net birdie either.
    if (strokes < PICKUP_SCORE) {
      const netStrokes = netStrokesForHole(strokes, acc.handicap, hole);
      const netBucket = bucketForNetScore(netStrokes, par);
      if (netBucket === 'eagleOrBetter') {
        acc.netEaglesOrBetter += 1;
        acc.netBirdiesOrBetter += 1;
      } else if (netBucket === 'birdie') {
        acc.netBirdiesOrBetter += 1;
      } else if (netBucket === 'par') {
        acc.netPars += 1;
      } else if (netBucket === 'bogey' || netBucket === 'doublePlus') {
        acc.netBogeysOrWorse += 1;
      }
    }

    // Putts
    if (typeof holeScore.putts === 'number' && holeScore.putts >= 0) {
      acc.totalPutts += holeScore.putts;
      acc.holesWithPuttsRecorded += 1;
      roundHasPutts = true;
      if (holeScore.putts === 1) acc.onePutts += 1;
      if (holeScore.putts >= 3) acc.threePuttsOrWorse += 1;
    }

    // FIR — only on par 4+ holes
    if (par >= 4 && typeof holeScore.fairwayHit === 'boolean') {
      acc.fairwayOpportunities += 1;
      if (holeScore.fairwayHit) acc.fairwaysHit += 1;
    }

    // GIR — applicable to all holes
    if (typeof holeScore.greenInRegulation === 'boolean') {
      acc.girOpportunities += 1;
      if (holeScore.greenInRegulation) acc.girHit += 1;
    }

    // Bunkers
    if (typeof holeScore.bunkerShots === 'number') {
      acc.bunkerShots += holeScore.bunkerShots;
      acc.hasBunkerData = true;
    }

    // Hazards
    if (Array.isArray(holeScore.hazards)) {
      acc.hazardCount += holeScore.hazards.length;
      acc.hasHazardData = true;
    }
  });

  // Only update best round if this scorecard covered the full course.
  // This avoids a 9-hole-in-progress card showing up as the "best 18-hole"
  // total. A scorecard that recorded all holes in `scorecard.holes` is
  // considered complete for this purpose.
  if (roundHolesCounted > 0 && roundHolesCounted === scorecard.holes.length) {
    if (acc.bestRoundGross === null || roundGross < acc.bestRoundGross) {
      acc.bestRoundGross = roundGross;
    }
    if (acc.bestRoundNet === null || roundNet < acc.bestRoundNet) {
      acc.bestRoundNet = roundNet;
    }
  }

  if (roundHasPutts) acc.roundsWithPutts.add(scorecard.id);
}

/**
 * Shape for a single category's raw rankable values (before grouping into
 * tied ranks).
 */
interface Rankable {
  playerId: string;
  playerName: string;
  value: number;
  displayValue: string;
}

/**
 * Group a sorted list of rankables into tied-rank groups.
 * Expects the list to already be ordered "best first" for the category.
 */
function groupByTies(sorted: Rankable[]): RankGroup[] {
  const out: RankGroup[] = [];
  let i = 0;
  while (i < sorted.length) {
    const current = sorted[i];
    const tiedPlayers: PlayerEntry[] = [];
    let j = i;
    while (j < sorted.length && sorted[j].value === current.value) {
      tiedPlayers.push({
        playerId: sorted[j].playerId,
        playerName: sorted[j].playerName,
        value: sorted[j].value,
        displayValue: sorted[j].displayValue,
      });
      j += 1;
    }
    out.push({
      rank: i + 1,
      value: current.value,
      displayValue: current.displayValue,
      players: tiedPlayers,
    });
    i = j;
  }
  return out;
}

function formatInt(n: number): string {
  return `${Math.round(n)}`;
}

function formatPercent(n: number): string {
  return `${Math.round(n * 10) / 10}%`;
}

function formatOneDp(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/**
 * Build a category from a list of (player, numeric value, display value)
 * triples, filtered by a qualify predicate and sorted by `direction`.
 * Returns `null` when no players qualified — caller drops empty categories.
 */
function buildCategory(
  key: CategoryKey,
  label: string,
  icon: string,
  tone: Category['tone'],
  players: PlayerAccumulator[],
  pick: (p: PlayerAccumulator) => { value: number; displayValue: string } | null,
  direction: 'desc' | 'asc'
): Category | null {
  const rankables: Rankable[] = [];
  for (const p of players) {
    const picked = pick(p);
    if (!picked) continue;
    rankables.push({
      playerId: p.playerId,
      playerName: p.playerName,
      value: picked.value,
      displayValue: picked.displayValue,
    });
  }
  if (rankables.length === 0) return null;

  rankables.sort((a, b) => (direction === 'desc' ? b.value - a.value : a.value - b.value));

  return {
    key,
    label,
    icon,
    tone,
    ranks: groupByTies(rankables),
  };
}

/**
 * Assemble the Scoring category group for a given mode (gross or net).
 */
function buildScoringGroup(
  players: PlayerAccumulator[],
  mode: ScoringMode
): CategoryGroup | null {
  const get = mode === 'gross'
    ? {
        birdies: (p: PlayerAccumulator) => p.grossBirdiesOrBetter,
        eagles: (p: PlayerAccumulator) => p.grossEaglesOrBetter,
        pars: (p: PlayerAccumulator) => p.grossPars,
        bogeys: (p: PlayerAccumulator) => p.grossBogeysOrWorse,
        bestRound: (p: PlayerAccumulator) => p.bestRoundGross,
      }
    : {
        birdies: (p: PlayerAccumulator) => p.netBirdiesOrBetter,
        eagles: (p: PlayerAccumulator) => p.netEaglesOrBetter,
        pars: (p: PlayerAccumulator) => p.netPars,
        bogeys: (p: PlayerAccumulator) => p.netBogeysOrWorse,
        bestRound: (p: PlayerAccumulator) => p.bestRoundNet,
      };

  const categories: Category[] = [];

  const birdies = buildCategory(
    'mostBirdiesOrBetter',
    'Most Birdies or Better',
    'golf-tee',
    'birdie',
    players,
    (p) => {
      const v = get.birdies(p);
      if (v <= 0) return null;
      return { value: v, displayValue: formatInt(v) };
    },
    'desc'
  );
  if (birdies) categories.push(birdies);

  const eagles = buildCategory(
    'mostEaglesOrBetter',
    'Most Eagles or Better',
    'bird',
    'eagle',
    players,
    (p) => {
      const v = get.eagles(p);
      if (v <= 0) return null;
      return { value: v, displayValue: formatInt(v) };
    },
    'desc'
  );
  if (eagles) categories.push(eagles);

  const pars = buildCategory(
    'mostPars',
    'Most Pars',
    'flag-outline',
    'par',
    players,
    (p) => {
      const v = get.pars(p);
      if (v <= 0) return null;
      return { value: v, displayValue: formatInt(v) };
    },
    'desc'
  );
  if (pars) categories.push(pars);

  const bogeys = buildCategory(
    'fewestBogeysOrWorse',
    'Fewest Bogeys or Worse',
    'shield-check-outline',
    'success',
    players,
    (p) => {
      // Only rank players who actually have scoring data (otherwise 0 looks
      // like "best" when they just haven't played).
      const hasData =
        get.birdies(p) > 0 ||
        get.pars(p) > 0 ||
        get.bogeys(p) > 0;
      if (!hasData) return null;
      const v = get.bogeys(p);
      return { value: v, displayValue: formatInt(v) };
    },
    'asc'
  );
  if (bogeys) categories.push(bogeys);

  const bestRound = buildCategory(
    'bestSingleRound',
    mode === 'gross' ? 'Best Single Round (Gross)' : 'Best Single Round (Net)',
    'trophy-outline',
    'warning',
    players,
    (p) => {
      const v = get.bestRound(p);
      if (v === null) return null;
      return { value: v, displayValue: formatInt(v) };
    },
    'asc'
  );
  if (bestRound) categories.push(bestRound);

  if (categories.length === 0) return null;

  return {
    key: 'scoring',
    title: 'Scoring',
    icon: 'golf',
    categories,
  };
}

function buildPuttingGroup(players: PlayerAccumulator[]): CategoryGroup | null {
  const categories: Category[] = [];

  const avgPutts = buildCategory(
    'fewestAvgPuttsPerRound',
    'Fewest Avg Putts / Round',
    'circle-outline',
    'success',
    players,
    (p) => {
      if (p.roundsWithPutts.size === 0) return null;
      if (p.holesWithPuttsRecorded < MIN_RATE_OPPORTUNITIES) return null;
      const avgPerRound = p.totalPutts / p.roundsWithPutts.size;
      return { value: avgPerRound, displayValue: formatOneDp(avgPerRound) };
    },
    'asc'
  );
  if (avgPutts) categories.push(avgPutts);

  const onePutts = buildCategory(
    'mostOnePutts',
    'Most 1-Putts',
    'numeric-1-circle-outline',
    'birdie',
    players,
    (p) => {
      if (p.onePutts <= 0) return null;
      return { value: p.onePutts, displayValue: formatInt(p.onePutts) };
    },
    'desc'
  );
  if (onePutts) categories.push(onePutts);

  const threePutts = buildCategory(
    'fewestThreePuttsOrWorse',
    'Fewest 3-Putts or Worse',
    'numeric-3-circle-outline',
    'success',
    players,
    (p) => {
      if (p.holesWithPuttsRecorded < MIN_RATE_OPPORTUNITIES) return null;
      return { value: p.threePuttsOrWorse, displayValue: formatInt(p.threePuttsOrWorse) };
    },
    'asc'
  );
  if (threePutts) categories.push(threePutts);

  if (categories.length === 0) return null;
  return {
    key: 'putting',
    title: 'Putting',
    icon: 'golf',
    categories,
  };
}

function buildOffTheTeeGroup(players: PlayerAccumulator[]): CategoryGroup | null {
  const fir = buildCategory(
    'bestFairwayPercentage',
    'Best FIR %',
    'arrow-right-bold',
    'success',
    players,
    (p) => {
      if (p.fairwayOpportunities < MIN_RATE_OPPORTUNITIES) return null;
      const pct = (p.fairwaysHit / p.fairwayOpportunities) * 100;
      return { value: pct, displayValue: formatPercent(pct) };
    },
    'desc'
  );
  if (!fir) return null;
  return {
    key: 'offTheTee',
    title: 'Off the Tee',
    icon: 'golf-tee',
    categories: [fir],
  };
}

function buildApproachGroup(players: PlayerAccumulator[]): CategoryGroup | null {
  const gir = buildCategory(
    'bestGirPercentage',
    'Best GIR %',
    'target',
    'success',
    players,
    (p) => {
      if (p.girOpportunities < MIN_RATE_OPPORTUNITIES) return null;
      const pct = (p.girHit / p.girOpportunities) * 100;
      return { value: pct, displayValue: formatPercent(pct) };
    },
    'desc'
  );
  if (!gir) return null;
  return {
    key: 'approach',
    title: 'Approach',
    icon: 'target',
    categories: [gir],
  };
}

function buildBunkerGroup(players: PlayerAccumulator[]): CategoryGroup | null {
  const bunkers = buildCategory(
    'fewestBunkerShots',
    'Fewest Bunker Shots',
    'beach',
    'warning',
    players,
    (p) => {
      if (!p.hasBunkerData) return null;
      return { value: p.bunkerShots, displayValue: formatInt(p.bunkerShots) };
    },
    'asc'
  );
  if (!bunkers) return null;
  return {
    key: 'bunkers',
    title: 'Bunkers',
    icon: 'beach',
    categories: [bunkers],
  };
}

function buildHazardsGroup(players: PlayerAccumulator[]): CategoryGroup | null {
  const hazards = buildCategory(
    'fewestHazards',
    'Fewest Hazards',
    'water-alert-outline',
    'warning',
    players,
    (p) => {
      if (!p.hasHazardData) return null;
      return { value: p.hazardCount, displayValue: formatInt(p.hazardCount) };
    },
    'asc'
  );
  if (!hazards) return null;
  return {
    key: 'hazards',
    title: 'Hazards',
    icon: 'water-alert-outline',
    categories: [hazards],
  };
}

/**
 * Build all category groups for a given scoring mode.
 * Putting/FIR/GIR/bunkers/hazards are unaffected by the mode; only Scoring
 * recomputes. Callers typically call this once for gross and once for net
 * then swap in the Scoring group based on the active mode.
 */
export function buildAllGroups(
  players: PlayerAccumulator[],
  mode: ScoringMode
): CategoryGroup[] {
  const order: CategoryGroupKey[] = [
    'scoring',
    'putting',
    'offTheTee',
    'approach',
    'bunkers',
    'hazards',
  ];
  const map: Partial<Record<CategoryGroupKey, CategoryGroup>> = {
    scoring: buildScoringGroup(players, mode) ?? undefined,
    putting: buildPuttingGroup(players) ?? undefined,
    offTheTee: buildOffTheTeeGroup(players) ?? undefined,
    approach: buildApproachGroup(players) ?? undefined,
    bunkers: buildBunkerGroup(players) ?? undefined,
    hazards: buildHazardsGroup(players) ?? undefined,
  };
  return order.map((k) => map[k]).filter((g): g is CategoryGroup => !!g);
}
