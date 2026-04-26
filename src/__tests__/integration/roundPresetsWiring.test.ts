/**
 * Round Preset Wiring Tests
 *
 * Catches the class of bug where a preset's `config.rules_override` doesn't
 * carry the field the finalization dispatcher expects. The original gap was:
 * `pairs_scramble_2v2` and the two Ryder-Cup presets shipped with no
 * `rules_override`, so `finalizePairResults` skipped them and the team
 * competition leaderboard never saw the round result.
 *
 * Each test below asserts the override shape required by
 * `refinalizeRoundResults` for the preset to write team rows to
 * `round_results`.
 */

import {
  TEAM_STABLEFORD_BEST_N,
  TEAM_MATCH_PLAY,
  PAIRS_BETTER_BALL_2V2,
  PAIRS_SCRAMBLE_2V2,
  RYDER_CUP_SINGLES,
  RYDER_CUP_FOURSOMES_2V2,
} from '@/constants/roundPresets';
import { isPairPointsOverride } from '@/services/rounds/finalizePairResults';
import { isCombinedTeamMatchPlay } from '@/services/rounds/finalizeTeamMatchPlayRound';
import { isTeamOnlyGameType } from '@/services/rounds/resultsEngine';

describe('Round preset wiring → finalization dispatcher', () => {
  describe('team_stableford_best_n (Best 3 of 4)', () => {
    it('routes to finalizeTeamResults via team_aggregation + team_points', () => {
      const cfg = TEAM_STABLEFORD_BEST_N.config;
      expect(cfg.game_type).toBe('stableford');
      expect(cfg.round_format).toBe('combined');
      // Goes through finalizeRound (individual rows) + finalizeTeamResults (team rows).
      expect(isTeamOnlyGameType(cfg.game_type)).toBe(false);
      expect(cfg.rules_override?.team_aggregation).toBe('best_n_of_m');
      expect(cfg.rules_override?.team_aggregation_config).toEqual({ n: 3, m: 4 });
      expect(cfg.rules_override?.team_points).toEqual({ win: 2, tie: 1, loss: 0 });
    });
  });

  describe('pairs_better_ball_2v2', () => {
    it('routes to finalizePairResults via pair_points on a split round', () => {
      const cfg = PAIRS_BETTER_BALL_2V2.config;
      expect(cfg.round_format).toBe('split');
      expect(cfg.sub_match_size).toBe(2);
      // Stableford game type = NOT team-only → falls through to the
      // post-individual pair-points block.
      expect(isTeamOnlyGameType(cfg.game_type)).toBe(false);
      expect(isPairPointsOverride(cfg.round_format, cfg.rules_override)).toBe(true);
      expect(cfg.rules_override?.pair_points).toEqual({ win: 1, tie: 0.5, loss: 0 });
    });
  });

  describe('pairs_scramble_2v2', () => {
    it('routes to finalizePairResults via the team-only-with-pair-points dispatcher branch', () => {
      const cfg = PAIRS_SCRAMBLE_2V2.config;
      expect(cfg.round_format).toBe('split');
      expect(cfg.sub_match_size).toBe(2);
      // Scramble IS team-only — was previously the source of the gap. The
      // dispatcher now lets split + pair_points fall through to
      // finalizePairResults instead of returning early.
      expect(isTeamOnlyGameType(cfg.game_type)).toBe(true);
      expect(isPairPointsOverride(cfg.round_format, cfg.rules_override)).toBe(true);
      expect(cfg.rules_override?.pair_points).toEqual({ win: 1, tie: 0.5, loss: 0 });
    });
  });

  describe('ryder_cup_singles', () => {
    it('ships pair_points on a split round so finalizePairResults runs', () => {
      const cfg = RYDER_CUP_SINGLES.config;
      expect(cfg.round_format).toBe('split');
      expect(cfg.sub_match_size).toBe(1);
      expect(isPairPointsOverride(cfg.round_format, cfg.rules_override)).toBe(true);
      expect(cfg.rules_override?.pair_points).toEqual({ win: 1, tie: 0.5, loss: 0 });
      // 1v1 singles → individual scorecards meaningfully rank.
      expect(cfg.rules_override?.contributes_to_individual_leaderboard).toBe(true);
    });
  });

  describe('ryder_cup_foursomes_2v2', () => {
    it('ships pair_points on a split round so finalizePairResults runs', () => {
      const cfg = RYDER_CUP_FOURSOMES_2V2.config;
      expect(cfg.round_format).toBe('split');
      expect(cfg.sub_match_size).toBe(2);
      expect(isPairPointsOverride(cfg.round_format, cfg.rules_override)).toBe(true);
      expect(cfg.rules_override?.pair_points).toEqual({ win: 1, tie: 0.5, loss: 0 });
      // Foursomes = one ball alternating shots → no per-player scores.
      expect(cfg.rules_override?.contributes_to_individual_leaderboard).toBe(false);
    });
  });

  describe('team_match_play (combined)', () => {
    it('routes to finalizeTeamMatchPlayRound via the combined-team-match-play branch', () => {
      const cfg = TEAM_MATCH_PLAY.config;
      expect(cfg.game_type).toBe('match-play');
      expect(cfg.team_format).toBe('match-play-team');
      expect(cfg.round_format).toBe('combined');
      expect(isCombinedTeamMatchPlay(cfg.game_type, cfg.team_format, cfg.round_format)).toBe(true);
      // team_points drives win/tie/loss allocation.
      expect(cfg.rules_override?.team_points).toEqual({ win: 1, tie: 0.5, loss: 0 });
    });
  });
});
