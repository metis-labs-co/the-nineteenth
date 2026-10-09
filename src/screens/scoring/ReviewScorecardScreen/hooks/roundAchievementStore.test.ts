/**
 * readRoundAchievementStore — what checkRoundAchievements reads from the
 * scoring store, including the ended-early flag (store holesPlayed, B3b).
 */
import { readRoundAchievementStore } from './roundAchievementStore';
let mockState: Record<string, unknown> = {};
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: { getState: () => mockState },
}));

const HOLES = [{ number: 1, par: 4 }];
const CARD = { playerId: 'player-1', scores: {} };

function setStore(holesPlayed: number | null | undefined) {
  mockState = {
    holes: HOLES,
    gameType: 'stroke',
    groupScorecards: new Map([['player-1', CARD]]),
    holesPlayed,
  };
}

describe('readRoundAchievementStore', () => {
  it("reads the holes, game type and the player's card", () => {
    setStore(null);

    const inputs = readRoundAchievementStore('player-1');

    expect(inputs.holes).toBe(HOLES);
    expect(inputs.gameType).toBe('stroke');
    expect(inputs.userScorecard).toBe(CARD);
    expect(readRoundAchievementStore('player-2').userScorecard).toBeUndefined();
  });

  it('flags a round ended early from the store holesPlayed', () => {
    setStore(6);
    expect(readRoundAchievementStore('player-1').endedEarly).toBe(true);

    setStore(null);
    expect(readRoundAchievementStore('player-1').endedEarly).toBe(false);
  });
  it.each([0, -1, 1.5])('treats any non-null store marker as ended (%s)', (marker) => {
    setStore(marker);
    expect(readRoundAchievementStore('player-1').endedEarly).toBe(true);
  });

  it('treats an absent marker as a planned round', () => {
    setStore(undefined);
    expect(readRoundAchievementStore('player-1').endedEarly).toBe(false);
  });
});
