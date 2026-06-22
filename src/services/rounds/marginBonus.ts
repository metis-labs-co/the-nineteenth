/**
 * Pure decision for the combined-match-margin bonus point. Given each team's
 * net holes-up margin for a round (signed sum of sub-match final_differential),
 * award the bonus to the team with the highest margin. Exact ties resolve per
 * the configured `tie` rule.
 */
export function decideMarginBonus(
  marginByTeam: Map<string, number>,
  bonus: { points: number; tie: 'split' | 'void' | 'carry' }
): Map<string, number> {
  const awards = new Map<string, number>();
  if (marginByTeam.size === 0 || bonus.points === 0) return awards;

  let max = -Infinity;
  for (const margin of marginByTeam.values()) {
    if (margin > max) max = margin;
  }
  const leaders = [...marginByTeam.entries()]
    .filter(([, margin]) => margin === max)
    .map(([teamId]) => teamId);

  if (leaders.length === 1) {
    awards.set(leaders[0], bonus.points);
    return awards;
  }

  // Tie among leaders.
  if (bonus.tie === 'split') {
    const share = bonus.points / leaders.length;
    for (const teamId of leaders) awards.set(teamId, share);
  }
  // 'void' and 'carry' → award nothing automatically.
  return awards;
}
