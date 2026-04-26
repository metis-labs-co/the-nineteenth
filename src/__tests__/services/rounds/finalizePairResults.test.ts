/**
 * finalizePairResults tests
 *
 * Covers R2 pair-points persistence for split (Ryder-Cup-style) rounds.
 */

import { finalizePairResults, isPairPointsOverride } from '@/services/rounds/finalizePairResults';
import * as roundResultsService from '@/services/rounds/roundResultsService';
import type { SubMatch } from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

const OVERRIDE: RoundRulesOverride = {
  template_id: 'pairs_better_ball',
  team_aggregation: 'pairs_better_ball',
  pair_points: { win: 1, tie: 0.5, loss: 0 },
};

function subMatch(overrides: Partial<SubMatch>): SubMatch {
  return {
    id: 'sm-' + Math.random().toString(36).slice(2, 8),
    round_id: 'round-1',
    sort_order: 0,
    team_a_player_ids: ['p1', 'p2'],
    team_b_player_ids: ['p3', 'p4'],
    tee_time: null,
    pairing_id: null,
    status: 'completed',
    result: 'a-wins',
    final_differential: 2,
    team_a_net_total: null,
    team_b_net_total: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('finalizePairResults', () => {
  let saveSpy: jest.SpyInstance;

  beforeEach(() => {
    saveSpy = jest
      .spyOn(roundResultsService, 'saveRoundResults')
      .mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes 2 team rows with accumulated pair points (Team A wins both 2v2 matches)', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, result: 'a-wins' }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [, rows] = saveSpy.mock.calls[0];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(2); // 1 + 1
    expect(byTeam['team-b']).toBe(0); // 0 + 0
  });

  it('handles halved sub-matches as 0.5 + 0.5', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'halved' }),
      subMatch({ sort_order: 1, result: 'a-wins' }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(1.5); // 0.5 (halved) + 1 (win)
    expect(byTeam['team-b']).toBe(0.5); // 0.5 (halved) + 0 (loss)
  });

  it('forfeit-b counts as Team A winning; forfeit-a as Team B winning', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'forfeit-b', status: 'forfeited' }),
      subMatch({ sort_order: 1, result: 'forfeit-a', status: 'forfeited' }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(1); // forfeit-b (A wins) + forfeit-a (A loses) = 1 + 0
    expect(byTeam['team-b']).toBe(1); // forfeit-b (B loses) + forfeit-a (B wins) = 0 + 1
  });

  it('skips in-progress and upcoming sub-matches', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, status: 'in-progress', result: null }),
      subMatch({ sort_order: 2, status: 'upcoming', result: null }),
    ];

    const count = await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    expect(count).toBe(2);
    const rows = saveSpy.mock.calls[0][1];
    const byTeam = Object.fromEntries(rows.map((r: { teamId: string; rawScore: number }) => [r.teamId, r.rawScore]));
    expect(byTeam['team-a']).toBe(1);
    expect(byTeam['team-b']).toBe(0);
  });

  it('assigns position 1 to the winning team and 2 to the loser', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, result: 'b-wins' }),
      subMatch({ sort_order: 2, result: 'a-wins' }),
    ];

    await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    const rows = saveSpy.mock.calls[0][1];
    const a = rows.find((r: { teamId: string }) => r.teamId === 'team-a');
    const b = rows.find((r: { teamId: string }) => r.teamId === 'team-b');
    expect(a.position).toBe(1); // 2 wins - 1 win
    expect(b.position).toBe(2);
  });

  it('assigns both teams position 1 when the overall score is tied', async () => {
    const subMatches: SubMatch[] = [
      subMatch({ sort_order: 0, result: 'a-wins' }),
      subMatch({ sort_order: 1, result: 'b-wins' }),
    ];

    await finalizePairResults({
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      rulesOverride: OVERRIDE,
      subMatches,
    });

    const rows = saveSpy.mock.calls[0][1];
    expect(rows.every((r: { position: number }) => r.position === 1)).toBe(true);
  });

  describe('perRoundRulesEnabled mode flag (Phase 6)', () => {
    it('no-ops when perRoundRulesEnabled=false even with pair_points set', async () => {
      const count = await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: OVERRIDE,
        perRoundRulesEnabled: false,
        subMatches: [subMatch({ result: 'a-wins' })],
      });
      expect(count).toBe(0);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('persists when perRoundRulesEnabled=true', async () => {
      const count = await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: OVERRIDE,
        perRoundRulesEnabled: true,
        subMatches: [subMatch({ result: 'a-wins' })],
      });
      expect(count).toBe(2);
    });

    it('treats undefined as legacy "honour override"', async () => {
      const count = await finalizePairResults({
        roundId: 'round-1',
        team1Id: 'team-a',
        team2Id: 'team-b',
        rulesOverride: OVERRIDE,
        subMatches: [subMatch({ result: 'a-wins' })],
      });
      expect(count).toBe(2);
    });
  });

  describe('guard rails', () => {
    const base = {
      roundId: 'round-1',
      team1Id: 'team-a',
      team2Id: 'team-b',
      subMatches: [subMatch({ result: 'a-wins' })],
    };

    it('no-ops when override has no pair_points', async () => {
      const count = await finalizePairResults({
        ...base,
        rulesOverride: { team_aggregation: 'sum' },
      });
      expect(count).toBe(0);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('no-ops when team1 or team2 is missing', async () => {
      const count = await finalizePairResults({
        ...base,
        team1Id: '',
        rulesOverride: OVERRIDE,
      });
      expect(count).toBe(0);
    });

    it('no-ops when there are no completed sub-matches', async () => {
      const count = await finalizePairResults({
        ...base,
        subMatches: [subMatch({ status: 'upcoming', result: null })],
        rulesOverride: OVERRIDE,
      });
      expect(count).toBe(0);
    });
  });

  describe('isPairPointsOverride', () => {
    it('returns true for split rounds with pair_points', () => {
      expect(isPairPointsOverride('split', OVERRIDE)).toBe(true);
    });

    it('returns false for combined rounds', () => {
      expect(isPairPointsOverride('combined', OVERRIDE)).toBe(false);
    });

    it('returns false without pair_points', () => {
      expect(isPairPointsOverride('split', { team_aggregation: 'sum' })).toBe(false);
    });

    it('returns false for null/undefined round_format or override', () => {
      expect(isPairPointsOverride(null, OVERRIDE)).toBe(false);
      expect(isPairPointsOverride('split', null)).toBe(false);
    });
  });
});
