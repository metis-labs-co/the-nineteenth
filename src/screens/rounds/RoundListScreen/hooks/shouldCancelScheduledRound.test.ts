import { shouldCancelScheduledRound } from './shouldCancelScheduledRound';
import type { RoundItem } from '../types';

const ME = 'user-me';

function makeRound(overrides: Partial<RoundItem>): RoundItem {
  return {
    id: 'r1',
    course: { id: 'c1', name: 'Test Course' },
    status: 'upcoming',
    gameType: 'stableford',
    roundNumber: 1,
    totalRounds: 1,
    holesCompleted: 0,
    totalHoles: 18,
    isStandalone: true,
    competition: undefined,
    players: [],
    ...overrides,
  } as RoundItem;
}

describe('shouldCancelScheduledRound', () => {
  it('returns true for a scheduled standalone round with other invited players', () => {
    const round = makeRound({
      players: [
        { id: ME, name: 'Me' },
        { id: 'friend-1', name: 'Friend' },
      ],
    });
    expect(shouldCancelScheduledRound(round, ME)).toBe(true);
  });

  it('returns false for a solo scheduled round (only the owner)', () => {
    const round = makeRound({ players: [{ id: ME, name: 'Me' }] });
    expect(shouldCancelScheduledRound(round, ME)).toBe(false);
  });

  it('returns false when there are no players', () => {
    const round = makeRound({ players: [] });
    expect(shouldCancelScheduledRound(round, ME)).toBe(false);
  });

  it('returns false for a competition round even with other players', () => {
    const round = makeRound({
      competition: { id: 'comp-1', name: 'Club Champs' },
      players: [
        { id: ME, name: 'Me' },
        { id: 'friend-1', name: 'Friend' },
      ],
    });
    expect(shouldCancelScheduledRound(round, ME)).toBe(false);
  });

  it('returns false for a completed round with other players', () => {
    const round = makeRound({
      status: 'completed',
      players: [
        { id: ME, name: 'Me' },
        { id: 'friend-1', name: 'Friend' },
      ],
    });
    expect(shouldCancelScheduledRound(round, ME)).toBe(false);
  });

  it('returns false for an in-progress round with other players', () => {
    const round = makeRound({
      status: 'in-progress',
      players: [
        { id: ME, name: 'Me' },
        { id: 'friend-1', name: 'Friend' },
      ],
    });
    expect(shouldCancelScheduledRound(round, ME)).toBe(false);
  });

  it('returns false for a null/undefined round', () => {
    expect(shouldCancelScheduledRound(null, ME)).toBe(false);
    expect(shouldCancelScheduledRound(undefined, ME)).toBe(false);
  });
});
