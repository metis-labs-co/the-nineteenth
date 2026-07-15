/**
 * ContributionsBoard Component Tests
 *
 * Tests for the ContributionsBoard component including:
 * - MVP rollup rendering
 * - Per-round breakdown rendering
 * - Data-missing warning
 * - Empty state
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ContributionsBoard } from './ContributionsBoard';
import type { ContributionsBoard as Board } from '@/utils/contributions';

// ============================================================================
// MOCKS
// ============================================================================

const mockUse = jest.fn();
jest.mock('@/hooks/competitions/useCompetitionContributions', () => ({
  useCompetitionContributions: (id: string) => mockUse(id),
}));

// Mock @/components/common to isolate ContributionsBoard from the rest of the
// barrel. Only stub what ContributionsBoard actually uses.
jest.mock('@/components/common', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ErrorState: ({ title, onRetry }: { title?: string; error?: unknown; onRetry?: () => void }) => (
      <View testID="error-state">
        <Text>{title ?? 'Error'}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry}>
            <Text>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
  };
});

// useThemeColors is globally mocked in jest.setup.js — no explicit provider needed.

// ============================================================================
// TEST FIXTURES
// ============================================================================

function board(partial: Partial<Board> = {}): Board {
  return {
    rollup: [
      {
        playerId: 'a',
        playerName: 'Ann Smith',
        weightIndex: 1.3,
        roundsCounted: 2,
        position: 1,
        isMvp: true,
      },
      {
        playerId: 'b',
        playerName: 'Bob Jones',
        weightIndex: 0.7,
        roundsCounted: 2,
        position: 2,
        isMvp: false,
      },
    ],
    rounds: [
      {
        roundId: 'r1',
        roundLabel: 'R1',
        format: 'best-ball',
        metricLabel: 'holes won',
        dataMissing: false,
        teams: [
          {
            teamId: 't1',
            teamName: 'Eagles',
            color: null,
            players: [
              {
                playerId: 'a',
                playerName: 'Ann Smith',
                value: 11,
                share: 0.61,
                position: 1,
                isMvp: true,
              },
              {
                playerId: 'b',
                playerName: 'Bob Jones',
                value: 7,
                share: 0.39,
                position: 2,
                isMvp: false,
              },
            ],
          },
        ],
      },
    ],
    isEmpty: false,
    ...partial,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ContributionsBoard', () => {
  beforeEach(() => mockUse.mockReset());

  it('renders the MVP rollup and per-round breakdown', () => {
    mockUse.mockReturnValue({
      board: board(),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ContributionsBoard competitionId="c1" />);

    // MVP rollup header
    expect(screen.getByText('★ COMPETITION MVP')).toBeTruthy();

    // MVP player "pull your weight" index
    expect(screen.getByText('1.3×')).toBeTruthy();
    expect(screen.getByText('1.0× = pulled their weight')).toBeTruthy();

    // Round header — format badge chip + round title are separate elements
    expect(screen.getByText('Best Ball')).toBeTruthy();
    expect(screen.getByText('R1')).toBeTruthy();

    // Crown emoji appears on the MVP rollup row.
    expect(screen.queryAllByText(/👑/).length).toBeGreaterThan(0);
  });

  it('shows the not-tracked warning for a data-missing round', () => {
    mockUse.mockReturnValue({
      board: board({
        rounds: [
          {
            roundId: 'r2',
            roundLabel: 'R2',
            format: 'scramble',
            metricLabel: 'shots used',
            dataMissing: true,
            teams: [],
          },
        ],
      }),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ContributionsBoard competitionId="c1" />);

    expect(screen.getByText(/weren't tracked/)).toBeTruthy();
  });

  it('shows empty state', () => {
    mockUse.mockReturnValue({
      board: { rollup: [], rounds: [], isEmpty: true },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ContributionsBoard competitionId="c1" />);

    expect(screen.getByText(/No team-format contributions yet/)).toBeTruthy();
  });
});
