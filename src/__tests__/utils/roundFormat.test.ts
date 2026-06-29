import {
  isSplitAltShotRound,
  isSplitMatchPlayRound,
  isSharedBallRound,
} from '@/utils/roundFormat';

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

describe('isSplitMatchPlayRound', () => {
  it('true for split + match-play', () => {
    expect(isSplitMatchPlayRound({ round_format: 'split', game_type: 'match-play' })).toBe(true);
  });
  it('false for combined match-play', () => {
    expect(isSplitMatchPlayRound({ round_format: 'combined', game_type: 'match-play' })).toBe(false);
  });
  it('false for split non-match-play', () => {
    expect(isSplitMatchPlayRound({ round_format: 'split', game_type: 'alt-shot' })).toBe(false);
  });
  it('false for missing fields', () => {
    expect(isSplitMatchPlayRound({})).toBe(false);
  });
});

describe('isSharedBallRound', () => {
  // Shared-ball formats: the player's gross is the TEAM's single ball, not
  // their own play. These must NOT feed individual stats or handicap.
  it('true for scramble game_type', () => {
    expect(isSharedBallRound({ game_type: 'scramble' })).toBe(true);
  });
  it('true for alt-shot game_type', () => {
    expect(isSharedBallRound({ game_type: 'alt-shot' })).toBe(true);
  });
  it('true for scramble team_format (even if game_type differs)', () => {
    expect(isSharedBallRound({ game_type: 'stableford', team_format: 'scramble' })).toBe(true);
  });
  it('true for alt-shot team_format', () => {
    expect(isSharedBallRound({ game_type: 'match-play', team_format: 'alt-shot' })).toBe(true);
  });
  it('true regardless of round_format (combined or split)', () => {
    expect(isSharedBallRound({ round_format: 'split', game_type: 'scramble' })).toBe(true);
    expect(isSharedBallRound({ round_format: 'combined', game_type: 'alt-shot' })).toBe(true);
  });

  // Own-ball formats: each player plays their own ball, so their gross is a
  // real individual score and SHOULD still count.
  it('false for best-ball (own ball)', () => {
    expect(isSharedBallRound({ game_type: 'best-ball', team_format: 'best-ball' })).toBe(false);
  });
  it('false for shamble (own ball after the drive)', () => {
    expect(isSharedBallRound({ game_type: 'shamble', team_format: 'shamble' })).toBe(false);
  });
  it('false for team stableford aggregate (own ball)', () => {
    expect(isSharedBallRound({ game_type: 'stableford', team_format: 'aggregate' })).toBe(false);
  });
  it('false for team match play (own ball, team takes lowest)', () => {
    expect(isSharedBallRound({ game_type: 'match-play', team_format: 'match-play-team' })).toBe(false);
  });
  it('false for individual stableford', () => {
    expect(isSharedBallRound({ game_type: 'stableford', team_format: null })).toBe(false);
  });
  it('false for singles match play', () => {
    expect(isSharedBallRound({ game_type: 'match-play', team_format: null })).toBe(false);
  });
  it('false for missing fields', () => {
    expect(isSharedBallRound({})).toBe(false);
  });
});
