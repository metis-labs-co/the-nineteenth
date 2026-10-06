import {
  isSplitAltShotRound,
  isSplitMatchPlayRound,
  isTeamMatchPlayRound,
  isSharedBallRound,
} from './roundFormat';

describe('roundFormat helpers', () => {
  describe('isSplitMatchPlayRound', () => {
    it('is true only for split match-play rounds', () => {
      expect(isSplitMatchPlayRound({ round_format: 'split', game_type: 'match-play' })).toBe(true);
      expect(isSplitMatchPlayRound({ round_format: 'combined', game_type: 'match-play' })).toBe(false);
      expect(isSplitMatchPlayRound({ round_format: 'split', game_type: 'stroke' })).toBe(false);
    });
  });

  describe('isTeamMatchPlayRound', () => {
    it('is true for the team match-play format regardless of round_format/game_type', () => {
      expect(isTeamMatchPlayRound({ team_format: 'match-play-team' })).toBe(true);
    });

    it('is false for other team formats and missing format', () => {
      expect(isTeamMatchPlayRound({ team_format: 'best-ball' })).toBe(false);
      expect(isTeamMatchPlayRound({ team_format: 'alt-shot' })).toBe(false);
      expect(isTeamMatchPlayRound({ team_format: null })).toBe(false);
      expect(isTeamMatchPlayRound({})).toBe(false);
    });
  });

  describe('isSplitAltShotRound', () => {
    it('matches split alt-shot via game_type or team_format', () => {
      expect(isSplitAltShotRound({ round_format: 'split', game_type: 'alt-shot' })).toBe(true);
      expect(isSplitAltShotRound({ round_format: 'split', team_format: 'alt-shot' })).toBe(true);
      expect(isSplitAltShotRound({ round_format: 'combined', team_format: 'alt-shot' })).toBe(false);
    });
  });

  describe('isSharedBallRound', () => {
    it('matches scramble and alt-shot on either field', () => {
      expect(isSharedBallRound({ game_type: 'scramble' })).toBe(true);
      expect(isSharedBallRound({ team_format: 'alt-shot' })).toBe(true);
      expect(isSharedBallRound({ team_format: 'match-play-team' })).toBe(false);
    });
  });
});
