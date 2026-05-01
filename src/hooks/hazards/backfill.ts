/**
 * Hazard backfill orchestration (Phase C1).
 *
 * The hole_hazards table is populated via a server-side service-role
 * job (Supabase Edge Function or admin script), not from the client.
 * Phase C1 spec §4.2 keeps client-facing INSERT/UPDATE/DELETE policies
 * unset for security — we don't ship the service role key in the app.
 *
 * This hook is therefore a thin pass-through for now: when the table
 * is empty for a course, it returns `{ wasAttempted: false }` and the
 * map renders without hazards. The actual data ingestion is a deploy
 * task documented in the spec; the OSM and GolfAPI fetchers under
 * `src/services/hazards/` are ready for the Edge Function to import.
 */

export interface UseHazardBackfillResult {
  /** Whether a backfill attempt has been made for this courseId. */
  wasAttempted: boolean;
}

export function useHazardBackfill(_courseId?: string): UseHazardBackfillResult {
  // Client-side backfill is not supported by design (RLS forbids client
  // writes to hole_hazards). This hook exists so callers can compose it
  // analogously to useCoordinateBackfill; the actual ingestion happens
  // server-side. Returning a stable shape avoids re-renders when called
  // from the map screen.
  return { wasAttempted: false };
}
