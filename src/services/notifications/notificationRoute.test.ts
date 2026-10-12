import { getNotificationRoute } from './notificationRoute';

type Input = Parameters<typeof getNotificationRoute>[0];

const base: Input = {
  type: 'scorecard_submitted' as Input['type'],
  round_id: null,
  competition_id: null,
  league_id: null,
  friendship_id: null,
  player_id: null,
};

const n = (overrides: Partial<Record<keyof Input, string | null>>): Input =>
  ({ ...base, ...overrides }) as Input;

describe('getNotificationRoute', () => {
  it('routes social round invitations/responses to ScheduledRound', () => {
    expect(getNotificationRoute(n({ type: 'social_round_invitation', round_id: 'r1' }))).toEqual({
      name: 'ScheduledRound',
      params: { roundId: 'r1' },
    });
    expect(getNotificationRoute(n({ type: 'social_round_response', round_id: 'r1' }))?.name).toBe(
      'ScheduledRound'
    );
  });

  it('routes activity engagement types to RoundActivity', () => {
    for (const type of ['round_liked', 'round_commented', 'round_also_commented', 'comment_liked']) {
      expect(getNotificationRoute(n({ type, round_id: 'r1', competition_id: 'c1' }))).toEqual({
        name: 'RoundActivity',
        params: { roundId: 'r1' },
      });
    }
  });

  it('routes other round notifications to ViewRound with competition context', () => {
    expect(getNotificationRoute(n({ round_id: 'r1', competition_id: 'c1' }))).toEqual({
      name: 'ViewRound',
      params: { roundId: 'r1', competitionId: 'c1' },
    });
  });

  it('falls back to competition then league', () => {
    expect(getNotificationRoute(n({ competition_id: 'c1', league_id: 'l1' }))).toEqual({
      name: 'CompetitionDetail',
      params: { id: 'c1' },
    });
    expect(getNotificationRoute(n({ league_id: 'l1' }))).toEqual({
      name: 'LeagueDetail',
      params: { id: 'l1' },
    });
  });

  it('opens the new friend profile for an accepted request with a player', () => {
    expect(
      getNotificationRoute(n({ type: 'friend_request_accepted', player_id: 'p1', friendship_id: 'f1' }))
    ).toEqual({ name: 'PlayerDetail', params: { id: 'p1' } });
  });

  it('routes friend requests without a player to Friends', () => {
    expect(getNotificationRoute(n({ type: 'friend_request_received' }))).toEqual({
      name: 'Friends',
      params: { fromProfile: true },
    });
    expect(getNotificationRoute(n({ type: 'friend_request_accepted' }))?.name).toBe('Friends');
    expect(getNotificationRoute(n({ friendship_id: 'f1' }))?.name).toBe('Friends');
  });

  it('returns null when there is nothing to open', () => {
    expect(getNotificationRoute(base)).toBeNull();
  });
});
