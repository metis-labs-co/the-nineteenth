import { deriveScoringMode } from '@/utils/scoringMode';

describe('deriveScoringMode', () => {
  const social = { competition_id: null, handicap_source: 'none', scoring_pairs_required: false };
  it.each([
    ['social round', social, 'social'],
    ['competition round', { ...social, competition_id: 'c1' }, 'standard'],
    ['handicap round (profile)', { ...social, handicap_source: 'profile' }, 'standard'],
    ['handicap round (NULL = profile)', { ...social, handicap_source: null }, 'standard'],
    ['scoring pairs', { ...social, scoring_pairs_required: true }, 'standard'],
    ['unknown competition', { handicap_source: 'none', scoring_pairs_required: false }, 'standard'],
    ['unknown pairs flag', { competition_id: null, handicap_source: 'none' }, 'standard'],
    ['no round', null, 'standard'],
  ])('%s → %s', (_n, round, expected) => {
    expect(deriveScoringMode(round as never)).toBe(expected);
  });
});
