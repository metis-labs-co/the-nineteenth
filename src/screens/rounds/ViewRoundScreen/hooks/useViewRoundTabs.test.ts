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
