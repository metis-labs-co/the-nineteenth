// src/__tests__/services/subMatches/updateSubMatchResult.test.ts
import { updateSubMatchResult } from '@/services/subMatches';
import { supabase } from '@/services/supabase/client';

jest.mock('@/services/supabase/client', () => ({ supabase: { from: jest.fn() } }));

function mockUpdateChain(returnedRow: Record<string, unknown>) {
  const single = jest.fn().mockResolvedValue({ data: returnedRow, error: null });
  const select = jest.fn().mockReturnValue({ single });
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  return { from: jest.fn().mockReturnValue({ update }), _update: update };
}

describe('updateSubMatchResult — finalHolesRemaining', () => {
  afterEach(() => jest.restoreAllMocks());

  it('persists final_holes_remaining when provided', async () => {
    const chain = mockUpdateChain({
      id: 'sm-1', round_id: 'r1', sort_order: 0,
      team_a_player_ids: ['a'], team_b_player_ids: ['b'],
      status: 'completed', result: 'a-wins', final_differential: 6,
      final_holes_remaining: 5, team_a_net_total: null, team_b_net_total: null,
      tee_time: null, pairing_id: null,
    });
    (supabase.from as jest.Mock).mockImplementation(chain.from);

    await updateSubMatchResult({
      subMatchId: 'sm-1', status: 'completed', result: 'a-wins',
      finalDifferential: 6, finalHolesRemaining: 5,
    });

    expect(chain._update).toHaveBeenCalledWith(
      expect.objectContaining({ final_differential: 6, final_holes_remaining: 5 })
    );
  });

  it('omits final_holes_remaining from the patch when undefined', async () => {
    const chain = mockUpdateChain({
      id: 'sm-1', round_id: 'r1', sort_order: 0,
      team_a_player_ids: ['a'], team_b_player_ids: ['b'],
      status: 'forfeited', result: 'forfeit-a', final_differential: null,
      final_holes_remaining: null, team_a_net_total: null, team_b_net_total: null,
      tee_time: null, pairing_id: null,
    });
    (supabase.from as jest.Mock).mockImplementation(chain.from);

    await updateSubMatchResult({ subMatchId: 'sm-1', status: 'forfeited', result: 'forfeit-a' });

    expect(chain._update.mock.calls[0][0]).not.toHaveProperty('final_holes_remaining');
  });

  it('persists manual_result when provided', async () => {
    const chain = mockUpdateChain({
      id: 'sm-1', round_id: 'r1', sort_order: 0,
      team_a_player_ids: ['a'], team_b_player_ids: ['b'],
      status: 'completed', result: 'a-wins', final_differential: 6,
      final_holes_remaining: 5, manual_result: true,
      team_a_net_total: null, team_b_net_total: null, tee_time: null, pairing_id: null,
    });
    (supabase.from as jest.Mock).mockImplementation(chain.from);

    await updateSubMatchResult({
      subMatchId: 'sm-1', status: 'completed', result: 'a-wins',
      finalDifferential: 6, finalHolesRemaining: 5, manualResult: true,
    });

    expect(chain._update).toHaveBeenCalledWith(
      expect.objectContaining({ manual_result: true })
    );
  });

  it('omits manual_result from the patch when undefined', async () => {
    const chain = mockUpdateChain({
      id: 'sm-1', round_id: 'r1', sort_order: 0,
      team_a_player_ids: ['a'], team_b_player_ids: ['b'],
      status: 'completed', result: 'a-wins', final_differential: 2,
      final_holes_remaining: null, manual_result: false,
      team_a_net_total: null, team_b_net_total: null, tee_time: null, pairing_id: null,
    });
    (supabase.from as jest.Mock).mockImplementation(chain.from);

    await updateSubMatchResult({ subMatchId: 'sm-1', status: 'completed', result: 'a-wins', finalDifferential: 2 });

    expect(chain._update.mock.calls[0][0]).not.toHaveProperty('manual_result');
  });
});
