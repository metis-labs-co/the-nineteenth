import { resolveGroupScopeIds } from '@/screens/scoring/ReviewScorecardScreen/hooks/resolveGroupScope';
import type { PairingWithPlayers } from '@/types';

const pairing = (id: string, playerIds: string[]): PairingWithPlayers =>
  ({ id, round_id: 'r', playerIds, players: [] } as unknown as PairingWithPlayers);

describe('resolveGroupScopeIds', () => {
  const base = {
    allowedPlayerIds: [] as string[],
    pairings: undefined as PairingWithPlayers[] | undefined,
    currentUserId: 'U' as string | undefined,
    groupScorecardPlayerIds: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  };

  it('prefers allowedPlayerIds when present', () => {
    expect(resolveGroupScopeIds({ ...base, allowedPlayerIds: ['A', 'B'] })).toEqual(['A', 'B']);
  });

  it("falls back to the user's pairing when allowedPlayerIds is empty", () => {
    const pairings = [pairing('p1', ['A', 'B', 'U', 'D']), pairing('p2', ['E', 'F', 'G', 'H'])];
    expect(resolveGroupScopeIds({ ...base, pairings })).toEqual(['A', 'B', 'U', 'D']);
  });

  it('falls back to all scorecards when no pairing matches the user', () => {
    const pairings = [pairing('p1', ['A', 'B']), pairing('p2', ['E', 'F'])];
    expect(resolveGroupScopeIds({ ...base, pairings })).toEqual(base.groupScorecardPlayerIds);
  });

  it('falls back to all scorecards when pairings are unresolved', () => {
    expect(resolveGroupScopeIds({ ...base, pairings: undefined })).toEqual(base.groupScorecardPlayerIds);
  });
});
