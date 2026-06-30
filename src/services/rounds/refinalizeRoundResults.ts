/**
 * refinalizeRoundResults
 *
 * Recomputes and rewrites `round_results` for a round using its current
 * `rules_override` and the competition's `per_round_rules_enabled` flag.
 *
 * Used in two places:
 * - Scorecard submission (via `useRoundFinalization`) — first-time finalize.
 * - Per-round rule edits (via `applyPresetToRound`) — re-finalize after the
 *   override changes so stored `competition_points` match the new rules.
 *
 * Safe to call repeatedly: `saveRoundResults` (delete-then-insert) overwrites
 * any prior rows. Errors are logged and swallowed to preserve the pre-extraction
 * behaviour where scorecard submission would never fail because of finalization.
 */
import { supabase } from '@/services/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  finalizeRound,
  deleteIndividualRoundResults,
} from '@/services/rounds/roundResultsService';
import {
  finalizeTeamResults,
  finalizeTeamOnlyRound,
} from '@/services/rounds/finalizeTeamResults';
import {
  finalizePairResults,
  isPairPointsOverride,
} from '@/services/rounds/finalizePairResults';
import {
  finalizeTeamMatchPlayRound,
  isCombinedTeamMatchPlay,
} from '@/services/rounds/finalizeTeamMatchPlayRound';
import { isTeamOnlyGameType } from '@/services/rounds/resultsEngine';
import { submitLogger } from '@/utils/debugLogger';
import { getRoundTemplate } from '@/constants/roundTemplates';
import type {
  Scorecard,
  GameType,
  PointSystemConfig,
  RoundRulesOverride,
} from '@/types/database.types';
import type { RoundTemplateId } from '@/types/database/enums';

/**
 * Fill in any rule fields the saved override is missing using the latest
 * payload from the round's template. Saved values always win — this only
 * patches `undefined` slots so users keep any custom edits, while
 * benefiting from template additions made after the round was created.
 *
 * Without this, an existing round that was created from a template before
 * a new field was added (e.g. `individual_points`) would never pick up
 * that field — even after tapping "Recalculate Results" — because the
 * saved JSON predates the new field. With this, recalculate becomes a
 * cheap way to apply template improvements to historical rounds.
 *
 * Pure: returns a fresh object; never mutates the input or writes to the
 * database. The saved JSON on disk stays exactly as it was.
 */
function mergeTemplateDefaults(
  saved: RoundRulesOverride | null,
): RoundRulesOverride | null {
  if (!saved) return saved;
  const templateId = saved.template_id as RoundTemplateId | undefined;
  if (!templateId) return saved;

  let template;
  try {
    template = getRoundTemplate(templateId);
  } catch {
    // Unknown template_id (renamed / removed). Use saved as-is.
    return saved;
  }
  if (!template) return saved;

  const merged: RoundRulesOverride = { ...saved };
  for (const key of Object.keys(template.override) as Array<keyof RoundRulesOverride>) {
    if (merged[key] === undefined) {
      const fromTemplate = template.override[key];
      if (fromTemplate !== undefined) {
        // Use unknown to bridge the heterogeneous union of override field types.
        (merged as unknown as Record<string, unknown>)[key as string] = fromTemplate;
      }
    }
  }
  return merged;
}

