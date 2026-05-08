/**
 * useCourseTeeColors — derive the back/front tee colours for a course.
 *
 * Maps GolfAPI's `tee_back` / `tee_front` GPS POIs to the course's longest
 * and shortest TeeBoxes (by totalYardage), so we can colour-code the tee
 * markers and chooser rows with the actual on-course tee colours.
 *
 * Reuses the existing `useCourse` query so we don't introduce a new fetch
 * for data that's already cached.
 */

import { useMemo } from 'react';
import { useCourse } from '@/hooks/courses';
import { analyseCourseTeeColors } from '@/utils/teeColors';

export function useCourseTeeColors(courseId: string | null | undefined) {
  const { data: course } = useCourse(courseId ?? undefined);
  return useMemo(
    () => analyseCourseTeeColors(course?.tees),
    [course?.tees]
  );
}
