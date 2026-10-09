import type { GameType, Hole, Player, Scorecard, TeeBox } from '@/types';
import type { NineType } from '@/types/database/enums';
import type { HandicapSource } from '@/types/database';
import { calculatePlayerTotals } from '@/store/utils/scorecardCalculations';
import { getBaseHandicap } from '@/utils/scorecardCalculations';
import { filterPlayableHoles } from '@/utils/holeTransformers';
import { RoundScoringWriteError } from './roundScoringErrors';
import { shapeHoleNumbers, type RebuildRoundShapeCard } from './roundScoringWrite';
import { readSyncHandicapSource } from './scorecardScoringMetadata';

export interface LiveRoundRepairContext {
  player: Player;
  handicapSource: HandicapSource;
  nineType: NineType;
  teeData: TeeBox | null;
  holes: Hole[];
  gameType: GameType;
}

export interface RoundRepairEvidence {
  holes?: Hole[];
  gameType?: GameType;
  /** Metadata only. Each supplied current source always retains its own scores. */
  sources?: readonly Scorecard[];
  /** Synchronous, guarded same-session metadata; never a current profile fetch. */
  getLiveContext?: (source: Scorecard) => LiveRoundRepairContext | undefined;
}

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const frozenKeys = [
  'teeData',
  'playerHandicap',
  'playerGender',
  'coursePar',
  'syncHoles',
  'syncGameType',
  'syncNineType',
  'syncHandicapSource',
] as const;

function compatibleEvidence(source: Scorecard, other: Scorecard): boolean {
  if (source.roundId !== other.roundId || source.playerId !== other.playerId) return false;
  // A historical submission has an identity beyond the local card ID.
  for (const key of ['submittedAt', 'submittedBy'] as const) {
    if (source[key] != null && !equal(source[key], other[key])) return false;
  }
  let overlap = false;
  for (const key of frozenKeys) {
    // Explicit unknown gender is recorded input, so it cannot mix with a known
    // gender. Matching unknowns alone still do not prove a shared frozen basis.
    if (
      key === 'playerGender' &&
      source[key] !== undefined &&
      other[key] !== undefined &&
      !equal(source[key], other[key])
    )
      return false;
    if (
      source[key] === undefined ||
      source[key] === null ||
      other[key] === undefined ||
      other[key] === null
    )
      continue;
    overlap = true;
    if (!equal(source[key], other[key])) return false;
  }
  return overlap;
}

