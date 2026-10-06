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

/**
 * True when a round is a team match-play round (full team vs full team, scored
 * best-ball net). Covers both the combined single team-vs-team match and split
 * team sub-matches, regardless of how `game_type` is stored. Used to route
 * these rounds to the sub-match leaderboard in the competition leaderboard.
 */
export function isTeamMatchPlayRound(round: {
  team_format?: string | null;
}): boolean {
  return round.team_format === 'match-play-team';
}

/**
 * True when a round is a "shared-ball" team format — scramble or alt-shot
 * (foursomes). In these formats the team plays a single ball, so a player's
 * stored `total_gross` is the TEAM's score, not their own individual play.
 *
 * Such rounds must NOT feed individual player statistics or the WHS handicap
 * history/index. Own-ball team formats (best-ball, shamble, aggregate, team
 * match play) still produce a genuine individual gross and are intentionally
 * NOT matched here.
 *
 * Checks both `game_type` and `team_format` because scramble/alt-shot presets
 * set both (and a round could carry the format on either field).
 */
export function isSharedBallRound(round: {
  game_type?: string | null;
  team_format?: string | null;
  round_format?: string | null;
}): boolean {
  const SHARED_BALL = new Set(['scramble', 'alt-shot']);
  return SHARED_BALL.has(round.game_type ?? '') || SHARED_BALL.has(round.team_format ?? '');
}
