/**
 * TeamMatchPlayScorecardTable — ended-early rendering.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { TeamMatchPlayScorecardTable } from './index';
import type { Hole } from '@/types/database.types';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

const eighteen: Hole[] = Array.from(
  { length: 18 },
  (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }) as Hole
);
const reds: MatchTeam = {
  id: 'r',
  name: 'Reds',
  handicap: 0,
  members: [{ id: 'r1', name: 'R1', handicap: 0, score: null, pickedUp: false }],
};
const blues: MatchTeam = {
  id: 'b',
  name: 'Blues',
  handicap: 0,
  members: [{ id: 'b1', name: 'B1', handicap: 0, score: null, pickedUp: false }],
};
// Reds win holes 1-2 (3 v 4), halve 3-6; nothing after 6.
const getPlayerScore = (playerId: string, holeNumber: number): number | undefined => {
  if (holeNumber > 6) return undefined;
  if (playerId === 'r1') return holeNumber <= 2 ? 3 : 4;
  return 4;
};

describe('TeamMatchPlayScorecardTable — ended early (holesPlayed)', () => {
  it('renders every planned hole when played as planned (characterization)', () => {
    render(
      <TeamMatchPlayScorecardTable
        holes={eighteen}
        team1={reds}
        team2={blues}
        getPlayerScore={getPlayerScore}
      />
    );

    expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('R 2 up')).toBeNull();
  });
});
describe('ended feature', () => {
  it('renders only the played holes and settles the match on the lead', () => {
    render(
      <TeamMatchPlayScorecardTable
        holes={eighteen}
        team1={reds}
        team2={blues}
        getPlayerScore={getPlayerScore}
        holesPlayed={6}
      />
    );

    expect(screen.getAllByText('6').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('7')).toBeNull();
    expect(screen.queryByText('18')).toBeNull();
    // Hole 6 row + TOT row ("R" = initials of "Reds").
    expect(screen.getAllByText('R 2 up')).toHaveLength(2);
  });
});

describe('TeamMatchPlayScorecardTable cutoff rerenders', () => {
  it('renders back-nine physical rows and recomputes when only cutoff changes', () => {
    const planned = eighteen.slice(9);
    const getScore = getPlayerScore;
    const card = (holesPlayed: number | null) => (
      <TeamMatchPlayScorecardTable
        holes={planned}
        team1={reds}
        team2={blues}
        getPlayerScore={getScore}
        holesPlayed={holesPlayed}
      />
    );
    const { rerender } = render(card(null));
    expect(screen.getByText('18')).toBeTruthy();
    rerender(card(3));
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('13')).toBeNull();
    expect(screen.queryByText('18')).toBeNull();
    expect(screen.getByText('OUT')).toBeTruthy();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('TOT')).toBeTruthy();
    rerender(card(null));
    expect(screen.getByText('18')).toBeTruthy();
  });
  it.each([0, -1, 1.5, 18, 19, NaN, Infinity])(
    'preserves baseline rows and running statuses for invalid cutoff %s',
    (cutoff) => {
      const planned = [eighteen[2], eighteen[0], eighteen[1], ...eighteen.slice(3)];
      const getScore = getPlayerScore;
      const card = (holesPlayed: number | null) => (
        <TeamMatchPlayScorecardTable
          holes={planned}
          team1={reds}
          team2={blues}
          getPlayerScore={getScore}
          holesPlayed={holesPlayed}
        />
      );
      const { rerender, toJSON } = render(card(null));
      const baseline = toJSON();
      rerender(card(cutoff));
      expect(toJSON()).toEqual(baseline);
    }
  );
});
