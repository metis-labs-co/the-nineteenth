import { resolveCompetitionBackAction, resolveScoringBackAction } from './competitionBackNavigation';

const COMP_ID = 'comp-1';
const params = { id: COMP_ID, initialTab: 'rounds' as const };

const stack = (names: string[], index = names.length - 1) => ({
  index,
  routes: names.map((name) => ({ name })),
});

describe('resolveCompetitionBackAction', () => {
  it('navigates (pops back) when a CompetitionDetail sits below ViewRound', () => {
    const action = resolveCompetitionBackAction(
      stack(['MainTabs', 'CompetitionDetail', 'ViewRound']),
      COMP_ID
    );

    expect(action).toEqual({ type: 'navigate', params });
  });

  it('navigates when CompetitionDetail is deeper down the stack', () => {
    const action = resolveCompetitionBackAction(
      stack(['MainTabs', 'CompetitionDetail', 'Scorecard', 'ReviewScorecard', 'ViewRound']),
      COMP_ID
    );

    expect(action).toEqual({ type: 'navigate', params });
  });

  it('replaces ViewRound when no CompetitionDetail exists below it', () => {
    // Entering from the Rounds tab / Home / a notification: navigating would
    // PUSH a CompetitionDetail on top of ViewRound, and its back would pop
    // straight back into ViewRound. Replace swaps ViewRound out instead.
    const action = resolveCompetitionBackAction(stack(['MainTabs', 'ViewRound']), COMP_ID);

    expect(action).toEqual({ type: 'replace', params });
  });

  it('ignores a CompetitionDetail sitting above the focused route', () => {
    const action = resolveCompetitionBackAction(
      { index: 1, routes: [{ name: 'MainTabs' }, { name: 'ViewRound' }, { name: 'CompetitionDetail' }] },
      COMP_ID
    );

    expect(action).toEqual({ type: 'replace', params });
  });

  it('resets to [MainTabs, CompetitionDetail] when ViewRound is the only route', () => {
    // Cold-start deep link (push notification). Replacing here would leave the
    // user on a screen with nothing to go back to.
    const action = resolveCompetitionBackAction(stack(['ViewRound']), COMP_ID);

    expect(action).toEqual({
      type: 'reset',
      state: {
        index: 1,
        routes: [{ name: 'MainTabs' }, { name: 'CompetitionDetail', params }],
      },
    });
  });
});

describe('resolveScoringBackAction', () => {
  it('navigates (pops back) when a ViewRound sits below the scorecard', () => {
    expect(resolveScoringBackAction(stack(['MainTabs', 'ViewRound', 'Scorecard']))).toEqual({
      type: 'navigate',
    });
  });

  it('replaces the scorecard when no ViewRound exists below it', () => {
    // Opened straight from the Rounds tab / Home: navigating would PUSH a
    // ViewRound on top of the scorecard, leaving the scorecard underneath to
    // be popped back into later.
    expect(resolveScoringBackAction(stack(['MainTabs', 'Scorecard']))).toEqual({ type: 'replace' });
  });

  it('replaces the scorecard when it is the only route (cold-start resume)', () => {
    expect(resolveScoringBackAction(stack(['Scorecard']))).toEqual({ type: 'replace' });
  });

  it('ignores a ViewRound sitting above the focused route', () => {
    expect(
      resolveScoringBackAction({
        index: 1,
        routes: [{ name: 'MainTabs' }, { name: 'Scorecard' }, { name: 'ViewRound' }],
      })
    ).toEqual({ type: 'replace' });
  });
});

/**
 * Characterization test for the bug this helper fixes.
 *
 * Models the React Navigation v6 StackRouter semantics we depend on
 * (verified against @react-navigation/routers 6.1.9 `StackRouter`):
 *  - NAVIGATE pops back to the last route with a matching name, or pushes when
 *    no such route exists (no `getId` is configured anywhere in this app).
 *  - GO_BACK pops the focused route.
 */
