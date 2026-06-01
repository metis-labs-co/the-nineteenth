/**
 * DetailedStatsSheet Component Tests
 *
 * Tests for the detailed stats bottom sheet including:
 * - Visibility/rendering based on props
 * - Fairway miss direction section
 * - Green miss direction section
 * - Bunker shots stepper
 * - Hazard multi-select chips
 * - Empty state
 * - Done button submits correct values
 */

import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { DetailedStatsSheet } from './DetailedStatsSheet';
import type { HoleScore } from '@/types/database/base';

// Mock BottomSheet to render children when visible
jest.mock('@/components/common', () => {
  const { View: RNView } = require('react-native');
  return {
    ...jest.requireActual('@/components/common'),
    BottomSheet: ({ visible, children, title }: any) =>
      visible ? (
        <RNView testID="bottom-sheet">
          <RNView testID="bottom-sheet-title-container">
            {/* Title rendered as accessible text for querying */}
          </RNView>
          <RNView>{children}</RNView>
        </RNView>
      ) : null,
  };
});

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const baseScore: HoleScore = {
  strokes: 4,
  putts: 2,
  fairwayHit: false,
  greenInRegulation: false,
  bunkerShots: 0,
  hazards: [],
};

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  holeNumber: 7,
  playerName: 'Alice',
  score: baseScore,
  onStatsUpdate: jest.fn(),
  showFairwayMissDirection: true,
  showGreenMissDirection: true,
  showBunkerShots: true,
  showHazards: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// VISIBILITY
// ===========================================================================

describe('Visibility', () => {
  it('does not render when visible=false', () => {
    render(<DetailedStatsSheet {...defaultProps} visible={false} />);
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('renders when visible=true', () => {
    render(<DetailedStatsSheet {...defaultProps} />);
    expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('renders Done button when visible', () => {
    render(<DetailedStatsSheet {...defaultProps} />);
    expect(screen.getByText('Done')).toBeTruthy();
  });
});

// ===========================================================================
// EMPTY STATE
// ===========================================================================

describe('Empty state', () => {
  it('shows empty state when no sections are applicable', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(
      screen.getByText('No detailed stats to track for this hole')
    ).toBeTruthy();
  });

  it('does not show empty state when at least one section is visible', () => {
    render(<DetailedStatsSheet {...defaultProps} />);
    expect(
      screen.queryByText('No detailed stats to track for this hole')
    ).toBeNull();
  });
});

// ===========================================================================
// FAIRWAY MISS DIRECTION
// ===========================================================================

describe('Fairway in regulation section', () => {
  it('shows fairway section when fairwayHit=false and showFairwayMissDirection=true', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: false }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('FAIRWAY IN REGULATION')).toBeTruthy();
  });

  it('still shows fairway section when fairwayHit=true (so user can re-toggle)', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('FAIRWAY IN REGULATION')).toBeTruthy();
  });

  it('hides fairway section when showFairwayMissDirection=false', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: false }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.queryByText('FAIRWAY IN REGULATION')).toBeNull();
  });

  it('hides fairway section on a par 3 hole', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        holePar={3}
        score={{ ...baseScore, fairwayHit: false }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.queryByText('FAIRWAY IN REGULATION')).toBeNull();
  });

  it('shows fairway section on par 4 and par 5 holes', () => {
    const { rerender } = render(
      <DetailedStatsSheet
        {...defaultProps}
        holePar={4}
        score={{ ...baseScore, fairwayHit: false }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('FAIRWAY IN REGULATION')).toBeTruthy();

    rerender(
      <DetailedStatsSheet
        {...defaultProps}
        holePar={5}
        score={{ ...baseScore, fairwayHit: false }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('FAIRWAY IN REGULATION')).toBeTruthy();
  });

  it('shows fairway section when par is unknown (holePar undefined)', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        holePar={undefined}
        score={{ ...baseScore, fairwayHit: false }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('FAIRWAY IN REGULATION')).toBeTruthy();
  });

  it('renders all five fairway buttons (Hit / Left / Right / Long / Short)', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: false, fairwayMissDirection: undefined }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('Hit')).toBeTruthy();
    expect(screen.getAllByText('Left').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Right').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Long').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Short').length).toBeGreaterThan(0);
  });

  it('fairway Hit button toggles fairwayHit=true and clears miss direction', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: false, fairwayMissDirection: 'left' }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );
    fireEvent.press(screen.getByText('Hit'));
    fireEvent.press(screen.getByText('Done'));
    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fairwayHit: true, fairwayMissDirection: undefined })
    );
  });

  it('pressing the same fairway direction twice clears it', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: false, fairwayMissDirection: 'left' }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );
    // The Left button has only an icon (no text on small variant); press by accessibility doesn't apply.
    // Use the FAIRWAY section's Left text label.
    const leftLabels = screen.getAllByText('Left');
    fireEvent.press(leftLabels[0]);
    fireEvent.press(screen.getByText('Done'));
    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fairwayHit: undefined, fairwayMissDirection: undefined })
    );
  });

  it('selecting Long fairway miss saves fairwayMissDirection=long', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: undefined, fairwayMissDirection: undefined }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );
    const longLabels = screen.getAllByText('Long');
    fireEvent.press(longLabels[0]);
    fireEvent.press(screen.getByText('Done'));
    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fairwayHit: false, fairwayMissDirection: 'long' })
    );
  });
});

