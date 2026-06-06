import { supabase } from '@/services/supabase/client';
import { transformHolesIfNeeded } from '@/utils/holeTransformers';
import { DEFAULT_HOLES } from '@/types/supabase/roundQueries';
import type { Hole } from '@/types/database.types';

/**
 * Fetch the holes (par + stroke index) for a round's course.
 * Falls back to DEFAULT_HOLES when the course has no hole data.
 */
export async function getRoundHoles(roundId: string): Promise<Hole[]> {
  const { data, error } = (await supabase
    .from('rounds')
    .select(`
      courses!course_id (
        id,
        name,
        holes
      )
    `)
    .eq('id', roundId)
    .single()) as {
    data: { courses: { id: string; name: string; holes: Hole[] | null } | null } | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`Failed to load round holes: ${error.message}`);
  }

  const rawHoles = data?.courses?.holes;
  return Array.isArray(rawHoles) && rawHoles.length > 0
    ? transformHolesIfNeeded(rawHoles)
    : DEFAULT_HOLES;
}
