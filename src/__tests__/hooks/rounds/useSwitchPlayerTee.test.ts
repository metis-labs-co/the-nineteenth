import { switchPlayerTeeAndPersist } from '@/hooks/rounds/mutations';
import { supabase } from '@/services/supabase/client';
import { upsertRoundPlayerTee } from '@/services/competitionPlayers/competitionPlayersService';
import { recalculateScorecardDifferential } from '@/services/handicap/recalculateScorecardDifferential';

jest.mock('@/services/competitionPlayers/competitionPlayersService', () => ({
  upsertRoundPlayerTee: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/handicap/recalculateScorecardDifferential', () => ({
  recalculateScorecardDifferential: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/services/supabase/client', () => {
  const update = jest.fn(() => ({
    eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
  }));
  return { supabase: { from: jest.fn(() => ({ update })) } };
});

const tee = { tee_id: 't1', name: 'Blue', color: 'blue', slopeRating: 120, courseRating: 71 };

describe('switchPlayerTeeAndPersist', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes round_players for standalone rounds', async () => {
    await switchPlayerTeeAndPersist({ roundId: 'r1', playerId: 'p1', tee });
    expect(supabase.from).toHaveBeenCalledWith('round_players');
    expect(upsertRoundPlayerTee).not.toHaveBeenCalled();
  });

  it('upserts competition_round_player_tees for competition rounds', async () => {
    await switchPlayerTeeAndPersist({ roundId: 'r1', playerId: 'p1', tee, competitionId: 'c1' });
    expect(upsertRoundPlayerTee).toHaveBeenCalledWith('r1', 'p1', tee);
    expect(supabase.from).not.toHaveBeenCalledWith('round_players');
  });

  it('recalculates when a scorecard id is provided', async () => {
    await switchPlayerTeeAndPersist({ roundId: 'r1', playerId: 'p1', tee, scorecardId: 'sc1' });
    expect(recalculateScorecardDifferential).toHaveBeenCalledWith('sc1');
  });

  it('skips recalculation when no scorecard id is provided', async () => {
    await switchPlayerTeeAndPersist({ roundId: 'r1', playerId: 'p1', tee });
    expect(recalculateScorecardDifferential).not.toHaveBeenCalled();
  });
});
