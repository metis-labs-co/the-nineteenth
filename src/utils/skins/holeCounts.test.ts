/**
 * Skins hole counts: holes are priced on the planned count, the pot is
 * settled over the holes played.
 */
import { DEFAULT_SKINS_HOLE_COUNTS, getSkinsHoleCounts } from './holeCounts';

describe('getSkinsHoleCounts', () => {
  it('defaults to a full 18 played as planned', () => {
    expect(DEFAULT_SKINS_HOLE_COUNTS).toEqual({ plannedHoles: 18, holesPlayed: 18 });
    expect(getSkinsHoleCounts(null)).toEqual({ plannedHoles: 18, holesPlayed: 18 });
    expect(getSkinsHoleCounts(undefined)).toEqual({ plannedHoles: 18, holesPlayed: 18 });
    expect(getSkinsHoleCounts({ nine_type: null })).toEqual({ plannedHoles: 18, holesPlayed: 18 });
    expect(getSkinsHoleCounts({ nine_type: 'full' })).toEqual({ plannedHoles: 18, holesPlayed: 18 });
  });

  it('plans 9 holes for either nine', () => {
    expect(getSkinsHoleCounts({ nine_type: 'front9' })).toEqual({ plannedHoles: 9, holesPlayed: 9 });
    expect(getSkinsHoleCounts({ nine_type: 'back9' })).toEqual({ plannedHoles: 9, holesPlayed: 9 });
  });

  it('settles over holes_played when the round ended early', () => {
    expect(getSkinsHoleCounts({ nine_type: 'full', holes_played: 6 })).toEqual({
      plannedHoles: 18,
      holesPlayed: 6,
    });
    expect(getSkinsHoleCounts({ nine_type: 'back9', holes_played: 6 })).toEqual({
      plannedHoles: 9,
      holesPlayed: 6,
    });
  });

  it('treats a holes_played outside 1..planned as "played as planned"', () => {
    expect(getSkinsHoleCounts({ nine_type: 'front9', holes_played: 0 })).toEqual({
      plannedHoles: 9,
      holesPlayed: 9,
    });
    expect(getSkinsHoleCounts({ nine_type: 'front9', holes_played: 12 })).toEqual({
      plannedHoles: 9,
      holesPlayed: 9,
    });
  });
});
