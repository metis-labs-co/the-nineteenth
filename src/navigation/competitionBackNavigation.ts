import type { RootStackParamList } from './types';

type CompetitionDetailParams = RootStackParamList['CompetitionDetail'];

/**
 * The parts of `navigation.getState()` this module reads.
 */
export interface BackStackSnapshot {
  index: number;
  routes: readonly { readonly name: string }[];
}

export interface CompetitionBackResetState {
  index: number;
  routes: {
    name: keyof RootStackParamList;
    params?: RootStackParamList[keyof RootStackParamList];
  }[];
}

export type CompetitionBackAction =
  | { type: 'navigate'; params: CompetitionDetailParams }
  | { type: 'replace'; params: CompetitionDetailParams }
  | { type: 'reset'; state: CompetitionBackResetState };

/**
 * Decide how `ViewRoundScreen` should back out to its competition.
 *
 * Back on a competition round always lands on `CompetitionDetail`'s Rounds tab,
 * however the user reached the round. The mechanics differ by stack shape:
 *
 * - **`navigate`** — a `CompetitionDetail` already sits below the round (the
 *   user drilled in from the competition). React Navigation's stack router pops
 *   back to it, so its own back button then exits to whatever is beneath.
 *
 * - **`replace`** — no `CompetitionDetail` below (opened from the Rounds tab,
 *   Home, a notification, a league). `navigate` would *push* a fresh
 *   `CompetitionDetail` on top of `ViewRound`, and `CompetitionDetail`'s
 *   `goBack()` would pop straight back into `ViewRound` — the two screens then
 *   ping-pong forever. Replacing swaps the round out for the competition, so
 *   back continues to the list the round was opened from.
 *
 * - **`reset`** — `ViewRound` is the only route (cold-start deep link from a
 *   push notification). Replacing it would leave the user on a screen with
 *   nothing to go back to, so rebuild the stack as `[MainTabs, CompetitionDetail]`.
 *
 * @see buildPostSubmitResetState — the same trap, handled for the post-submit reset.
 */
export function resolveCompetitionBackAction(
  state: BackStackSnapshot,
  competitionId: string
): CompetitionBackAction {
  const params: CompetitionDetailParams = { id: competitionId, initialTab: 'rounds' };

  const hasDetailBelow = state.routes
    .slice(0, state.index)
    .some((route) => route.name === 'CompetitionDetail');

  if (hasDetailBelow) {
    return { type: 'navigate', params };
  }

  if (state.index > 0) {
    return { type: 'replace', params };
  }

  return {
    type: 'reset',
    state: {
      index: 1,
      routes: [{ name: 'MainTabs' }, { name: 'CompetitionDetail', params }],
    },
  };
}
