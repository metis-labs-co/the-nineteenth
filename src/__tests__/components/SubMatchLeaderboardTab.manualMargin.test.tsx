// src/__tests__/components/SubMatchLeaderboardTab.manualMargin.test.tsx
import { persistedMatchData, selectMatchSource } from '@/components/leaderboard/SubMatchLeaderboardTab';

describe('persistedMatchData', () => {
  it('returns a/A-side win with formatted margin from persisted fields', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'a-wins', final_differential: 6, final_holes_remaining: 5,
    })).toEqual({ holesUpDown: '6&5', leaderSide: 'a', hasScores: true, isManual: false });
  });
  it('returns halved A/S', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'halved', final_differential: null, final_holes_remaining: null,
    })).toEqual({ holesUpDown: 'A/S', leaderSide: null, hasScores: true, isManual: false });
  });
  it('formats a went-the-distance win as XUP', () => {
    expect(persistedMatchData({
      status: 'completed', result: 'b-wins', final_differential: 2, final_holes_remaining: null,
    })).toEqual({ holesUpDown: '2UP', leaderSide: 'b', hasScores: true, isManual: false });
  });
  it('returns null when the sub-match has no persisted decisive result', () => {
    expect(persistedMatchData({
      status: 'in-progress', result: null, final_differential: null, final_holes_remaining: null,
    })).toBeNull();
  });
});

describe('persistedMatchData isManual', () => {
  it('forwards manual_result as isManual', () => {
    const d = persistedMatchData({
      status: 'completed', result: 'b-wins', final_differential: 2,
      final_holes_remaining: 1, manual_result: true,
    });
    expect(d).toMatchObject({ holesUpDown: '2&1', leaderSide: 'b', isManual: true });
  });
  it('isManual is false for a scored (non-manual) result', () => {
    const d = persistedMatchData({
      status: 'completed', result: 'a-wins', final_differential: 3,
      final_holes_remaining: null, manual_result: false,
    });
    expect(d).toMatchObject({ leaderSide: 'a', isManual: false });
  });
});

describe('selectMatchSource manual precedence', () => {
  const liveComplete = { statusText: '3&2', leaderSide: 'a' as const, isComplete: true, hasScores: true };
  it('prefers a MANUAL persisted result even when live is complete', () => {
    const persisted = { holesUpDown: '2&1', leaderSide: 'b' as const, hasScores: true, isManual: true };
    const out = selectMatchSource(liveComplete, persisted);
    expect(out).toMatchObject({ statusText: '2&1', leaderSide: 'b' });
  });
  it('prefers live when the persisted result is NOT manual and live is complete', () => {
    const persisted = { holesUpDown: '2&1', leaderSide: 'b' as const, hasScores: true, isManual: false };
    const out = selectMatchSource(liveComplete, persisted);
    expect(out).toMatchObject({ statusText: '3&2', leaderSide: 'a' });
  });
});
