/**
 * Aggregate per-club distance stats for a player.
 *
 * Fetches every `shot_log` row this player has produced (with `club_used`
 * set), joins course-id via the `rounds` row, fetches the hole tee
 * coordinates in one bulk query, then derives each shot's travelled
 * distance via `computeShotDistances`. Aggregations are grouped by
 * canonical `ClubKey`.
 *
 * v1 fetches everything in two queries — fine for typical users; a
 * server-side materialised view is the eventual escape hatch.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { bagKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import {
  computeShotDistances,
  resolveTeeAnchor,
  type ShotWithDistance,
} from '@/utils/shotDistances';
import { isClubKey, type ClubKey } from '@/constants/clubs';
import { useTeeOverrideStore } from '@/store/teeOverrideStore';
import type { ShotLogEntry } from '@/types/database/shotLog.types';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { CustomHoleTee } from '@/types/database/customHoleTees.types';

const shotLogTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('shot_log');

const holeCoordinatesTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('hole_coordinates');

const customHoleTeesTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('custom_hole_tees');

interface ShotWithCourse extends ShotLogEntry {
  rounds: {
    course_id: string;
    date: string | null;
    courses: { name: string | null } | null;
  } | null;
}

export interface ShotWithContext extends ShotWithDistance {
  /** Round date (ISO) — `null` when unknown. */
  roundPlayedAt: string | null;
  /** Course display name — `null` when unknown. */
  courseName: string | null;
  /** Course id — needed by detail screens that re-fetch hole coordinates
   *  (e.g. to offer a tee-origin override for shot 1). `null` when unknown. */
  courseId: string | null;
  /**
   * The position the shot was struck from — i.e. the prior shot's landing,
   * or the hole's tee coord for shot 1. `null` when shot 1 has no tee data.
   */
  originLatitude: number | null;
  originLongitude: number | null;
}

export interface ClubStatsEntry {
  /** All shots for this club, with per-shot derived distance (metres) + round/course context. */
  shots: ShotWithContext[];
  /** Mean travelled distance in metres across shots with a known prior position. */
  averageMeters: number | null;
  /** Total shots logged with this club (regardless of whether distance is known). */
  totalShots: number;
  /** Shots whose travelled distance is known. */
  shotsWithDistance: number;
}

export type PerClubStats = Partial<Record<ClubKey, ClubStatsEntry>>;

interface RawPerClubStatsData {
  shots: ShotWithCourse[];
  coordsByCourseHole: Map<string, HoleCoordinate[]>;
  /** All custom tees this user has created, indexed by `${course_id}::${hole_number}`. */
  customTeesByCourseHole: Map<string, CustomHoleTee[]>;
}

async function fetchRawPerClubStatsData(
  playerId: string
): Promise<RawPerClubStatsData> {
  // 1. Pull every shot for the player that has a club assigned, joined
  //    with rounds(course_id, date, courses(name)) so we can find the
  //    matching tee coordinate AND have round/course context for the
  //    Club Distance Detail screen.
  const { data, error } = await shotLogTable()
    .select('*, rounds!inner(course_id, date, courses(name))')
    .eq('player_id', playerId)
    .not('club_used', 'is', null)
    .is('rounds.deleted_at', null)
    .order('round_id', { ascending: true })
    .order('hole_number', { ascending: true })
    .order('sequence', { ascending: true });

  if (error) {
    console.error('[usePerClubStats] shot_log query failed:', error);
    throw error;
  }
  const shots = (data as ShotWithCourse[] | null) ?? [];

  // 2. Bulk-fetch tee coordinates for every (course, hole) pair we touched,
  //    plus this player's custom tees on the same courses.
  const coordsByCourseHole = new Map<string, HoleCoordinate[]>();
  const customTeesByCourseHole = new Map<string, CustomHoleTee[]>();
  if (shots.length === 0) {
    return { shots, coordsByCourseHole, customTeesByCourseHole };
  }

  const courseIds = Array.from(
    new Set(shots.map((s) => s.rounds?.course_id).filter((id): id is string => !!id))
  );

  if (courseIds.length === 0) {
    return { shots, coordsByCourseHole, customTeesByCourseHole };
  }

  const [coordResult, customResult] = await Promise.all([
    holeCoordinatesTable()
      .select('*')
      .in('course_id', courseIds)
      .in('poi_type', ['tee_back', 'tee_front']),
    customHoleTeesTable().select('*').in('course_id', courseIds),
  ]);

  if (coordResult.error) throw coordResult.error;
  if (customResult.error) throw customResult.error;

  const coordinates = (coordResult.data as HoleCoordinate[] | null) ?? [];
  for (const c of coordinates) {
    const key = `${c.course_id}::${c.hole_number}`;
    const list = coordsByCourseHole.get(key) ?? [];
    list.push(c);
    coordsByCourseHole.set(key, list);
  }

  const customTees = (customResult.data as CustomHoleTee[] | null) ?? [];
  for (const t of customTees) {
    const key = `${t.course_id}::${t.hole_number}`;
    const list = customTeesByCourseHole.get(key) ?? [];
    list.push(t);
    customTeesByCourseHole.set(key, list);
  }

  return { shots, coordsByCourseHole, customTeesByCourseHole };
}

