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

interface CourseData {
  id: string;
  name: string;
  holes: Hole[];
  tees: TeeBox[];
}

interface UseRoundCourseResult {
  course: CourseData | null;
  holes: Hole[];
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

    try {
      roundDataLogger.debug('Fetching course data', { roundId: roundId.substring(0, 8) });

      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select(`
          courses!course_id (
            id,
            name,
            holes,
            tees
          )
        `)
        .eq('id', roundId)
        .single() as {
          data: { courses: { id: string; name: string; holes: Hole[] | null; tees: TeeBox[] | null } | null } | null;
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
        });
        setIsLoading(false);
        return;
      }

      // Get holes from course or use defaults (fallback if empty array)
      // Transform from database format (snake_case) to app format (camelCase) if needed
      const rawHoles = courseData.holes as unknown[] | null;
      let holes = rawHoles && rawHoles.length > 0
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

      roundDataLogger.debug('Course data loaded', {
        courseName: courseData.name,
        holesCount: holes.length,
        teesCount: courseData.tees?.length || 0,
        hasYardages: holes.some(h => h.yardages && Object.keys(h.yardages).length > 0),
      });

      setCourse({
        id: courseData.id,
        name: courseData.name,
        holes,
        tees: courseData.tees || [],
      });
      setIsLoading(false);
    } catch (err) {
      roundDataLogger.error('Error fetching course', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
      setIsLoading(false);
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
    getHole,
    isLoading,
    error,
    refetch: fetchCourse,
  };
}
