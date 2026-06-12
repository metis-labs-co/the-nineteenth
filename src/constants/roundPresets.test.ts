import {
  ROUND_PRESETS,
  ROUND_PRESET_ORDER,
  getPresetAvailability,
  inferPresetIdFromRound,
  isTierAllowed,
  matchesPreset,
  type PresetAvailabilityContext,
  type RoundShapeForPresets,
} from './roundPresets';

function makeRound(overrides: Partial<RoundShapeForPresets> = {}): RoundShapeForPresets {
  return {
    game_type: 'stableford',
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    rules_override: null,
    ...overrides,
  };
}

describe('matchesPreset', () => {
  it('matches individual stableford exactly', () => {
    expect(matchesPreset(makeRound(), ROUND_PRESETS.individual_stableford)).toBe(true);
  });

  it('rejects individual stableford when is_team_round is true', () => {
    expect(
      matchesPreset(
        makeRound({ is_team_round: true, team_format: 'aggregate' }),
        ROUND_PRESETS.individual_stableford
      )
    ).toBe(false);
  });

  it('matches 2v2 Pairs Better Ball only when sub_match_size=2 and override is set', () => {
    const round = makeRound({
      is_team_round: true,
      team_format: 'best-ball',
      round_format: 'split',
      sub_match_size: 2,
      rules_override: ROUND_PRESETS.pairs_better_ball_2v2.config.rules_override,
    });
    expect(matchesPreset(round, ROUND_PRESETS.pairs_better_ball_2v2)).toBe(true);
  });

  it('rejects 2v2 Pairs Better Ball when sub_match_size is 3', () => {
    const round = makeRound({
      is_team_round: true,
      team_format: 'best-ball',
      round_format: 'split',
      sub_match_size: 3,
      rules_override: ROUND_PRESETS.pairs_better_ball_2v2.config.rules_override,
    });
    expect(matchesPreset(round, ROUND_PRESETS.pairs_better_ball_2v2)).toBe(false);
  });

  it('matches Team Scramble with scramble override', () => {
    const round = makeRound({
      game_type: 'scramble',
      is_team_round: true,
      team_format: 'scramble',
      rules_override: ROUND_PRESETS.team_scramble.config.rules_override,
    });
    expect(matchesPreset(round, ROUND_PRESETS.team_scramble)).toBe(true);
  });

  it('matches 2v2 Pairs Scramble only when split + scramble override + sub_match_size=2', () => {
    const round = makeRound({
      game_type: 'scramble',
      is_team_round: true,
      team_format: 'scramble',
      round_format: 'split',
      sub_match_size: 2,
      rules_override: ROUND_PRESETS.pairs_scramble_2v2.config.rules_override,
    });
    expect(matchesPreset(round, ROUND_PRESETS.pairs_scramble_2v2)).toBe(true);
    // Combined (non-split) scramble should NOT match the 2v2 pairs preset.
    expect(matchesPreset(round, ROUND_PRESETS.team_scramble)).toBe(false);
  });

  it('distinguishes 2v2 Pairs Scramble from 2v2 Pairs Better Ball via game_type + template', () => {
    const scrambleRound = makeRound({
      game_type: 'scramble',
      is_team_round: true,
      team_format: 'scramble',
      round_format: 'split',
      sub_match_size: 2,
      rules_override: ROUND_PRESETS.pairs_scramble_2v2.config.rules_override,
    });
    expect(matchesPreset(scrambleRound, ROUND_PRESETS.pairs_scramble_2v2)).toBe(true);
    expect(matchesPreset(scrambleRound, ROUND_PRESETS.pairs_better_ball_2v2)).toBe(false);

    const betterBallRound = makeRound({
      game_type: 'stableford',
      is_team_round: true,
      team_format: 'best-ball',
      round_format: 'split',
      sub_match_size: 2,
      rules_override: ROUND_PRESETS.pairs_better_ball_2v2.config.rules_override,
    });
    expect(matchesPreset(betterBallRound, ROUND_PRESETS.pairs_better_ball_2v2)).toBe(true);
    expect(matchesPreset(betterBallRound, ROUND_PRESETS.pairs_scramble_2v2)).toBe(false);
  });

  it('distinguishes Team Stableford (aggregate) from Best 3 of 4 via rules_override', () => {
    const aggregateRound = makeRound({
      is_team_round: true,
      team_format: 'aggregate',
    });
    expect(matchesPreset(aggregateRound, ROUND_PRESETS.team_stableford_aggregate)).toBe(true);
    expect(matchesPreset(aggregateRound, ROUND_PRESETS.team_stableford_best_n)).toBe(false);

    const bestNRound = makeRound({
      is_team_round: true,
      team_format: 'aggregate',
      rules_override: ROUND_PRESETS.team_stableford_best_n.config.rules_override,
    });
    expect(matchesPreset(bestNRound, ROUND_PRESETS.team_stableford_best_n)).toBe(true);
    expect(matchesPreset(bestNRound, ROUND_PRESETS.team_stableford_aggregate)).toBe(false);
  });
});

