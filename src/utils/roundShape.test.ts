import {
  resolveRoundShape,
  firstHoleNumber,
  lastPlayedHoleNumber,
  isHoleAfterEarlyEnd,
  isEndedEarly,
  formatEndedEarlyLabel,
} from './roundShape';

describe('resolveRoundShape', () => {
  it('uses the server row when there is no local value', () => {
    expect(resolveRoundShape({ nine_type: 'back9', holes_played: 6 })).toEqual({ nineType: 'back9', holesPlayed: 6 });
    expect(resolveRoundShape({ nine_type: 'front9', holes_played: null }, null)).toEqual({
      nineType: 'front9',
      holesPlayed: null,
    });
  });

  it('defaults to a full round played as planned when nothing is known', () => {
    expect(resolveRoundShape(null)).toEqual({ nineType: 'full', holesPlayed: null });
    expect(resolveRoundShape(undefined, undefined)).toEqual({ nineType: 'full', holesPlayed: null });
    expect(resolveRoundShape({}, {})).toEqual({ nineType: 'full', holesPlayed: null });
  });

  it('uses the local cards\' holesPlayed while the server has none (offline end not synced yet)', () => {
    expect(resolveRoundShape({ nine_type: 'full', holes_played: null }, { nineType: 'full', holesPlayed: 6 })).toEqual({
      nineType: 'full',
      holesPlayed: 6,
    });
  });

  it('the server holes_played wins over a different local value (another device ended first)', () => {
    expect(resolveRoundShape({ nine_type: 'full', holes_played: 6 }, { nineType: 'full', holesPlayed: 8 })).toEqual({
      nineType: 'full',
      holesPlayed: 6,
    });
  });

  it('takes the nine type from the server, then the local value, then full', () => {
    expect(resolveRoundShape({ nine_type: 'full' }, { nineType: 'back9' }).nineType).toBe('full');
    expect(resolveRoundShape({ nine_type: null }, { nineType: 'front9' }).nineType).toBe('front9');
    expect(resolveRoundShape(null, { nineType: 'back9', holesPlayed: 6 })).toEqual({ nineType: 'back9', holesPlayed: 6 });
  });

  it('treats a non-positive holes_played on either side as not set', () => {
    expect(resolveRoundShape({ nine_type: 'full', holes_played: 0 })).toEqual({ nineType: 'full', holesPlayed: null });
    expect(resolveRoundShape({ nine_type: 'full', holes_played: 0 }, { holesPlayed: 5 })).toEqual({
      nineType: 'full',
      holesPlayed: 5,
    });
    expect(resolveRoundShape({ nine_type: 'full' }, { holesPlayed: -1 })).toEqual({ nineType: 'full', holesPlayed: null });
  });

  it('treats a non-integer holes_played as not set, like filterPlayableHoles', () => {
    expect(resolveRoundShape({ nine_type: 'full', holes_played: 2.5 })).toEqual({ nineType: 'full', holesPlayed: null });
    expect(resolveRoundShape({ nine_type: 'full', holes_played: 2.5 }, { holesPlayed: 4 })).toEqual({
      nineType: 'full',
      holesPlayed: 4,
    });
    expect(resolveRoundShape({ nine_type: 'full' }, { holesPlayed: Number.NaN })).toEqual({
      nineType: 'full',
      holesPlayed: null,
    });
  });
});

describe('firstHoleNumber / lastPlayedHoleNumber', () => {
  it('numbers a back 9 from hole 10', () => {
    expect(firstHoleNumber('full')).toBe(1);
    expect(firstHoleNumber('front9')).toBe(1);
    expect(firstHoleNumber('back9')).toBe(10);
  });

  it('counts N holes from the first hole (Review Focus #2)', () => {
    expect(lastPlayedHoleNumber('full', 6)).toBe(6);
    expect(lastPlayedHoleNumber('front9', 4)).toBe(4);
    expect(lastPlayedHoleNumber('back9', 6)).toBe(15);
    expect(lastPlayedHoleNumber('full', 9)).toBe(9);
  });
});

describe('isHoleAfterEarlyEnd', () => {
  it('is false for every hole when the round was not ended', () => {
    expect(isHoleAfterEarlyEnd('full', null, 7)).toBe(false);
    expect(isHoleAfterEarlyEnd('full', undefined, 18)).toBe(false);
    expect(isHoleAfterEarlyEnd('full', 0, 5)).toBe(false);
  });

  it('ignores a non-integer holesPlayed, agreeing with filterPlayableHoles (which keeps every hole)', () => {
    expect(isHoleAfterEarlyEnd('full', 2.5, 5)).toBe(false);
    expect(isHoleAfterEarlyEnd('full', Number.NaN, 18)).toBe(false);
  });

  it('is true only after the last played hole', () => {
    expect(isHoleAfterEarlyEnd('full', 6, 6)).toBe(false);
    expect(isHoleAfterEarlyEnd('full', 6, 7)).toBe(true);
    expect(isHoleAfterEarlyEnd('front9', 4, 5)).toBe(true);
  });

  it('uses back-9 hole numbers (ended after 6 ⇒ holes 16-18 closed)', () => {
    expect(isHoleAfterEarlyEnd('back9', 6, 15)).toBe(false);
    expect(isHoleAfterEarlyEnd('back9', 6, 16)).toBe(true);
    // Before the round's first hole: not "after the end" (the planned-list check rejects it).
    expect(isHoleAfterEarlyEnd('back9', 6, 7)).toBe(false);
  });
});

describe('isEndedEarly', () => {
  it('is true only for a positive holes_played', () => {
    expect(isEndedEarly(null)).toBe(false);
    expect(isEndedEarly(undefined)).toBe(false);
    expect(isEndedEarly({})).toBe(false);
    expect(isEndedEarly({ holes_played: null })).toBe(false);
    expect(isEndedEarly({ holes_played: 0 })).toBe(false);
    expect(isEndedEarly({ holes_played: 2.5 })).toBe(false);
    expect(isEndedEarly({ holes_played: 6 })).toBe(true);
  });
});

describe('formatEndedEarlyLabel', () => {
  it('reads "Ended after N of M" with M from the nine type', () => {
    expect(formatEndedEarlyLabel(6, 'back9')).toBe('Ended after 6 of 9');
    expect(formatEndedEarlyLabel(6, 'full')).toBe('Ended after 6 of 18');
    expect(formatEndedEarlyLabel(9, 'full')).toBe('Ended after 9 of 18');
    expect(formatEndedEarlyLabel(4, 'front9')).toBe('Ended after 4 of 9');
  });
});
