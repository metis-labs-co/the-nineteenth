import {
  getMiniIndividualRows,
  getMiniTeamRows,
  resolveUserTeamId,
} from '@/utils/miniLeaderboard';
import type { CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import type { TeamWithMembers } from '@/types/database/team.types';

function ind(
  participantId: string,
  participantName: string,
  position: number,
  totalPoints: number,
): CompetitionLeaderboardEntry {
  return {
    participantId,
    participantName,
    isTeam: false,
    totalPoints,
    roundsPlayed: 2,
    position,
    tied: false,
    handicap: 10,
    teamMembers: [],
    roundPoints: [],
  };
}

function team(
  participantId: string,
  participantName: string,
  position: number,
  totalPoints: number,
): CompetitionLeaderboardEntry {
  return {
    ...ind(participantId, participantName, position, totalPoints),
    isTeam: true,
    handicap: null,
  };
}

const board = [
  ind('p1', 'Alice', 1, 40),
  ind('p2', 'Jess', 2, 38),
  ind('p3', 'You', 3, 32),
  ind('p4', 'Mike', 4, 28),
  ind('p5', 'Sam', 5, 20),
];

describe('getMiniIndividualRows', () => {
  it('returns above/you/below when user is in the middle', () => {
    const result = getMiniIndividualRows(board, 'p3');
    expect(result).toEqual({
      above: { id: 'p2', position: 2, name: 'Jess', points: 38, isCurrent: false },
      you: { id: 'p3', position: 3, name: 'You', points: 32, isCurrent: true },
      below: { id: 'p4', position: 4, name: 'Mike', points: 28, isCurrent: false },
    });
  });

  it('returns no above when user is first', () => {
    const result = getMiniIndividualRows(board, 'p1');
    expect(result?.above).toBeNull();
    expect(result?.you.id).toBe('p1');
    expect(result?.below?.id).toBe('p2');
  });

  it('returns no below when user is last', () => {
    const result = getMiniIndividualRows(board, 'p5');
    expect(result?.above?.id).toBe('p4');
    expect(result?.you.id).toBe('p5');
    expect(result?.below).toBeNull();
  });

  it('returns null when user is not in the leaderboard', () => {
    expect(getMiniIndividualRows(board, 'p99')).toBeNull();
  });

  it('returns just the user when leaderboard has one entry', () => {
    const single = [ind('p1', 'You', 1, 10)];
    const result = getMiniIndividualRows(single, 'p1');
    expect(result).toEqual({
      above: null,
      you: { id: 'p1', position: 1, name: 'You', points: 10, isCurrent: true },
      below: null,
    });
  });

  it('returns null when leaderboard is undefined or empty', () => {
    expect(getMiniIndividualRows(undefined, 'p1')).toBeNull();
    expect(getMiniIndividualRows([], 'p1')).toBeNull();
  });

  it('returns null when userId is undefined', () => {
    expect(getMiniIndividualRows(board, undefined)).toBeNull();
  });
});

describe('getMiniTeamRows', () => {
  const teams = [
    team('t1', 'Eagles', 1, 88),
    team('t2', 'Hawks', 2, 82),
    team('t3', 'Falcons', 3, 79),
  ];

  it('returns above/you/below when team is in the middle', () => {
    const result = getMiniTeamRows(teams, 't2');
    expect(result?.above?.id).toBe('t1');
    expect(result?.you.id).toBe('t2');
    expect(result?.below?.id).toBe('t3');
    expect(result?.you.isCurrent).toBe(true);
  });

  it('returns null when team is undefined', () => {
    expect(getMiniTeamRows(teams, undefined)).toBeNull();
  });

  it('returns null when team is not in the leaderboard', () => {
    expect(getMiniTeamRows(teams, 't99')).toBeNull();
  });
});

describe('resolveUserTeamId', () => {
  const t = (id: string, memberIds: string[]): TeamWithMembers => ({
    id,
    competition_id: 'c1',
    name: `Team ${id}`,
    created_at: '',
    updated_at: '',
    members: memberIds.map((pid) => ({
      team_id: id,
      player_id: pid,
      joined_at: '',
    })),
  });

  it('returns the team id the user belongs to', () => {
    const teamsList = [t('t1', ['p1', 'p2']), t('t2', ['p3', 'p4'])];
    expect(resolveUserTeamId(teamsList, 'p3')).toBe('t2');
  });

  it('returns undefined when user is on no team', () => {
    const teamsList = [t('t1', ['p1', 'p2'])];
    expect(resolveUserTeamId(teamsList, 'p9')).toBeUndefined();
  });

  it('returns undefined when teams or userId is missing', () => {
    expect(resolveUserTeamId(undefined, 'p1')).toBeUndefined();
    expect(resolveUserTeamId([], 'p1')).toBeUndefined();
    expect(resolveUserTeamId([t('t1', ['p1'])], undefined)).toBeUndefined();
  });
});
