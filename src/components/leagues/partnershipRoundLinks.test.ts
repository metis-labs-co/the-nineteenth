import { getPartnershipRoundLinks } from './partnershipRoundLinks';
import type { PartnershipRound } from '@/types/database';

const base = { id: 'pr1' } as PartnershipRound;

describe('getPartnershipRoundLinks', () => {
  it('returns one link when both scorecards share a round', () => {
    expect(
      getPartnershipRoundLinks({ ...base, round_1_id: 'r1', round_1_competition_id: 'c1', round_2_id: 'r1' }),
    ).toEqual([{ roundId: 'r1', competitionId: 'c1' }]);
  });

  it('returns both rounds when the scorecards differ', () => {
    expect(
      getPartnershipRoundLinks({ ...base, round_1_id: 'r1', round_2_id: 'r2', round_2_competition_id: null }),
    ).toEqual([
      { roundId: 'r1', competitionId: undefined },
      { roundId: 'r2', competitionId: null },
    ]);
  });

  it('returns nothing when no round is visible', () => {
    expect(getPartnershipRoundLinks({ ...base, round_1_id: null, round_2_id: null })).toEqual([]);
  });
});
