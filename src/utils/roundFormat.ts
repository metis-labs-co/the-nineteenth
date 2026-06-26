/**
 * True when a round is a split alt-shot (foursomes) round — head-to-head
 * sub-matches scored by the alt-shot model. Used to gate the sub-match
 * leaderboard on the ViewRound screen and the competition leaderboard.
 */
export function isSplitAltShotRound(round: {
  round_format?: string | null;
  game_type?: string | null;
  team_format?: string | null;
}): boolean {
  return (
    round.round_format === 'split' &&
    (round.game_type === 'alt-shot' || round.team_format === 'alt-shot')
  );
}

/**
 * True when a round is a split match-play round (1v1 singles / Ryder-cup-style
 * sub-matches). Gates the sub-match leaderboard on ViewRound and the competition.
 */
export function isSplitMatchPlayRound(round: {
  round_format?: string | null;
  game_type?: string | null;
}): boolean {
  return round.round_format === 'split' && round.game_type === 'match-play';
}