describe('back-button loop', () => {
  type Stack = { index: number; routes: { name: string }[] };

  const navigate = (state: Stack, name: string): Stack => {
    const existing = state.routes.map((r) => r.name).lastIndexOf(name);
    if (existing === -1) {
      const routes = [...state.routes, { name }];
      return { index: routes.length - 1, routes };
    }
    return { index: existing, routes: state.routes.slice(0, existing + 1) };
  };

  const goBack = (state: Stack): Stack =>
    state.index === 0
      ? state
      : { index: state.index - 1, routes: state.routes.slice(0, state.index) };

  const replace = (state: Stack, name: string): Stack => ({
    index: state.index,
    routes: [...state.routes.slice(0, state.index), { name }],
  });

  /** Press back repeatedly; return every stack the user passes through. */
  const pressBackRepeatedly = (start: Stack, presses: number): string[][] => {
    let state = start;
    const seen: string[][] = [];

    for (let i = 0; i < presses; i++) {
      const focused = state.routes[state.index].name;
      if (focused === 'Scorecard') {
        const action = resolveScoringBackAction(state);
        state = action.type === 'navigate' ? navigate(state, 'ViewRound') : replace(state, 'ViewRound');
      } else if (focused === 'ViewRound') {
        const action = resolveCompetitionBackAction(state, COMP_ID);
        if (action.type === 'navigate') state = navigate(state, 'CompetitionDetail');
        else if (action.type === 'replace') state = replace(state, 'CompetitionDetail');
        else state = { index: action.state.index, routes: action.state.routes.map((r) => ({ name: r.name })) };
      } else {
        // Every other screen here (CompetitionDetail included) backs out with goBack().
        state = goBack(state);
      }
      seen.push(state.routes.map((r) => r.name));
    }

    return seen;
  };

  it('escapes to MainTabs when the round was opened from the Rounds tab', () => {
    const seen = pressBackRepeatedly({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'ViewRound' }] }, 4);

    expect(seen).toEqual([
      ['MainTabs', 'CompetitionDetail'],
      ['MainTabs'],
      ['MainTabs'],
      ['MainTabs'],
    ]);
    // Never bounces back into the round.
    expect(seen.some((routes) => routes.includes('ViewRound'))).toBe(false);
  });

  it('escapes to MainTabs when the round was opened from CompetitionDetail', () => {
    const seen = pressBackRepeatedly(
      { index: 2, routes: [{ name: 'MainTabs' }, { name: 'CompetitionDetail' }, { name: 'ViewRound' }] },
      3
    );

    expect(seen).toEqual([['MainTabs', 'CompetitionDetail'], ['MainTabs'], ['MainTabs']]);
  });

  it('escapes to MainTabs when an in-progress round was opened from the Rounds tab', () => {
    // Rounds tab → in-progress competition round opens the scorecard directly.
    // Before the fix, back pushed ViewRound on top of the scorecard, ViewRound
    // replaced itself with CompetitionDetail, and CompetitionDetail's back
    // popped into the scorecard again — forever.
    const seen = pressBackRepeatedly({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'Scorecard' }] }, 4);

    expect(seen).toEqual([
      ['MainTabs', 'ViewRound'],
      ['MainTabs', 'CompetitionDetail'],
      ['MainTabs'],
      ['MainTabs'],
    ]);
    expect(seen.some((routes) => routes.includes('Scorecard'))).toBe(false);
  });

  it('pops back to the existing ViewRound when scoring was opened from it', () => {
    const seen = pressBackRepeatedly(
      {
        index: 3,
        routes: [{ name: 'MainTabs' }, { name: 'CompetitionDetail' }, { name: 'ViewRound' }, { name: 'Scorecard' }],
      },
      3
    );

    expect(seen).toEqual([
      ['MainTabs', 'CompetitionDetail', 'ViewRound'],
      ['MainTabs', 'CompetitionDetail'],
      ['MainTabs'],
    ]);
  });

  it('escapes to MainTabs from a cold-start deep link into the round', () => {
    const seen = pressBackRepeatedly({ index: 0, routes: [{ name: 'ViewRound' }] }, 3);

    expect(seen).toEqual([['MainTabs', 'CompetitionDetail'], ['MainTabs'], ['MainTabs']]);
  });
});
