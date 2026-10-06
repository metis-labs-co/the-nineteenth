import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { DEFAULT_POINT_SYSTEM } from '@/types/database.types';
import { SettingsSection } from './SettingsSection';

jest.mock('@/components/common/Pill', () => {
  const { Text } = require('react-native');
  return { Pill: ({ label }: { label: string }) => <Text>{label}</Text> };
});

const competition = (overrides: Partial<Competition> = {}): Competition =>
  ({
    id: 'competition-1',
    name: 'Summer Championship',
    competition_type: 'event',
    start_date: '2025-01-15',
    end_date: '2025-01-16',
    handicap_system: 'honor',
    handicap_source: 'profile',
    visibility: 'private',
    invite_code: 'SUMMER25',
    organizer_id: 'organizer-1',
    status: 'upcoming',
    team_mode: 'none',
    team_size: null,
    point_system: DEFAULT_POINT_SYSTEM,
    per_round_rules_enabled: false,
    knockout_config: null,
    whatsapp_group_invite_url: null,
    description: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  }) as Competition;

const team = (id: string, memberCount: number): TeamWithMembers =>
  ({
    id,
    competition_id: 'competition-1',
    name: `Team ${id}`,
    color: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    members: Array.from({ length: memberCount }, (_, index) => ({
      team_id: id,
      player_id: `${id}-${index}`,
      joined_at: '2025-01-01T00:00:00Z',
    })),
  }) as TeamWithMembers;

const renderSection = (
  value: Competition = competition(),
  teams: TeamWithMembers[] = [],
  hasStartedRound = false
) =>
  render(
    <SettingsSection
      competition={value}
      teams={teams}
      rounds={[] as Round[]}
      isOrganizer
      hasStartedRound={hasStartedRound}
    />
  );

describe('SettingsSection', () => {
  it('groups competition and scoring settings', () => {
    renderSection();

    expect(screen.getByText('Competition')).toBeTruthy();
    expect(screen.getByText('Scoring & handicaps')).toBeTruthy();
    expect(screen.getByText('Event')).toBeTruthy();
    expect(screen.getByText('Individual')).toBeTruthy();
    expect(screen.getByText('Social')).toBeTruthy();
    expect(screen.getByText('General rules')).toBeTruthy();
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getByText('01/15/2025')).toBeTruthy();
    expect(screen.getByText('01/16/2025')).toBeTruthy();
  });

  it.each([
    ['fixed', 'Fixed Teams'],
    ['per-round', 'Per-Round Teams'],
  ] as const)('renders the %s team format', (teamMode, label) => {
    renderSection(competition({ team_mode: teamMode, team_size: 2 }));
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('falls back to configured team size before teams exist', () => {
    renderSection(competition({ team_mode: 'fixed', team_size: 2 }));
    expect(screen.getByText('2 players')).toBeTruthy();
  });

  it('uses actual team membership and represents uneven teams', () => {
    renderSection(
      competition({ team_mode: 'fixed', team_size: 2 }),
      [team('a', 3), team('b', 4)]
    );

    expect(screen.getByText('3–4 players')).toBeTruthy();
    expect(screen.queryByText('2 players')).toBeNull();
  });

  it('omits team size for individual competitions', () => {
    renderSection();
    expect(screen.queryByText('Team Size')).toBeNull();
  });

  it('renders knockout without an empty end date row', () => {
    renderSection(competition({ competition_type: 'knockout', end_date: null }));
    expect(screen.getByText('Knockout')).toBeTruthy();
    expect(screen.queryByText('End Date')).toBeNull();
  });

  it('explains the locked state after scoring starts', () => {
    renderSection(competition(), [], true);
    expect(
      screen.getByText('Competition settings are locked once scoring has started.')
    ).toBeTruthy();
  });
});
