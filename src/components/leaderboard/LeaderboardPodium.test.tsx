/**
 * LeaderboardPodium Component Tests
 *
 * - Renders top 3 with visual arrangement 2nd / 1st / 3rd
 * - Skips rendering with <3 entries
 * - Skips rendering when ties make top-3 placings ambiguous
 * - Current user YOU pill
 * - Accessibility labels per slot
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LeaderboardPodium } from './LeaderboardPodium';
import type { LeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';

// =====================================================
// MOCKS
// =====================================================

jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconCrown: (_props: { size?: number; color?: string }) => (
      <View testID="icon-crown">
        <Text>CrownIcon</Text>
      </View>
    ),
  };
});

jest.mock('@/components/common', () => {
  const RN = require('react-native');
  return {
    ScaledText: ({ children, style, ...props }: any) => (
      <RN.Text style={style} {...props}>
        {children}
      </RN.Text>
    ),
    Badge: ({ label }: { label: string }) => <RN.Text>{label}</RN.Text>,
  };
});

// =====================================================
// FIXTURES
// =====================================================

function createEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    playerId: overrides.playerId || `player-${Math.random().toString(36).slice(2, 11)}`,
    playerName: 'Test Player',
    handicap: 12,
    totalPoints: 30,
    roundsPlayed: 2,
    ...overrides,
  };
}

const clearTopThree: LeaderboardEntry[] = [
  createEntry({ playerId: 'p3', playerName: 'Tom Brown', totalPoints: 35 }),
  createEntry({ playerId: 'p1', playerName: 'Mark ONeill', totalPoints: 38 }),
  createEntry({ playerId: 'p2', playerName: 'Alex Fraser', totalPoints: 36 }),
  createEntry({ playerId: 'p4', playerName: 'Dana White', totalPoints: 30 }),
];

// =====================================================
// TESTS
// =====================================================

describe('LeaderboardPodium', () => {
  describe('rendering', () => {
    it('renders the top three entries sorted by points', () => {
      render(<LeaderboardPodium entries={clearTopThree} testID="podium" />);

      expect(screen.getByTestId('podium')).toBeTruthy();
      expect(screen.getByText('Mark ONeill')).toBeTruthy();
      expect(screen.getByText('Alex Fraser')).toBeTruthy();
      expect(screen.getByText('Tom Brown')).toBeTruthy();
      expect(screen.queryByText('Dana White')).toBeNull();
    });

    it('shows points for each podium slot', () => {
      render(<LeaderboardPodium entries={clearTopThree} testID="podium" />);

      expect(screen.getByText('38 pts')).toBeTruthy();
      expect(screen.getByText('36 pts')).toBeTruthy();
      expect(screen.getByText('35 pts')).toBeTruthy();
    });

    it('arranges slots visually as 2nd, 1st, 3rd', () => {
      render(<LeaderboardPodium entries={clearTopThree} testID="podium" />);

      const container = screen.getByTestId('podium');
      const slotIds = container.children
        .map((child: any) => child?.props?.testID)
        .filter(Boolean);

      expect(slotIds).toEqual(['podium-rank-2', 'podium-rank-1', 'podium-rank-3']);
    });

    it('shows the crown on first place only', () => {
      render(<LeaderboardPodium entries={clearTopThree} testID="podium" />);

      expect(screen.getAllByTestId('icon-crown')).toHaveLength(1);
    });

    it('shows player initials in the avatar circles', () => {
      render(<LeaderboardPodium entries={clearTopThree} testID="podium" />);

      expect(screen.getByText('MO')).toBeTruthy();
      expect(screen.getByText('AF')).toBeTruthy();
      expect(screen.getByText('TB')).toBeTruthy();
    });
  });

  describe('skip conditions', () => {
    it('renders nothing with fewer than 3 entries', () => {
      render(
        <LeaderboardPodium entries={clearTopThree.slice(0, 2)} testID="podium" />
      );

      expect(screen.queryByTestId('podium')).toBeNull();
    });

    it('renders nothing with an empty list', () => {
      render(<LeaderboardPodium entries={[]} testID="podium" />);

      expect(screen.queryByTestId('podium')).toBeNull();
    });

    it('renders nothing when first and second are tied', () => {
      const tied = [
        createEntry({ playerId: 'a', totalPoints: 38 }),
        createEntry({ playerId: 'b', totalPoints: 38 }),
        createEntry({ playerId: 'c', totalPoints: 30 }),
      ];
      render(<LeaderboardPodium entries={tied} testID="podium" />);

      expect(screen.queryByTestId('podium')).toBeNull();
    });

    it('renders nothing when second and third are tied', () => {
      const tied = [
        createEntry({ playerId: 'a', totalPoints: 38 }),
        createEntry({ playerId: 'b', totalPoints: 34 }),
        createEntry({ playerId: 'c', totalPoints: 34 }),
      ];
      render(<LeaderboardPodium entries={tied} testID="podium" />);

      expect(screen.queryByTestId('podium')).toBeNull();
    });

    it('renders nothing when third is tied with fourth', () => {
      const tied = [
        createEntry({ playerId: 'a', totalPoints: 38 }),
        createEntry({ playerId: 'b', totalPoints: 36 }),
        createEntry({ playerId: 'c', totalPoints: 34 }),
        createEntry({ playerId: 'd', totalPoints: 34 }),
      ];
      render(<LeaderboardPodium entries={tied} testID="podium" />);

      expect(screen.queryByTestId('podium')).toBeNull();
    });

    it('renders with exactly 3 clear entries', () => {
      render(
        <LeaderboardPodium entries={clearTopThree.slice(0, 3)} testID="podium" />
      );

      expect(screen.getByTestId('podium')).toBeTruthy();
    });
  });

  describe('current user highlight', () => {
    it('shows the YOU pill on the current user slot', () => {
      render(
        <LeaderboardPodium
          entries={clearTopThree}
          currentUserId="p2"
          testID="podium"
        />
      );

      expect(screen.getByText('You')).toBeTruthy();
    });

    it('shows no YOU pill when the current user is not on the podium', () => {
      render(
        <LeaderboardPodium
          entries={clearTopThree}
          currentUserId="p4"
          testID="podium"
        />
      );

      expect(screen.queryByText('You')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('labels each slot with place, name and points', () => {
      render(<LeaderboardPodium entries={clearTopThree} testID="podium" />);

      expect(
        screen.getByLabelText('1st place: Mark ONeill, 38 points')
      ).toBeTruthy();
      expect(
        screen.getByLabelText('2nd place: Alex Fraser, 36 points')
      ).toBeTruthy();
      expect(
        screen.getByLabelText('3rd place: Tom Brown, 35 points')
      ).toBeTruthy();
    });

    it('appends "you" to the current user slot label', () => {
      render(
        <LeaderboardPodium
          entries={clearTopThree}
          currentUserId="p1"
          testID="podium"
        />
      );

      expect(
        screen.getByLabelText('1st place: Mark ONeill, 38 points, you')
      ).toBeTruthy();
    });
  });
});
