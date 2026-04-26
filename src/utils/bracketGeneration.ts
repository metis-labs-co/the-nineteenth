/**
 * Bracket Generation Utilities
 *
 * Algorithms for building knockout tournament brackets:
 * - Single elimination main bracket
 * - Full consolation bracket (all losers enter)
 * - Standard seeding (1v8, 2v7, etc.)
 */

import type {
  BracketType,
  KnockoutMatchStatus,
  KnockoutMatchWithPlayers,
  BracketStage,
  BracketData,
  BracketSeedingStyle,
  ValidPlayerCount,
  SeedingMethod,
  GameType,
} from '@/types/database';

// =====================================================
// TYPES
// =====================================================

export interface SeededPlayer {
  playerId: string;
  seed: number;
  name: string;
  handicap: number | null;
}

export interface BracketMatchSlot {
  bracketType: BracketType;
  stage: number;
  bracketPosition: number;
  player1Seed: number | null;
  player2Seed: number | null;
  nextMatchPosition: number | null;
  nextMatchSlot: 1 | 2 | null;
  consolationMatchPosition: number | null;
  consolationMatchSlot: 1 | 2 | null;
  status: KnockoutMatchStatus;
}

// =====================================================
// SEEDING
// =====================================================

/**
 * Generate seeded player list.
 * - handicap:   sort by handicap (lowest = seed 1)
 * - random:     shuffle randomly
 * - qualifying: use the `preOrdered` array verbatim (caller has already
 *               sorted by qualifying-round standings — see
 *               `getQualifyingStandings` in services/api/knockout.ts).
 */
export function generateSeedings(
  players: { id: string; name: string; handicap: number | null }[],
  method: SeedingMethod,
  preOrdered?: { id: string; name: string; handicap: number | null }[]
): SeededPlayer[] {
  let sorted: { id: string; name: string; handicap: number | null }[];

  if (method === 'qualifying') {
    // Caller pre-sorts by qualifying metric. If they forget, fall back to
    // handicap so we never emit an unseeded bracket.
    sorted = preOrdered && preOrdered.length > 0 ? [...preOrdered] : [...players];
    if (!preOrdered || preOrdered.length === 0) {
      sorted.sort((a, b) => {
        if (a.handicap == null && b.handicap == null) return 0;
        if (a.handicap == null) return 1;
        if (b.handicap == null) return -1;
        return a.handicap - b.handicap;
      });
    }
  } else if (method === 'handicap') {
    sorted = [...players].sort((a, b) => {
      if (a.handicap == null && b.handicap == null) return 0;
      if (a.handicap == null) return 1;
      if (b.handicap == null) return -1;
      return a.handicap - b.handicap;
    });
  } else {
    // Fisher-Yates shuffle
    sorted = [...players];
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }

  return sorted.map((p, i) => ({
    playerId: p.id,
    seed: i + 1,
    name: p.name,
    handicap: p.handicap,
  }));
}

// =====================================================
// BRACKET STRUCTURE
// =====================================================

/**
 * Standard seeding matchups for first round.
 * For 8 players: (1v8, 4v5, 2v7, 3v6) — ensures top seeds don't meet until later rounds.
 */
function getStandardFirstRoundMatchups(playerCount: ValidPlayerCount): [number, number][] {
  // Standard bracket ordering ensures top seeds are on opposite sides
  const matchups: Record<ValidPlayerCount, [number, number][]> = {
    4: [
      [1, 4],
      [2, 3],
    ],
    8: [
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ],
    16: [
      [1, 16], [8, 9],
      [4, 13], [5, 12],
      [2, 15], [7, 10],
      [3, 14], [6, 11],
    ],
    32: [
      [1, 32], [16, 17], [8, 25], [9, 24],
      [4, 29], [13, 20], [5, 28], [12, 21],
      [2, 31], [15, 18], [7, 26], [10, 23],
      [3, 30], [14, 19], [6, 27], [11, 22],
    ],
  };
  return matchups[playerCount];
}

/**
 * Adjacent seeding matchups for first round.
 * For 8 players: (1v2, 3v4, 5v6, 7v8) — pairs closely-matched seeds, no
 * "top seed rewarded" structure. Used for social / friendly formats where
 * every match should be competitive.
 *
 * The bracket tree itself (winner-advance links) stays the same — only the
 * first-round pairings differ from standard.
 */
