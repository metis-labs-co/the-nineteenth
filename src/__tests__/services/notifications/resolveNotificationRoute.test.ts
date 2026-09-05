import { resolveNotificationRoute } from '@/services/notifications/notificationHandler';

const SOCIAL = [
  'round_liked',
  'round_commented',
  'round_also_commented',
  'comment_liked',
] as const;

describe('resolveNotificationRoute', () => {
  it.each(SOCIAL)('falls back to ViewRound for %s when positively restricted', (type) => {
    expect(resolveNotificationRoute(type, { isRestricted: true })).toBe('ViewRound');
  });

  it.each(SOCIAL)('routes %s to RoundActivity when not restricted', (type) => {
    expect(resolveNotificationRoute(type, { isRestricted: false })).toBe('RoundActivity');
  });

  // REGRESSION: notifications are frequently handled at cold start with no
  // cached profile. Treating "not yet known" as restricted would send eligible
  // users to the wrong screen on the app's most common deep-link path.
  it('routes to RoundActivity when the profile is not cached yet', () => {
    expect(resolveNotificationRoute('round_commented', { isRestricted: false })).toBe(
      'RoundActivity'
    );
  });

  it('leaves non-social notifications untouched', () => {
    expect(resolveNotificationRoute('tee_time_reminder', { isRestricted: true })).toBe(
      'ViewRound'
    );
    expect(resolveNotificationRoute('prize_pool_settled', { isRestricted: true })).toBe(
      'CompetitionDetail'
    );
  });
});
