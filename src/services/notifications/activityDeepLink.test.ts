import { isActivityDetailNotificationType } from './activityDeepLink';

describe('isActivityDetailNotificationType', () => {
  it('is true for social engagement types', () => {
    for (const t of ['round_liked', 'round_commented', 'round_also_commented', 'comment_liked']) {
      expect(isActivityDetailNotificationType(t)).toBe(true);
    }
  });

  it('is false for other / missing types', () => {
    expect(isActivityDetailNotificationType('scorecard_submitted')).toBe(false);
    expect(isActivityDetailNotificationType('social_round_invitation')).toBe(false);
    expect(isActivityDetailNotificationType(undefined)).toBe(false);
    expect(isActivityDetailNotificationType(null)).toBe(false);
  });
});