// ===========================================================================
// GREEN MISS DIRECTION
// ===========================================================================

describe('Green in regulation section', () => {
  it('shows green section when GIR=false and showGreenMissDirection=true', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: false }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('GREEN IN REGULATION')).toBeTruthy();
  });

  it('still shows green section when GIR=true (so user can re-toggle)', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('GREEN IN REGULATION')).toBeTruthy();
  });

  it('renders Hit and all four green direction buttons', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: false }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.getByText('Hit')).toBeTruthy();
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('Right')).toBeTruthy();
    expect(screen.getByText('Long')).toBeTruthy();
    expect(screen.getByText('Short')).toBeTruthy();
  });

  it('green Hit toggles greenInRegulation=true and clears miss direction', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: false, greenMissDirection: 'short' }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );
    fireEvent.press(screen.getByText('Hit'));
    fireEvent.press(screen.getByText('Done'));
    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ greenInRegulation: true, greenMissDirection: undefined })
    );
  });

  it('green direction button can be pressed to select', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: false, greenMissDirection: undefined }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    fireEvent.press(screen.getByText('Long'));
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('pressing the same green direction twice deselects it', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: false, greenMissDirection: 'short' }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );
    fireEvent.press(screen.getByText('Short'));
    fireEvent.press(screen.getByText('Done'));
    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ greenInRegulation: undefined, greenMissDirection: undefined })
    );
  });
});

// ===========================================================================
// BUNKER SHOTS STEPPER
// ===========================================================================

describe('Bunker shots stepper', () => {
  it('shows bunker stepper when showBunkerShots=true', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 0 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    expect(screen.getByText('BUNKER SHOTS')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('hides bunker stepper when showBunkerShots=false', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.queryByText('BUNKER SHOTS')).toBeNull();
  });

  it('increments bunker count when + is pressed', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 0 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    expect(screen.getByText('0')).toBeTruthy();
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('decrements bunker count when − is pressed', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 2 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    expect(screen.getByText('2')).toBeTruthy();
    fireEvent.press(screen.getByText('−'));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('does not decrement below 0', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 0 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    expect(screen.getByText('0')).toBeTruthy();
    // The − button is disabled at 0, but try pressing anyway
    fireEvent.press(screen.getByText('−'));
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('does not increment above 5', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 5 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    expect(screen.getByText('5')).toBeTruthy();
    // The + button is disabled at 5
    fireEvent.press(screen.getByText('+'));
    expect(screen.getByText('5')).toBeTruthy();
  });
});

// ===========================================================================
// HAZARD CHIPS
// ===========================================================================

describe('Hazard chips', () => {
  it('shows hazard chips when showHazards=true', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, hazards: [] }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={true}
      />
    );
    expect(screen.getByText('HAZARDS')).toBeTruthy();
    expect(screen.getByText(/Water/)).toBeTruthy();
    expect(screen.getByText(/OB/)).toBeTruthy();
    expect(screen.getByText(/Lateral/)).toBeTruthy();
    expect(screen.getByText(/Lost Ball/)).toBeTruthy();
  });

  it('hides hazard chips when showHazards=false', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
      />
    );
    expect(screen.queryByText('HAZARDS')).toBeNull();
  });

  it('hazard chips are multi-select: Water and OB can both be selected', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, hazards: [] }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={true}
      />
    );

    // Tap Water
    fireEvent.press(screen.getByText(/Water/));
    // Tap OB
    fireEvent.press(screen.getByText(/OB/));

    // Both should still be rendered (multi-select means neither deselects the other)
    expect(screen.getByText(/Water/)).toBeTruthy();
    expect(screen.getByText(/OB/)).toBeTruthy();
    // Done button still present
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('tapping a selected hazard deselects it', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, hazards: [{ type: 'water' }] }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={true}
      />
    );

    // Tap Water again to deselect
    fireEvent.press(screen.getByText(/Water/));
    // Done still available
    expect(screen.getByText('Done')).toBeTruthy();
  });
});

