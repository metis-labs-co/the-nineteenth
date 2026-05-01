/**
 * Query key factory for the Phase C1 hole_hazards domain.
 */
export const hazardKeys = {
  all: ['holeHazards'] as const,
  byCourse: (courseId: string) => [...hazardKeys.all, 'course', courseId] as const,
  byHole: (courseId: string, holeNumber: number) =>
    [...hazardKeys.byCourse(courseId), 'hole', holeNumber] as const,
} as const;
