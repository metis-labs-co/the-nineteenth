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

  // Activated in the What's-in-the-Bag feature (May 2026).
  // `club_used` stores a canonical ClubKey from `src/constants/clubs.ts`.
  // `shot_type` remains reserved for a later iteration.
  club_used: string | null;
  shot_type: string | null;

  /** Set automatically by the shot_log_detect_bunker server-side trigger. */
  from_bunker: boolean;

  /**
   * Reported GPS accuracy (metres) at the moment the shot was logged.
   * `null` for legacy rows and for rows whose position has been manually
   * overridden via the move-on-map flow.
   */
  accuracy_meters: number | null;

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type ShotLogInsert = Pick<
  ShotLogEntry,
  | 'round_id'
  | 'hole_number'
  | 'player_id'
  | 'sequence'
  | 'latitude'
  | 'longitude'
  | 'club_used'
  | 'accuracy_meters'
>;

export type ShotLogUpdate = Partial<
  Pick<ShotLogEntry, 'latitude' | 'longitude' | 'club_used' | 'accuracy_meters'>
>;