export async function refinalizeRoundResults(roundId: string): Promise<void> {
  try {
    submitLogger.info('Finalizing round results', { roundId: roundId.substring(0, 8) + '...' });

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('game_type, competition_id, rules_override, round_format, team1_id, team2_id, team_format')
      .eq('id', roundId)
      .single() as unknown as {
        data: {
          game_type: string;
          competition_id: string | null;
          rules_override: RoundRulesOverride | null;
          round_format: string | null;
          team1_id: string | null;
          team2_id: string | null;
          team_format: string | null;
        } | null;
        error: PostgrestError | null;
      };

    if (roundError || !round) {
      submitLogger.error('Failed to fetch round data for finalization', roundError, { roundId: roundId.substring(0, 8) + '...' });
      return;
    }

    if (!round.competition_id) {
      submitLogger.warn('Round has no competition_id, skipping finalization');
      return;
    }

    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('point_system, per_round_rules_enabled')
      .eq('id', round.competition_id)
      .single() as unknown as {
        data: {
          point_system: PointSystemConfig | null;
          per_round_rules_enabled: boolean | null;
        } | null;
        error: PostgrestError | null;
      };

    if (compError || !competition) {
      submitLogger.error('Failed to fetch competition for finalization', compError, { competitionId: round.competition_id?.substring(0, 8) + '...' });
      return;
    }

    // When the competition is in "general rules" mode, any saved
    // rules_override is ignored. Defaults to TRUE when the column is null
    // so competitions that predate the mode flag keep today's behaviour.
    const perRoundRulesEnabled = competition.per_round_rules_enabled ?? true;

    // Layer template defaults under the saved override so recalculating an
    // existing round picks up new template fields (e.g. individual_points
    // added after the round was created). Saved values are preserved.
    const effectiveOverride = mergeTemplateDefaults(round.rules_override);

    const { data: scorecards, error: scError } = await supabase
      .from('scorecards')
      .select('*')
      .eq('round_id', roundId)
      .eq('status', 'completed') as unknown as { data: Scorecard[] | null; error: PostgrestError | null };

    if (scError || !scorecards || scorecards.length === 0) {
      // Split pair-points rounds (Ryder-Cup singles, split match play, alt-shot
      // foursomes) score entirely from sub-match outcomes, which are stored
      // self-contained on the `sub_matches` rows. When the organiser finalizes
      // such a round via manual sub-match results (or forfeits) WITHOUT any
      // completed scorecards, finalization must still write the pair-point team
      // rows. Bailing here left the competition standings with no contribution
      // from the round (empty round_results).
      if (!scError && isPairPointsOverride(round.round_format, effectiveOverride)) {
        submitLogger.info('Finalizing split pair-points round from sub-matches (no completed scorecards)', {
          roundId: roundId.substring(0, 8) + '...',
        });
        try {
          await deleteIndividualRoundResults(roundId);
        } catch (err) {
          submitLogger.error('Failed to clear stale individual rows', err, {
            roundId: roundId.substring(0, 8) + '...',
          });
        }
        try {
          const pairRowCount = await finalizePairResults({
            roundId,
            team1Id: round.team1_id,
            team2Id: round.team2_id,
            competitionId: round.competition_id,
            gameType: round.game_type as GameType,
            scorecards: [],
            rulesOverride: effectiveOverride,
            perRoundRulesEnabled,
          });
          submitLogger.info('Pair results persisted (no completed scorecards)', {
            roundId: roundId.substring(0, 8) + '...',
            pairRowCount,
          });
        } catch (err) {
          submitLogger.error('Pair finalization failed (no completed scorecards)', err, {
            roundId: roundId.substring(0, 8) + '...',
          });
        }
        return;
      }

      submitLogger.warn('No completed scorecards found for finalization', { roundId: roundId.substring(0, 8) + '...' });
      return;
    }

    const pointSystem: PointSystemConfig = competition.point_system || {
      type: 'position',
      rules: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1, 'default': 1 },
    };

    const gameType = round.game_type as GameType;

    // Split rounds (Ryder-Cup style) with a pair_points override score
    // exclusively from sub-match outcomes. This holds even for team-only
    // game types like scramble where the round-total Ambrose score has no
    // bearing on the result — only which pair won each sub-match matters.
    const splitWithPairPoints = isPairPointsOverride(
      round.round_format,
      effectiveOverride
    );

    // Team-only formats (Scramble, Best Ball, Shamble) when NOT in a
    // pair-points split round: the team is the unit of competition. Skip
    // individual finalization entirely and write team rows directly. Clear
    // any stale individual rows first — they could exist from a prior
    // (pre-fix) finalization that wrote one row per scorecard.
    if (isTeamOnlyGameType(gameType) && !splitWithPairPoints) {
      submitLogger.info('Finalizing team-only round', {
        roundId: roundId.substring(0, 8) + '...',
        gameType,
        scorecardCount: scorecards.length,
        templateId: round.rules_override?.template_id,
      });

      try {
        await deleteIndividualRoundResults(roundId);
        const teamRowCount = await finalizeTeamOnlyRound({
          roundId,
          competitionId: round.competition_id,
          gameType,
          scorecards,
          pointSystem,
          rulesOverride: effectiveOverride,
          perRoundRulesEnabled,
        });
        submitLogger.info('Team-only round finalized', {
          roundId: roundId.substring(0, 8) + '...',
          teamRowCount,
          templateId: round.rules_override?.template_id,
        });
      } catch (err) {
        submitLogger.error('Team-only finalization failed', err, {
          roundId: roundId.substring(0, 8) + '...',
        });
      }
      return;
    }

    // Team-only game types in a split + pair_points round (e.g. Pairs
    // Scramble 2v2): the round-total Ambrose score isn't the result the
    // user is competing on — pair points from sub-matches are. Skip both
    // individual and team-only finalization; clear any stale individual
    // rows from earlier code paths; write only the pair-point team rows.
    if (isTeamOnlyGameType(gameType) && splitWithPairPoints) {
      submitLogger.info('Finalizing split team-only round (pair points)', {
        roundId: roundId.substring(0, 8) + '...',
        gameType,
        templateId: round.rules_override?.template_id,
      });

      try {
        await deleteIndividualRoundResults(roundId);
      } catch (err) {
        submitLogger.error('Failed to clear stale individual rows', err, {
          roundId: roundId.substring(0, 8) + '...',
        });
      }

      // team1_id/team2_id are NOT required: split team-only rounds (e.g.
      // alt-shot foursomes, which is a 'team-only' engine shape) carry no team
      // ids on the round — the two sides are derived from competition team
      // membership inside finalizePairResults, and sub-match outcomes are
      // computed live from scorecards. Bailing here was the cause of empty
      // standings (0–0) on alt-shot split rounds.
      try {
        const pairRowCount = await finalizePairResults({
          roundId,
          team1Id: round.team1_id,
          team2Id: round.team2_id,
          competitionId: round.competition_id,
          gameType,
          scorecards,
          rulesOverride: effectiveOverride,
          perRoundRulesEnabled,
        });
        submitLogger.info('Pair results persisted (split team-only)', {
          roundId: roundId.substring(0, 8) + '...',
          pairRowCount,
          templateId: round.rules_override?.template_id,
        });
      } catch (err) {
        submitLogger.error(
          'Pair finalization failed (split team-only)',
          err,
          { roundId: roundId.substring(0, 8) + '...' }
        );
      }
      return;
    }

    // Individual + (optional) team-aggregated formats.
    submitLogger.info('Calling finalizeRound', {
      roundId: roundId.substring(0, 8) + '...',
      gameType,
      scorecardCount: scorecards.length,
      pointSystemType: pointSystem.type,
      hasRulesOverride: !!round.rules_override,
      templateId: round.rules_override?.template_id,
    });

    await finalizeRound(
      roundId,
      scorecards,
      gameType,
      pointSystem,
      effectiveOverride,
      perRoundRulesEnabled
    );

    submitLogger.info('Round results finalized successfully', { roundId: roundId.substring(0, 8) + '...' });

    // Phase 5 — team-level persistence. Runs after individual finalization
    // so it can read the just-saved individual results. Returns 0 when the
    // override doesn't request team persistence (e.g. no rules_override,
    // or an aggregation that's not supported here yet). Failures are
    // logged but don't bubble — individuals are already safely persisted.
    try {
      const teamRowCount = await finalizeTeamResults({
        roundId,
        competitionId: round.competition_id,
        gameType,
        pointSystem,
        rulesOverride: effectiveOverride,
        perRoundRulesEnabled,
      });
      if (teamRowCount > 0) {
        submitLogger.info('Team results persisted', {
          roundId: roundId.substring(0, 8) + '...',
          teamRowCount,
          templateId: round.rules_override?.template_id,
        });
      }
    } catch (teamErr) {
      submitLogger.error('Team result persistence failed (individual rows intact)', teamErr, {
        roundId: roundId.substring(0, 8) + '...',
      });
    }

    // Combined Team Match Play persistence. `finalizeRound` (above) writes
    // individual match-play rows; this writes the team-level result so the
    // multi-round team competition leaderboard sees the round outcome. No-op
    // for individual match play and for split rounds (which go through
    // `finalizePairResults` below).
    if (
      isCombinedTeamMatchPlay(gameType, round.team_format, round.round_format)
    ) {
      try {
        const teamMatchRowCount = await finalizeTeamMatchPlayRound({
          roundId,
          competitionId: round.competition_id,
          scorecards,
          rulesOverride: effectiveOverride,
          perRoundRulesEnabled,
          team1Id: round.team1_id,
          team2Id: round.team2_id,
        });
        if (teamMatchRowCount > 0) {
          submitLogger.info('Team match play results persisted', {
            roundId: roundId.substring(0, 8) + '...',
            teamMatchRowCount,
            templateId: round.rules_override?.template_id,
          });
        }
      } catch (matchErr) {
        submitLogger.error(
          'Team match play persistence failed (individual rows intact)',
          matchErr,
          { roundId: roundId.substring(0, 8) + '...' }
        );
      }
    }

    // R2 — Pair-points persistence for split rounds (e.g. Pairs Better Ball).
    // Independent of the round-total team path — the two never fire on the
    // same round because `finalizeTeamResults` skips `pairs_better_ball`.
    //
    // team1_id/team2_id are passed when set but no longer required: sides are
    // derived from competition team membership when absent, and sub-match
    // outcomes are computed live from scorecards when not explicitly recorded
    // (a stableford Pairs Better Ball round never persists sub-match results).
    if (isPairPointsOverride(round.round_format, effectiveOverride)) {
      try {
        const pairRowCount = await finalizePairResults({
          roundId,
          team1Id: round.team1_id,
          team2Id: round.team2_id,
          competitionId: round.competition_id,
          gameType,
          scorecards,
          rulesOverride: effectiveOverride,
          perRoundRulesEnabled,
        });
        if (pairRowCount > 0) {
          submitLogger.info('Pair results persisted', {
            roundId: roundId.substring(0, 8) + '...',
            pairRowCount,
            templateId: round.rules_override?.template_id,
          });
        }
      } catch (pairErr) {
        submitLogger.error('Pair result persistence failed (individual rows intact)', pairErr, {
          roundId: roundId.substring(0, 8) + '...',
        });
      }
    }
  } catch (error) {
    submitLogger.error('Error finalizing round results', error, { roundId: roundId.substring(0, 8) + '...' });
  }
}
