/**
 * DetailedStatsBadges Component Tests
 *
 * Tests for the detailed stats badge pills component including:
 * - Returns null when score is undefined
 * - Returns null when no badges to show
 * - Bunker shots badge with count
 * - Hazard badges (icon per type)
 * - Suppression when visibility flags are off
 *
 * Note: Fairway/green miss direction badges were moved to display
 * inside the FIR/GIR toggle buttons in StatsRow.
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { DetailedStatsBadges } from './DetailedStatsBadges';
import type { HoleScore } from '@/types/database/base';

// Mock tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconShovel: (props: { size: number; color: string }) => <View testID="icon-shovel" {...props} />,
    IconDroplet: (props: { size: number; color: string }) => <View testID="icon-droplet" {...props} />,
    IconBan: (props: { size: number; color: string }) => <View testID="icon-ban" {...props} />,
    IconCircleOff: (props: { size: number; color: string }) => <View testID="icon-circle-off" {...props} />,
    IconQuestionMark: (props: { size: number; color: string }) => <View testID="icon-question-mark" {...props} />,
  };
});

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
    expect(screen.queryByTestId('icon-shovel')).toBeNull();
    expect(screen.queryByTestId('icon-droplet')).toBeNull();
  });

  it('renders nothing when all flags are off', () => {
    const score: HoleScore = {
      strokes: 4,
      bunkerShots: 2,
      hazards: [{ type: 'water' }],
    };
    renderBadges(score, allFlagsOff);
    expect(screen.queryByTestId('icon-shovel')).toBeNull();
    expect(screen.queryByTestId('icon-droplet')).toBeNull();
  });

  it('renders nothing when score has no detailed stats data', () => {
    const score: HoleScore = { strokes: 4 };
    renderBadges(score);
    expect(screen.queryByTestId('icon-shovel')).toBeNull();
    expect(screen.queryByTestId('icon-droplet')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Bunker shots
  // -------------------------------------------------------------------------

  it('shows bunker badge with count when bunkerShots > 0', () => {
    const score: HoleScore = { strokes: 5, bunkerShots: 2 };
    renderBadges(score, { ...allFlagsOff, showBunkerShots: true });
    expect(screen.queryByTestId('icon-shovel')).toBeTruthy();
    expect(screen.queryByText('2')).toBeTruthy();
  });

  it('does NOT show bunker badge when bunkerShots is 0', () => {
    const score: HoleScore = { strokes: 4, bunkerShots: 0 };
    renderBadges(score, { ...allFlagsOff, showBunkerShots: true });
    expect(screen.queryByTestId('icon-shovel')).toBeNull();
  });

  it('does NOT show bunker badge when flag is off', () => {
    const score: HoleScore = { strokes: 5, bunkerShots: 3 };
    renderBadges(score, { ...allFlagsOff, showBunkerShots: false });
    expect(screen.queryByTestId('icon-shovel')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Hazards
  // -------------------------------------------------------------------------

  it('shows hazard icon for water hazard', () => {
    const score: HoleScore = {
      strokes: 6,
      hazards: [{ type: 'water' }],
    };
    renderBadges(score, { ...allFlagsOff, showHazards: true });
    expect(screen.queryByTestId('icon-droplet')).toBeTruthy();
  });

  it('shows multiple hazard icons for multiple hazards', () => {
    const score: HoleScore = {
      strokes: 6,
      hazards: [{ type: 'water' }, { type: 'ob' }],
    };
    renderBadges(score, { ...allFlagsOff, showHazards: true });
    expect(screen.queryByTestId('icon-droplet')).toBeTruthy();
    expect(screen.queryByTestId('icon-ban')).toBeTruthy();
  });

  it('does NOT show hazard badges when showHazards flag is off', () => {
    const score: HoleScore = {
      strokes: 6,
      hazards: [{ type: 'water' }],
    };
    renderBadges(score, { ...allFlagsOff, showHazards: false });
    expect(screen.queryByTestId('icon-droplet')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Multiple badges together
  // -------------------------------------------------------------------------

  it('shows bunker and hazard badges simultaneously', () => {
    const score: HoleScore = {
      strokes: 7,
      bunkerShots: 1,
      hazards: [{ type: 'lateral' }],
    };
    renderBadges(score, { ...allFlagsOff, showBunkerShots: true, showHazards: true });
    expect(screen.queryByTestId('icon-shovel')).toBeTruthy();
    expect(screen.queryByText('1')).toBeTruthy();
    expect(screen.queryByTestId('icon-circle-off')).toBeTruthy();
  });
});
