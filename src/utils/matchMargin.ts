/**
 * Format a match-play margin the same way the live engine does:
 *   - halved        -> "A/S"
 *   - dormie win     -> "6&5"  (holesUp & holesRemaining)
 *   - went distance  -> "6UP"  (holesRemaining === 0)
 * `holesUp` is the unsigned margin (winner's holes up).
 */
export function formatMatchMargin(
  holesUp: number,
  holesRemaining: number,
  halved: boolean
): string {
  if (halved) return 'A/S';
  return holesRemaining > 0 ? `${holesUp}&${holesRemaining}` : `${holesUp}UP`;
}
