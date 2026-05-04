/**
 * Seed Featured Course Coordinates Script
 *
 * Fetches hole-level GPS coordinates (tee boxes, green centers) from GolfAPI.io
 * for all featured Australian courses and upserts them into the hole_coordinates table.
 *
 * Usage:
 *   npx tsx scripts/seed-featured-coordinates.ts
 *
 * Options:
 *   --dry-run    Show what would be fetched without writing to database
 *   --state VIC  Only process courses in a specific state
 *   --force      Re-fetch coordinates even if course already has data
 *   --all        Include non-featured clubs (defaults to featured only).
 *                Use after the poi_type swap migration to re-fetch every
 *                course with a golfapi_course_id so all three green
 *                positions (front/center/back) are written instead of the
 *                single squashed row that the migration left behind.
 *   --prod       Target the production Supabase project. Reads
 *                EXPO_PUBLIC_SUPABASE_URL_PROD + SUPABASE_SECRET_KEY_PROD
 *                instead of the default (staging) values. Without this
 *                flag the script writes to staging.
 *
 * Prerequisites:
 *   - .env must have EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 *   - .env must have EXPO_PUBLIC_GOLFAPI_IO_KEY, EXPO_PUBLIC_GOLFAPI_IO_URL
 *   - Featured clubs must already be seeded (run seed-featured-courses.ts first)
 *
 * Idempotent: safe to re-run. Uses upsert on (course_id, hole_number, poi_type).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env from project root
config({ path: resolve(__dirname, '..', '.env') });

// =====================================================
// CLI ARGS  (parsed before Supabase client init so --prod can pick env vars)
// =====================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const INCLUDE_ALL = args.includes('--all');
const TARGET_PROD = args.includes('--prod');
const stateIdx = args.indexOf('--state');
const STATE_FILTER = stateIdx !== -1 ? args[stateIdx + 1]?.toUpperCase() : null;

const SUPABASE_URL = TARGET_PROD
  ? process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!
  : process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = TARGET_PROD
  ? (process.env.SUPABASE_SECRET_KEY_PROD ||
     process.env.SUPABASE_SERVICE_ROLE_KEY ||
     process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY_PROD)!
  : (process.env.SUPABASE_SECRET_KEY ||
     process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
const GOLFAPI_URL = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL || 'https://www.golfapi.io/api/v2.3';
const GOLFAPI_KEY = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    `Missing Supabase credentials in .env for ${TARGET_PROD ? 'PROD' : 'staging'} target.\n` +
    `  Need: ${TARGET_PROD ? 'EXPO_PUBLIC_SUPABASE_URL_PROD + SUPABASE_SECRET_KEY_PROD' : 'EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY'}`
  );
  process.exit(1);
}
if (!GOLFAPI_KEY) {
  console.error('Missing EXPO_PUBLIC_GOLFAPI_IO_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Prominent banner so the operator can't miss which DB they're hitting.
const supabaseHost = (() => {
  try {
    return new URL(SUPABASE_URL).host;
  } catch {
    return SUPABASE_URL;
  }
})();
console.log(
  `\n${'='.repeat(60)}\n` +
  `Target: ${TARGET_PROD ? 'PRODUCTION' : 'STAGING'}\n` +
  `Host:   ${supabaseHost}\n` +
  `${'='.repeat(60)}\n`
);

// =====================================================
// GOLFAPI.IO TYPES & HELPERS
// =====================================================

interface GolfApiCoordinate {
  poi: number;
  location: number;
  sideFW: number;
  hole: number;
  latitude: number;
  longitude: number;
}

interface GolfApiCoordinatesResponse {
  courseID: string;
  numCoordinates: number;
  coordinates: GolfApiCoordinate[];
  apiRequestsLeft: string;
}

type PoiType = 'tee_front' | 'tee_back' | 'green_front' | 'green_center' | 'green_back';

/**
 * Map GolfAPI.io numeric POI code to our PoiType string.
 * Mirrors src/services/api/golfApiTransformers.ts:mapPoiToPoiType.
 *
 * GolfAPI.io's poi codes are inverted from the labels in their docs
 * (verified on-course): poi=1 carries green positions (front/center/back)
 * and poi=11/12 carry tee positions. See the central transformer for the
 * full explanation.
 */
function mapPoiToPoiType(poi: number, location: number): PoiType | null {
  if (poi === 1) {
    if (location === 1) return 'green_front';
    if (location === 2) return 'green_center';
    if (location === 3) return 'green_back';
    return null;
  }
  if (poi === 11) return 'tee_front';
  if (poi === 12) return 'tee_back';
  return null;
}

