/**
 * useRoundCourse Hook
 *
 * Fetches course and hole data for a round.
 * Provides fallback default holes if course has no hole data.
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { roundDataLogger } from '@/utils/debugLogger';
import { transformHolesIfNeeded } from '@/utils/holeTransformers';
import type { Hole, TeeBox } from '@/types/database.types';
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
      const holes = rawHoles && rawHoles.length > 0
        ? transformHolesIfNeeded(rawHoles)
        : DEFAULT_HOLES;

      roundDataLogger.debug('Course data loaded', {
        courseName: courseData.name,
        holesCount: holes.length,
        teesCount: courseData.tees?.length || 0,
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
