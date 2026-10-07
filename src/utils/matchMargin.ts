/**
 * Canonical match-play margin formatter — the single source of truth for the
 * compact result token across badges, leaderboards and the live engine:
 *   - halved        -> "A/S"
 *   - dormie win     -> "6&5"  (holesUp & holesRemaining)
 *   - went distance  -> "6 UP" (holesRemaining === 0)
 * `holesUp` is the unsigned margin (winner's holes up).
 */
export function formatMatchMargin(
  holesUp: number,
  holesRemaining: number,
  halved: boolean
): string {
  if (halved) return 'A/S';
  return holesRemaining > 0 ? `${holesUp}&${holesRemaining}` : `${holesUp} UP`;
}

/**
 * Convert a `calculateMatchStatus` / `calculateTeamMatchStatus` margin
 * ("3 & 2", "2 up", "All Square") to the compact token above
 * ("3&2", "2 UP", "A/S"). Anything else passes through unchanged.
 */
export function compactMatchMargin(margin: string): string {
  if (margin === 'All Square') return 'A/S';
  if (margin.includes('&')) return margin.replace(/\s+/g, '');
  const up = /^(\d+)\s*up$/i.exec(margin.trim());
  return up ? `${up[1]} UP` : margin;
}
