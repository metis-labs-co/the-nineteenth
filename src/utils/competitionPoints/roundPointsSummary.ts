/**
 * Pure helpers that translate a round's rules_override into a plain-English
 * points summary and a max-points figure, plus a competition-wide total and
 * "first to N wins" target. Used by the read-only Points & Rules section.
 */
import type { Round } from '@/types/database.types';
import type {
  RoundRulesOverride,
  WinTieLossPoints,
} from '@/types/database/roundRules.types';
import { ROUND_TEMPLATES } from '@/constants/roundTemplates';

export interface RoundPointsContext {
  /** Members on each competition team (used to count split sub-matches). */
  membersPerTeam: number;
}

export interface RoundPointsSummary {
  roundId: string;
  title: string;
  detail: string;
  maxPoints: number;
  isCustom: boolean;
  voided: boolean;
}

function subMatchCount(round: Round, ctx: RoundPointsContext): number {
  const size = round.sub_match_size ?? 1;
  return Math.max(1, Math.floor(ctx.membersPerTeam / Math.max(1, size)));
}

function isZeroPoints(p: WinTieLossPoints | undefined): boolean {
  return !!p && p.win === 0 && p.tie === 0 && p.loss === 0;
}

function samePoints(a: WinTieLossPoints | undefined, b: WinTieLossPoints | undefined): boolean {
  if (!a || !b) return a === b;
  return a.win === b.win && a.tie === b.tie && a.loss === b.loss;
}

function bonusPointsValue(o: RoundRulesOverride): number {
  return o.bonus_points?.enabled ? o.bonus_points.points : 0;
}

export function summarizeRoundPoints(
  round: Round,
  ctx: RoundPointsContext
): RoundPointsSummary {
  const o: RoundRulesOverride = (round.rules_override ?? {}) as RoundRulesOverride;
  const template = o.template_id ? ROUND_TEMPLATES[o.template_id] : undefined;
  const title = round.name?.trim() || `Round`;

  const bonus = bonusPointsValue(o);
  const bonusSuffix = bonus ? ` · +${bonus} bonus (combined margin)` : '';

  // Pair-points (split) round.
  if (o.pair_points) {
    const matches = subMatchCount(round, ctx);
    const voided = isZeroPoints(o.pair_points);
    const maxPoints = voided ? 0 : o.pair_points.win * matches + bonus;
    const detail = voided
      ? 'Void · 0 points'
      : `${o.pair_points.win} pt per match (×${matches})${bonusSuffix}`;
    const isCustom =
      !template ||
      !samePoints(o.pair_points, template.override.pair_points) ||
      bonus !== bonusPointsValue(template.override);
    return { roundId: round.id, title, detail, maxPoints, isCustom, voided };
  }

  // Team-points (combined) round.
  if (o.team_points) {
    const voided = isZeroPoints(o.team_points);
    const maxPoints = voided ? 0 : o.team_points.win + bonus;
    const detail = voided
      ? 'Dinner bet · 0 points'
      : `${o.team_points.win} pts to winning team${bonusSuffix}`;
    const isCustom =
      !template ||
      !samePoints(o.team_points, template.override.team_points) ||
      bonus !== bonusPointsValue(template.override);
    return { roundId: round.id, title, detail, maxPoints, isCustom, voided };
  }

  return {
    roundId: round.id,
    title,
    detail: 'Uses competition default points',
    maxPoints: 0,
    isCustom: false,
    voided: false,
  };
}

export function summarizeCompetition(
  rounds: Round[],
  ctx: RoundPointsContext
): { perRound: RoundPointsSummary[]; total: number; toWin: number } {
  const perRound = rounds.map((r) => summarizeRoundPoints(r, ctx));
  const total = perRound.reduce((sum, r) => sum + r.maxPoints, 0);
  const toWin = Math.floor(total / 2) + 1;
  return { perRound, total, toWin };
}
