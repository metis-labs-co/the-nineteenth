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

describe('useViewRoundTabs — split alt-shot', () => {
  it('suppresses scramble Scorecard/Leaderboard but keeps Contributions for split alt-shot', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isScrambleRound: true, isAltShotSplitRound: true } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('subMatches');
    expect(keys).toContain('scrambleContributions');
    expect(keys).not.toContain('scrambleTeamScore');
    expect(keys).not.toContain('scrambleLeaderboard');
  });

  it('keeps all three scramble tabs for a non-split (combined) scramble/alt-shot round', () => {
    const { result } = renderHook(() =>
      useViewRoundTabs({ ...base, isSplitRound: false, isScrambleRound: true, isAltShotSplitRound: false } as never)
    );
    const keys = result.current.map((t: { key: string }) => t.key);
    expect(keys).toContain('scrambleTeamScore');
    expect(keys).toContain('scrambleLeaderboard');
    expect(keys).toContain('scrambleContributions');
  });
});
