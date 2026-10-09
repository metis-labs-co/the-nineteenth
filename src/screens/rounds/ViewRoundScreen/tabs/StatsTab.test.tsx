/**
 * StatsTab — rendered holes for 9-hole and ended-early rounds. StatsTab does
 * no handicap math, so it simply renders the played holes.
 */
import React from 'react';
import { render, screen, within } from '@/__tests__/utils/renderHelpers';
import { StatsTab } from './StatsTab';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { ScorecardTablePlayer } from '@/components/scorecard/ScorecardTable/types';

jest.mock('@/components/subscription/FeatureLockCompact', () => ({
  FeatureLockCompact: ({ children }: { children: React.ReactNode }) => children,
}));

const holes = create18Holes();
const STATS_OFF = {
  showPutts: false,
  showFairwayHit: false,
  showGreenInRegulation: false,
  showBunkerShots: false,
  showHazards: false,
};

/** One player who made bogey on each of `holeNumbers`. */
function soloPlayer(holeNumbers: number[]): ScorecardTablePlayer[] {
  const scores: Record<string, { strokes: number }> = {};
  for (const hole of holes.filter((h) => holeNumbers.includes(h.number))) {
    scores[String(hole.number)] = { strokes: hole.par + 1 };
  }
  return [{ id: 'sc-1', playerId: 'p1', player: { id: 'p1', name: 'Sam' }, scores, hasScorecard: true }];
}

describe('StatsTab hole rows', () => {
  it('renders OUT, IN and a 72 par total for a full round played as planned', () => {
    render(<StatsTab displayPlayers={soloPlayer([1, 2, 3])} holes={holes} statsVisibility={STATS_OFF} />);

    expect(screen.getByText('OUT')).toBeTruthy();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
  });

});

describe('StatsTab ended rows', () => {
  it('renders only holes 1–6 for a full round ended after 6', () => {
    // create18Holes pars 4,3,5,4,4,3 = 23; bogey on each = 29.
    render(
      <StatsTab
        displayPlayers={soloPlayer([1, 2, 3, 4, 5, 6])}
        holes={holes}
        statsVisibility={STATS_OFF}
        holesPlayed={6}
      />
    );

    expect(screen.queryByText('IN')).toBeNull();
    expect(screen.queryByText('7')).toBeNull(); // hole 7 row is gone
    expect(screen.getAllByText('23')).toHaveLength(2); // OUT par + TOT par
    expect(screen.getAllByText('29')).toHaveLength(2); // OUT score + TOT score
  });

  it('renders holes 10–15 for a back-9 round ended after 6', () => {
    render(
      <StatsTab
        displayPlayers={soloPlayer([10, 11, 12, 13, 14, 15])}
        holes={holes}
        statsVisibility={STATS_OFF}
        nineType="back9"
        holesPlayed={6}
      />
    );

    expect(screen.queryByText('OUT')).toBeNull();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.queryByText('16')).toBeNull();
  });
});

describe('StatsTab planned defaults', () => {
  it.each([undefined, null])('preserves Review inputs with marker %s', (holesPlayed) => {
    render(<StatsTab displayPlayers={soloPlayer([1, 2, 3])} holes={holes}
      statsVisibility={STATS_OFF} {...{ holesPlayed }} />);
    expect(screen.getByText('OUT')).toBeTruthy();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
  });

  it.each([null, []])('generates full holes when course holes are %s', (rawHoles) => {
    render(<StatsTab displayPlayers={soloPlayer([1, 2, 3])} holes={rawHoles} statsVisibility={STATS_OFF} />);
    expect(screen.getByText('OUT')).toBeTruthy();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
  });

  it('keeps a planned back nine and excludes front nine stats', () => {
    render(<StatsTab displayPlayers={soloPlayer([1, 10, 11, 12])} holes={holes}
      statsVisibility={STATS_OFF} nineType="back9" />);
    expect(screen.queryByText('OUT')).toBeNull();
    expect(screen.getByText('IN')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getAllByText('36')).toHaveLength(2);
  });
});

const RETAINED_STATS = { ...STATS_OFF, showPutts: true, showFairwayHit: true, showGreenInRegulation: true };

function staleStatsPlayer(): ScorecardTablePlayer[] {
  return [{ id: 'stats-card', playerId: 'p1', player: { id: 'p1', name: 'Sam' }, hasScorecard: true,
    scores: Object.fromEntries(holes.map(h => [String(h.number), {
      strokes: h.par + 1, putts: 2, fairwayHit: h.number % 2 === 1, greenInRegulation: h.number % 2 === 1,
    }])),
  }];
}

function rowTexts(label: string): unknown[] {
  // Ascend through Paper's Text wrapper to the rendered cell, then its row.
  let row = screen.getByText(label).parent!;
  while (row.type !== 'View') row = row.parent!;
  row = row.parent!;
  while (row.type !== 'View') row = row.parent!;
  return within(row).getAllByText(/.+/).map(text => String(text.props.children));
}

describe('StatsTab retained sums and denominators', () => {
  it('excludes stale later putts, FIR and GIR from front-nine sums and denominators', () => {
    render(<StatsTab displayPlayers={staleStatsPlayer()} holes={holes} statsVisibility={RETAINED_STATS} holesPlayed={6} />);
    expect(rowTexts('OUT')).toEqual(['OUT', '23', '29', '12', '3/4', '3/6']);
    expect(rowTexts('TOT')).toEqual(['TOT', '23', '29', '12', '3/4', '3/6']);
    expect(screen.queryByText('IN')).toBeNull();
  });

  it('excludes removed back-nine stats and counts only played back-nine opportunities', () => {
    render(<StatsTab displayPlayers={staleStatsPlayer()} holes={holes} statsVisibility={RETAINED_STATS}
      nineType="back9" holesPlayed={6} />);
    expect(rowTexts('IN')).toEqual(['IN', '23', '29', '12', '1/4', '3/6']);
    expect(rowTexts('TOT')).toEqual(['TOT', '23', '29', '12', '1/4', '3/6']);
    expect(screen.queryByText('OUT')).toBeNull();
  });

  it('keeps OUT and retained IN subtotals when the cutoff crosses the turn', () => {
    render(<StatsTab displayPlayers={staleStatsPlayer()} holes={holes} statsVisibility={RETAINED_STATS} holesPlayed={12} />);
    expect(rowTexts('OUT')).toEqual(['OUT', '36', '45', '18', '5/7', '5/9']);
    expect(rowTexts('IN')).toEqual(['IN', '12', '15', '6', '0/2', '1/3']);
    expect(rowTexts('TOT')).toEqual(['TOT', '48', '60', '24', '5/9', '6/12']);
  });

  it('applies the cutoff to generated holes when course data is missing', () => {
    render(<StatsTab displayPlayers={staleStatsPlayer()} holes={null} statsVisibility={STATS_OFF} holesPlayed={6} />);
    expect(screen.queryByText('IN')).toBeNull();
    expect(screen.queryByText('7')).toBeNull();
    // Generated pars 4,4,3,5,4,4 sum to24; persisted fixture strokes remain29.
    expect(rowTexts('TOT')).toEqual(['TOT', '24', '29']);
  });
});
