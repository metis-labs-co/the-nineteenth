/**
 * Tests for pure functions in roundSession service.
 *
 * Only buildPlayerTeeMap and navigateToScoring are tested here — they are
 * the pure/synchronous functions that don't require Supabase mocks.
 */

import { buildPlayerTeeMap, navigateToScoring } from '../roundSession';
import type { TeeBox } from '@/types';
import type { PlayingPartner, TeamConfig } from '@/screens/rounds/CreateRoundBottomSheet';
import type { Player } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeeBox(id: string): TeeBox {
  return {
    id,
    name: id,
    color: 'white',
    courseRating: 72,
    slopeRating: 113,
  } as TeeBox;
}

function makePartner(id: string, selectedTee?: TeeBox): PlayingPartner {
  return { id, name: `Partner ${id}`, selectedTee };
}

function makePlayer(id: string): Player {
  return {
    id,
    name: `Player ${id}`,
    email: '',
    handicap: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeNavigation() {
  return { navigate: jest.fn() };
}

// ---------------------------------------------------------------------------
// buildPlayerTeeMap
// ---------------------------------------------------------------------------

describe('buildPlayerTeeMap', () => {
  it('maps current user to selectedTee when both are provided', () => {
    const tee = makeTeeBox('white');
    const result = buildPlayerTeeMap({
      currentUserId: 'user-1',
      selectedTee: tee,
      partners: [],
    });
    expect(result.get('user-1')).toBe(tee);
    expect(result.size).toBe(1);
  });

  it('does not set current user entry when selectedTee is undefined', () => {
    const result = buildPlayerTeeMap({
      currentUserId: 'user-1',
      selectedTee: undefined,
      partners: [],
    });
    expect(result.has('user-1')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('does not set current user entry when currentUserId is null', () => {
    const tee = makeTeeBox('blue');
    const result = buildPlayerTeeMap({
      currentUserId: null,
      selectedTee: tee,
      partners: [],
    });
    expect(result.has(null as any)).toBe(false);
    expect(result.size).toBe(0);
  });

  it('maps partner using selectedTee when partner has no override', () => {
    const tee = makeTeeBox('white');
    const partner = makePartner('p-1');
    const result = buildPlayerTeeMap({
      currentUserId: 'user-1',
      selectedTee: tee,
      partners: [partner],
    });
    expect(result.get('p-1')).toBe(tee);
  });

  it('partner override wins over selectedTee', () => {
    const globalTee = makeTeeBox('white');
    const partnerTee = makeTeeBox('red');
    const partner = makePartner('p-1', partnerTee);
    const result = buildPlayerTeeMap({
      currentUserId: 'user-1',
      selectedTee: globalTee,
      partners: [partner],
    });
    expect(result.get('p-1')).toBe(partnerTee);
    // Current user still gets the global tee
    expect(result.get('user-1')).toBe(globalTee);
  });

  it('omits partner from map when neither partner override nor selectedTee is set', () => {
    const partner = makePartner('p-1'); // no override
    const result = buildPlayerTeeMap({
      currentUserId: null,
      selectedTee: undefined,
      partners: [partner],
    });
    expect(result.has('p-1')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('handles multiple partners with mixed tee overrides', () => {
    const globalTee = makeTeeBox('white');
    const p1Tee = makeTeeBox('red');
    const partner1 = makePartner('p-1', p1Tee);
    const partner2 = makePartner('p-2'); // uses global
    const result = buildPlayerTeeMap({
      currentUserId: 'user-1',
      selectedTee: globalTee,
      partners: [partner1, partner2],
    });
    expect(result.get('user-1')).toBe(globalTee);
    expect(result.get('p-1')).toBe(p1Tee);
    expect(result.get('p-2')).toBe(globalTee);
    expect(result.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// navigateToScoring
// ---------------------------------------------------------------------------

describe('navigateToScoring', () => {
  it('navigates to Scorecard for stableford game type', () => {
    const nav = makeNavigation();
    navigateToScoring(nav as any, {
      roundId: 'r-1',
      gameType: 'stableford',
      players: [makePlayer('p-1')],
    });
    expect(nav.navigate).toHaveBeenCalledWith('Scorecard', {
      roundId: 'r-1',
      competitionId: 'standalone',
      isBuildAsYouPlay: undefined,
    });
  });

  it('navigates to Scorecard for stroke game type', () => {
    const nav = makeNavigation();
    navigateToScoring(nav as any, {
      roundId: 'r-2',
      gameType: 'stroke',
      players: [makePlayer('p-1')],
    });
    expect(nav.navigate).toHaveBeenCalledWith('Scorecard', {
      roundId: 'r-2',
      competitionId: 'standalone',
      isBuildAsYouPlay: undefined,
    });
  });

  it('passes isBuildAsYouPlay through to Scorecard', () => {
    const nav = makeNavigation();
    navigateToScoring(nav as any, {
      roundId: 'r-3',
      gameType: 'stableford',
      players: [makePlayer('p-1')],
      isBuildAsYouPlay: true,
    });
    expect(nav.navigate).toHaveBeenCalledWith('Scorecard', {
      roundId: 'r-3',
      competitionId: 'standalone',
      isBuildAsYouPlay: true,
    });
  });

  it('navigates to MatchPlayScoring for 1v1 match-play (no teamConfig, 2+ players)', () => {
    const nav = makeNavigation();
    navigateToScoring(nav as any, {
      roundId: 'r-4',
      gameType: 'match-play',
      players: [makePlayer('p-1'), makePlayer('p-2')],
    });
    expect(nav.navigate).toHaveBeenCalledWith('MatchPlayScoring', {
      roundId: 'r-4',
      player1Id: 'p-1',
      player2Id: 'p-2',
    });
  });

  it('navigates to TeamMatchPlayScoring for match-play with teamConfig and 2+ teams', () => {
    const nav = makeNavigation();
    const teamConfig: TeamConfig = {
      teams: [
        { id: 'team-1', name: 'Team 1', memberIds: ['p-1', 'p-2'] },
        { id: 'team-2', name: 'Team 2', memberIds: ['p-3', 'p-4'] },
      ],
    };
    navigateToScoring(nav as any, {
      roundId: 'r-5',
      gameType: 'match-play',
      teamConfig,
      players: [makePlayer('p-1'), makePlayer('p-2'), makePlayer('p-3'), makePlayer('p-4')],
    });
    expect(nav.navigate).toHaveBeenCalledWith('TeamMatchPlayScoring', {
      roundId: 'r-5',
      team1Id: 'team-1',
      team2Id: 'team-2',
    });
  });

  it('falls through to Scorecard for match-play with teamConfig but fewer than 2 teams', () => {
    const nav = makeNavigation();
    const teamConfig: TeamConfig = {
      teams: [{ id: 'team-1', name: 'Team 1', memberIds: ['p-1'] }],
    };
    navigateToScoring(nav as any, {
      roundId: 'r-6',
      gameType: 'match-play',
      teamConfig,
      players: [makePlayer('p-1'), makePlayer('p-2')],
    });
    // isMatchPlayWithTeams=true but teams.length < 2 → condition fails → falls to else (Scorecard)
    expect(nav.navigate).toHaveBeenCalledWith('Scorecard', {
      roundId: 'r-6',
      competitionId: 'standalone',
      isBuildAsYouPlay: undefined,
    });
  });

  it('falls through to Scorecard for 1v1 match-play with fewer than 2 players', () => {
    const nav = makeNavigation();
    navigateToScoring(nav as any, {
      roundId: 'r-7',
      gameType: 'match-play',
      players: [makePlayer('p-1')], // only 1 player
    });
    expect(nav.navigate).toHaveBeenCalledWith('Scorecard', {
      roundId: 'r-7',
      competitionId: 'standalone',
      isBuildAsYouPlay: undefined,
    });
  });
});
