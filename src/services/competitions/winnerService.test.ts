import { fetchCompetitionWinner } from './winnerService';
import { getCompetitionResults } from '@/services/rounds/roundResultsService';

jest.mock('@/services/rounds/roundResultsService');

const mockGet = getCompetitionResults as jest.MockedFunction<typeof getCompetitionResults>;

// One round: team "Eagles" (12 pts) beats individual "Sam" (40 pts raw).
// Mixed aggregation would wrongly pick Sam; team-filtered must pick Eagles.
function resultsFixture() {
  return {
    rounds: [
      {
        roundId: 'r1',
        roundNumber: 1,
        gameType: 'stableford',
        results: [
          {
            player_id: null,
            team_id: 't-eagles',
            is_team_result: true,
            team: { name: 'Eagles' },
            player: null,
            raw_score: 74,
            position: 1,
            competition_points: 12,
          },
          {
            player_id: 'p-sam',
            team_id: null,
            is_team_result: false,
            team: null,
            player: { name: 'Sam' },
            raw_score: 40,
            position: 1,
            competition_points: 40,
          },
        ],
      },
    ],
  } as unknown as Awaited<ReturnType<typeof getCompetitionResults>>;
}

describe('fetchCompetitionWinner', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the winning TEAM for a team competition', async () => {
    mockGet.mockResolvedValue(resultsFixture());
    const winner = await fetchCompetitionWinner('c1', 'fixed');
    expect(winner).toEqual({ name: 'Eagles', points: 12, isTeam: true });
  });

  it('returns the winning INDIVIDUAL for a non-team competition', async () => {
    mockGet.mockResolvedValue(resultsFixture());
    const winner = await fetchCompetitionWinner('c1', 'none');
    expect(winner).toEqual({ name: 'Sam', points: 40, isTeam: false });
  });
});
