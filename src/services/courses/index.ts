export { courseCacheService, CourseCacheService, CACHE_TTL_DAYS, CACHE_TTL_MS } from './cacheService';
export type { CacheSearchParams, CacheSearchResult, ClubInsert, CourseInsert } from './cacheService';

export { courseService, CourseService } from './courseService';
export type {
  CourseSearchParams,
  CourseSearchResult,
  ImportCourseResult,
  ImportClubResult,
  CourseWithDetails,
} from './courseService';

export {
  teesService,
  TeesService,
  TEE_COLORS,
  DEFAULT_TEE_COLOR,
  calculateTotalLength,
  calculateFront9Length,
  calculateBack9Length,
  getTeeColor,
  normalizeTeeColor,
} from './teesService';
export type { TeeInsert } from './teesService';

export {
  coordinatesService,
  CoordinatesService,
  ESSENTIAL_POI_TYPES,
  ALL_POI_TYPES,
  calculateDistance,
  calculateCoordinateDistance,
  metersToYards,
  yardsToMeters,
  groupCoordinatesByHole,
  getCoordinateByPoiType,
} from './coordinatesService';
export type {
  HoleCoordinateInsert,
  HoleCoordinatesByHole,
  HoleCoordinateSummary,
} from './coordinatesService';
