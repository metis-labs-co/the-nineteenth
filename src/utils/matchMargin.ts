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
