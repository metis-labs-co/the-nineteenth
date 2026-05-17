/**
 * Query + mutation hooks for the player's bag (What's in the Bag).
 *
 * Two tiers:
 *   - useBag / useUpdateBag — operates on ClubKey[] (which clubs the user
 *     carries). Used everywhere: shot logger, bag picker, etc.
 *   - useBagDetails / useUpdateClubFitting / useApplyFittingToClubs —
 *     operates on full rows with optional fitting metadata. Only used by
 *     WhatsInTheBagScreen and ClubFittingSheet.
 *
 * Bag changes are a diff — `useUpdateBag` accepts a desired final list and
 * fans out the inserts/deletes that get from current → next. Fitting edits
 * are UPDATE on a specific (player_id, club_key) row.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { bagKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import { ensurePutter, diffBag } from '@/utils/bag';
import { isClubKey, PUTTER_KEY, type ClubKey } from '@/constants/clubs';
import {
  EMPTY_FITTING,
  isShaftFlex,
  mergeFitting,
  type ClubFitting,
} from '@/utils/clubFitting';

// Until supabase Database types are regenerated post-migration, the generated
// client doesn't know about `player_bag`. Cast to bypass the `never` table.
const playerBagTable = () =>
  (supabase as unknown as { from: (table: string) => any }).from('player_bag');

interface PlayerBagRow {
  player_id: string;
  club_key: string;
  added_at: string;
  updated_at?: string | null;
  brand?: string | null;
  model?: string | null;
  loft_degrees?: number | string | null;
  lie_angle_degrees?: number | string | null;
  shaft_brand?: string | null;
  shaft_model?: string | null;
  shaft_flex?: string | null;
  shaft_length_inches?: number | string | null;
  notes?: string | null;
}

export interface BagEntry extends ClubFitting {
  clubKey: ClubKey;
  addedAt: string;
  updatedAt: string | null;
}

// Postgres NUMERIC values arrive as strings via PostgREST. Normalise to number.
function numOrNull(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rowToEntry(row: PlayerBagRow): BagEntry | null {
  if (!isClubKey(row.club_key)) return null;
  return {
    clubKey: row.club_key,
    addedAt: row.added_at,
    updatedAt: row.updated_at ?? null,
    brand: row.brand ?? null,
    model: row.model ?? null,
    loftDegrees: numOrNull(row.loft_degrees),
    lieAngleDegrees: numOrNull(row.lie_angle_degrees),
    shaftBrand: row.shaft_brand ?? null,
    shaftModel: row.shaft_model ?? null,
    shaftFlex: isShaftFlex(row.shaft_flex) ? row.shaft_flex : null,
    shaftLengthInches: numOrNull(row.shaft_length_inches),
    notes: row.notes ?? null,
  };
}

function entryToDbPayload(fitting: ClubFitting): Record<string, unknown> {
  return {
    brand: fitting.brand,
    model: fitting.model,
    loft_degrees: fitting.loftDegrees,
    lie_angle_degrees: fitting.lieAngleDegrees,
    shaft_brand: fitting.shaftBrand,
    shaft_model: fitting.shaftModel,
    shaft_flex: fitting.shaftFlex,
    shaft_length_inches: fitting.shaftLengthInches,
    notes: fitting.notes,
    updated_at: new Date().toISOString(),
  };
}

/** Synthesise an empty bag entry — used when the putter row is missing. */
function syntheticEntry(clubKey: ClubKey): BagEntry {
  return {
    clubKey,
    addedAt: new Date(0).toISOString(),
    updatedAt: null,
    ...EMPTY_FITTING,
  };
}

async function fetchBag(playerId: string): Promise<ClubKey[]> {
  const { data, error } = await playerBagTable()
    .select('club_key')
    .eq('player_id', playerId)
    .order('added_at', { ascending: true });
  if (error) throw error;
  const rows = (data as Pick<PlayerBagRow, 'club_key'>[] | null) ?? [];
  // Filter to known canonical keys; unknown legacy values are ignored client-side
  // and remain in the DB until the next save (which will diff them away).
  const keys = rows.map((r) => r.club_key).filter(isClubKey);
  // Always surface the putter — it's permanent in the bag UI even if the user
  // hasn't yet written it to the server.
  return ensurePutter(keys);
}

async function fetchBagDetails(playerId: string): Promise<BagEntry[]> {
  const { data, error } = await playerBagTable()
    .select(
      'player_id, club_key, added_at, updated_at, brand, model, loft_degrees, lie_angle_degrees, shaft_brand, shaft_model, shaft_flex, shaft_length_inches, notes'
    )
    .eq('player_id', playerId)
    .order('added_at', { ascending: true });
  if (error) throw error;
  const rows = (data as PlayerBagRow[] | null) ?? [];
  const entries = rows
    .map(rowToEntry)
    .filter((e): e is BagEntry => e !== null);
  // Ensure the putter is present — synthesise an empty row if the user has
  // never explicitly saved it (parity with `ensurePutter`).
  if (!entries.some((e) => e.clubKey === PUTTER_KEY)) {
    return [syntheticEntry(PUTTER_KEY), ...entries];
  }
  return entries;
}

export function useBag(playerId: string | undefined) {
  return useQuery({
    queryKey: bagKeys.byPlayer(playerId ?? ''),
    queryFn: () => fetchBag(playerId as string),
    enabled: !!playerId,
    staleTime: CACHE_TIMES.MODERATE,
  });
}

export function useBagDetails(playerId: string | undefined) {
  return useQuery({
    queryKey: bagKeys.detailsByPlayer(playerId ?? ''),
    queryFn: () => fetchBagDetails(playerId as string),
    enabled: !!playerId,
    staleTime: CACHE_TIMES.MODERATE,
  });
}