/** Pure current-source resolver: no I/O, mutation, score borrowing or player persistence. */
export function createRoundScoringContext(
  roundId: string,
  evidence: RoundRepairEvidence
): RebuildRoundShapeCard {
  return (source, keep, target) => {
    const fail = (message: string, changed = false): never => {
      throw new RoundScoringWriteError(
        changed ? 'context_changed' : 'context_missing',
        roundId,
        `Scoring context: ${message}`
      );
    };
    if (source.roundId !== roundId) fail('round identity changed', true);
    if (target.holes_played === null && source.holesPlayed != null) {
      throw new RoundScoringWriteError(
        'local_end_pending',
        roundId,
        'A final local end is still pending'
      );
    }
    const required = shapeHoleNumbers(target);
    let resolved = { ...source };
    try {
      readSyncHandicapSource(source.syncHandicapSource);
    } catch {
      fail('invalid handicap source');
    }
    for (const other of evidence.sources ?? []) {
      if (!compatibleEvidence(source, other)) continue;
      if (!compatibleEvidence(resolved, other)) fail('compatible evidence disagrees', true);
      for (const key of frozenKeys) {
        // Recorded null gender is a valid historical unknown, not missing evidence.
        if (resolved[key] === undefined || (resolved[key] === null && key !== 'playerGender')) {
          resolved = { ...resolved, [key]: other[key] };
        }
      }
    }
    const submitted =
      source.status === 'completed' ||
      source.status === 'confirmed' ||
      source.submittedAt != null ||
      source.submittedBy != null;
    const complete =
      resolved.syncHoles?.length &&
      resolved.syncGameType &&
      (resolved.syncNineType || source.holesPlayed == null) &&
      (resolved.syncHandicapSource === 'none' ||
        (resolved.playerHandicap != null &&
          resolved.playerGender !== undefined &&
          resolved.teeData));
    const live = !submitted && !complete ? evidence.getLiveContext?.(source) : undefined;
    if (live) {
      if (live.player.id !== source.playerId) fail('live player changed', true);
      let liveSource: HandicapSource | undefined;
      try {
        liveSource = readSyncHandicapSource(live.handicapSource);
      } catch {
        fail('invalid live handicap source');
      }
      if (!liveSource) fail('missing live handicap source');
      const liveHandicap =
        liveSource === 'none'
          ? source.playerHandicap
          : getBaseHandicap(
              {
                id: live.player.id,
                name: live.player.name,
                handicap: live.player.handicap ?? null,
                handicap_index: live.player.handicapIndex ?? null,
                gender: live.player.gender ?? null,
              },
              liveSource!
            );
      if (
        (resolved.syncHandicapSource != null && resolved.syncHandicapSource !== liveSource) ||
        (liveSource !== 'none' &&
          resolved.playerHandicap != null &&
          resolved.playerHandicap !== liveHandicap) ||
        (resolved.teeData != null && !equal(resolved.teeData, live.teeData)) ||
        (resolved.playerGender !== undefined &&
          resolved.playerGender !== (live.player.gender ?? null)) ||
        (resolved.syncGameType != null && resolved.syncGameType !== live.gameType)
      )
        fail('live basis no longer matches captured inputs', true);
      resolved = {
        ...resolved,
        syncHandicapSource: resolved.syncHandicapSource ?? liveSource,
        teeData: resolved.teeData ?? live.teeData,
        syncHoles: resolved.syncHoles ?? live.holes,
        syncGameType: resolved.syncGameType ?? live.gameType,
        syncNineType: resolved.syncNineType ?? live.nineType,
        playerGender:
          resolved.playerGender === undefined
            ? (live.player.gender ?? null)
            : resolved.playerGender,
        // None allocates zero without inventing HI0. Keep any authentic recorded HI.
        playerHandicap: resolved.playerHandicap ?? liveHandicap,
      };
    }
    const declared = resolved.syncHoles ?? evidence.holes;
    if (!declared?.length) return fail('missing planned holes');
    const seen = new Set<number>();
    for (const hole of declared) {
      if (
        !Number.isInteger(hole.number) ||
        hole.number < 1 ||
        hole.number > 18 ||
        seen.has(hole.number) ||
        !Number.isFinite(hole.par) ||
        hole.par <= 0 ||
        !Number.isInteger(hole.strokeIndex) ||
        hole.strokeIndex < 1 ||
        hole.strokeIndex > 18
      ) {
        fail('invalid planned par/stroke index');
      }
      seen.add(hole.number);
    }
    const originalNine = resolved.syncNineType ?? (source.holesPlayed == null ? 'full' : undefined);
    if (!originalNine || !['full', 'front9', 'back9'].includes(originalNine))
      fail('missing or invalid original nine context');
    const originalPar = filterPlayableHoles(declared, originalNine!).reduce(
      (sum, hole) => sum + hole.par,
      0
    );
    if (resolved.coursePar != null && resolved.coursePar !== originalPar)
      fail('captured original planned par disagrees', true);
    const planned = filterPlayableHoles(declared, target.nine_type);
    const numbers = new Set<number>(planned.map((h) => h.number));
    // Full means either a declared physical nine or the entire real course.
    // A captured back9-only list cannot be relabeled as full/front9.
    const expectedPlanned =
      target.nine_type === 'full' && planned.length === 9
        ? new Set(Array.from({ length: 9 }, (_, i) => i + 1))
        : shapeHoleNumbers({ ...target, holes_played: null });
    if (
      planned.length !== expectedPlanned.size ||
      [...expectedPlanned].some((h) => !numbers.has(h)) ||
      (target.nine_type === 'full' && resolved.syncNineType === 'back9' && declared.length <= 9) ||
      (target.holes_played != null && [...required].some((h) => !numbers.has(h)))
    )
      fail('incomplete target planned holes');
    for (const key of Object.keys(source.scores)) {
      if (keep.has(Number(key)) && required.has(Number(key)) && !numbers.has(Number(key)))
        fail('missing retained scored hole');
    }
    const coursePar = planned.reduce((sum, h) => sum + h.par, 0);
    if (
      resolved.syncNineType === target.nine_type &&
      resolved.coursePar != null &&
      resolved.coursePar !== coursePar
    )
      fail('captured planned par disagrees', true);
    const gameType = resolved.syncGameType ?? evidence.gameType;
    if (!gameType) fail('missing game type');
    let handicapSource: HandicapSource | undefined;
    try {
      handicapSource = readSyncHandicapSource(resolved.syncHandicapSource);
    } catch {
      fail('invalid proven handicap source');
    }
    if (
      resolved.playerGender !== undefined &&
      resolved.playerGender !== null &&
      !['male', 'female'].includes(resolved.playerGender)
    )
      fail('invalid recorded gender');
    if (handicapSource !== 'none') {
      if (
        typeof resolved.playerHandicap !== 'number' ||
        !Number.isFinite(resolved.playerHandicap) ||
        resolved.playerGender === undefined ||
        !resolved.teeData ||
        !Number.isFinite(resolved.teeData.slopeRating) ||
        Number(resolved.teeData.slopeRating) <= 0 ||
        !Number.isFinite(resolved.teeData.courseRating) ||
        Number(resolved.teeData.courseRating) <= 0
      )
        fail('missing frozen HI/gender/tee ratings');
      // Match calculateNineAwareDailyHandicap: a dedicated CR selects that
      // nine's slope (or main fallback); otherwise both nine fields are unused.
      if (target.nine_type !== 'full') {
        const nineCourseRating =
          target.nine_type === 'front9'
            ? resolved.teeData?.courseRatingFront9
            : resolved.teeData?.courseRatingBack9;
        const nineSlopeRating =
          (target.nine_type === 'front9'
            ? resolved.teeData?.slopeRatingFront9
            : resolved.teeData?.slopeRatingBack9) ?? resolved.teeData?.slopeRating;
        if (
          nineCourseRating != null &&
          (!Number.isFinite(nineCourseRating) ||
            nineCourseRating <= 0 ||
            !Number.isFinite(nineSlopeRating) ||
            Number(nineSlopeRating) <= 0)
        )
          fail('invalid frozen nine tee ratings');
      }
    }
    const scores = Object.fromEntries(
      Object.entries(source.scores).filter(
        ([h]) => keep.has(Number(h)) && required.has(Number(h)) && numbers.has(Number(h))
      )
    );
    const calculation = {
      ...resolved,
      scores,
      player: {
        ...source.player,
        id: source.playerId,
        name: source.player?.name ?? '',
        email: source.player?.email ?? '',
        createdAt: source.player?.createdAt ?? source.createdAt,
        updatedAt: source.player?.updatedAt ?? source.updatedAt,
        handicap: resolved.playerHandicap,
        gender: resolved.playerGender,
      },
    };
    const totals = calculatePlayerTotals(calculation, planned, gameType!, {
      handicapSource: handicapSource === 'none' ? 'none' : 'profile',
      selectedTee: resolved.teeData,
      nineType: target.nine_type,
    });
    return {
      ...source,
      scores,
      holesPlayed: target.holes_played,
      syncNineType: target.nine_type,
      teeData: resolved.teeData,
      syncHandicapSource: handicapSource,
      playerHandicap: resolved.playerHandicap,
      playerGender: resolved.playerGender,
      syncHoles: planned,
      syncGameType: gameType,
      coursePar,
      totalGross: totals.gross,
      totalNet: totals.net,
      total_par_score: totals.parScore,
    };
  };
}
