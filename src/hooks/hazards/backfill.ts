/**
 * Hazard backfill orchestration.
 *
 * On first call for a given courseId, fires the ingest-course-hazards
 * Edge Function (server-side, service-role-authed). Idempotent on the
 * server: repeated upserts on the same (course, hole, external_id)
 * tuple are no-ops. We dedupe per-courseId on the client to avoid
 * spurious invocations across re-renders / multiple components mounting.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabase/client';

const inFlight = new Set<string>();

export interface UseHazardBackfillResult {
  /** Whether a backfill attempt has been made for this courseId. */
  wasAttempted: boolean;
}

export function useHazardBackfill(courseId?: string): UseHazardBackfillResult {
  const [wasAttempted, setWasAttempted] = useState(false);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    if (startedFor.current === courseId) return;
    if (inFlight.has(courseId)) {
      startedFor.current = courseId;
      setWasAttempted(true);
      return;
    }

    startedFor.current = courseId;
    inFlight.add(courseId);
    setWasAttempted(true);

    void supabase.functions
      .invoke('ingest-course-hazards', { body: { courseId } })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[useHazardBackfill] invoke failed', err);
      })
      .finally(() => {
        inFlight.delete(courseId);
      });
  }, [courseId]);

  return { wasAttempted };
}
