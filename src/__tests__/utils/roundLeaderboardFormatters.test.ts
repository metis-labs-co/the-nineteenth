/**
 * formatMatchPlayData — match-play leaderboard rows built from round_results.
 */

import { formatMatchPlayData } from '@/utils/roundLeaderboardFormatters';

function marginFor(finalMargin: string | undefined): string {
  return formatMatchPlayData(
    {
      opponent_id: 'p2',
      match_result: 'win',
      final_margin: finalMargin,
      holes_won: 3,
      holes_lost: 1,
      holes_halved: 14,
    },
    []
  ).holesUpDown;
}

describe('formatMatchPlayData — final margin', () => {
  it('shows a legacy last-hole win stored as "N & 0" as "N up" (I10)', () => {
    expect(marginFor('2 & 0')).toBe('2 up');
    expect(marginFor('1&0')).toBe('1 up');
    expect(marginFor('10 & 0')).toBe('10 up');
  });

  it('keeps real close-outs and current margins as stored (characterization)', () => {
    expect(marginFor('3 & 2')).toBe('3 & 2');
    expect(marginFor('10&8')).toBe('10&8');
    expect(marginFor('2 up')).toBe('2 up');
    expect(marginFor('A/S')).toBe('A/S');
  });

  it("falls back to 'A/S' when no margin was stored (characterization)", () => {
    expect(marginFor(undefined)).toBe('A/S');
  });
});
