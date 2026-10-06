import type { RoundBreakdownEntry } from './TeamLeaderboardTable';

/** One round rendered as a two-column head-to-head row. */
export interface HeadToHeadRoundRow {
  roundId: string;
  roundNumber: number;
  roundLabel: string;
  courseName?: string;
  pointsLeft: number;
  pointsRight: number;
}

/**
 * Merge two teams' per-round breakdowns into aligned rows for the head-to-head
 * card. A round scored by only one side shows 0 for the other. Rows are ordered
 * by the positional round number (rounds missing from the map sort last).
 */
export function mergeHeadToHeadRounds(
  left: RoundBreakdownEntry[] | undefined,
  right: RoundBreakdownEntry[] | undefined,
  roundNumberByRoundId: Map<string, number>
): HeadToHeadRoundRow[] {
  const leftById = new Map((left ?? []).map((r) => [r.roundId, r]));
  const rightById = new Map((right ?? []).map((r) => [r.roundId, r]));

  const roundIds = new Set<string>([...leftById.keys(), ...rightById.keys()]);

  const rows: HeadToHeadRoundRow[] = [];
  for (const roundId of roundIds) {
    const l = leftById.get(roundId);
    const r = rightById.get(roundId);
    const roundNumber = roundNumberByRoundId.get(roundId) ?? Number.MAX_SAFE_INTEGER;
    rows.push({
      roundId,
      roundNumber,
      roundLabel: `R${roundNumber === Number.MAX_SAFE_INTEGER ? '?' : roundNumber}`,
      courseName: l?.courseName ?? r?.courseName,
      pointsLeft: l?.points ?? 0,
      pointsRight: r?.points ?? 0,
    });
  }

  return rows.sort((a, b) => a.roundNumber - b.roundNumber);
}
