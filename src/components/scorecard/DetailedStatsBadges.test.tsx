/**
 * DetailedStatsBadges Component Tests
 *
 * Tests for the detailed stats badge pills component including:
 * - Returns null when score is undefined
 * - Returns null when no badges to show
 * - Fairway miss direction badge (left/right)
 * - Green miss direction badge (all 4 directions)
 * - Bunker shots badge
 * - Hazard badges (water, ob, lateral, lost_ball)
 * - Suppression when parent stat is "hit"
 * - Suppression when visibility flags are off
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { DetailedStatsBadges } from './DetailedStatsBadges';
import type { HoleScore } from '@/types/database/base';

// ===========================================================================
// HELPERS
// ===========================================================================

const allFlagsOn = {
  showFairwayMissDirection: true,
  showGreenMissDirection: true,
  showBunkerShots: true,
  showHazards: true,
};

const allFlagsOff = {
  showFairwayMissDirection: false,
  showGreenMissDirection: false,
  showBunkerShots: false,
  showHazards: false,
};

function renderBadges(score: HoleScore | undefined, flags = allFlagsOn) {
  return render(<DetailedStatsBadges score={score} {...flags} />);
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('DetailedStatsBadges', () => {
  // -------------------------------------------------------------------------
  // Null / empty cases
  // -------------------------------------------------------------------------

  it('renders nothing when score is undefined', () => {
    renderBadges(undefined);
    // No badge text should be rendered
    expect(screen.queryByText('⬅ L')).toBeNull();
    expect(screen.queryByText('R ➡')).toBeNull();
    expect(screen.queryByText(/🏖/)).toBeNull();
    expect(screen.queryByText('OB')).toBeNull();
    expect(screen.queryByText('💧')).toBeNull();
  });

  it('renders nothing when all flags are off', () => {
    const score: HoleScore = {
      strokes: 4,
      fairwayHit: false,
      fairwayMissDirection: 'left',
      greenInRegulation: false,
      greenMissDirection: 'right',
      bunkerShots: 2,
      hazards: [{ type: 'water' }],
    };
    renderBadges(score, allFlagsOff);
    expect(screen.queryByText('⬅ L')).toBeNull();
    expect(screen.queryByText('R')).toBeNull();
    expect(screen.queryByText(/🏖/)).toBeNull();
    expect(screen.queryByText('💧')).toBeNull();
  });

  it('renders nothing when score has no detailed stats data', () => {
    const score: HoleScore = { strokes: 4 };
    renderBadges(score);
    expect(screen.queryByText(/⬅|➡|🏖|OB|💧|🔴|\?/)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Fairway miss direction
  // -------------------------------------------------------------------------

  it('shows left fairway miss badge when fairwayHit is false and direction is left', () => {
    const score: HoleScore = {
      strokes: 4,
      fairwayHit: false,
      fairwayMissDirection: 'left',
    };
    renderBadges(score, { ...allFlagsOff, showFairwayMissDirection: true });
    expect(screen.queryByText('⬅ L')).toBeTruthy();
  });

  it('shows right fairway miss badge when fairwayHit is false and direction is right', () => {
    const score: HoleScore = {
      strokes: 4,
      fairwayHit: false,
      fairwayMissDirection: 'right',
    };
    renderBadges(score, { ...allFlagsOff, showFairwayMissDirection: true });
    expect(screen.queryByText('R ➡')).toBeTruthy();
  });

  it('does NOT show fairway miss badge when fairwayHit is true', () => {
    const score: HoleScore = {
      strokes: 4,
      fairwayHit: true,
      fairwayMissDirection: 'left',
    };
    renderBadges(score, { ...allFlagsOff, showFairwayMissDirection: true });
    expect(screen.queryByText('⬅ L')).toBeNull();
    expect(screen.queryByText('R ➡')).toBeNull();
  });

  it('does NOT show fairway miss badge when showFairwayMissDirection flag is off', () => {
    const score: HoleScore = {
      strokes: 4,
      fairwayHit: false,
      fairwayMissDirection: 'left',
    };
    renderBadges(score, { ...allFlagsOff, showFairwayMissDirection: false });
    expect(screen.queryByText('⬅ L')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Green miss direction
  // -------------------------------------------------------------------------

  it('shows green miss direction badge when greenInRegulation is false', () => {
    const score: HoleScore = {
      strokes: 5,
      greenInRegulation: false,
      greenMissDirection: 'short',
    };
    renderBadges(score, { ...allFlagsOff, showGreenMissDirection: true });
    expect(screen.queryByText('Sh')).toBeTruthy();
  });

  it('does NOT show green miss badge when greenInRegulation is true', () => {
    const score: HoleScore = {
      strokes: 3,
      greenInRegulation: true,
      greenMissDirection: 'long',
    };
    renderBadges(score, { ...allFlagsOff, showGreenMissDirection: true });
    expect(screen.queryByText('Lo')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Bunker shots
  // -------------------------------------------------------------------------

  it('shows bunker shots badge when bunkerShots > 0 and flag is on', () => {
    const score: HoleScore = { strokes: 5, bunkerShots: 2 };
    renderBadges(score, { ...allFlagsOff, showBunkerShots: true });
    expect(screen.queryByText('2🏖')).toBeTruthy();
  });

  it('does NOT show bunker badge when bunkerShots is 0', () => {
    const score: HoleScore = { strokes: 4, bunkerShots: 0 };
    renderBadges(score, { ...allFlagsOff, showBunkerShots: true });
    expect(screen.queryByText(/🏖/)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Hazards
  // -------------------------------------------------------------------------

  it('shows hazard badges for each entry in hazards array', () => {
    const score: HoleScore = {
      strokes: 6,
      hazards: [{ type: 'water' }, { type: 'ob' }],
    };
    renderBadges(score, { ...allFlagsOff, showHazards: true });
    expect(screen.queryByText('💧')).toBeTruthy();
    expect(screen.queryByText('OB')).toBeTruthy();
  });

  it('does NOT show hazard badges when showHazards flag is off', () => {
    const score: HoleScore = {
      strokes: 6,
      hazards: [{ type: 'water' }],
    };
    renderBadges(score, { ...allFlagsOff, showHazards: false });
    expect(screen.queryByText('💧')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Multiple badges together
  // -------------------------------------------------------------------------

  it('shows multiple badges simultaneously when all flags are on', () => {
    const score: HoleScore = {
      strokes: 7,
      fairwayHit: false,
      fairwayMissDirection: 'right',
      greenInRegulation: false,
      greenMissDirection: 'long',
      bunkerShots: 1,
      hazards: [{ type: 'lateral' }],
    };
    renderBadges(score);
    expect(screen.queryByText('R ➡')).toBeTruthy();
    expect(screen.queryByText('Lo')).toBeTruthy();
    expect(screen.queryByText('1🏖')).toBeTruthy();
    expect(screen.queryByText('🔴')).toBeTruthy();
  });
});
