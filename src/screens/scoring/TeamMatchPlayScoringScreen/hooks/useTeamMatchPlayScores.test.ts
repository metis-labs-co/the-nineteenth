/**
 * useTeamMatchPlayScores Hook Tests
 *
 * Focuses on the net-score-aware best-ball logic: hole winners must be
 * decided on the lowest net score per team, not gross.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useTeamMatchPlayScores } from './useTeamMatchPlayScores';
import { useScorecardStore } from '@/store/scorecardStore';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole } from '@/types';
import type { MatchTeam } from '../types';

// ============================================================================
// Mocks
// ============================================================================

const mockGetPlayerScore = jest.fn();
const mockSetPlayerScore = jest.fn();

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

const mockedUseScorecardStore = useScorecardStore as jest.MockedFunction<typeof useScorecardStore>;

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({ success: '#0a0', warning: '#ff0' }),
}));

// ============================================================================
// Fixtures
// ============================================================================

function buildHoles(): Hole[] {
  const holes: Hole[] = [];
  for (let i = 1; i <= 18; i++) {
    holes.push({
      number: i as Hole['number'],
      par: 4 as Hole['par'],
      strokeIndex: i,
    });
  }
  return holes;
}

function buildTeam(
  id: string,
  name: string,
  members: { id: string; name: string; handicap: number }[]
): MatchTeam {
  return {
    id,
    name,
    handicap: 0,
    members: members.map((m) => ({ ...m, score: null, pickedUp: false })),
  };
}

function setupStoreMock(scores: Record<string, Record<number, number>>) {
  mockGetPlayerScore.mockImplementation((playerId: string, holeNumber: number) => {
    const strokes = scores[playerId]?.[holeNumber];
    return strokes != null ? { strokes } : undefined;
  });
  mockedUseScorecardStore.mockReturnValue({
    getPlayerScore: mockGetPlayerScore,
    setPlayerScore: mockSetPlayerScore,
  } as any);
}

const holes = buildHoles();

// ============================================================================
// Tests
// ============================================================================

describe('useTeamMatchPlayScores — net-score best ball', () => {
  beforeEach(() => jest.clearAllMocks());

  it('awards the hole to the team whose best NET score is lower (even when gross is tied)', () => {
    // Hole 3 (SI 3). team1 has HC-18 (gets 1 stroke) + HC-0 (none).
    // team2 has HC-4 (gets 1 stroke on SI <= 4) + HC-0.
    // All players card gross 5. team1's HC-18 net = 4; team2's HC-4 net = 4.
    // With these handicaps it's halved on net — verified by the symmetry test below.
    // For THIS test: team1 has HC-18 player (1 stroke), team2 has HC-0 players only.
    const team1 = buildTeam('t1', 'Team 1', [
      { id: 'p1a', name: 'A', handicap: 18 },
      { id: 'p1b', name: 'B', handicap: 0 },
    ]);
    const team2 = buildTeam('t2', 'Team 2', [
      { id: 'p2a', name: 'C', handicap: 0 },
      { id: 'p2b', name: 'D', handicap: 0 },
    ]);

    setupStoreMock({
      p1a: { 3: 5 },
      p1b: { 3: 5 },
      p2a: { 3: 5 },
      p2b: { 3: 5 },
    });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 3, holes));

    // Best contributor of team1 should be p1a (lowest net due to stroke)
    expect(result.current.getBestContributorForHole(team1, 3)).toBe('p1a');
    // Winner on net should be team1
    expect(result.current.getHoleWinnerForHole(3)).toBe('team1');
  });

  it('halves the hole when both teams have equal best net', () => {
    // Both teams have an HC-18 player carding 5 on SI 3 → net 4 each.
    const team1 = buildTeam('t1', 'Team 1', [
      { id: 'p1a', name: 'A', handicap: 18 },
    ]);
    const team2 = buildTeam('t2', 'Team 2', [
      { id: 'p2a', name: 'C', handicap: 18 },
    ]);

    setupStoreMock({
      p1a: { 3: 5 },
      p2a: { 3: 5 },
    });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 3, holes));

    expect(result.current.getHoleWinnerForHole(3)).toBe('halved');
  });

  it('returns the best-net contributor even when another teammate carded a lower gross', () => {
    // Hole 3 (SI 3). team1 has:
    //   A (HC 18): gross 5 → net 4
    //   B (HC 0):  gross 4 → net 4 (tie on net — tie-break by gross → B wins)
    // Displayed team score should therefore be B's gross (4), not A's.
    const team1 = buildTeam('t1', 'Team 1', [
      { id: 'p1a', name: 'A', handicap: 18 },
      { id: 'p1b', name: 'B', handicap: 0 },
    ]);
    const team2 = buildTeam('t2', 'Team 2', [
      { id: 'p2a', name: 'C', handicap: 0 },
    ]);

    setupStoreMock({
      p1a: { 3: 5 },
      p1b: { 3: 4 },
      p2a: { 3: 10 },
    });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 3, holes));

    expect(result.current.getBestContributorForHole(team1, 3)).toBe('p1b');
    expect(result.current.getTeamBestScoreForHole(team1, 3)).toBe(4);
  });
});

describe('useTeamMatchPlayScores — pickup (concession) semantics', () => {
  beforeEach(() => jest.clearAllMocks());

  const team1 = buildTeam('t1', 'Team 1', [{ id: 'p1a', name: 'A', handicap: 0 }]);
  const team2 = buildTeam('t2', 'Team 2', [{ id: 'p2a', name: 'C', handicap: 0 }]);

  it('counts a blow-up score above double bogey as a real contributor, not a pickup', () => {
    // Hole 1 par 4 → double bogey is 6. A 7 must score normally, not concede.
    setupStoreMock({ p1a: { 1: 7 } });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 1, holes));

    expect(result.current.isPlayerPickedUpOnHole('p1a', 1)).toBe(false);
    expect(result.current.getBestContributorForHole(team1, 1)).toBe('p1a');
    expect(result.current.getTeamBestScoreForHole(team1, 1)).toBe(7);
  });

  it('detects a pickup only at the explicit PICKUP_SCORE sentinel', () => {
    setupStoreMock({ p1a: { 1: PICKUP_SCORE } });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 1, holes));

    expect(result.current.isPlayerPickedUpOnHole('p1a', 1)).toBe(true);
    // A conceded member is not a valid best contributor.
    expect(result.current.getBestContributorForHole(team1, 1)).toBeNull();
  });

  it('stores the pickup sentinel when a player is picked up', async () => {
    setupStoreMock({});

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 1, holes));

    await act(async () => {
      await result.current.pickUpPlayer('p1a');
    });

    expect(mockSetPlayerScore).toHaveBeenCalledWith('p1a', 1, PICKUP_SCORE);
  });

  it('awards the hole to the opponent when a team concedes and the opponent has a score', () => {
    setupStoreMock({ p1a: { 1: PICKUP_SCORE }, p2a: { 1: 4 } });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 1, holes));

    expect(result.current.getHoleWinnerForHole(1)).toBe('team2');
  });

  it('leaves the hole undecided when a team concedes but the opponent has no score', () => {
    setupStoreMock({ p1a: { 1: PICKUP_SCORE } });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 1, holes));

    expect(result.current.getHoleWinnerForHole(1)).toBeNull();
  });

  it('halves the hole when both teams concede', () => {
    setupStoreMock({ p1a: { 1: PICKUP_SCORE }, p2a: { 1: PICKUP_SCORE } });

    const { result } = renderHook(() => useTeamMatchPlayScores(team1, team2, 1, holes));

    expect(result.current.getHoleWinnerForHole(1)).toBe('halved');
  });
});
