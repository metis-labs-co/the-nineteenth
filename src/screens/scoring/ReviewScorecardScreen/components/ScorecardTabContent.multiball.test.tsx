/**
 * ScorecardTabContent multi-ball tests
 *
 * A solo practice round scored with 2+ balls must render one card per ball with
 * real strokes, not a single player column of dashes.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { ScorecardTabContent } from './ScorecardTabContent';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { ScorecardTablePlayer } from '@/components/scorecard';
import type { Player } from '@/types';

const holes = create18Holes();

const player: Player = {
  id: 'p1',
  name: 'Noah',
  handicap: 0,
} as Player;

/** Ball 1 shoots par on every hole; ball 2 shoots par + 1. */
function twoBallScores(): Record<string, { balls: { strokes: number }[] }> {
  const scores: Record<string, { balls: { strokes: number }[] }> = {};
  for (const hole of holes) {
    scores[String(hole.number)] = {
      balls: [{ strokes: hole.par }, { strokes: hole.par + 1 }],
    };
  }
  return scores;
}

function renderTab(overrides: Partial<React.ComponentProps<typeof ScorecardTabContent>> = {}) {
  return render(<ScorecardTabContent {...createTabProps(overrides)} />);
}

function createTabProps(
  overrides: Partial<React.ComponentProps<typeof ScorecardTabContent>> = {}
): React.ComponentProps<typeof ScorecardTabContent> {
  const tablePlayerData: ScorecardTablePlayer[] = [
    {
      id: player.id,
      playerId: player.id,
      player,
      scores: twoBallScores(),
      hasScorecard: true,
    } as ScorecardTablePlayer,
  ];

  return {
    holes,
    tablePlayerData,
    currentPlayers: [player],
    effectiveGameType: 'stroke',
    isScramble: false,
    scrambleTeams: [],
    getPlayerScore: () => undefined,
    onHolePress: () => {},
    isRefreshing: false,
    onRefresh: () => {},
    bottomInset: 0,
    isMultiBall: true,
    ballCount: 2,
    ...overrides,
  };
}

describe('ScorecardTabContent — multi-ball practice rounds', () => {
  it('renders one card per ball', () => {
    renderTab();

    expect(screen.getByText('Ball 1')).toBeTruthy();
    expect(screen.getByText('Ball 2')).toBeTruthy();
  });

  it('shows each ball its own gross total rather than dashes', () => {
    renderTab();

    // Course par is 72 (create18Holes). Ball 1 = par on every hole = 72.
    // Ball 2 = par + 1 on every hole = 90.
    expect(screen.getByText('72')).toBeTruthy();
    expect(screen.getByText('90')).toBeTruthy();
  });

  it('falls back to the single-player table when the round is single-ball', () => {
    renderTab({ isMultiBall: false, ballCount: 1 });

    expect(screen.queryByText('Ball 1')).toBeNull();
    expect(screen.getByText('Noah')).toBeTruthy();
  });

  it('falls back to the single-player table for multiple players', () => {
    const second: Player = { id: 'p2', name: 'Sam', handicap: 5 } as Player;
    renderTab({
      currentPlayers: [player, second],
      tablePlayerData: [
        { id: 'p1', playerId: 'p1', player, scores: twoBallScores(), hasScorecard: true },
        { id: 'p2', playerId: 'p2', player: second, scores: {}, hasScorecard: true },
      ] as ScorecardTablePlayer[],
    });

    expect(screen.queryByText('Ball 1')).toBeNull();
  });

  it('totals each ball over the played holes when the round was ended early', () => {
    renderTab({ nineType: 'full', holesPlayed: 6 });

    // Par through six is 23, so ball 2 totals 23 + 6 = 29.
    expect(screen.getAllByText('29').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('90')).toBeNull();
    expect(screen.queryByText('72')).toBeNull();
    expect(screen.queryByText('18')).toBeNull();
  });

  it('updates ended early ball totals when only the cutoff changes, keeping planned tee handicap', () => {
    const props = createTabProps({
      tablePlayerData: [
        {
          id: 'p1',
          playerId: 'p1',
          player: { ...player, handicap: 9 },
          scores: twoBallScores(),
          hasScorecard: true,
        },
      ],
      selectedTeeData: { name: 'White', color: 'white', slopeRating: 113, courseRating: 72 },
      handicapSource: 'profile',
    });
    const { rerender } = render(<ScorecardTabContent {...props} />);
    expect(screen.getByText('90')).toBeTruthy();

    rerender(<ScorecardTabContent {...props} holesPlayed={6} />);
    expect(screen.getAllByText('29')).toHaveLength(2);
    expect(screen.getAllByText('9')).toHaveLength(2); // Ball 2: six bogeys + three strokes.
    expect(screen.queryByText('90')).toBeNull();

    rerender(<ScorecardTabContent {...props} holesPlayed={3} />);
    expect(screen.getAllByText('12')).toHaveLength(4); // Par and ball 1 gross across both cards.
    expect(screen.getAllByText('5')).toHaveLength(6); // Ball 2 points total and subtotal, plus par/score values.
    expect(screen.queryByText('29')).toBeNull();
  });

  it('shows ended early back-nine ball rows and totals on holes 10–15', () => {
    renderTab({
      holes: holes.filter((hole) => hole.number >= 10),
      nineType: 'back9',
      holesPlayed: 6,
    });

    expect(screen.getAllByText('29')).toHaveLength(2);
    expect(screen.getAllByText('23')).toHaveLength(4);
    expect(screen.queryByText('17')).toBeNull();
    expect(screen.queryByText('45')).toBeNull();
  });

  it('forwards the ended early cutoff to the standard single-ball table', () => {
    renderTab({ isMultiBall: false, ballCount: 1, holesPlayed: 6 });

    expect(screen.queryByText('IN')).toBeNull();
    expect(screen.queryByText('18')).toBeNull();
    expect(screen.getByText('OUT')).toBeTruthy();
    expect(screen.getAllByText('23')).toHaveLength(2); // Played par subtotal and total.
  });

  it('shows only played scramble rows and totals when ended early', () => {
    renderTab({
      isScramble: true,
      scrambleTeams: [{ id: 'team-1', name: 'Team 1', memberIds: ['p1'] }],
      holesPlayed: 6,
      getPlayerScore: (_playerId, holeNumber) => ({ strokes: holes[holeNumber - 1].par }),
    });

    expect(screen.queryByText('18')).toBeNull();
    expect(screen.queryByText('72')).toBeNull();
    expect(screen.getAllByText('23').length).toBeGreaterThanOrEqual(2);
  });
});
