/**
 * Course Service - Import Operations
 *
 * Import clubs, courses, tees, and coordinates from GolfAPI.io to local cache.
 */

import { golfApiClient } from '@/services/api/golfApiClient';
import { supabase } from '@/services/supabase/client';
import { createModuleLogger } from '@/utils/debugLogger';
import { courseCacheService } from '../cacheService';
import { teesService } from '../teesService';
import {
  transformApiClubResponse,
  transformApiCourseResponse,
  transformApiCoordinates,
  hasHoleData,
  hasTeeData,
} from '@/services/api/golfApiTransformers';
import {
  filterMultiNineCourses,
  getDisplayCourseName,
  getMultiNineTotalHoles,
} from '@/services/api/multiNineFilter';
import type { Club, Course, Tee } from '@/types/database.types';
import type { TeeInsert } from '../teesService';
import type { HoleCoordinateInsert } from '../coordinatesService';
import type { ImportCourseResult, ImportClubResult } from './types';
import { importCoordinates } from './coordinates';

const logger = createModuleLogger('CourseService');

/**
 * Import a course from API to local cache
 * Creates/updates club, course, and tees separately
 *
 * @param golfapiCourseId - The GolfAPI.io course identifier
 * @returns Imported course with club and tees
 */
export async function importCourse(golfapiCourseId: string): Promise<ImportCourseResult> {
  // Check if course already cached
  const existingCourse = await courseCacheService.getCachedCourseByGolfApiId(golfapiCourseId);
  const courseCreated = !existingCourse;

  try {
    // Fetch course details from API (includes club info and tees)
    const courseResponse = await golfApiClient.getCourse(golfapiCourseId);

    // Transform API response
    const { course: courseData, tees: teesData, club: clubData } =
      transformApiCourseResponse(courseResponse);

    // Check if club already exists
    const existingClub = clubData.golfapi_club_id
      ? await courseCacheService.getCachedClubByGolfApiId(clubData.golfapi_club_id)
      : null;
    const clubCreated = !existingClub;

    // Cache club
    const club = await courseCacheService.cacheClub({
      name: clubData.name || 'Unknown Club',
      ...clubData,
    });

    // Cache course with club_id (apply multi-nine rename if applicable)
    const rawCourseName = courseData.name || 'Main Course';
    const course = await courseCacheService.cacheCourse({
      ...courseData,
      name: getDisplayCourseName(clubData.golfapi_club_id ?? null, golfapiCourseId, rawCourseName),
      club_id: club.id,
    });

    // Cache tees
    const tees = await teesService.cacheTees(
      course.id,
      teesData.map((t) => ({
        ...t,
        name: t.name || 'Default',
      })) as TeeInsert[]
    );

    // Import GPS coordinates (non-blocking - don't fail if coordinates unavailable)
    let coordinatesImported = 0;
    try {
      coordinatesImported = await importCoordinates(golfapiCourseId, course.id);
    } catch (coordError) {
      logger.warn('Failed to import coordinates (non-blocking)', { error: coordError instanceof Error ? coordError.message : String(coordError) });
    }

    // Fire-and-forget OSM bunker ingestion. Runs server-side via
    // ingest-course-hazards Edge Function. Course creation is not blocked.
    if (coordinatesImported > 0) {
      void supabase.functions
        .invoke('ingest-course-hazards', { body: { courseId: course.id } })
        .catch((err: unknown) => {
          logger.warn('Hazard ingestion fire-and-forget failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return {
      club,
      course,
      tees,
      clubCreated,
      courseCreated,
      hasHoleData: hasHoleData(courseData),
      hasTeeData: hasTeeData(teesData),
      coordinatesImported,
    };
  } catch (error) {
    // If API fails but we have cached data, return stale cache
    if (existingCourse) {
      logger.warn('API fetch failed, returning cached data', { error: error instanceof Error ? error.message : String(error) });

      const club = await courseCacheService.getCachedClubById(existingCourse.club_id);
      const tees = await teesService.getTeesByCourse(existingCourse.id);

      if (!club) {
        throw new Error('Club not found for cached course');
      }

      return {
        club,
        course: existingCourse,
        tees,
        clubCreated: false,
        courseCreated: false,
        hasHoleData: hasHoleData(existingCourse),
        hasTeeData: tees.length > 0,
        coordinatesImported: 0,
      };
    }

    throw error;
  }
}

/**
 * Import a club with all its courses from API
 *
 * @param golfapiClubId - The GolfAPI.io club identifier
 * @returns Imported club with all courses and tees
 */
export async function importClubWithCourses(golfapiClubId: string): Promise<ImportClubResult> {
  // Check if club already exists
  const existingClub = await courseCacheService.getCachedClubByGolfApiId(golfapiClubId);
  const created = !existingClub;

  try {
    // Fetch club from API (includes nested courses summary)
    const clubResponse = await golfApiClient.getClub(golfapiClubId);

    // Transform and cache club
    const clubData = transformApiClubResponse(clubResponse);

    // Fix total_holes for multi-nine clubs (e.g., 27 instead of 162)
    const multiNineHoles = getMultiNineTotalHoles(clubResponse.courses ?? []);
    if (multiNineHoles) {
      clubData.total_holes = multiNineHoles;
    }

    const club = await courseCacheService.cacheClub({
      name: clubData.name || 'Unknown Club',
      ...clubData,
    });

    const courses: Course[] = [];
    const allTees: Tee[] = [];

    // Filter multi-nine clubs to valid playable combinations only
    const allCourses = clubResponse.courses ?? [];
    const coursesToImport = filterMultiNineCourses(allCourses, golfapiClubId);

    // Import each course from the club
    if (coursesToImport.length > 0) {
      for (const courseSummary of coursesToImport) {
        try {
          // Fetch full course details
          const courseResponse = await golfApiClient.getCourse(courseSummary.courseID);

          // Transform course and tees
          const { course: courseData, tees: teesData } =
            transformApiCourseResponse(courseResponse);

          // Cache course (apply multi-nine rename if applicable)
          const rawName = courseData.name || courseSummary.courseName || 'Main Course';
          const course = await courseCacheService.cacheCourse({
            ...courseData,
            name: getDisplayCourseName(golfapiClubId, courseSummary.courseID, rawName),
            club_id: club.id,
          });

          courses.push(course);

          // Cache tees for this course
          const tees = await teesService.cacheTees(
            course.id,
            teesData.map((t) => ({
              ...t,
              name: t.name || 'Default',
            })) as TeeInsert[]
          );

          allTees.push(...tees);

          // Import GPS coordinates (non-blocking)
          try {
            const coordCount = await importCoordinates(courseSummary.courseID, course.id);
            if (coordCount > 0) {
              void supabase.functions
                .invoke('ingest-course-hazards', { body: { courseId: course.id } })
                .catch((err: unknown) => {
                  logger.warn('Hazard ingestion fire-and-forget failed', {
                    error: err instanceof Error ? err.message : String(err),
                  });
                });
            }
          } catch (coordError) {
            logger.warn('Failed to import coordinates for course', { name: course.name, error: coordError instanceof Error ? coordError.message : String(coordError) });
          }
        } catch (courseError) {
          logger.warn('Failed to import course', { name: courseSummary.courseName, error: courseError instanceof Error ? courseError.message : String(courseError) });
          // Continue with other courses
        }
      }
    }

    return {
      club,
      courses,
      tees: allTees,
      created,
    };
  } catch (error) {
    // If API fails but we have cached data, return stale cache
    if (existingClub) {
      logger.warn('API fetch failed, returning cached data', { error: error instanceof Error ? error.message : String(error) });

      const courses = await courseCacheService.getCoursesByClub(existingClub.id);
      const allTees: Tee[] = [];

      for (const course of courses) {
        const tees = await teesService.getTeesByCourse(course.id);
        allTees.push(...tees);
      }

      return {
        club: existingClub,
        courses,
        tees: allTees,
        created: false,
      };
    }

    throw error;
  }
}

/**
 * Import a club from search result (basic info only)
 * Use when full course details aren't available yet
 *
 * @param partialClub - Partial club data from search
 * @returns Cached club
 */
export async function importBasicClub(partialClub: Partial<Club>): Promise<Club> {
  return courseCacheService.cacheClub({
    name: partialClub.name || 'Unknown Club',
    ...partialClub,
  });
}
