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
  const tablePlayerData: ScorecardTablePlayer[] = [
    {
      id: player.id,
      playerId: player.id,
      player,
      scores: twoBallScores(),
      hasScorecard: true,
    } as ScorecardTablePlayer,
  ];

  return render(
    <ScorecardTabContent
      holes={holes}
      tablePlayerData={tablePlayerData}
      currentPlayers={[player]}
      effectiveGameType="stroke"
      isScramble={false}
      scrambleTeams={[]}
      getPlayerScore={() => undefined}
      onHolePress={() => {}}
      isRefreshing={false}
      onRefresh={() => {}}
      bottomInset={0}
      isMultiBall
      ballCount={2}
      {...overrides}
    />
  );
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
});