// Resolves the tee origin for each (round, hole) using `resolveTeeAnchor`,
// which honours both back/front overrides and custom-tee UUIDs. Shot 1's
// distance therefore recomputes against the chosen tee everywhere this
// hook is consumed (the bag list).
function computePerClubStats(
  raw: RawPerClubStatsData,
  overrides: Record<string, string>
): PerClubStats {
  const { shots, coordsByCourseHole, customTeesByCourseHole } = raw;
  if (shots.length === 0) return {};

  // Group shots by (round, hole) so distances can be computed within each
  // per-hole sequence (preserves prior-shot relationships).
  const groups = new Map<string, ShotWithCourse[]>();
  for (const s of shots) {
    const key = `${s.round_id}::${s.hole_number}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  // For each group, derive distances using the matching course/hole tee
  // coord — honouring any per-(round,hole) tee override — then accumulate
  // into per-club buckets.
  const buckets = new Map<ClubKey, ShotWithContext[]>();
  for (const [, group] of groups) {
    const courseId = group[0].rounds?.course_id ?? null;
    const holeNumber = group[0].hole_number;
    const roundId = group[0].round_id;
    const override = overrides[`${roundId}::${holeNumber}`] ?? null;
    const courseHoleKey = courseId ? `${courseId}::${holeNumber}` : null;
    const tee = courseHoleKey
      ? resolveTeeAnchor(
          override,
          customTeesByCourseHole.get(courseHoleKey) ?? [],
          coordsByCourseHole.get(courseHoleKey) ?? []
        )
      : null;
    const annotated = computeShotDistances(group, tee);
    for (let i = 0; i < annotated.length; i++) {
      const shot = annotated[i];
      const original = group[i];
      if (!isClubKey(shot.club_used)) continue;
      const origin =
        i === 0
          ? tee
            ? { latitude: tee.latitude, longitude: tee.longitude }
            : null
          : { latitude: group[i - 1].latitude, longitude: group[i - 1].longitude };
      const enriched: ShotWithContext = {
        ...shot,
        roundPlayedAt: original.rounds?.date ?? null,
        courseName: original.rounds?.courses?.name ?? null,
        courseId: original.rounds?.course_id ?? null,
        originLatitude: origin?.latitude ?? null,
        originLongitude: origin?.longitude ?? null,
      };
      const list = buckets.get(shot.club_used) ?? [];
      list.push(enriched);
      buckets.set(shot.club_used, list);
    }
  }

  // Reduce to summary stats per club. Sort each club's shot list newest-first
  // so the detail screen reads like a chronological journal.
  const result: PerClubStats = {};
  for (const [club, list] of buckets) {
    const sorted = [...list].sort((a, b) => {
      const aTime = a.roundPlayedAt ?? a.created_at;
      const bTime = b.roundPlayedAt ?? b.created_at;
      return bTime.localeCompare(aTime);
    });
    const measured = sorted.filter(
      (s): s is ShotWithContext & { distanceMeters: number } =>
        s.distanceMeters != null
    );
    const averageMeters =
      measured.length === 0
        ? null
        : measured.reduce((sum, s) => sum + s.distanceMeters, 0) / measured.length;
    result[club] = {
      shots: sorted,
      totalShots: sorted.length,
      shotsWithDistance: measured.length,
      averageMeters,
    };
  }

  return result;
}

export function usePerClubStats(playerId: string | undefined) {
  const overrides = useTeeOverrideStore((s) => s.byRoundHole);

  const rawQuery = useQuery({
    queryKey: bagKeys.perClubStats(playerId ?? ''),
    queryFn: () => fetchRawPerClubStatsData(playerId as string),
    enabled: !!playerId,
    staleTime: CACHE_TIMES.STANDARD,
  });

  const data = useMemo<PerClubStats | undefined>(() => {
    if (!rawQuery.data) return undefined;
    return computePerClubStats(rawQuery.data, overrides);
  }, [rawQuery.data, overrides]);

  return { ...rawQuery, data };
}
