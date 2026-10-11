import { renderHook } from '@testing-library/react-native';
import { useViewRoundTabs } from './useViewRoundTabs';

const base = {
  isMatchPlayRound: false,
  isTeamMatchPlayRound: false,
  isShambleRound: false,
  isStrokePlayRound: false,
  isStablefordRound: false,
  isParRound: false,
  isTeamStrokeRound: false,
  isTeamRound: true,
  isSplitRound: true,
  hasSkinsGame: false,
  hasWolfGame: false,
  hasPayoutsTab: false,
  hasStats: false,
  hasShots: false,
  playerCount: 4,
  groupCount: 2,
  teamCount: 2,
};

describe('useViewRoundTabs — alt-shot hides Contributions', () => {
  it('suppresses Scorecard/Leaderboard AND Contributions for split alt-shot', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isScrambleRound: true, isAltShotSplitRound: true, isAltShotRound: true } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('subMatches');
    expect(keys).not.toContain('scrambleContributions');
    expect(keys).not.toContain('scrambleTeamScore');
    expect(keys).not.toContain('scrambleLeaderboard');
  });

  it('hides Contributions for combined alt-shot but keeps Scorecard/Leaderboard', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isSplitRound: false, isScrambleRound: true, isAltShotSplitRound: false, isAltShotRound: true } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('scrambleTeamScore');
    expect(keys).toContain('scrambleLeaderboard');
    expect(keys).not.toContain('scrambleContributions');
  });

  it('keeps all three scramble tabs (incl. Contributions) for a real scramble round', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isSplitRound: false, isScrambleRound: true, isAltShotSplitRound: false, isAltShotRound: false } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('scrambleTeamScore');
    expect(keys).toContain('scrambleLeaderboard');
    expect(keys).toContain('scrambleContributions');
  });
});

describe('useViewRoundTabs — Groups tab visibility', () => {
  const keysFor = (over: Record<string, unknown>) =>
    renderHook(() =>
      useViewRoundTabs({
        ...base,
        isTeamRound: false,
        isSplitRound: false,
        isScrambleRound: false,
        isAltShotSplitRound: false,
        isAltShotRound: false,
        teamCount: 0,
        ...over,
      } as never)
    ).result.current.map((t: { key: string }) => t.key);

  it('hides Groups for a 2-player match play round', () => {
    expect(keysFor({ isMatchPlayRound: true, playerCount: 2 })).not.toContain('subMatches');
  });
  it('shows Groups for a 4-player match play round', () => {
    expect(keysFor({ isMatchPlayRound: true, playerCount: 4 })).toContain('subMatches');
  });
  it('shows Groups for a 6-player stroke play round', () => {
    expect(keysFor({ isStrokePlayRound: true, playerCount: 6 })).toContain('subMatches');
  });
  it('hides Groups for a 3-player stroke play round', () => {
    expect(keysFor({ isStrokePlayRound: true, playerCount: 3 })).not.toContain('subMatches');
  });
  it('still shows Groups for a split round regardless of player count', () => {
    expect(keysFor({ isSplitRound: true, isTeamRound: true, playerCount: 2 })).toContain('subMatches');
  });
  it('still shows Groups for a team round with 2+ teams', () => {
    expect(keysFor({ isTeamRound: true, teamCount: 2, playerCount: 2 })).toContain('subMatches');
  });
});
