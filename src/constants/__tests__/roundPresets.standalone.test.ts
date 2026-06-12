import {
  ROUND_PRESETS,
  getStandalonePresets,
  getPresetAvailability,
  presetIdForGameType,
} from '@/constants/roundPresets';

describe('standalone preset metadata', () => {
  it('exposes exactly the standalone-eligible presets, in catalog order', () => {
    expect(getStandalonePresets().map((p) => p.id)).toEqual([
      'individual_stableford',
      'individual_stroke',
      'individual_par',
      'individual_match_play',
      'team_best_ball',
      'team_shamble',
      'team_scramble',
      'team_match_play',
    ]);
  });

  it('defines player bounds including the organiser', () => {
    expect(ROUND_PRESETS.individual_stableford.standalone).toEqual({ minPlayers: 1, maxPlayers: 4 });
    expect(ROUND_PRESETS.individual_match_play.standalone).toEqual({ minPlayers: 2, maxPlayers: 2 });
    expect(ROUND_PRESETS.team_scramble.standalone).toEqual({ minPlayers: 2, maxPlayers: 4 });
    expect(ROUND_PRESETS.team_match_play.standalone).toEqual({ minPlayers: 4, maxPlayers: 4 });
    expect(ROUND_PRESETS.pairs_better_ball_2v2.standalone).toBeUndefined();
  });

  it('marks comp-only presets context-blocked in standalone context', () => {
    const ctx = { tier: 'premium' as const, isStandalone: true, perRoundRulesEnabled: true };
    expect(getPresetAvailability(ROUND_PRESETS.pairs_better_ball_2v2, ctx).contextAllowed).toBe(false);
    expect(getPresetAvailability(ROUND_PRESETS.individual_match_play_seeded, ctx).contextAllowed).toBe(false);
    expect(getPresetAvailability(ROUND_PRESETS.team_best_ball, ctx).contextAllowed).toBe(true);
  });

  it('does not apply comingSoon to standalone-eligible presets in standalone context', () => {
    const ctx = { tier: 'premium' as const, isStandalone: true, perRoundRulesEnabled: true };
    // team_best_ball is comingSoon for competitions but already live standalone
    expect(getPresetAvailability(ROUND_PRESETS.team_best_ball, ctx).comingSoon).toBe(false);
  });

  it('maps legacy GameType entry points to canonical presets', () => {
    expect(presetIdForGameType('stableford')).toBe('individual_stableford');
    expect(presetIdForGameType('match-play')).toBe('individual_match_play');
    expect(presetIdForGameType('scramble')).toBe('team_scramble');
  });
});
