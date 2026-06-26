import { isSplitAltShotRound } from '@/utils/roundFormat';

describe('isSplitAltShotRound', () => {
  it('true for split + alt-shot game_type', () => {
    expect(isSplitAltShotRound({ round_format: 'split', game_type: 'alt-shot', team_format: null })).toBe(true);
  });
  it('true for split + alt-shot team_format', () => {
    expect(isSplitAltShotRound({ round_format: 'split', game_type: 'stableford', team_format: 'alt-shot' })).toBe(true);
  });
  it('false for combined alt-shot', () => {
    expect(isSplitAltShotRound({ round_format: 'combined', game_type: 'alt-shot', team_format: 'alt-shot' })).toBe(false);
  });
  it('false for split non-alt-shot', () => {
    expect(isSplitAltShotRound({ round_format: 'split', game_type: 'match-play', team_format: 'best-ball' })).toBe(false);
  });
  it('false for missing fields', () => {
    expect(isSplitAltShotRound({})).toBe(false);
  });
});
