/**
 * Shot log row shape — mirrors `shot_log` table.
 * Phase C2 of the tiered hole-map roadmap.
 */
export interface ShotLogEntry {
  id: string; // UUID
  round_id: string; // UUID
  hole_number: number; // 1-18
  player_id: string; // UUID, references players(id)
  sequence: number; // per-(round, hole, player), starts at 1, contiguous

  latitude: number;
  longitude: number;

  // Reserved nullable columns for v2 — no UI today.
  club_used: string | null;
  shot_type: string | null;

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type ShotLogInsert = Pick<
  ShotLogEntry,
  'round_id' | 'hole_number' | 'player_id' | 'sequence' | 'latitude' | 'longitude'
>;

export type ShotLogUpdate = Partial<
  Pick<ShotLogEntry, 'latitude' | 'longitude'>
>;