interface UpdateBagInput {
  playerId: string;
  next: readonly ClubKey[];
}

export function useUpdateBag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playerId, next }: UpdateBagInput): Promise<ClubKey[]> => {
      const current =
        queryClient.getQueryData<ClubKey[]>(bagKeys.byPlayer(playerId)) ??
        (await fetchBag(playerId));

      // Putter is locked — never let a save remove it. Cheap defence in depth
      // on top of the UI which already prevents toggling it off.
      const desired = ensurePutter(next);
      const { adds, removes } = diffBag(current, desired);

      if (adds.length > 0) {
        const { error } = await playerBagTable().insert(
          adds.map((club_key) => ({ player_id: playerId, club_key }))
        );
        if (error) throw error;
      }

      if (removes.length > 0) {
        const { error } = await playerBagTable()
          .delete()
          .eq('player_id', playerId)
          .in('club_key', removes);
        if (error) throw error;
      }

      return desired;
    },
    onSuccess: (saved, { playerId }) => {
      queryClient.setQueryData(bagKeys.byPlayer(playerId), saved);
      queryClient.invalidateQueries({ queryKey: bagKeys.detailsByPlayer(playerId) });
      queryClient.invalidateQueries({ queryKey: bagKeys.perClubStats(playerId) });
    },
  });
}

interface UpdateClubFittingInput {
  playerId: string;
  clubKey: ClubKey;
  fitting: ClubFitting;
}

/**
 * Save fitting metadata for one club. UPSERT semantics: if the row doesn't
 * exist yet (edge case — e.g. the synthesised putter row that hasn't been
 * persisted), it's inserted; otherwise the existing row is updated in place
 * and `added_at` is preserved.
 */
export function useUpdateClubFitting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerId,
      clubKey,
      fitting,
    }: UpdateClubFittingInput): Promise<BagEntry> => {
      const payload = {
        player_id: playerId,
        club_key: clubKey,
        ...entryToDbPayload(fitting),
      };
      // Upsert on the composite PK. PostgREST `on_conflict` keeps added_at
      // intact for existing rows because added_at is omitted from payload.
      const { data, error } = await playerBagTable()
        .upsert(payload, { onConflict: 'player_id,club_key' })
        .select(
          'player_id, club_key, added_at, updated_at, brand, model, loft_degrees, lie_angle_degrees, shaft_brand, shaft_model, shaft_flex, shaft_length_inches, notes'
        )
        .single();
      if (error) throw error;
      const entry = rowToEntry(data as PlayerBagRow);
      if (!entry) throw new Error('Unexpected club key returned from save');
      return entry;
    },
    onMutate: async ({ playerId, clubKey, fitting }) => {
      const key = bagKeys.detailsByPlayer(playerId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BagEntry[]>(key);
      if (previous) {
        const next = previous.map((e) =>
          e.clubKey === clubKey
            ? { ...e, ...fitting, updatedAt: new Date().toISOString() }
            : e
        );
        queryClient.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (_err, { playerId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bagKeys.detailsByPlayer(playerId), context.previous);
      }
    },
    onSuccess: (saved, { playerId }) => {
      // Patch the cache with the canonical row from the server.
      const key = bagKeys.detailsByPlayer(playerId);
      const current = queryClient.getQueryData<BagEntry[]>(key);
      if (current) {
        const exists = current.some((e) => e.clubKey === saved.clubKey);
        queryClient.setQueryData(
          key,
          exists
            ? current.map((e) => (e.clubKey === saved.clubKey ? saved : e))
            : [...current, saved]
        );
      }
      // Keep the simpler key list in sync if this saved an unknown club.
      queryClient.invalidateQueries({ queryKey: bagKeys.byPlayer(playerId) });
    },
  });
}

interface ApplyFittingToClubsInput {
  playerId: string;
  source: ClubFitting;
  /** Clubs to apply the source fitting onto. Empty list is a no-op. */
  targets: readonly ClubKey[];
}

/**
 * Apply non-null fields from `source` onto each `targets` row. Used by the
 * "Copy these settings to my other irons" helper — empty fields in source
 * don't trample per-club values (e.g. each iron keeps its own loft).
 */
export function useApplyFittingToClubs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerId,
      source,
      targets,
    }: ApplyFittingToClubsInput): Promise<BagEntry[]> => {
      if (targets.length === 0) return [];
      const current =
        queryClient.getQueryData<BagEntry[]>(bagKeys.detailsByPlayer(playerId)) ??
        (await fetchBagDetails(playerId));
      const byKey = new Map(current.map((e) => [e.clubKey, e]));

      const payloads = targets.map((clubKey) => {
        const existing = byKey.get(clubKey);
        const merged = mergeFitting(existing ?? { ...EMPTY_FITTING }, source);
        return {
          player_id: playerId,
          club_key: clubKey,
          ...entryToDbPayload(merged),
        };
      });

      const { data, error } = await playerBagTable()
        .upsert(payloads, { onConflict: 'player_id,club_key' })
        .select(
          'player_id, club_key, added_at, updated_at, brand, model, loft_degrees, lie_angle_degrees, shaft_brand, shaft_model, shaft_flex, shaft_length_inches, notes'
        );
      if (error) throw error;
      const rows = (data as PlayerBagRow[] | null) ?? [];
      return rows.map(rowToEntry).filter((e): e is BagEntry => e !== null);
    },
    onSuccess: (saved, { playerId }) => {
      if (saved.length === 0) return;
      const key = bagKeys.detailsByPlayer(playerId);
      const current = queryClient.getQueryData<BagEntry[]>(key);
      if (current) {
        const updates = new Map(saved.map((e) => [e.clubKey, e]));
        queryClient.setQueryData(
          key,
          current.map((e) => updates.get(e.clubKey) ?? e)
        );
      } else {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
