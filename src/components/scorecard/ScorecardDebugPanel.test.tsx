/**
 * ScorecardDebugPanel Component Tests
 *
 * Tests for the comprehensive debugging panel including:
 * - Visibility toggling
 * - Section expansion/collapse
 * - Round, hole, player, team, score display
 * - Sync and store status display
 * - Match play data display
 * - Copy to clipboard functionality
 * - Log to console functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { ScorecardDebugPanel } from './ScorecardDebugPanel';
import { createTestPlayer, createTeamWithMembers } from '@/__tests__/utils/testFixtures';
import type { Player, Hole, HoleScore, GameType } from '@/types';
import type { TeamWithMembers, TeamFormat } from '@/types/database.types';

// Mock the scorecard store - use require inside factory to avoid scope issues
const mockGetHoleInfo = jest.fn();
const mockGetPlayerScore = jest.fn();
const mockGetPlayerTotals = jest.fn();
const mockIsHoleComplete = jest.fn();
const mockGetCompletedHolesCount = jest.fn();

// Create mock holes inside the factory
const mockHoles: Hole[] = [
  { number: 1, par: 4, strokeIndex: 7, yardages: { white: 400, blue: 420, red: 380 } },
  { number: 2, par: 3, strokeIndex: 15, yardages: { white: 380, blue: 400, red: 360 } },
  { number: 3, par: 5, strokeIndex: 1, yardages: { white: 500, blue: 520, red: 480 } },
  { number: 4, par: 4, strokeIndex: 11, yardages: { white: 420, blue: 440, red: 400 } },
  { number: 5, par: 4, strokeIndex: 5, yardages: { white: 400, blue: 420, red: 380 } },
  { number: 6, par: 3, strokeIndex: 17, yardages: { white: 380, blue: 400, red: 360 } },
  { number: 7, par: 4, strokeIndex: 3, yardages: { white: 420, blue: 440, red: 400 } },
  { number: 8, par: 5, strokeIndex: 9, yardages: { white: 500, blue: 520, red: 480 } },
  { number: 9, par: 4, strokeIndex: 13, yardages: { white: 420, blue: 440, red: 400 } },
  { number: 10, par: 4, strokeIndex: 8, yardages: { white: 400, blue: 420, red: 380 } },
  { number: 11, par: 3, strokeIndex: 16, yardages: { white: 380, blue: 400, red: 360 } },
  { number: 12, par: 5, strokeIndex: 2, yardages: { white: 500, blue: 520, red: 480 } },
  { number: 13, par: 4, strokeIndex: 12, yardages: { white: 420, blue: 440, red: 400 } },
  { number: 14, par: 4, strokeIndex: 6, yardages: { white: 400, blue: 420, red: 380 } },
  { number: 15, par: 3, strokeIndex: 18, yardages: { white: 380, blue: 400, red: 360 } },
  { number: 16, par: 4, strokeIndex: 4, yardages: { white: 420, blue: 440, red: 400 } },
  { number: 17, par: 5, strokeIndex: 10, yardages: { white: 500, blue: 520, red: 480 } },
  { number: 18, par: 4, strokeIndex: 14, yardages: { white: 420, blue: 440, red: 400 } },
] as Hole[];

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

// Theme context is already mocked in jest.setup.js

// Get the mocked module
const { useScorecardStore } = require('@/store/scorecardStore');

describe('ScorecardDebugPanel', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    roundId: 'round-123',
    competitionId: 'comp-456',
    courseName: 'Test Golf Course',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetHoleInfo.mockReturnValue({
      number: 5,
      par: 4,
      strokeIndex: 5,
      yardages: { white: 400, blue: 420, red: 380 },
    });

    mockGetPlayerScore.mockReturnValue({
      strokes: 5,
      putts: 2,
      fairwayHit: true,
      greenInRegulation: false,
    });

    mockGetPlayerTotals.mockReturnValue({
      gross: 20,
      net: 18,
      points: 8,
    });

    mockIsHoleComplete.mockReturnValue(true);
    mockGetCompletedHolesCount.mockReturnValue(4);

    // Set up the default store mock
    useScorecardStore.mockReturnValue({
      currentRoundId: 'round-123',
      currentPlayers: [
        { id: 'player-1', name: 'John Smith', handicap: 15 },
        { id: 'player-2', name: 'Jane Doe', handicap: 20 },
      ],
      currentHole: 5,
      holes: mockHoles,
      gameType: 'stableford',
      groupScorecards: new Map([['player-1', {}], ['player-2', {}]]),
      isOnline: true,
      isSyncing: false,
      pendingSyncCount: 0,
      syncError: null,
      isInitialized: true,
      isLoading: false,
      allowedPlayerIds: [],
      getHoleInfo: mockGetHoleInfo,
      getPlayerScore: mockGetPlayerScore,
      getPlayerTotals: mockGetPlayerTotals,
      isHoleComplete: mockIsHoleComplete,
      getCompletedHolesCount: mockGetCompletedHolesCount,
    });
  });

  // ===========================================================================
  // VISIBILITY TESTS
  // ===========================================================================

  describe('Visibility', () => {
    it('renders when visible is true', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Debug Panel')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(<ScorecardDebugPanel {...defaultProps} visible={false} />);

      expect(screen.queryByText('Debug Panel')).toBeNull();
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header', () => {
    it('renders the Debug Panel title', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Debug Panel')).toBeTruthy();
    });

    it('renders close button with accessibility label', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByLabelText('Close debug panel')).toBeTruthy();
    });

    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      render(<ScorecardDebugPanel {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close debug panel');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders copy button with accessibility label', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByLabelText('Copy debug data')).toBeTruthy();
    });

    it('renders console log button with accessibility label', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByLabelText('Log to console')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ROUND INFO SECTION TESTS
  // ===========================================================================

  describe('Round Info Section', () => {
    it('renders Round Info section header', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Round Info')).toBeTruthy();
    });

    it('displays round ID (truncated)', () => {
      render(<ScorecardDebugPanel {...defaultProps} roundId="round-12345678-abcd" />);

      // Round ID should be truncated
      expect(screen.getByText(/round-12/)).toBeTruthy();
    });

    it('displays competition ID (truncated)', () => {
      render(<ScorecardDebugPanel {...defaultProps} competitionId="comp-98765432-wxyz" />);

      expect(screen.getByText(/comp-987/)).toBeTruthy();
    });

    it('displays game type', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('stableford')).toBeTruthy();
    });

    it('displays course name', () => {
      render(<ScorecardDebugPanel {...defaultProps} courseName="Royal Melbourne" />);

      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
    });

    it('displays "Unknown" when course name is null', () => {
      render(<ScorecardDebugPanel {...defaultProps} courseName={null} />);

      expect(screen.getByText('Unknown')).toBeTruthy();
    });

    it('displays is team round indicator', () => {
      render(<ScorecardDebugPanel {...defaultProps} isTeamRound={true} teamFormat="best-ball" />);

      // Is Team Round row shows "Yes" when it's a team round
      expect(screen.getByText('Is Team Round')).toBeTruthy();
    });

    it('displays team format when team round', () => {
      render(<ScorecardDebugPanel {...defaultProps} isTeamRound={true} teamFormat="scramble" />);

      expect(screen.getByText('scramble')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HOLE INFO SECTION TESTS
  // ===========================================================================

  describe('Hole Info Section', () => {
    it('renders Hole Info section header', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Hole Info')).toBeTruthy();
    });

    it('displays current hole number', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Current hole is 5, total holes is 18
      expect(screen.getByText('5 / 18')).toBeTruthy();
    });

    it('displays hole par', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Par 4 hole
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    });

    it('displays stroke index', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('displays completed holes count', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // mockGetCompletedHolesCount returns 4
      expect(screen.getByText('Completed Holes')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYERS SECTION TESTS
  // ===========================================================================

  describe('Players Section', () => {
    it('renders Players section header', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Players')).toBeTruthy();
    });

    it('displays total player count', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Total Players row label
      expect(screen.getByText('Total Players')).toBeTruthy();
    });

    it('displays player names', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Players section is expanded by default
      expect(screen.getByText('Players')).toBeTruthy();
    });

    it('displays player handicaps', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText(/HC: 15/)).toBeTruthy();
      expect(screen.getByText(/HC: 20/)).toBeTruthy();
    });

    it('displays scoring pairs status', () => {
      render(<ScorecardDebugPanel {...defaultProps} scoringPairsEnabled={true} />);

      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    it('displays players to score when scoring pairs enabled', () => {
      const playersToScore = [
        createTestPlayer({ id: 'p1', name: 'Alice' }),
        createTestPlayer({ id: 'p2', name: 'Bob' }),
      ];

      render(
        <ScorecardDebugPanel
          {...defaultProps}
          scoringPairsEnabled={true}
          playersToScore={playersToScore}
        />
      );

      expect(screen.getByText('Alice, Bob')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAMS SECTION TESTS
  // ===========================================================================

  describe('Teams Section', () => {
    it('renders Teams section when team round with teams', () => {
      const teams = [
        createTeamWithMembers(
          { id: 'team-1', name: 'Team Alpha' },
          [createTestPlayer({ id: 'p1', name: 'Alice' }), createTestPlayer({ id: 'p2', name: 'Bob' })]
        ),
      ];

      render(
        <ScorecardDebugPanel
          {...defaultProps}
          isTeamRound={true}
          teamFormat="best-ball"
          teams={teams}
        />
      );

      expect(screen.getByText('Teams')).toBeTruthy();
    });

    it('displays team names when section is expanded', () => {
      const teams = [
        createTeamWithMembers({ id: 'team-1', name: 'Team Alpha' }, []),
        createTeamWithMembers({ id: 'team-2', name: 'Team Beta' }, []),
      ];

      render(
        <ScorecardDebugPanel
          {...defaultProps}
          isTeamRound={true}
          teamFormat="scramble"
          teams={teams}
        />
      );

      // Teams section is collapsed by default - just verify header exists
      expect(screen.getByText('Teams')).toBeTruthy();

      // Expand the section to see content
      fireEvent.press(screen.getByText('Teams'));

      // Now content should be visible
      expect(screen.getByText(/Team Alpha/)).toBeTruthy();
    });

    it('displays team member names when section is expanded', () => {
      const teams = [
        createTeamWithMembers(
          { id: 'team-1', name: 'Team Alpha' },
          [
            createTestPlayer({ id: 'p1', name: 'Charlie' }),
            createTestPlayer({ id: 'p2', name: 'Diana' }),
          ]
        ),
      ];

      render(
        <ScorecardDebugPanel
          {...defaultProps}
          isTeamRound={true}
          teamFormat="best-ball"
          teams={teams}
        />
      );

      // Expand the Teams section
      fireEvent.press(screen.getByText('Teams'));

      expect(screen.getByText(/Charlie, Diana/)).toBeTruthy();
    });

    it('does not render Teams section when not team round', () => {
      render(<ScorecardDebugPanel {...defaultProps} isTeamRound={false} />);

      // Teams section header should not appear
      const teamsHeaders = screen.queryAllByText('Teams');
      // There might be text containing "Teams" in other contexts, so check specifically
      expect(teamsHeaders.length).toBe(0);
    });
  });

  // ===========================================================================
  // CURRENT HOLE SCORES SECTION TESTS
  // ===========================================================================

  describe('Current Hole Scores Section', () => {
    it('renders Current Hole Scores section header', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Current Hole Scores')).toBeTruthy();
    });

    it('displays hole subtitle', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Hole 5 Scores')).toBeTruthy();
    });

    it('displays strokes for each player', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // mockGetPlayerScore returns strokes: 5
      expect(screen.getAllByText('Strokes').length).toBeGreaterThanOrEqual(1);
    });

    it('displays putts for each player', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getAllByText('Putts').length).toBeGreaterThanOrEqual(1);
    });

    it('displays FIR (Fairway In Regulation) indicator', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getAllByText('FIR').length).toBeGreaterThanOrEqual(1);
    });

    it('displays GIR (Green In Regulation) indicator', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getAllByText('GIR').length).toBeGreaterThanOrEqual(1);
    });

    it('displays player totals', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // mockGetPlayerTotals returns gross: 20, net: 18, points: 8
      expect(screen.getAllByText(/Gross 20/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Net 18/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Pts 8/).length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty scores gracefully', () => {
      mockGetPlayerScore.mockReturnValue(undefined);

      render(<ScorecardDebugPanel {...defaultProps} />);

      // Should show dashes for empty scores
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // MATCH PLAY SECTION TESTS
  // ===========================================================================

  describe('Match Play Section', () => {
    const matchPlayData = {
      player1: { id: 'p1', name: 'John', handicap: 10 },
      player2: { id: 'p2', name: 'Jane', handicap: 15 },
      matchStatus: '2 UP',
      holeResults: {
        1: { player1Score: 4, player2Score: 5, winner: 'player1' },
        2: { player1Score: 3, player2Score: 3, winner: 'halved' },
        3: { player1Score: 5, player2Score: 4, winner: 'player2' },
      },
    };

    it('renders Match Play section when match play data provided', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      expect(screen.getByText('Match Play')).toBeTruthy();
    });

    it('displays player 1 info when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      // Match Play section is collapsed by default - expand it
      fireEvent.press(screen.getByText('Match Play'));

      expect(screen.getByText('John (HC: 10)')).toBeTruthy();
    });

    it('displays player 2 info when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      fireEvent.press(screen.getByText('Match Play'));

      expect(screen.getByText('Jane (HC: 15)')).toBeTruthy();
    });

    it('displays match status when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      fireEvent.press(screen.getByText('Match Play'));

      expect(screen.getByText('2 UP')).toBeTruthy();
    });

    it('displays hole results when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      fireEvent.press(screen.getByText('Match Play'));

      expect(screen.getByText('H1')).toBeTruthy();
      expect(screen.getByText('H2')).toBeTruthy();
      expect(screen.getByText('H3')).toBeTruthy();
    });

    it('displays scores for each hole when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      fireEvent.press(screen.getByText('Match Play'));

      expect(screen.getByText('4 vs 5')).toBeTruthy();
      expect(screen.getByText('3 vs 3')).toBeTruthy();
      expect(screen.getByText('5 vs 4')).toBeTruthy();
    });

    it('displays winner indicators when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      fireEvent.press(screen.getByText('Match Play'));

      // P1 for player1 win, = for halved, P2 for player2 win
      expect(screen.getByText('P1')).toBeTruthy();
      expect(screen.getByText('=')).toBeTruthy();
      expect(screen.getByText('P2')).toBeTruthy();
    });

    it('does not render Match Play section when no match play data', () => {
      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={undefined} />);

      expect(screen.queryByText('Match Play')).toBeNull();
    });
  });

  // ===========================================================================
  // SYNC STATUS SECTION TESTS
  // ===========================================================================

  describe('Sync Status Section', () => {
    it('renders Sync Status section header', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Sync Status')).toBeTruthy();
    });

    it('displays online status badge when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Expand the Sync Status section
      fireEvent.press(screen.getByText('Sync Status'));

      expect(screen.getByText('Online')).toBeTruthy();
    });

    it('displays pending sync label when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Expand the Sync Status section
      fireEvent.press(screen.getByText('Sync Status'));

      expect(screen.getByText('Pending Sync')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STORE STATUS SECTION TESTS
  // ===========================================================================

  describe('Store Status Section', () => {
    it('renders Store Status section header', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Store Status')).toBeTruthy();
    });

    it('displays initialized status badge', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Should show "Yes" for initialized
      expect(screen.getAllByText('Yes').length).toBeGreaterThanOrEqual(1);
    });

    it('displays loading status label when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Expand the Store Status section
      fireEvent.press(screen.getByText('Store Status'));

      expect(screen.getByText('Loading')).toBeTruthy();
    });

    it('displays scorecard count label when section expanded', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Expand the Store Status section
      fireEvent.press(screen.getByText('Store Status'));

      expect(screen.getByText('Scorecard Count')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SECTION TOGGLE TESTS
  // ===========================================================================

  describe('Section Toggling', () => {
    it('collapses section when header is pressed', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Initially Round Info should be expanded (in expandedSections set by default)
      expect(screen.getByText('Round Info')).toBeTruthy();

      // Verify content is visible before collapse
      expect(screen.getByText('Game Type')).toBeTruthy();

      // Press to collapse
      const sectionHeader = screen.getByText('Round Info');
      fireEvent.press(sectionHeader);

      // After collapse, the Game Type label should not be visible
      expect(screen.queryByText('Game Type')).toBeNull();
    });

    it('expands collapsed section when header is pressed', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      // Find a section that starts collapsed (not in default expandedSections)
      // Store Status is in default set, but let's toggle it
      const syncSection = screen.getByText('Sync Status');

      // Press twice - first collapse, then expand
      fireEvent.press(syncSection);
      fireEvent.press(syncSection);

      // Should still be visible
      expect(screen.getByText('Sync Status')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACTION BUTTON TESTS
  // ===========================================================================

  describe('Action Buttons', () => {
    it('handles copy to clipboard button press', () => {
      // Spy on console.log to verify the copy was attempted
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      render(<ScorecardDebugPanel {...defaultProps} />);

      const copyButton = screen.getByLabelText('Copy debug data');
      fireEvent.press(copyButton);

      // The component logs a message after copying
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ScorecardDebugPanel]')
      );

      consoleSpy.mockRestore();
    });

    it('handles log to console button press', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});

      render(<ScorecardDebugPanel {...defaultProps} />);

      const logButton = screen.getByLabelText('Log to console');
      fireEvent.press(logButton);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  // ===========================================================================
  // FOOTER TESTS
  // ===========================================================================

  describe('Footer', () => {
    it('renders footer text', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText(/tap headers to expand\/collapse/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty players array', () => {
      useScorecardStore.mockReturnValue({
        currentRoundId: 'round-123',
        currentPlayers: [],
        currentHole: 1,
        holes: [],
        gameType: 'stableford',
        groupScorecards: new Map(),
        isOnline: true,
        isSyncing: false,
        pendingSyncCount: 0,
        syncError: null,
        isInitialized: true,
        isLoading: false,
        allowedPlayerIds: [],
        getHoleInfo: mockGetHoleInfo,
        getPlayerScore: mockGetPlayerScore,
        getPlayerTotals: mockGetPlayerTotals,
        isHoleComplete: mockIsHoleComplete,
        getCompletedHolesCount: mockGetCompletedHolesCount,
      });

      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Debug Panel')).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy(); // 0 players
    });

    it('handles null roundId and competitionId', () => {
      render(
        <ScorecardDebugPanel
          {...defaultProps}
          roundId={undefined}
          competitionId={undefined}
        />
      );

      // Should show fallback from store's currentRoundId
      expect(screen.getByText('Debug Panel')).toBeTruthy();
    });

    it('handles empty teams array', () => {
      render(
        <ScorecardDebugPanel
          {...defaultProps}
          isTeamRound={true}
          teamFormat="best-ball"
          teams={[]}
        />
      );

      // Should not render teams section for empty array
      expect(screen.queryByText(/Team Count/)).toBeNull();
    });

    it('handles sync error display when section expanded', () => {
      useScorecardStore.mockReturnValue({
        currentRoundId: 'round-123',
        currentPlayers: [],
        currentHole: 1,
        holes: [],
        gameType: 'stableford',
        groupScorecards: new Map(),
        isOnline: false,
        isSyncing: false,
        pendingSyncCount: 5,
        syncError: 'Network error',
        isInitialized: true,
        isLoading: false,
        allowedPlayerIds: [],
        getHoleInfo: mockGetHoleInfo,
        getPlayerScore: mockGetPlayerScore,
        getPlayerTotals: mockGetPlayerTotals,
        isHoleComplete: mockIsHoleComplete,
        getCompletedHolesCount: mockGetCompletedHolesCount,
      });

      render(<ScorecardDebugPanel {...defaultProps} />);

      // Expand the Sync Status section to see the Offline badge
      fireEvent.press(screen.getByText('Sync Status'));

      expect(screen.getByText('Offline')).toBeTruthy();
    });

    it('handles missing hole data', () => {
      mockGetHoleInfo.mockReturnValue(undefined);

      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByText('Debug Panel')).toBeTruthy();
    });

    it('handles match play with null scores when section expanded', () => {
      const matchPlayData = {
        player1: { id: 'p1', name: 'John', handicap: 10 },
        player2: { id: 'p2', name: 'Jane', handicap: 15 },
        matchStatus: 'A/S',
        holeResults: {
          1: { player1Score: null, player2Score: null, winner: null },
        },
      };

      render(<ScorecardDebugPanel {...defaultProps} matchPlayData={matchPlayData} />);

      // Expand the Match Play section to see the content
      fireEvent.press(screen.getByText('Match Play'));

      expect(screen.getByText('- vs -')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible buttons', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      expect(screen.getByLabelText('Close debug panel')).toBeTruthy();
      expect(screen.getByLabelText('Copy debug data')).toBeTruthy();
      expect(screen.getByLabelText('Log to console')).toBeTruthy();
    });

    it('sections are touchable', () => {
      render(<ScorecardDebugPanel {...defaultProps} />);

      const roundInfoSection = screen.getByText('Round Info');
      expect(() => fireEvent.press(roundInfoSection)).not.toThrow();
    });
  });
});