describe('inferPresetIdFromRound', () => {
  it('returns the right preset id for each catalog entry', () => {
    for (const id of ROUND_PRESET_ORDER) {
      const preset = ROUND_PRESETS[id];
      const round: RoundShapeForPresets = {
        ...preset.config,
        // Normalise optional nullable fields the way a DB row would.
        team_format: preset.config.team_format ?? null,
        sub_match_size: preset.config.sub_match_size ?? null,
        rules_override: preset.config.rules_override ?? null,
      };
      expect(inferPresetIdFromRound(round)).toBe(id);
    }
  });

  it('returns null for a combination that matches no preset', () => {
    // Shamble + split is not in the catalog.
    const weird = makeRound({
      game_type: 'shamble',
      is_team_round: true,
      team_format: 'shamble',
      round_format: 'split',
      sub_match_size: 2,
    });
    expect(inferPresetIdFromRound(weird)).toBeNull();
  });

  it('returns null when the saved override template does not match any preset', () => {
    // Stableford aggregate round with a scramble override — legacy mismatch.
    const round = makeRound({
      is_team_round: true,
      team_format: 'aggregate',
      rules_override: ROUND_PRESETS.team_scramble.config.rules_override,
    });
    expect(inferPresetIdFromRound(round)).toBeNull();
  });
});

describe('isTierAllowed', () => {
  it('free user cannot use premium presets', () => {
    expect(isTierAllowed('free', 'premium')).toBe(false);
  });

  it('social user can use free and social presets', () => {
    expect(isTierAllowed('social', 'free')).toBe(true);
    expect(isTierAllowed('social', 'social')).toBe(true);
    expect(isTierAllowed('social', 'premium')).toBe(false);
  });

  it('premium user can use premium presets', () => {
    expect(isTierAllowed('premium', 'premium')).toBe(true);
  });

  it('super_admin can use everything', () => {
    expect(isTierAllowed('super_admin', 'premium')).toBe(true);
    expect(isTierAllowed('super_admin', 'social')).toBe(true);
    expect(isTierAllowed('super_admin', 'free')).toBe(true);
  });
});

describe('getPresetAvailability', () => {
  const context = (overrides: Partial<PresetAvailabilityContext> = {}): PresetAvailabilityContext => ({
    tier: 'free',
    isStandalone: false,
    perRoundRulesEnabled: true,
    ...overrides,
  });

  it('free user sees individual_stableford as fully available', () => {
    const avail = getPresetAvailability(ROUND_PRESETS.individual_stableford, context());
    expect(avail.tierAllowed).toBe(true);
    expect(avail.contextAllowed).toBe(true);
    expect(avail.rulesWouldBeIgnored).toBe(false);
  });

  it('free user sees team_scramble as tier-locked', () => {
    const avail = getPresetAvailability(ROUND_PRESETS.team_scramble, context());
    expect(avail.tierAllowed).toBe(false);
  });

  it('standalone round blocks comp-only presets (no standalone field)', () => {
    // pairs_better_ball_2v2 has no standalone field — it requires competition
    // team rosters to generate sub-match pairings.
    const avail = getPresetAvailability(
      ROUND_PRESETS.pairs_better_ball_2v2,
      context({ tier: 'premium', isStandalone: true })
    );
    expect(avail.contextAllowed).toBe(false);
  });

  it('flags rulesWouldBeIgnored when competition has per_round_rules_enabled=false', () => {
    const avail = getPresetAvailability(
      ROUND_PRESETS.team_scramble,
      context({ tier: 'premium', perRoundRulesEnabled: false })
    );
    expect(avail.rulesWouldBeIgnored).toBe(true);
  });

  it('does not flag rulesWouldBeIgnored for presets without an override', () => {
    const avail = getPresetAvailability(
      ROUND_PRESETS.team_best_ball,
      context({ tier: 'premium', perRoundRulesEnabled: false })
    );
    expect(avail.rulesWouldBeIgnored).toBe(false);
  });
});
