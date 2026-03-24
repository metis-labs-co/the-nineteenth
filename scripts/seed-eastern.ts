/**
 * One-off script to seed The Eastern Golf Club from GolfAPI.io into PROD.
 *
 * Only imports the 3 standard 18-hole combinations:
 *   South/North, North/East, East/South
 *
 * NOTE: GolfAPI has a data bug on course 023 (2nd+3rd) — the pars and stroke
 * indexes for the back 9 are wrong (shows 1st nine instead of 3rd nine), and
 * slope/CR are missing. The tee lengths are correct however.
 * To work around this, North/East is built as a composite:
 *   - Front 9 pars/SI from course 021 (North/South, holes 1-9 = North nine)
 *   - Back 9 pars/SI from course 013 (South/East, holes 10-18 = East nine)
 *   - Tee lengths from course 023 (correct for North/East)
 *   - Slope/CR not available from API for this combination
 *
 * Nines: 1st = South, 2nd = North, 3rd = East
 *
 * Usage: npx tsx scripts/seed-eastern.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!;
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bnhmaHV2b2N4eWlsaGxlbmthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDc5NzMyNywiZXhwIjoyMDg2MzczMzI3fQ.ueDZlsAM5neoBzWwXtoJy97nWn51ERaviCsa-W2GCf0';
const GOLFAPI_URL = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL || 'https://www.golfapi.io/api/v2.3';
const GOLFAPI_KEY = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY!;

const CLUB_API_ID = '141519519758903234';
const ID_SUFFIX = '1769153723593685';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Standard courses that can be imported directly from a single API course
const STANDARD_COURSES: { apiCourseId: string; displayName: string }[] = [
  { apiCourseId: `012${ID_SUFFIX}`, displayName: 'South/North Course' },
  { apiCourseId: `031${ID_SUFFIX}`, displayName: 'East/South Course' },
];

// North/East is a composite — built from multiple API courses due to API data bug
const NORTH_EAST = {
  displayName: 'North/East Course',
  // Course 023 has correct tee lengths but wrong pars/SI and no slope/CR
  teeCourseId: `023${ID_SUFFIX}`,
  // Front 9 (North nine) pars/SI from course 021
  front9CourseId: `021${ID_SUFFIX}`,
  // Back 9 (East nine) pars/SI from course 013
  back9CourseId: `013${ID_SUFFIX}`,
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRating(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHoles(pars: number[], indexes: number[]): any[] {
  return pars.map((par: number, i: number) => ({
    number: i + 1,
    par,
    stroke_index: indexes[i] || i + 1,
  }));
}

async function golfApiGet(endpoint: string) {
  const res = await fetch(`${GOLFAPI_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${GOLFAPI_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GolfAPI ${res.status}: ${res.statusText}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTeeRecord(tee: any, courseId: string, measureUnit: string | null) {
  return {
    course_id: courseId,
    golfapi_tee_id: tee.teeID,
    name: tee.teeName,
    color: tee.teeColor || null,
    slope: parseRating(tee.slopeMen),
    slope_front9: parseRating(tee.slopeMenFront9),
    slope_back9: parseRating(tee.slopeMenBack9),
    course_rating: parseRating(tee.courseRatingMen),
    course_rating_front9: parseRating(tee.courseRatingMenFront9),
    course_rating_back9: parseRating(tee.courseRatingMenBack9),
    slope_women: parseRating(tee.slopeWomen),
    slope_women_front9: parseRating(tee.slopeWomenFront9),
    slope_women_back9: parseRating(tee.slopeWomenBack9),
    course_rating_women: parseRating(tee.courseRatingWomen),
    course_rating_women_front9: parseRating(tee.courseRatingWomenFront9),
    course_rating_women_back9: parseRating(tee.courseRatingWomenBack9),
    measure_unit: measureUnit,
    length_hole_1: tee.length1 || null,
    length_hole_2: tee.length2 || null,
    length_hole_3: tee.length3 || null,
    length_hole_4: tee.length4 || null,
    length_hole_5: tee.length5 || null,
    length_hole_6: tee.length6 || null,
    length_hole_7: tee.length7 || null,
    length_hole_8: tee.length8 || null,
    length_hole_9: tee.length9 || null,
    length_hole_10: tee.length10 || null,
    length_hole_11: tee.length11 || null,
    length_hole_12: tee.length12 || null,
    length_hole_13: tee.length13 || null,
    length_hole_14: tee.length14 || null,
    length_hole_15: tee.length15 || null,
    length_hole_16: tee.length16 || null,
    length_hole_17: tee.length17 || null,
    length_hole_18: tee.length18 || null,
    updated_at: new Date().toISOString(),
  };
}

async function upsertCourse(
  clubId: string,
  apiCourseId: string,
  displayName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courseRecord: Record<string, any>
): Promise<string> {
  // Look up by API ID first, then fall back to club+name (handles ID corrections)
  let { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('golfapi_course_id', apiCourseId)
    .single();

  if (!existing) {
    ({ data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('club_id', clubId)
      .eq('name', displayName)
      .single());
  }

  if (existing) {
    await supabase.from('courses').update(courseRecord).eq('id', existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('courses')
    .insert(courseRecord)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertTees(courseId: string, tees: any[], measureUnit: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tee of tees) {
    const teeRecord = buildTeeRecord(tee, courseId, measureUnit);

    const { data: existingTee } = await supabase
      .from('tees')
      .select('id')
      .eq('golfapi_tee_id', tee.teeID)
      .eq('course_id', courseId)
      .single();

    if (existingTee) {
      await supabase.from('tees').update(teeRecord).eq('id', existingTee.id);
    } else {
      // Fall back to matching by tee name for the composite course (different API source)
      const { data: existingByName } = await supabase
        .from('tees')
        .select('id')
        .eq('course_id', courseId)
        .eq('name', tee.teeName)
        .single();

      if (existingByName) {
        await supabase.from('tees').update(teeRecord).eq('id', existingByName.id);
      } else {
        const { error } = await supabase.from('tees').insert(teeRecord);
        if (error) console.warn(`    Tee insert error (${tee.teeName}):`, error.message);
      }
    }
  }
}

async function importStandardCourse(
  clubId: string,
  entry: { apiCourseId: string; displayName: string }
) {
  console.log(`  Importing: ${entry.displayName}...`);

  const course = await golfApiGet(`courses/${entry.apiCourseId}`);

  const parsMen: number[] = course.parsMen || [];
  const indexesMen: number[] = course.indexesMen || [];
  const parsWomen: number[] = course.parsWomen || [];
  const indexesWomen: number[] = course.indexesWomen || [];

  const holes = buildHoles(parsMen, indexesMen);
  const holesWomen = parsWomen.length ? buildHoles(parsWomen, indexesWomen) : null;

  const courseRecord = {
    club_id: clubId,
    golfapi_course_id: entry.apiCourseId,
    name: entry.displayName,
    num_holes: 18,
    measure_unit: course.measure || null,
    holes,
    holes_women: holesWomen,
    golfapi_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const courseId = await upsertCourse(clubId, entry.apiCourseId, entry.displayName, courseRecord);
  await upsertTees(courseId, course.tees || [], course.measure || null);

  console.log(`    Done: ${entry.displayName} — ${(course.tees || []).length} tees`);
  return courseId;
}

async function importNorthEastComposite(clubId: string) {
  const { displayName, teeCourseId, front9CourseId, back9CourseId } = NORTH_EAST;
  console.log(`  Importing: ${displayName} (composite — API data bug workaround)...`);

  // Fetch all 3 source courses in parallel
  const [teeCourse, front9Course, back9Course] = await Promise.all([
    golfApiGet(`courses/${teeCourseId}`),
    golfApiGet(`courses/${front9CourseId}`),
    golfApiGet(`courses/${back9CourseId}`),
  ]);

  // Merge pars/SI: front 9 from course 021 (North nine) + back 9 from course 013 (East nine)
  const parsMen = [
    ...(front9Course.parsMen || []).slice(0, 9),
    ...(back9Course.parsMen || []).slice(9, 18),
  ];
  const indexesMen = [
    ...(front9Course.indexesMen || []).slice(0, 9),
    ...(back9Course.indexesMen || []).slice(9, 18),
  ];
  const parsWomen = [
    ...(front9Course.parsWomen || []).slice(0, 9),
    ...(back9Course.parsWomen || []).slice(9, 18),
  ];
  const indexesWomen = [
    ...(front9Course.indexesWomen || []).slice(0, 9),
    ...(back9Course.indexesWomen || []).slice(9, 18),
  ];

  console.log(`    Merged pars (men):   ${parsMen.join(',')}`);
  console.log(`    Merged SI (men):     ${indexesMen.join(',')}`);

  const holes = buildHoles(parsMen, indexesMen);
  const holesWomen = parsWomen.length ? buildHoles(parsWomen, indexesWomen) : null;

  const courseRecord = {
    club_id: clubId,
    golfapi_course_id: teeCourseId,
    name: displayName,
    num_holes: 18,
    measure_unit: teeCourse.measure || null,
    holes,
    holes_women: holesWomen,
    golfapi_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const courseId = await upsertCourse(clubId, teeCourseId, displayName, courseRecord);

  // Use tees from course 023 (lengths are correct for North/East)
  await upsertTees(courseId, teeCourse.tees || [], teeCourse.measure || null);

  console.log(`    Done: ${displayName} — ${(teeCourse.tees || []).length} tees (slope/CR not available from API)`);
  return courseId;
}

async function main() {
  console.log('Fetching The Eastern Golf Club from GolfAPI...');

  const club = await golfApiGet(`clubs/${CLUB_API_ID}`);
  console.log(`Found: ${club.clubName}`);

  // Upsert club
  const clubRecord = {
    source: 'api',
    golfapi_club_id: club.clubID,
    name: club.clubName,
    address: club.address || null,
    city: club.city || null,
    postal_code: club.postalCode || null,
    state: 'VIC',
    country: 'Australia',
    continent: 'Oceania',
    phone: club.telephone || null,
    website: club.website || null,
    total_holes: 27,
    location: `SRID=4326;POINT(${club.longitude} ${club.latitude})`,
    is_featured: true,
    last_synced: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: existingClub } = await supabase
    .from('clubs')
    .select('id')
    .eq('golfapi_club_id', club.clubID)
    .single();

  let clubId: string;
  if (existingClub) {
    await supabase.from('clubs').update(clubRecord).eq('id', existingClub.id);
    clubId = existingClub.id;
  } else {
    const { data, error } = await supabase.from('clubs').insert(clubRecord).select('id').single();
    if (error) throw error;
    clubId = data.id;
  }
  console.log(`Club upserted: ${clubId}`);

  // Import standard courses (South/North, East/South)
  for (const entry of STANDARD_COURSES) {
    await importStandardCourse(clubId, entry);
    await sleep(300);
  }

  // Import composite North/East course
  await importNorthEastComposite(clubId);

  console.log('\nComplete: 1 club, 3 courses imported to PROD.');

  // Verify
  const { data: verify } = await supabase
    .from('courses')
    .select('id, name, num_holes')
    .eq('club_id', clubId);
  console.log('\nVerification:');
  verify?.forEach((c: { id: string; name: string; num_holes: number }) =>
    console.log(`  - ${c.name} (${c.num_holes} holes) — ${c.id}`)
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
