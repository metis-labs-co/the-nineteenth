import { getRoundOptionsRows, type RoundOptionsInput } from './roundOptionsRows';

const input: RoundOptionsInput = {
  isOnline: true, courseHoleCount: 18, isEnded: false, anyCardSubmitted: false,
  rosterEditableFormat: true, canChangeTees: true, canEndRoundEarly: true, endEarlyBlockedReason: null,
};
const row = (i: RoundOptionsInput, key: string) => getRoundOptionsRows(i).find((r) => r.key === key);

describe('getRoundOptionsRows', () => {
  it('lists rows in order with everything enabled', () => {
    expect(getRoundOptionsRows(input).map((r) => [r.key, r.disabled])).toEqual([
      ['holes', false], ['players', false], ['tees', false], ['endEarly', false], ['delete', false],
    ]);
    expect(row(input, 'delete')?.destructive).toBe(true);
  });
  it('hides Holes on a 9-hole course', () => {
    expect(row({ ...input, courseHoleCount: 9 }, 'holes')).toBeUndefined();
  });
  it('greys online-only rows offline but keeps End round early', () => {
    const off = { ...input, isOnline: false };
    for (const key of ['holes', 'players', 'tees', 'delete']) {
      expect(row(off, key)).toMatchObject({ disabled: true, caption: 'Needs a connection' });
    }
    expect(row(off, 'endEarly')?.disabled).toBe(false);
  });
  it('locks Players for other formats', () => {
    expect(row({ ...input, rosterEditableFormat: false }, 'players'))
      .toMatchObject({ disabled: true, caption: 'Not available for this format' });
  });
  it('locks Holes and Players once ended', () => {
    const ended = { ...input, isEnded: true };
    expect(row(ended, 'holes')).toMatchObject({ disabled: true, caption: 'Round has been ended' });
    expect(row(ended, 'players')).toMatchObject({ disabled: true, caption: 'Round has been ended' });
  });
  it('locks Players once a card is submitted', () => {
    expect(row({ ...input, anyCardSubmitted: true }, 'players'))
      .toMatchObject({ disabled: true, caption: 'Scores have been submitted' });
  });
  it('shows the end-early blocked reason', () => {
    expect(row({ ...input, canEndRoundEarly: false, endEarlyBlockedReason: 'Needs scores for Dave on holes 1–2' }, 'endEarly'))
      .toMatchObject({ disabled: true, caption: 'Needs scores for Dave on holes 1–2' });
  });
  it('hides Change tees when not permitted', () => {
    expect(row({ ...input, canChangeTees: false }, 'tees')).toBeUndefined();
  });
});
