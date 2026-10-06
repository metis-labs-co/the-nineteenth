import { buildCombinedShareMessage, calculateCombinedPayouts } from './combinedPayouts';

describe('calculateCombinedPayouts', () => {
  it('merges games, preserves membership flags, ranks ties, and settles the net positions', () => {
    const result = calculateCombinedPayouts(
      [
        { player_id: 'a', net_result: 10 },
        { player_id: 'b', net_result: -10 },
      ],
      [
        { player_id: 'a', net_result: -5 },
        { player_id: 'c', net_result: 5 },
      ],
      { a: 'Ada', b: 'Ben', c: 'Cam' }
    );

    expect(result.standings).toEqual([
      expect.objectContaining({ player_id: 'a', skins_net: 10, wolf_net: -5, total_net: 5, rank: 1, in_skins: true, in_wolf: true }),
      expect.objectContaining({ player_id: 'c', skins_net: 0, wolf_net: 5, total_net: 5, rank: 1, in_skins: false, in_wolf: true }),
      expect.objectContaining({ player_id: 'b', skins_net: -10, wolf_net: 0, total_net: -10, rank: 3, in_skins: true, in_wolf: false }),
    ]);
    expect(result.debts).toEqual([
      { from_player_id: 'b', to_player_id: 'a', amount: 5 },
      { from_player_id: 'b', to_player_id: 'c', amount: 5 },
    ]);
    expect(result.debts.reduce((sum, debt) => sum + debt.amount, 0)).toBe(10);
  });

  it('normalizes a non-zero-sum pot before settlement', () => {
    const result = calculateCombinedPayouts(
      [
        { player_id: 'a', net_result: -2 },
        { player_id: 'b', net_result: -6 },
      ],
      [],
      { a: 'Ada', b: 'Ben' }
    );

    expect(result.debts).toEqual([
      { from_player_id: 'b', to_player_id: 'a', amount: 2 },
    ]);
  });
});

describe('buildCombinedShareMessage', () => {
  it('includes standings and settlement names', () => {
    const { standings, debts } = calculateCombinedPayouts(
      [{ player_id: 'a', net_result: 5 }, { player_id: 'b', net_result: -5 }],
      [],
      { a: 'Ada', b: 'Ben' }
    );

    const message = buildCombinedShareMessage(
      standings,
      debts,
      { pot_value: 2 },
      null,
      { a: 'Ada', b: 'Ben' },
      'skins-only'
    );

    expect(message).toContain('Skins Payouts');
    expect(message).toContain('Ben → Ada');
    expect(message).toContain('Shared from The Nineteenth');
  });
});
