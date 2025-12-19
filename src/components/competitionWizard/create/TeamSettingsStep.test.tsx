/**
 * TeamSettingsStep Component Tests
 *
 * Tests for the team settings step in competition creation including:
 * - Team mode selection (None, Fixed, Per-Round)
 * - Team size selection (when teams enabled)
 * - Point system preview
 * - Custom point editing
 * - Form validation
 * - Navigation (Back/Next buttons)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import TeamSettingsStep from './TeamSettingsStep';
import { DEFAULT_POINT_SYSTEM, type TeamSettingsFormData } from '@/schemas/competition';

// =====================================================
// MOCKS
// =====================================================

// Note: safe area context and LayoutAnimation are mocked in jest.setup.js

// =====================================================
// TEST FIXTURES
// =====================================================

const defaultInitialData: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const fixedTeamsInitialData: TeamSettingsFormData = {
  teamMode: 'fixed',
  teamSize: 2,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const perRoundTeamsInitialData: TeamSettingsFormData = {
  teamMode: 'per-round',
  teamSize: 4,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const customPointSystem = [
  { position: 1, points: 25 },
  { position: 2, points: 20 },
  { position: 3, points: 15 },
  { position: 4, points: 10 },
  { position: 5, points: 5 },
  { position: 6, points: 3 },
  { position: 7, points: 2 },
  { position: 8, points: 1 },
];

// =====================================================
// TESTS
// =====================================================

describe('TeamSettingsStep', () => {
  const defaultProps = {
    onComplete: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('Team Format')).toBeTruthy();
    });

    it('renders step description', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('Configure team settings and point system for your competition.')).toBeTruthy();
    });

    it('renders all three team mode options', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('No Teams')).toBeTruthy();
      expect(screen.getByText('Fixed Teams')).toBeTruthy();
      expect(screen.getByText('Per-Round')).toBeTruthy();
    });

    it('renders Point System section', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('Point System')).toBeTruthy();
      expect(screen.getByText('Points awarded based on finishing position')).toBeTruthy();
    });

    it('renders Back and Next buttons', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('Back')).toBeTruthy();
      expect(screen.getByText('Next: Round Details')).toBeTruthy();
    });

    it('renders with initial data', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      // Fixed Teams should be selected (check for description)
      expect(screen.getByText('Same teams throughout all rounds')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAM MODE SELECTION TESTS
  // ===========================================================================

  describe('Team Mode Selection', () => {
    it('defaults to No Teams mode', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // Check the description for no teams mode
      expect(screen.getByText('Individual competition - players compete solo')).toBeTruthy();
    });

    it('shows correct description for No Teams', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('Individual competition - players compete solo')).toBeTruthy();
    });

    it('changes to Fixed Teams mode when selected', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Fixed Teams'));

      await waitFor(() => {
        expect(screen.getByText('Same teams throughout all rounds')).toBeTruthy();
      });
    });

    it('changes to Per-Round mode when selected', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Per-Round'));

      await waitFor(() => {
        expect(screen.getByText('Teams change each round (rotating partners)')).toBeTruthy();
      });
    });

    it('has accessibility labels for team mode buttons', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByLabelText('No Teams')).toBeTruthy();
      expect(screen.getByLabelText('Fixed Teams')).toBeTruthy();
      expect(screen.getByLabelText('Per-Round')).toBeTruthy();
    });

    it('has accessibility hints for team mode buttons', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      const noTeamsButton = screen.getByLabelText('No Teams');
      expect(noTeamsButton.props.accessibilityHint).toBe('Individual competition - players compete solo');

      const fixedTeamsButton = screen.getByLabelText('Fixed Teams');
      expect(fixedTeamsButton.props.accessibilityHint).toBe('Same teams throughout all rounds');
    });

    it('marks team mode buttons as radio buttons', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      const noTeamsButton = screen.getByLabelText('No Teams');
      expect(noTeamsButton.props.accessibilityRole).toBe('radio');
    });

    it('indicates selected state for team mode buttons', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      const noTeamsButton = screen.getByLabelText('No Teams');
      expect(noTeamsButton.props.accessibilityState.selected).toBe(true);

      const fixedTeamsButton = screen.getByLabelText('Fixed Teams');
      expect(fixedTeamsButton.props.accessibilityState.selected).toBe(false);
    });
  });

  // ===========================================================================
  // TEAM SIZE TESTS
  // ===========================================================================

  describe('Team Size', () => {
    it('does not show team size when No Teams selected', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.queryByText('Team Size')).toBeNull();
    });

    it('shows team size when Fixed Teams selected', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      expect(screen.getByText('Team Size')).toBeTruthy();
      expect(screen.getByText('Number of players per team')).toBeTruthy();
    });

    it('shows team size when Per-Round selected', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={perRoundTeamsInitialData} />);

      expect(screen.getByText('Team Size')).toBeTruthy();
    });

    it('shows team size options (2, 3, 4)', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      // Use accessibility labels to find the specific team size buttons
      expect(screen.getByLabelText('2 players per team')).toBeTruthy();
      expect(screen.getByLabelText('3 players per team')).toBeTruthy();
      expect(screen.getByLabelText('4 players per team')).toBeTruthy();
    });

    it('defaults team size to 2', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      const button2 = screen.getByLabelText('2 players per team');
      expect(button2.props.accessibilityState.selected).toBe(true);
    });

    it('changes team size when option selected', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      const button4 = screen.getByLabelText('4 players per team');
      fireEvent.press(button4);

      await waitFor(() => {
        expect(button4.props.accessibilityState.selected).toBe(true);
      });
    });

    it('has accessibility labels for team size buttons', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      expect(screen.getByLabelText('2 players per team')).toBeTruthy();
      expect(screen.getByLabelText('3 players per team')).toBeTruthy();
      expect(screen.getByLabelText('4 players per team')).toBeTruthy();
    });

    it('marks team size buttons as radio buttons', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      const button2 = screen.getByLabelText('2 players per team');
      expect(button2.props.accessibilityRole).toBe('radio');
    });

    it('hides team size when switching back to No Teams', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      expect(screen.getByText('Team Size')).toBeTruthy();

      fireEvent.press(screen.getByText('No Teams'));

      await waitFor(() => {
        expect(screen.queryByText('Team Size')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // POINT SYSTEM TESTS
  // ===========================================================================

  describe('Point System', () => {
    it('shows default points preview', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // First 5 positions are shown in preview
      expect(screen.getByText('1st')).toBeTruthy();
      expect(screen.getByText('2nd')).toBeTruthy();
      expect(screen.getByText('3rd')).toBeTruthy();
      expect(screen.getByText('4th')).toBeTruthy();
      expect(screen.getByText('5th')).toBeTruthy();
    });

    it('shows point values for first 5 positions', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // Default points: 10, 8, 6, 5, 4 for positions 1-5
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
      expect(screen.getByText('6')).toBeTruthy();
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
    });

    it('shows more positions indicator when more than 5 positions', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // Default has 8 positions, so 3 more
      expect(screen.getByText('+3 more positions...')).toBeTruthy();
    });

    it('shows Customize Points button', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText('Customize Points')).toBeTruthy();
    });

    it('shows custom points editor when Customize Points pressed', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        expect(screen.getByText('Edit Point Values')).toBeTruthy();
        expect(screen.getByText('Reset')).toBeTruthy();
      });
    });

    it('toggles to Hide Customization when expanded', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        expect(screen.getByText('Hide Customization')).toBeTruthy();
      });
    });

    it('hides custom points editor when Hide Customization pressed', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // Open
      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        expect(screen.getByText('Hide Customization')).toBeTruthy();
      });

      // Close
      fireEvent.press(screen.getByText('Hide Customization'));

      await waitFor(() => {
        expect(screen.getByText('Customize Points')).toBeTruthy();
        expect(screen.queryByText('Edit Point Values')).toBeNull();
      });
    });

    it('shows all position inputs when custom editor open', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        // Should show all 8 default positions (1st through 8th)
        expect(screen.getAllByText('pts').length).toBe(8);
      });
    });

    it('has Reset button in custom editor', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        expect(screen.getByText('Reset')).toBeTruthy();
      });
    });

    it('has accessible customize button', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      const button = screen.getByLabelText('Customize points');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('has accessible reset button', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        const resetButton = screen.getByLabelText('Reset to default points');
        expect(resetButton.props.accessibilityRole).toBe('button');
      });
    });
  });

  // ===========================================================================
  // INFO BOX TESTS
  // ===========================================================================

  describe('Info Box', () => {
    it('shows individual competition info when No Teams selected', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      expect(screen.getByText(/Individual competition - each player competes for their own score/)).toBeTruthy();
    });

    it('shows fixed teams info when Fixed Teams selected', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      expect(screen.getByText(/Teams of 2 will be assigned once and stay the same/)).toBeTruthy();
    });

    it('shows per-round teams info when Per-Round selected', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={perRoundTeamsInitialData} />);

      expect(screen.getByText(/Teams of 4 will be rotated each round/)).toBeTruthy();
    });

    it('updates info box when team mode changes', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // Initially shows individual info
      expect(screen.getByText(/Individual competition - each player competes for their own score/)).toBeTruthy();

      // Switch to Fixed Teams
      fireEvent.press(screen.getByText('Fixed Teams'));

      await waitFor(() => {
        expect(screen.getByText(/Teams of 2 will be assigned once and stay the same/)).toBeTruthy();
      });
    });

    it('updates info box when team size changes', async () => {
      render(<TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />);

      expect(screen.getByText(/Teams of 2/)).toBeTruthy();

      fireEvent.press(screen.getByLabelText('4 players per team'));

      await waitFor(() => {
        expect(screen.getByText(/Teams of 4/)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('calls onBack when Back button pressed', () => {
      const onBack = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onBack={onBack} />);

      fireEvent.press(screen.getByText('Back'));

      expect(onBack).toHaveBeenCalled();
    });

    it('calls onComplete with form data when Next button pressed', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.teamMode).toBe('none');
        expect(callArgs.teamSize).toBe(2);
        expect(callArgs.pointSystem).toEqual(DEFAULT_POINT_SYSTEM);
      });
    });

    it('calls onComplete with Fixed Teams data', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} initialData={fixedTeamsInitialData} />);

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.teamMode).toBe('fixed');
        expect(callArgs.teamSize).toBe(2);
      });
    });

    it('calls onComplete with selected team size', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} initialData={fixedTeamsInitialData} />);

      // Change team size to 4
      fireEvent.press(screen.getByLabelText('4 players per team'));

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.teamSize).toBe(4);
      });
    });

    it('calls onComplete with Per-Round mode', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} />);

      // Switch to Per-Round
      fireEvent.press(screen.getByText('Per-Round'));

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.teamMode).toBe('per-round');
      });
    });
  });

  // ===========================================================================
  // INITIAL DATA TESTS
  // ===========================================================================

  describe('Initial Data', () => {
    it('uses default values when no initial data', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.teamMode).toBe('none');
        expect(callArgs.teamSize).toBe(2);
        expect(callArgs.pointSystem).toEqual(DEFAULT_POINT_SYSTEM);
      });
    });

    it('uses initial team mode', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={perRoundTeamsInitialData} />);

      // Per-Round should be selected
      expect(screen.getByText('Teams change each round (rotating partners)')).toBeTruthy();
    });

    it('uses initial team size', () => {
      render(<TeamSettingsStep {...defaultProps} initialData={perRoundTeamsInitialData} />);

      const button4 = screen.getByLabelText('4 players per team');
      expect(button4.props.accessibilityState.selected).toBe(true);
    });

    it('uses initial custom point system', () => {
      const customData: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: customPointSystem,
      };

      render(<TeamSettingsStep {...defaultProps} initialData={customData} />);

      // Custom points: 25 for 1st place
      expect(screen.getByText('25')).toBeTruthy();
    });
  });

  // ===========================================================================
  // POSITION LABEL TESTS
  // ===========================================================================

  describe('Position Labels', () => {
    it('formats 1st position correctly', () => {
      render(<TeamSettingsStep {...defaultProps} />);
      expect(screen.getByText('1st')).toBeTruthy();
    });

    it('formats 2nd position correctly', () => {
      render(<TeamSettingsStep {...defaultProps} />);
      expect(screen.getByText('2nd')).toBeTruthy();
    });

    it('formats 3rd position correctly', () => {
      render(<TeamSettingsStep {...defaultProps} />);
      expect(screen.getByText('3rd')).toBeTruthy();
    });

    it('formats 4th+ positions correctly', () => {
      render(<TeamSettingsStep {...defaultProps} />);
      expect(screen.getByText('4th')).toBeTruthy();
      expect(screen.getByText('5th')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      render(<TeamSettingsStep {...defaultProps} />, { isDarkMode: true });

      expect(screen.getByText('Team Format')).toBeTruthy();
      expect(screen.getByText('Point System')).toBeTruthy();
    });

    it('renders team size section in dark mode', () => {
      render(
        <TeamSettingsStep {...defaultProps} initialData={fixedTeamsInitialData} />,
        { isDarkMode: true }
      );

      expect(screen.getByText('Team Size')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty point system gracefully', () => {
      const emptyPointData: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: [],
      };

      render(<TeamSettingsStep {...defaultProps} initialData={emptyPointData} />);

      // Should not show "more positions" text
      expect(screen.queryByText(/more positions/)).toBeNull();
    });

    it('handles single point entry', () => {
      const singlePointData: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: [{ position: 1, points: 10 }],
      };

      render(<TeamSettingsStep {...defaultProps} initialData={singlePointData} />);

      expect(screen.getByText('1st')).toBeTruthy();
      expect(screen.getByText('10')).toBeTruthy();
    });

    it('handles exactly 5 points (no more text)', () => {
      const fivePointData: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: [
          { position: 1, points: 10 },
          { position: 2, points: 8 },
          { position: 3, points: 6 },
          { position: 4, points: 5 },
          { position: 5, points: 4 },
        ],
      };

      render(<TeamSettingsStep {...defaultProps} initialData={fivePointData} />);

      expect(screen.queryByText(/more positions/)).toBeNull();
    });

    it('handles 6 points (shows +1 more)', () => {
      const sixPointData: TeamSettingsFormData = {
        teamMode: 'none',
        teamSize: 2,
        pointSystem: [
          { position: 1, points: 10 },
          { position: 2, points: 8 },
          { position: 3, points: 6 },
          { position: 4, points: 5 },
          { position: 5, points: 4 },
          { position: 6, points: 3 },
        ],
      };

      render(<TeamSettingsStep {...defaultProps} initialData={sixPointData} />);

      expect(screen.getByText('+1 more positions...')).toBeTruthy();
    });

    it('handles rapid team mode switching', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      // Rapid switching
      fireEvent.press(screen.getByText('Fixed Teams'));
      fireEvent.press(screen.getByText('Per-Round'));
      fireEvent.press(screen.getByText('No Teams'));
      fireEvent.press(screen.getByText('Fixed Teams'));

      await waitFor(() => {
        expect(screen.getByText('Same teams throughout all rounds')).toBeTruthy();
        expect(screen.getByText('Team Size')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // FORM VALIDATION TESTS
  // ===========================================================================

  describe('Form Validation', () => {
    it('submits valid form without errors', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('submits valid Fixed Teams form', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} initialData={fixedTeamsInitialData} />);

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.teamMode).toBe('fixed');
        expect(callArgs.teamSize).toBe(2);
      });
    });

    it('includes point system in submission', async () => {
      const onComplete = jest.fn();
      render(<TeamSettingsStep {...defaultProps} onComplete={onComplete} />);

      fireEvent.press(screen.getByText('Next: Round Details'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const callArgs = onComplete.mock.calls[0][0];
        expect(callArgs.pointSystem).toBeDefined();
        expect(callArgs.pointSystem[0].position).toBe(1);
        expect(callArgs.pointSystem[0].points).toBe(10);
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible Back button', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      const backButton = screen.getByText('Back');
      expect(backButton).toBeTruthy();
    });

    it('has accessible Next button', () => {
      render(<TeamSettingsStep {...defaultProps} />);

      const nextButton = screen.getByText('Next: Round Details');
      expect(nextButton).toBeTruthy();
    });

    it('customize button updates label when expanded', async () => {
      render(<TeamSettingsStep {...defaultProps} />);

      fireEvent.press(screen.getByText('Customize Points'));

      await waitFor(() => {
        expect(screen.getByLabelText('Hide point customization')).toBeTruthy();
      });
    });
  });
});
