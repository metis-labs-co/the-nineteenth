import { renderHook } from '@testing-library/react-native';
import { useReviewScorecardTabs } from './useReviewScorecardTabs';
import { useRoundDetails } from '@/hooks/useRoundDetails';

jest.mock('@/hooks/useRoundDetails', () => ({ useRoundDetails: jest.fn() }));
jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({
  useStatsVisibilityWithTier: () => ({
    showPutts: false, showFairwayHit: false, showGreenInRegulation: false,
    showBunkerShots: false, showHazards: false,
  }),
}));
jest.mock('@/hooks/useSkins', () => ({ useActiveSkinsGameForRound: () => ({ data: null }) }));
jest.mock('@/hooks/wolf', () => ({ useWolfGameByRound: () => ({ data: null }) }));
jest.mock('@/hooks/shots', () => ({ useShotLogByRound: () => ({ data: [] }) }));

const mockUseRoundDetails = useRoundDetails as jest.Mock;

describe('useReviewScorecardTabs — alt-shot hides Contributions', () => {
  it('omits Contributions for an alt-shot round (keeps Leaderboard + Scorecard)', () => {
    mockUseRoundDetails.mockReturnValue({
      data: { game_type: 'alt-shot', team_format: 'alt-shot', round_format: 'combined', scoring_pairs_required: false },
    });
    const { result } = renderHook(() =>
      useReviewScorecardTabs({ roundId: 'r1', storeGameType: 'alt-shot', playerCount: 4 })
    );
    const keys = result.current.tabs.map((t: { key: string }) => t.key);
    expect(keys).toContain('leaderboard');
    expect(keys).toContain('scorecard');
    expect(keys).not.toContain('contributions');
  });

  it('keeps Contributions for a real scramble round', () => {
    mockUseRoundDetails.mockReturnValue({
      data: { game_type: 'scramble', team_format: 'scramble', round_format: 'combined', scoring_pairs_required: false },
    });
    const { result } = renderHook(() =>
      useReviewScorecardTabs({ roundId: 'r1', storeGameType: 'scramble', playerCount: 4 })
    );
    const keys = result.current.tabs.map((t: { key: string }) => t.key);
    expect(keys).toContain('contributions');
  });
});