function getAdjacentFirstRoundMatchups(playerCount: ValidPlayerCount): [number, number][] {
  const pairs: [number, number][] = [];
  for (let seed = 1; seed <= playerCount; seed += 2) {
    pairs.push([seed, seed + 1]);
  }
  return pairs;
}

function getFirstRoundMatchups(
  playerCount: ValidPlayerCount,
  style: BracketSeedingStyle = 'standard'
): [number, number][] {
  return style === 'adjacent'
    ? getAdjacentFirstRoundMatchups(playerCount)
    : getStandardFirstRoundMatchups(playerCount);
}

/**
 * Build the complete bracket structure for a given player count.
 * Returns all match slots for both main and consolation brackets.
 *
 * @param style 'standard' (default, classic knockout) or 'adjacent' (closely-
 *              matched pairings for social play — requires advanced_round_rules
 *              feature at edit time but honored here unconditionally).
 */
export function buildBracketStructure(
  playerCount: ValidPlayerCount,
  style: BracketSeedingStyle = 'standard'
): BracketMatchSlot[] {
  const totalMainStages = Math.log2(playerCount); // e.g. 3 for 8 players
  const matches: BracketMatchSlot[] = [];

  // --- MAIN BRACKET ---
  const firstRoundMatchups = getFirstRoundMatchups(playerCount, style);
  const mainMatchCountByStage: number[] = [];

  for (let stage = 0; stage < totalMainStages; stage++) {
    const matchCount = playerCount / Math.pow(2, stage + 1);
    mainMatchCountByStage.push(matchCount);

    for (let pos = 0; pos < matchCount; pos++) {
      const isFirstRound = stage === 0;
      const isFinal = stage === totalMainStages - 1;

      const match: BracketMatchSlot = {
        bracketType: 'main',
        stage,
        bracketPosition: pos,
        player1Seed: isFirstRound ? firstRoundMatchups[pos][0] : null,
        player2Seed: isFirstRound ? firstRoundMatchups[pos][1] : null,
        nextMatchPosition: isFinal ? null : Math.floor(pos / 2),
        nextMatchSlot: isFinal ? null : ((pos % 2) + 1) as 1 | 2,
        consolationMatchPosition: null, // Set below
        consolationMatchSlot: null,
        status: isFirstRound ? 'ready' : 'pending',
      };
      matches.push(match);
    }
  }

  // --- CONSOLATION BRACKET ---
  // Consolation receives losers from main bracket, staggered by one stage.
  // Stage mapping: main stage 0 losers → consolation stage 1
  //                main stage 1 losers → consolation stage 2 (mixed with con R1 winners)
  // For 8 players:
  //   Con stage 1: 2 matches (4 QF losers)
  //   Con stage 2: 2 matches (2 SF losers + 2 con R1 winners)
  //   Con stage 3: 1 match (con final)
  const totalConStages = totalMainStages; // same count but offset by 1

  for (let conStage = 1; conStage <= totalConStages; conStage++) {
    let matchCount: number;

    if (conStage === 1) {
      // First consolation round: half the first-round losers pair up
      matchCount = playerCount / 4;
    } else if (conStage < totalConStages) {
      // Middle consolation rounds: main losers meet consolation winners
      matchCount = matchCount = playerCount / Math.pow(2, conStage + 1) * 2;
    } else {
      // Consolation final
      matchCount = 1;
    }

    for (let pos = 0; pos < matchCount; pos++) {
      const isConFinal = conStage === totalConStages;

      const match: BracketMatchSlot = {
        bracketType: 'consolation',
        stage: conStage,
        bracketPosition: pos,
        player1Seed: null,
        player2Seed: null,
        nextMatchPosition: isConFinal ? null : Math.floor(pos / 2),
        nextMatchSlot: isConFinal ? null : ((pos % 2) + 1) as 1 | 2,
        consolationMatchPosition: null,
        consolationMatchSlot: null,
        status: 'pending',
      };
      matches.push(match);
    }
  }

  // --- LINK MAIN LOSERS TO CONSOLATION ---
  // Main stage 0 losers → consolation stage 1
  const mainStage0 = matches.filter(m => m.bracketType === 'main' && m.stage === 0);
  const conStage1 = matches.filter(m => m.bracketType === 'consolation' && m.stage === 1);

  mainStage0.forEach((mainMatch, idx) => {
    const conIdx = Math.floor(idx / 2);
    const slot = ((idx % 2) + 1) as 1 | 2;
    if (conStage1[conIdx]) {
      mainMatch.consolationMatchPosition = conStage1[conIdx].bracketPosition;
      mainMatch.consolationMatchSlot = slot;
    }
  });

  // Main stage 1+ losers → consolation stage+1
  for (let stage = 1; stage < totalMainStages; stage++) {
    const mainStage = matches.filter(m => m.bracketType === 'main' && m.stage === stage);
    const conStage = matches.filter(m => m.bracketType === 'consolation' && m.stage === stage + 1);

    mainStage.forEach((mainMatch, idx) => {
      if (conStage[idx]) {
        // Main losers enter consolation as slot 1, consolation winners fill slot 2
        mainMatch.consolationMatchPosition = conStage[idx].bracketPosition;
        mainMatch.consolationMatchSlot = 1;
      }
    });
  }

  return matches;
}

