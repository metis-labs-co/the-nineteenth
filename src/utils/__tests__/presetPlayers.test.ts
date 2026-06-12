import { checkPresetPlayerCount } from '@/utils/presetPlayers';

describe('checkPresetPlayerCount', () => {
  it('passes individual formats with any group size 1-4', () => {
    expect(checkPresetPlayerCount('individual_stableford', 0).ok).toBe(true); // solo
    expect(checkPresetPlayerCount('individual_stableford', 3).ok).toBe(true); // full group
  });

  it('blocks under-filled formats with an add-N-more message', () => {
    const result = checkPresetPlayerCount('team_scramble', 0); // organiser only
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Scramble needs at least 2 players — add 1 more');
  });

  it('uses singular wording when one player is missing', () => {
    const result = checkPresetPlayerCount('team_match_play', 2); // 3 of 4
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Team Match Play needs at least 4 players — add 1 more');
  });

  it('blocks exact-size formats when over-filled', () => {
    const result = checkPresetPlayerCount('individual_match_play', 2); // 3 players in a 1v1
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Match Play allows at most 2 players');
  });

  it('reports the bounds and total for UI hints', () => {
    const result = checkPresetPlayerCount('team_match_play', 1);
    expect(result.required).toEqual({ minPlayers: 4, maxPlayers: 4 });
    expect(result.totalPlayers).toBe(2);
  });

  it('fails closed for presets that are not standalone-eligible', () => {
    const result = checkPresetPlayerCount('pairs_better_ball_2v2', 3);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('2v2 Better Ball is not available for standalone rounds');
  });

  it('reports plural missing counts', () => {
    const result = checkPresetPlayerCount('team_match_play', 0); // 1 of 4
    expect(result.message).toBe('Team Match Play needs at least 4 players — add 3 more');
  });
});
