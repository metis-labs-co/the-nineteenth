import {
  buildCompetitionDetailTabs,
  reconcileCompetitionDetailTab,
  type CompetitionDetailRole,
} from './tabModel';

const availability = {
  roundsCount: 4,
  playersCount: 12,
  teams: true,
  stats: true,
  breakdown: true,
  payouts: true,
  skins: true,
  skinsCount: 3,
};

function keysAndLabels(
  role: CompetitionDetailRole,
  competitionType: 'event' | 'knockout',
  status: 'upcoming' | 'in-progress' | 'completed'
) {
  return buildCompetitionDetailTabs({ role, competitionType, status, availability }).map(
    ({ key, label }) => [key, label]
  );
}

describe('competition detail tab model', () => {
  it.each(['upcoming', 'in-progress'] as const)(
    'uses the complete organizer set with Standings when %s',
    (status) => {
      expect(keysAndLabels('organizer', 'event', status)).toEqual([
        ['details', 'Details'],
        ['rounds', 'Rounds'],
        ['leaderboard', 'Standings'],
        ['stats', 'Stats'],
        ['breakdown', 'Breakdown'],
        ['players', 'Players'],
        ['teams', 'Teams'],
        ['payouts', 'Payouts'],
        ['skins', 'Skins'],
      ]);
    }
  );

  it('renames organizer Standings to Results when completed', () => {
    expect(keysAndLabels('organizer', 'event', 'completed')[2]).toEqual([
      'leaderboard',
      'Results',
    ]);
  });

  it.each(['upcoming', 'in-progress'] as const)(
    'uses the reduced competitor set without payouts when %s',
    (status) => {
      expect(keysAndLabels('competitor', 'event', status)).toEqual([
        ['leaderboard', 'Standings'],
        ['rounds', 'Rounds'],
        ['players', 'Players'],
        ['skins', 'Skins'],
      ]);
    }
  );

  it('adds competitor payouts and Results only when completed', () => {
    expect(keysAndLabels('competitor', 'event', 'completed')).toEqual([
      ['leaderboard', 'Results'],
      ['rounds', 'Rounds'],
      ['players', 'Players'],
      ['skins', 'Skins'],
      ['payouts', 'Payouts'],
    ]);
  });

  it('uses Bracket instead of Standings for knockout competitions', () => {
    expect(keysAndLabels('competitor', 'knockout', 'upcoming')).toEqual([
      ['bracket', 'Bracket'],
      ['rounds', 'Rounds'],
      ['players', 'Players'],
      ['skins', 'Skins'],
    ]);
  });

  it('omits Skins for competitors who are not participants', () => {
    const tabs = buildCompetitionDetailTabs({
      role: 'competitor',
      competitionType: 'event',
      status: 'upcoming',
      availability: { ...availability, skins: false },
    });

    expect(tabs.map(({ key }) => key)).not.toContain('skins');
  });

  it('clamps inaccessible initial tabs to the role default', () => {
    const competitorTabs = buildCompetitionDetailTabs({
      role: 'competitor',
      competitionType: 'event',
      status: 'upcoming',
      availability,
    });
    expect(
      reconcileCompetitionDetailTab(
        'details',
        competitorTabs,
        'competitor',
        'event'
      )
    ).toBe('leaderboard');
    expect(
      reconcileCompetitionDetailTab(
        'payouts',
        competitorTabs,
        'competitor',
        'event'
      )
    ).toBe('leaderboard');
  });

  it('preserves a valid tab when completed makes payouts available', () => {
    const completedTabs = buildCompetitionDetailTabs({
      role: 'competitor',
      competitionType: 'event',
      status: 'completed',
      availability,
    });
    expect(
      reconcileCompetitionDetailTab(
        'rounds',
        completedTabs,
        'competitor',
        'event'
      )
    ).toBe('rounds');
  });
});
