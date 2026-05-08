/**
 * useRoundCourse Hook
 *
 * Fetches course and hole data for a round.
 * Provides fallback default holes if course has no hole data.
 *
 * For courses imported from GolfAPI.io, yardages are stored in the normalized
 * `tees` table (with length_hole_1 through length_hole_18 columns) rather than
 * in the legacy courses.holes JSONB. This hook fetches both and hydrates holes
 * with tee yardages when available.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { roundDataLogger } from '@/utils/debugLogger';
import { transformHolesIfNeeded, hydrateHolesWithTeeYardages } from '@/utils/holeTransformers';
import type { Hole, TeeBox, Tee } from '@/types/database.types';
import { DEFAULT_HOLES } from '@/types/supabase/roundQueries';
import { scheduleFetchTimeout } from './fetchTimeout';

interface CourseData {
  id: string;
  name: string;
  holes: Hole[];
  tees: TeeBox[];
  /** Display offset for hole numbers (1 = standard 1..18, 10 = combo
   *  course starting at facility hole 10). See displayHoleNumber(). */
  startHole: number;
}

interface UseRoundCourseResult {
  course: CourseData | null;
  holes: Hole[];
  /** Convenience accessor — same as `course?.startHole ?? 1`. */
  startHole: number;
  getHole: (holeNumber: number) => Hole | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching course and hole data for a round
 */
export function useRoundCourse(roundId: string | undefined): UseRoundCourseResult {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!roundId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const cancelTimeout = scheduleFetchTimeout('course data', (msg) => {
      setError(msg);
      setIsLoading(false);
    });

    try {
      roundDataLogger.debug('Fetching course data', { roundId: roundId.substring(0, 8) });

      // Important: this select stays on columns that have always existed.
      // Adding a `start_hole` column to the join broke environments where
      // the migration hadn't been applied yet ("column courses_1.start_hole
      // does not exist"), which surfaced as a course-fetch failure that
      // blocked the entire scorecard. start_hole is fetched separately
      // below — failure there only loses the display offset (defaults to 1).
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select(`
          courses!course_id (
            id,
            name,
            holes
          )
        `)
        .eq('id', roundId)
        .single() as {
          data: { courses: { id: string; name: string; holes: Hole[] | null } | null } | null;
          error: { message: string } | null;
        };

      if (roundError) {
        roundDataLogger.error('Failed to fetch course', roundError);
        setError(`Failed to load course: ${roundError.message}`);
        setIsLoading(false);
        return;
      }

      const courseData = roundData?.courses;

      if (!courseData) {
        // No course data - use defaults
        roundDataLogger.warn('No course data found, using defaults');
        setCourse({
          id: '',
          name: 'Unknown Course',
          holes: DEFAULT_HOLES,
          tees: [],
          startHole: 1,
        });
        setIsLoading(false);
        return;
      }

      // Get holes from course or use defaults (fallback if empty array)
      // Transform from database format (snake_case) to app format (camelCase) if needed
      const rawHoles = courseData.holes;
      let holes = Array.isArray(rawHoles) && rawHoles.length > 0
        ? transformHolesIfNeeded(rawHoles)
        : DEFAULT_HOLES;

      // Check if holes are missing yardages - if so, fetch from normalized tees table
      const firstHoleWithYardages = holes.find(h => h.yardages && Object.keys(h.yardages).length > 0);

      if (!firstHoleWithYardages && courseData.id) {
        roundDataLogger.debug('Holes missing yardages, fetching from tees table', {
          courseId: courseData.id.substring(0, 8),
        });

        // Fetch tees from the normalized tees table (GolfAPI.io data)
        const { data: teesData, error: teesError } = await supabase
          .from('tees')
          .select('*')
          .eq('course_id', courseData.id) as {
            data: Tee[] | null;
            error: { message: string } | null;
          };

        if (teesError) {
          roundDataLogger.warn('Failed to fetch tees from normalized table', teesError);
        } else if (teesData && teesData.length > 0) {
          roundDataLogger.debug('Hydrating holes with tee yardages', {
            teesCount: teesData.length,
            teeNames: teesData.map(t => t.name),
          });

          // Hydrate holes with yardages from the tees table
          holes = hydrateHolesWithTeeYardages(holes, teesData);

          // Log the result
          const hydratedHole = holes.find(h => h.yardages && Object.keys(h.yardages).length > 0);
          if (hydratedHole) {
            roundDataLogger.debug('Holes hydrated successfully', {
              sampleHole: hydratedHole.number,
              yardageKeys: Object.keys(hydratedHole.yardages || {}),
            });
          }
        }
      }

      // Fetch start_hole separately — a missing column (migration not yet
      // applied) here just defaults the display offset to 1 instead of
      // breaking the entire course fetch.
      let startHole = 1;
      if (courseData.id) {
        try {
          const { data: startHoleRow, error: startHoleError } = await supabase
            .from('courses')
            .select('start_hole')
            .eq('id', courseData.id)
            .maybeSingle() as {
              data: { start_hole?: number | null } | null;
              error: { message: string } | null;
            };
          if (startHoleError) {
            roundDataLogger.warn('start_hole fetch failed — defaulting to 1', startHoleError);
          } else if (typeof startHoleRow?.start_hole === 'number') {
            startHole = startHoleRow.start_hole;
          }
        } catch (startHoleErr) {
          roundDataLogger.warn('start_hole fetch threw — defaulting to 1', {
            error: startHoleErr instanceof Error ? startHoleErr.message : String(startHoleErr),
          });
        }
      }

      roundDataLogger.debug('Course data loaded', {
        courseName: courseData.name,
        holesCount: holes.length,
        hasYardages: holes.some(h => h.yardages && Object.keys(h.yardages).length > 0),
        startHole,
      });

      setCourse({
        id: courseData.id,
        name: courseData.name,
        holes,
        tees: [],
        startHole,
      });
      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error fetching course', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
      setIsLoading(false);
    } finally {
      cancelTimeout();
    }
  }, [roundId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const getHole = useCallback(
    (holeNumber: number): Hole | undefined => {
      return course?.holes.find((h) => h.number === holeNumber);
    },
    [course]
  );

  return {
    course,
    holes: course?.holes || DEFAULT_HOLES,
    startHole: course?.startHole ?? 1,
    getHole,
    isLoading,
    error,
    refetch: fetchCourse,
  };
}
