// src/__tests__/services/rounds/refinalizeRoundResults.noScorecards.test.ts
//
// Regression: a split pair-points round (Ryder-cup singles / split match play /
// alt-shot) finalized purely from manual sub-match results has NO completed
// scorecards. refinalizeRoundResults used to early-return on "no completed
// scorecards", so finalizePairResults never ran and the competition standings
// got no team rows for the round. It must now still finalize the pair results
// from the self-contained sub_matches.
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { supabase } from '@/services/supabase/client';
import * as pairModule from '@/services/rounds/finalizePairResults';
import * as roundResultsService from '@/services/rounds/roundResultsService';

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));

const COMP = { point_system: null, per_round_rules_enabled: true };

const SPLIT_MATCH_PLAY_ROUND = {
  game_type: 'match-play',
  competition_id: 'comp-1',
  rules_override: { pair_points: { win: 2, tie: 0.5, loss: 0 } },
  round_format: 'split',
  team1_id: null,
  team2_id: null,
  team_format: 'match-play-team',
};

function mockSupabase(round: Record<string, unknown>, completedScorecards: unknown[]) {
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'rounds') {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: round, error: null }) }) }) };
    }
    if (table === 'competitions') {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: COMP, error: null }) }) }) };
    }
    if (table === 'scorecards') {
      // .select('*').eq('round_id', x).eq('status', 'completed')
      return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: completedScorecards, error: null }) }) }) };
    }
    return {};
  });
}

describe('refinalizeRoundResults — split pair-points round with no completed scorecards', () => {
  afterEach(() => jest.restoreAllMocks());

  it('finalizes pair results from sub-matches even when zero scorecards are completed', async () => {
    mockSupabase(SPLIT_MATCH_PLAY_ROUND, []);
    jest.spyOn(roundResultsService, 'deleteIndividualRoundResults').mockResolvedValue(undefined);
    const pairSpy = jest.spyOn(pairModule, 'finalizePairResults').mockResolvedValue(2);

    await refinalizeRoundResults('round-1');

    expect(pairSpy).toHaveBeenCalledTimes(1);
    expect(pairSpy).toHaveBeenCalledWith(
      expect.objectContaining({ roundId: 'round-1', competitionId: 'comp-1' })
    );
  });

  it('does NOT finalize pair results for a non-pair-points round with no scorecards', async () => {
    mockSupabase({ ...SPLIT_MATCH_PLAY_ROUND, round_format: 'combined', rules_override: null }, []);
    const pairSpy = jest.spyOn(pairModule, 'finalizePairResults').mockResolvedValue(0);

    await refinalizeRoundResults('round-2');

    expect(pairSpy).not.toHaveBeenCalled();
  });
});