async function golfApiFetch<T>(endpoint: string): Promise<T> {
  const baseUrl = GOLFAPI_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = `${baseUrl}/${cleanEndpoint}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GOLFAPI_KEY}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    throw new NotFoundError(`Not found: ${endpoint}`);
  }

  if (!res.ok) {
    throw new Error(`GolfAPI ${res.status}: ${res.statusText} - ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// =====================================================
// DATABASE HELPERS
// =====================================================

interface FeaturedCourse {
  course_id: string;
  course_name: string;
  golfapi_course_id: string;
  club_name: string;
  club_state: string;
  num_holes: number;
}

async function getFeaturedCourses(): Promise<FeaturedCourse[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      golfapi_course_id,
      num_holes,
      clubs!inner (
        name,
        state,
        is_featured
      )
    `)
    .not('golfapi_course_id', 'is', null);

  if (error) {
    throw new Error(`Failed to query featured courses: ${error.message}`);
  }

  if (!data) return [];

  return (data as any[])
    .filter((row: any) => INCLUDE_ALL ? true : row.clubs?.is_featured === true)
    .filter((row: any) => !STATE_FILTER || row.clubs?.state === STATE_FILTER)
    .map((row: any) => ({
      course_id: row.id,
      course_name: row.name,
      golfapi_course_id: row.golfapi_course_id,
      club_name: row.clubs.name,
      club_state: row.clubs.state || '??',
      num_holes: row.num_holes || 18,
    }));
}

async function courseHasCoordinates(courseId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('hole_coordinates')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (error) return false;
  return (count || 0) > 0;
}

interface CoordinateRow {
  course_id: string;
  hole_number: number;
  poi_type: PoiType;
  latitude: number;
  longitude: number;
  side_of_fairway: string | null;
}

async function upsertCoordinates(coordinates: CoordinateRow[]): Promise<number> {
  if (coordinates.length === 0) return 0;

  // Deduplicate by (course_id, hole_number, poi_type) - keep last occurrence
  const deduped = new Map<string, CoordinateRow>();
  for (const coord of coordinates) {
    const key = `${coord.course_id}:${coord.hole_number}:${coord.poi_type}`;
    deduped.set(key, coord);
  }

  const rows = Array.from(deduped.values());

  const { data, error } = await supabase
    .from('hole_coordinates')
    .upsert(rows, {
      onConflict: 'course_id,hole_number,poi_type',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) {
    throw new Error(`Upsert failed: ${error.message}`);
  }

  return data?.length || 0;
}

// =====================================================
// MAIN
// =====================================================

const DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Seeding hole coordinates for featured Australian courses...');
  if (DRY_RUN) console.log('  (DRY RUN - no database writes)');
  if (FORCE) console.log('  (FORCE - re-fetching all courses)');
  if (STATE_FILTER) console.log(`  (STATE FILTER: ${STATE_FILTER})`);
  console.log('');

  // Step 1: Get all featured courses with golfapi_course_id
  const courses = await getFeaturedCourses();
  console.log(`Found ${courses.length} featured courses with GolfAPI IDs`);
  console.log('');

  if (courses.length === 0) {
    console.log('No featured courses found. Run seed-featured-courses.ts first.');
    process.exit(0);
  }

  let fetched = 0;
  let skippedExisting = 0;
  let skippedNoData = 0;
  let failed = 0;
  let totalCoords = 0;

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const progress = `[${i + 1}/${courses.length}]`;
    const label = `${course.club_name} - ${course.course_name} (${course.club_state})`;

    try {
      // Check if coordinates already exist (skip unless --force)
      if (!FORCE) {
        const hasCoords = await courseHasCoordinates(course.course_id);
        if (hasCoords) {
          console.log(`${progress} -- ${label} (already has coordinates)`);
          skippedExisting++;
          continue;
        }
      }

      // Fetch coordinates from GolfAPI.io
      console.log(`${progress} >> Fetching ${label}...`);

      if (DRY_RUN) {
        fetched++;
        await sleep(100);
        continue;
      }

      const apiResponse = await golfApiFetch<GolfApiCoordinatesResponse>(
        `/coordinates/${course.golfapi_course_id}`
      );

      if (!apiResponse.coordinates || apiResponse.coordinates.length === 0) {
        console.log(`   .. No coordinate data available`);
        skippedNoData++;
        await sleep(DELAY_MS);
        continue;
      }

      // Transform API coordinates to our format
      const coordinates: CoordinateRow[] = [];
      for (const apiCoord of apiResponse.coordinates) {
        const poiType = mapPoiToPoiType(apiCoord.poi, apiCoord.location);
        if (!poiType) continue;

        coordinates.push({
          course_id: course.course_id,
          hole_number: apiCoord.hole,
          poi_type: poiType,
          latitude: apiCoord.latitude,
          longitude: apiCoord.longitude,
          side_of_fairway: apiCoord.sideFW ? String(apiCoord.sideFW) : null,
        });
      }

      if (coordinates.length === 0) {
        console.log(`   .. No essential POIs in response (${apiResponse.coordinates.length} raw coords)`);
        skippedNoData++;
        await sleep(DELAY_MS);
        continue;
      }

      // Upsert to database
      const count = await upsertCoordinates(coordinates);
      const holesCovered = new Set(coordinates.map((c) => c.hole_number)).size;
      console.log(`   OK ${count} coordinates across ${holesCovered} holes`);

      fetched++;
      totalCoords += count;

      // Log remaining API requests periodically
      if (apiResponse.apiRequestsLeft && (i + 1) % 20 === 0) {
        console.log(`   [API requests remaining: ${apiResponse.apiRequestsLeft}]`);
      }
    } catch (err) {
      if (err instanceof NotFoundError) {
        console.log(`   .. Course not found on GolfAPI.io`);
        skippedNoData++;
      } else {
        console.error(`${progress} !! ${label}: ${(err as Error).message}`);
        failed++;
      }
    }

    await sleep(DELAY_MS);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`Fetched:          ${fetched} courses`);
  console.log(`Coordinates:      ${totalCoords} total POIs upserted`);
  console.log(`Skipped (cached): ${skippedExisting}`);
  console.log(`Skipped (no data):${skippedNoData}`);
  console.log(`Failed:           ${failed}`);
  console.log('='.repeat(50));

  // Summary of what's in the database
  if (!DRY_RUN) {
    const { count } = await supabase
      .from('hole_coordinates')
      .select('*', { count: 'exact', head: true });
    console.log(`\nTotal hole_coordinates in database: ${count}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
