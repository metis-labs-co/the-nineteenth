// src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx
import { persistedMatchData } from '@/components/leaderboard/SubMatchLeaderboardTab';

describe('persistedMatchData', () => {
  it('returns a/A-side win with formatted margin from persisted fields', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'a-wins', final_differential: 6, final_holes_remaining: 5,
    })).toEqual({ holesUpDown: '6&5', leaderSide: 'a', hasScores: true });
  });
  it('returns halved A/S', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'halved', final_differential: null, final_holes_remaining: null,
    })).toEqual({ holesUpDown: 'A/S', leaderSide: null, hasScores: true });
  });
  it('formats a went-the-distance win as XUP', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'b-wins', final_differential: 2, final_holes_remaining: null,
    })).toEqual({ holesUpDown: '2UP', leaderSide: 'b', hasScores: true });
  });
  it('returns null when the sub-match has no persisted decisive result', () => {
    expect(persistedMatchData({
      status: 'in-progress', result: null, final_differential: null, final_holes_remaining: null,
    })).toBeNull();
  });
});
