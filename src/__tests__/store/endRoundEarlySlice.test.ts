/**
 * endRoundEarlySlice — scoresEveryPlayer, the "who can end" rule shared by
 * the store action and useEndRoundEarly's gate (Global Constraints).
 */

import { scoresEveryPlayer } from '@/store/endRoundEarlySlice';

jest.mock('@/services/offline/database', () => ({ deleteHoleScoresForCards: jest.fn() }));
jest.mock('@/store/scorecardPersistence', () => ({ persistScorecardUpdate: jest.fn() }));
jest.mock('@/store/scorecardSyncDebounce', () => ({ debouncedQueueScorecardSync: jest.fn() }));

const players = [{ id: 'p1' }, { id: 'p2' }];
const cards = new Map<string, unknown>([
  ['p1', {}],
  ['p2', {}],
]);

describe('scoresEveryPlayer', () => {
  it('is true when allowedPlayerIds is empty (this device scores everyone)', () => {
    expect(
      scoresEveryPlayer({ allowedPlayerIds: [], currentPlayers: players, groupScorecards: cards })
    ).toBe(true);
  });

  it('is true when allowedPlayerIds lists every player (ScorecardEntryScreen always fills it)', () => {
    expect(
      scoresEveryPlayer({
        allowedPlayerIds: ['p2', 'p1'],
        currentPlayers: players,
        groupScorecards: cards,
      })
    ).toBe(true);
  });

  it('is false when a player, or a card held for another player, is outside allowedPlayerIds', () => {
    expect(
      scoresEveryPlayer({
        allowedPlayerIds: ['p1'],
        currentPlayers: players,
        groupScorecards: cards,
      })
    ).toBe(false);
    expect(
      scoresEveryPlayer({
        allowedPlayerIds: ['p1', 'p2'],
        currentPlayers: players,
        groupScorecards: new Map<string, unknown>([...cards, ['p3', {}]]),
      })
    ).toBe(false);
  });
});
