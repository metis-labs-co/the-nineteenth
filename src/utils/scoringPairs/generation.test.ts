/**
 * generateGroupAwareScoringPairs — unit tests
 *
 * Covers the invariants described in the function doc comment:
 *   - Pairs stay within a group.
 *   - Cross-team reciprocal pairs are preferred.
 *   - Uneven groups fall back to same-team pairs and surface a warning.
 *   - Groups of size 1 end up in unassignedPlayerIds.
 */

import { generateGroupAwareScoringPairs } from './generation';

describe('generateGroupAwareScoringPairs', () => {
  it('produces cross-team reciprocal pairs for a balanced 2v2 group', () => {
    const teamMap = new Map<string, string>([
      ['a1', 'Team A'],
      ['a2', 'Team A'],
      ['b1', 'Team B'],
      ['b2', 'Team B'],
    ]);
    const result = generateGroupAwareScoringPairs(
      [{ playerIds: ['a1', 'a2', 'b1', 'b2'] }],
      teamMap
    );

    // 2 cross-team reciprocal pairs → 4 scoring-pair rows (a↔b, a↔b).
    expect(result.pairs).toHaveLength(4);
    // No same-team fallbacks, no warnings.
    expect(result.sameTeamPairedPlayerIds).toEqual([]);
    expect(result.warnings).toEqual([]);
    // Every pair must have scorer and player on opposing teams.
    for (const p of result.pairs) {
      expect(teamMap.get(p.scorerId)).not.toEqual(teamMap.get(p.playerId));
    }
  });

  it('falls back to same-team pairs for an uneven group and surfaces a warning', () => {
    const teamMap = new Map<string, string>([
      ['a1', 'Team A'],
      ['a2', 'Team A'],
      ['a3', 'Team A'],
      ['b1', 'Team B'],
    ]);
    const result = generateGroupAwareScoringPairs(
      [{ playerIds: ['a1', 'a2', 'a3', 'b1'] }],
      teamMap
    );

    // Cross-team pair: a1↔b1 (2 rows). Leftover a2 + a3 pair same-team
    // reciprocally (2 rows). Total = 4 scoring-pair rows.
    expect(result.pairs).toHaveLength(4);
    // a2 and a3 should be in the same-team fallback list.
    expect(result.sameTeamPairedPlayerIds.sort()).toEqual(['a2', 'a3']);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('never pairs players across different groups', () => {
    const teamMap = new Map<string, string>([
      ['a1', 'Team A'],
      ['b1', 'Team B'],
      ['a2', 'Team A'],
      ['b2', 'Team B'],
    ]);
    const result = generateGroupAwareScoringPairs(
      [
        { id: 'g1', playerIds: ['a1', 'b1'] },
        { id: 'g2', playerIds: ['a2', 'b2'] },
      ],
      teamMap
    );

    const groupOf = (id: string) =>
      id === 'a1' || id === 'b1' ? 'g1' : 'g2';
    for (const p of result.pairs) {
      expect(groupOf(p.scorerId)).toEqual(groupOf(p.playerId));
    }
    // 2 groups × 1 cross-team reciprocal pair = 4 rows.
    expect(result.pairs).toHaveLength(4);
  });

  it('drops solo-player groups into unassignedPlayerIds', () => {
    const teamMap = new Map<string, string>([['solo', 'Team A']]);
    const result = generateGroupAwareScoringPairs(
      [{ playerIds: ['solo'] }],
      teamMap
    );

    expect(result.pairs).toEqual([]);
    expect(result.unassignedPlayerIds).toEqual(['solo']);
  });

  it('handles players without a team — they pair within the no-team bucket', () => {
    const teamMap = new Map<string, string>();
    const result = generateGroupAwareScoringPairs(
      [{ playerIds: ['p1', 'p2', 'p3', 'p4'] }],
      teamMap
    );

    // With no team info, the whole group is one bucket → reciprocal pairs.
    expect(result.pairs).toHaveLength(4);
  });
});
