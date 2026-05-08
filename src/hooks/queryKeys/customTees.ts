/**
 * Query key factory for the custom_hole_tees domain.
 */
export const customHoleTeeKeys = {
  all: ['customHoleTees'] as const,
  byCourse: (courseId: string) =>
    [...customHoleTeeKeys.all, 'course', courseId] as const,
  byCourseHole: (courseId: string, holeNumber: number) =>
    [...customHoleTeeKeys.byCourse(courseId), 'hole', holeNumber] as const,
} as const;