// =====================================================
// STAGE NAMES
// =====================================================

/**
 * Get human-readable stage name
 */
export function getStageName(
  stage: number,
  totalMainStages: number,
  bracketType: BracketType
): string {
  const prefix = bracketType === 'consolation' ? 'Con. ' : '';
  const stagesFromEnd = totalMainStages - 1 - (bracketType === 'main' ? stage : stage - 1);

  if (bracketType === 'main') {
    if (stage === totalMainStages - 1) return 'Final';
    if (stagesFromEnd === 0) return 'Final';
    if (stagesFromEnd === 1) return 'Semi Finals';
    if (stagesFromEnd === 2) return 'Quarter Finals';
    if (stagesFromEnd === 3) return 'Round of 16';
    if (stagesFromEnd === 4) return 'Round of 32';
    return `Round ${stage + 1}`;
  }

  // Consolation
  if (stage === totalMainStages) return `${prefix}Final`;
  return `${prefix}Round ${stage}`;
}

// =====================================================
// WINNER DETERMINATION
// =====================================================

/**
 * Determine match winner based on game type and scores.
 * Returns the winner's player ID, or null if scores are tied/incomplete.
 */
export function determineMatchWinner(
  gameType: GameType,
  player1Id: string,
  player2Id: string,
  player1Score: number | null,
  player2Score: number | null
): string | null {
  if (player1Score == null || player2Score == null) return null;

  // For stroke play and par: lower is better
  // For stableford: higher is better
  // For match play: higher holes won is better
  const higherWins = gameType === 'stableford' || gameType === 'match-play';

  if (player1Score === player2Score) return null; // Tie

  if (higherWins) {
    return player1Score > player2Score ? player1Id : player2Id;
  } else {
    return player1Score < player2Score ? player1Id : player2Id;
  }
}

// =====================================================
// BRACKET DATA ORGANIZATION
// =====================================================

/**
 * Organize flat knockout matches into structured bracket data for display.
 */
export function organizeBracketData(
  matches: KnockoutMatchWithPlayers[],
  playerCount: number
): BracketData {
  const totalMainStages = Math.log2(playerCount);

  const mainMatches = matches.filter(m => m.bracket_type === 'main');
  const consolationMatches = matches.filter(m => m.bracket_type === 'consolation');

  // Group by stage
  const groupByStage = (
    stageMatches: KnockoutMatchWithPlayers[],
    bracketType: BracketType
  ): BracketStage[] => {
    const stageMap = new Map<number, KnockoutMatchWithPlayers[]>();

    stageMatches.forEach(m => {
      const existing = stageMap.get(m.stage) || [];
      existing.push(m);
      stageMap.set(m.stage, existing);
    });

    return Array.from(stageMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([stage, stageMatchList]) => ({
        stage,
        stageName: getStageName(stage, totalMainStages, bracketType),
        matches: stageMatchList.sort((a, b) => a.bracket_position - b.bracket_position),
      }));
  };

  return {
    mainBracket: groupByStage(mainMatches, 'main'),
    consolationBracket: groupByStage(consolationMatches, 'consolation'),
    totalStages: totalMainStages,
    playerCount,
  };
}

/**
 * Check if a number is a valid player count (power of 2, 4-32)
 */
export function isValidPlayerCount(count: number): count is ValidPlayerCount {
  return [4, 8, 16, 32].includes(count);
}

/**
 * Get the nearest valid player count
 */
export function getNearestValidPlayerCount(count: number): ValidPlayerCount {
  const valid: ValidPlayerCount[] = [4, 8, 16, 32];
  return valid.reduce((prev, curr) =>
    Math.abs(curr - count) < Math.abs(prev - count) ? curr : prev
  );
}
