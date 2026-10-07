import { renderHook } from '@testing-library/react-native';
import { useLiveScorecardMerge } from '@/hooks/scorecard/useLiveScorecardMerge';
import { useScorecardStore } from '@/store/scorecardStore';

let mockHandler: ((payload: { new: unknown }) => void) | null = null;
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    channel: jest.fn(() => {
      const ch: Record<string, unknown> = {};
      ch.on = jest.fn((_e: unknown, _f: unknown, handler: (p: { new: unknown }) => void) => { mockHandler = handler; return ch; });
      ch.subscribe = jest.fn(() => ch);
      return ch;
    }),
    removeChannel: jest.fn(),
  },
}));

describe('useLiveScorecardMerge', () => {
  const merge = jest.fn(() => Promise.resolve());
  beforeEach(() => {
    mockHandler = null;
    merge.mockClear();
    useScorecardStore.setState({ mergeRemoteScorecard: merge } as never);
  });

  it('feeds realtime rows into the store in a social round', () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    mockHandler!({ new: { player_id: 'p', scores: {}, revision: 2, status: 'in-progress', round_id: 'r-1' } });
    expect(merge).toHaveBeenCalledWith({ player_id: 'p', scores: {}, revision: 2, status: 'in-progress' });
  });

  it('ignores malformed rows', () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    mockHandler!({ new: { player_id: 'p' } });
    expect(merge).not.toHaveBeenCalled();
  });

  it('does not subscribe in a standard round', () => {
    useScorecardStore.setState({ scoringMode: 'standard' } as never);
    renderHook(() => useLiveScorecardMerge('r-1'));
    expect(mockHandler).toBeNull();
  });

  it('gives two simultaneous mounts different channel names', () => {
    useScorecardStore.setState({ scoringMode: 'social' } as never);
    const { supabase } = jest.requireMock('@/services/supabase/client');
    (supabase.channel as jest.Mock).mockClear();
    renderHook(() => useLiveScorecardMerge('r-1'));
    renderHook(() => useLiveScorecardMerge('r-1'));
    const names = (supabase.channel as jest.Mock).mock.calls.map(([n]) => n);
    expect(new Set(names).size).toBe(2);
  });
});
