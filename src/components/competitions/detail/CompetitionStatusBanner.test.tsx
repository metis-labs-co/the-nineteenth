/**
 * CompetitionStatusBanner tests — countdown maths, live-round derivation,
 * and winner derivation from the mini-leaderboard window.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CompetitionStatusBanner } from './CompetitionStatusBanner';
import type { Competition, CompetitionStatus } from '@/types/database.types';
import { DEFAULT_POINT_SYSTEM } from '@/types/database.types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import type { RoundWithCourse } from './types';

jest.mock('@/utils/formatting', () => ({
  formatDateAustralian: (date: string) => `formatted(${date})`,
}));

function localDateString(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function createCompetition(overrides: Partial<Competition> = {}): Competition {
  return {
    id: 'comp-1',
    name: 'Severn Cup',
    description: null,
    competition_type: 'event',
    start_date: localDateString(6),
    end_date: null,
    handicap_system: 'whs',
    handicap_source: 'profile',
    visibility: 'private',
    invite_code: 'CUP123',
    organizer_id: 'org-1',
    status: 'upcoming' as CompetitionStatus,
    team_mode: 'none',
    team_size: null,
    point_system: DEFAULT_POINT_SYSTEM,
    per_round_rules_enabled: false,
    knockout_config: null,
    whatsapp_group_invite_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  } as Competition;
}

function createRound(overrides: Partial<RoundWithCourse> = {}): RoundWithCourse {
  return {
    id: 'round-1',
    competition_id: 'comp-1',
    user_id: null,
    round_number: 1,
    display_order: 1,
    name: null,
    course_id: 'course-1',
    date: '2026-07-20',
    tee_time: null,
    rules_override: null,
    game_type: 'stableford',
    nine_type: 'full',
    selected_tee: null,
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    team1_id: null,
    team2_id: null,
    scoring_pairs_required: false,
    pairing_source: 'manual',
    pairing_style: null,
    pairing_metric: null,
    ball_count: 1,
    handicap_source: null,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    course: null,
    ...overrides,
  } as RoundWithCourse;
}

const miniWithWinner = (winnerName: string): MiniLeaderboardData => ({
  above: { id: 'p1', position: 1, name: winnerName, points: 90, isCurrent: false },
  you: { id: 'p2', position: 2, name: 'You', points: 80, isCurrent: true },
  below: { id: 'p3', position: 3, name: 'Other', points: 70, isCurrent: false },
});

const miniWithoutWinner = (): MiniLeaderboardData => ({
  above: { id: 'p4', position: 4, name: 'Above', points: 60, isCurrent: false },
  you: { id: 'p5', position: 5, name: 'You', points: 50, isCurrent: true },
  below: { id: 'p6', position: 6, name: 'Below', points: 40, isCurrent: false },
});

describe('CompetitionStatusBanner', () => {
  describe('upcoming', () => {
    it('shows day countdown with chip for a future start date', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ start_date: localDateString(6) })}
          rounds={[createRound(), createRound({ id: 'round-2' })]}
        />
      );
      expect(screen.getByText('Starts in 6 days')).toBeTruthy();
      expect(screen.getByText('6d')).toBeTruthy();
      expect(screen.getByText(/2 rounds/)).toBeTruthy();
    });

    it('shows "Starts tomorrow" for a next-day start', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ start_date: localDateString(1) })}
          rounds={[createRound()]}
        />
      );
      expect(screen.getByText('Starts tomorrow')).toBeTruthy();
      expect(screen.getByText('1d')).toBeTruthy();
    });

    it('shows "Starts today" with Today chip when start date is today', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ start_date: localDateString(0) })}
          rounds={[createRound()]}
        />
      );
      expect(screen.getByText('Starts today')).toBeTruthy();
      expect(screen.getByText('Today')).toBeTruthy();
    });

    it('handles past start dates gracefully (no chip)', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ start_date: localDateString(-3) })}
          rounds={[createRound()]}
        />
      );
      expect(screen.getByText('Ready to start')).toBeTruthy();
      expect(screen.queryByText(/-\d+d/)).toBeNull();
    });
  });

  describe('in-progress', () => {
    it('shows the first in-progress round with its positional number and format', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ status: 'in-progress' })}
          rounds={[
            createRound({ id: 'r1', status: 'completed' }),
            createRound({ id: 'r2', status: 'in-progress', game_type: 'stableford' }),
          ]}
        />
      );
      expect(screen.getByText(/Round 2 · .*in progress/)).toBeTruthy();
    });

    it('falls back to "Competition in progress" without a live round', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ status: 'in-progress' })}
          rounds={[
            createRound({ id: 'r1', status: 'completed' }),
            createRound({ id: 'r2', status: 'upcoming' }),
          ]}
        />
      );
      expect(screen.getByText('Competition in progress')).toBeTruthy();
      expect(screen.getByText('1 of 2 rounds complete')).toBeTruthy();
    });
  });

  describe('completed', () => {
    it('shows the winner when position 1 is visible in the mini window', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ status: 'completed' })}
          rounds={[createRound({ status: 'completed' })]}
          miniIndividual={miniWithWinner('Jess Patel')}
        />
      );
      expect(screen.getByText('Jess Patel wins')).toBeTruthy();
      expect(screen.getByText('Final')).toBeTruthy();
    });

    it('prefers the team winner over the individual winner', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ status: 'completed', team_mode: 'fixed' })}
          rounds={[createRound({ status: 'completed' })]}
          miniIndividual={miniWithWinner('Jess Patel')}
          miniTeam={miniWithWinner('Wales')}
        />
      );
      expect(screen.getByText('Wales wins')).toBeTruthy();
    });

    it('falls back to "Competition complete" when no winner is derivable', () => {
      render(
        <CompetitionStatusBanner
          competition={createCompetition({ status: 'completed' })}
          rounds={[createRound({ status: 'completed' })]}
          miniIndividual={miniWithoutWinner()}
        />
      );
      expect(screen.getByText('Competition complete')).toBeTruthy();
      expect(screen.getByText('Final')).toBeTruthy();
    });
  });

  it('renders nothing for cancelled competitions', () => {
    render(
      <CompetitionStatusBanner
        competition={createCompetition({ status: 'cancelled' })}
        rounds={[]}
      />
    );
    expect(screen.queryByTestId('competition-status-banner')).toBeNull();
  });
});
