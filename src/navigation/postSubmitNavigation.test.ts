import { buildPostSubmitResetState } from './postSubmitNavigation';

describe('buildPostSubmitResetState', () => {
  it('places CompetitionDetail under ViewRound for competition rounds', () => {
    const state = buildPostSubmitResetState('round-1', 'comp-1');

    expect(state.routes.map((r) => r.name)).toEqual([
      'MainTabs',
      'CompetitionDetail',
      'ViewRound',
    ]);
    // index points at the focused (top) route: ViewRound
    expect(state.index).toBe(2);
    expect(state.routes[1].params).toEqual({ id: 'comp-1', initialTab: 'rounds' });
    expect(state.routes[2].params).toEqual({ roundId: 'round-1', competitionId: 'comp-1' });
  });

  it('does not include CompetitionDetail for standalone rounds', () => {
    const state = buildPostSubmitResetState('round-2', 'standalone');

    expect(state.routes.map((r) => r.name)).toEqual(['MainTabs', 'ViewRound']);
    expect(state.index).toBe(1);
    expect(state.routes[1].params).toEqual({ roundId: 'round-2', competitionId: undefined });
  });

  it('treats missing/null competitionId as standalone', () => {
    expect(buildPostSubmitResetState('r', undefined).routes.map((r) => r.name)).toEqual([
      'MainTabs',
      'ViewRound',
    ]);
    expect(buildPostSubmitResetState('r', null).routes.map((r) => r.name)).toEqual([
      'MainTabs',
      'ViewRound',
    ]);
  });
});