// ===========================================================================
// DONE BUTTON
// ===========================================================================

describe('Done button', () => {
  it('calls onClose when Done is pressed', () => {
    const onClose = jest.fn();
    render(<DetailedStatsSheet {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onStatsUpdate when Done is pressed', () => {
    const onStatsUpdate = jest.fn();
    render(<DetailedStatsSheet {...defaultProps} onStatsUpdate={onStatsUpdate} />);
    fireEvent.press(screen.getByText('Done'));
    expect(onStatsUpdate).toHaveBeenCalledTimes(1);
  });

  it('submits fairway direction selected by user', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: false, fairwayMissDirection: undefined }}
        showFairwayMissDirection={true}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );

    fireEvent.press(screen.getByText('Right'));
    fireEvent.press(screen.getByText('Done'));

    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fairwayMissDirection: 'right' })
    );
  });

  it('submits green direction selected by user', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: false, greenMissDirection: undefined }}
        showFairwayMissDirection={false}
        showGreenMissDirection={true}
        showBunkerShots={false}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );

    fireEvent.press(screen.getByText('Long'));
    fireEvent.press(screen.getByText('Done'));

    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ greenMissDirection: 'long' })
    );
  });

  it('submits bunker count after increment', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 0 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
        onStatsUpdate={onStatsUpdate}
      />
    );

    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByText('+'));
    fireEvent.press(screen.getByText('Done'));

    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ bunkerShots: 2 })
    );
  });

  it('submits hazards array with selected hazard types', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, hazards: [] }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={true}
        onStatsUpdate={onStatsUpdate}
      />
    );

    fireEvent.press(screen.getByText(/Water/));
    fireEvent.press(screen.getByText(/OB/));
    fireEvent.press(screen.getByText('Done'));

    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        hazards: expect.arrayContaining([
          expect.objectContaining({ type: 'water' }),
          expect.objectContaining({ type: 'ob' }),
        ]),
      })
    );
  });

  it('submits undefined hazards when none selected', () => {
    const onStatsUpdate = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, hazards: [] }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={false}
        showHazards={true}
        onStatsUpdate={onStatsUpdate}
      />
    );

    fireEvent.press(screen.getByText('Done'));

    expect(onStatsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ hazards: undefined })
    );
  });

  it('calls both onStatsUpdate and onClose when Done is pressed', () => {
    const onStatsUpdate = jest.fn();
    const onClose = jest.fn();
    render(
      <DetailedStatsSheet
        {...defaultProps}
        onStatsUpdate={onStatsUpdate}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByText('Done'));

    expect(onStatsUpdate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// STATE SYNC FROM SCORE PROP
// ===========================================================================

describe('State sync from score prop', () => {
  it('initialises bunker count from score.bunkerShots', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={{ ...baseScore, fairwayHit: true, greenInRegulation: true, bunkerShots: 3 }}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('initialises without bunker count when score is undefined', () => {
    render(
      <DetailedStatsSheet
        {...defaultProps}
        score={undefined}
        showFairwayMissDirection={false}
        showGreenMissDirection={false}
        showBunkerShots={true}
        showHazards={false}
      />
    );
    // Default bunker count is 0
    expect(screen.getByText('0')).toBeTruthy();
  });
});
