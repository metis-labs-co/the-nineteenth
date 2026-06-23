// src/__tests__/utils/competitionPoints/roundPointsSummary.test.ts
import {
  summarizeRoundPoints,
  summarizeCompetition,
} from '@/utils/competitionPoints/roundPointsSummary';
import type { Round } from '@/types/database.types';
import type { RoundRulesOverride } from '@/types/database/roundRules.types';

function round(id: string, override: RoundRulesOverride, extra: Partial<Round> = {}): Round {
  return {
    id,
    rules_override: override,
    round_format: 'combined',
    sub_match_size: null,
    name: null,
    ...extra,
  } as unknown as Round;
}

const CTX = { membersPerTeam: 4 };

describe('summarizeRoundPoints', () => {
  it('reports team-points max as the win value', () => {
    const s = summarizeRoundPoints(
      round('r3', { team_points: { win: 2, tie: 1, loss: 0 }, template_id: 'team_scramble_fixed_points' }),
      CTX
    );
    expect(s.maxPoints).toBe(2);
    expect(s.voided).toBe(false);
    expect(s.isCustom).toBe(false);
  });

  it('flags a voided round (all zero team points) and 0 max', () => {
    const s = summarizeRoundPoints(
      round('r1', { team_points: { win: 0, tie: 0, loss: 0 }, template_id: 'team_stableford_best_n_of_m' }),
      CTX
    );
    expect(s.maxPoints).toBe(0);
    expect(s.voided).toBe(true);
    expect(s.isCustom).toBe(true); // differs from template default 2/1/0
  });

  it('multiplies pair points by sub-match count and adds bonus', () => {
    const s = summarizeRoundPoints(
      round(
        'r2',
        {
          pair_points: { win: 1, tie: 0.5, loss: 0 },
          bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
        },
        { round_format: 'split', sub_match_size: 2 }
      ),
      CTX
    );
    expect(s.maxPoints).toBe(3); // 1 * (4/2) + 1 bonus
  });

  it('counts 4 singles sub-matches at 2 pts each', () => {
    const s = summarizeRoundPoints(
      round('r4', { pair_points: { win: 2, tie: 1, loss: 0 } }, { round_format: 'split', sub_match_size: 1 }),
      CTX
    );
    expect(s.maxPoints).toBe(8); // 2 * (4/1)
  });

  it('returns an empty title when the round has no name (component numbers it)', () => {
    const s = summarizeRoundPoints(
      round('r5', { team_points: { win: 2, tie: 1, loss: 0 } }),
      CTX
    );
    expect(s.title).toBe('');
  });
});

describe('summarizeCompetition', () => {
  it('totals max points and computes first-to-win', () => {
    const rounds: Round[] = [
      round('r1', { team_points: { win: 0, tie: 0, loss: 0 } }),
      round(
        'r2',
        {
          pair_points: { win: 1, tie: 0.5, loss: 0 },
          bonus_points: { enabled: true, metric: 'combined_match_margin', points: 1, tie: 'split' },
        },
        { round_format: 'split', sub_match_size: 2 }
      ),
      round('r3', { team_points: { win: 2, tie: 1, loss: 0 } }),
      round('r4', { pair_points: { win: 2, tie: 1, loss: 0 } }, { round_format: 'split', sub_match_size: 1 }),
    ];
    const result = summarizeCompetition(rounds, CTX);
    expect(result.total).toBe(13); // 0 + 3 + 2 + 8
    expect(result.toWin).toBe(7);
  });
});
