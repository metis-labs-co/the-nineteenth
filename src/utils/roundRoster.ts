/**
 * Roster rules for editing players on a social round mid-round.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md
 */

import { getRoundPreset, presetIdForGameType } from '@/constants/roundPresets';
import { isHoleScored } from '@/utils/endRoundEarly';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import type { Hole, Scorecard } from '@/types';
import type { GameType, NineType, TeamFormat } from '@/types/database/enums';

const ROSTER_EDITABLE_GAME_TYPES: ReadonlySet<GameType> = new Set(['stableford', 'stroke', 'par']);

export function getStandaloneMaxPlayers(gameType: GameType): number {
  return getRoundPreset(presetIdForGameType(gameType)).standalone?.maxPlayers ?? 4;
}

export function isRosterEditableFormat(input: {
  gameType: GameType;
  teamFormat: TeamFormat | null;
  hasSkins: boolean;
  hasWolf: boolean;
  scoringPairsEnabled: boolean;
  isMultiBall: boolean;
}): boolean {
  return (
    ROSTER_EDITABLE_GAME_TYPES.has(input.gameType) &&
    !input.teamFormat &&
    !input.hasSkins &&
    !input.hasWolf &&
    !input.scoringPairsEnabled &&
    !input.isMultiBall
  );
}

export function findBackfillGaps(input: {
  holes: Hole[];
  nineType: NineType;
  players: { id: string; name: string }[];
  scorecards: Map<string, { scores: Scorecard['scores'] }>;
}): { playerId: string; playerName: string; holes: number[] }[] {
  const planned = filterHolesByNineType(input.holes, input.nineType).map((h) => h.number).sort((a, b) => a - b);
  const scored = (playerId: string, hole: number) =>
    isHoleScored(input.scorecards.get(playerId)?.scores[hole]);

  const furthest = planned.filter((hole) => input.players.some((p) => scored(p.id, hole))).pop();
  if (furthest == null) return [];

  return input.players
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      holes: planned.filter((hole) => hole <= furthest && !scored(p.id, hole)),
    }))
    .filter((gap) => gap.holes.length > 0);
}

export function formatHoleRange(holes: number[]): string {
  const sorted = [...holes].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) { prev = cur; continue; }
    if (start !== undefined) parts.push(start === prev ? String(start) : `${start}–${prev}`);
    start = cur;
    prev = cur;
  }
  return parts.join(', ');
}
