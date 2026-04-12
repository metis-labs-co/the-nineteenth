/**
 * Seed additional courses for The Eastern Golf Club into PROD.
 *
 * Adds the 3 reverse nine combinations and the Eastern Waters composite:
 *   - North/South Course (reverse of South/North)
 *   - South/East Course (reverse of East/South)
 *   - East/North Course (reverse of North/East)
 *   - Eastern Waters (East holes 1-7 + Shark Waters Par 3 + East holes 8-9)
 *
 * Reverse courses swap the front 9 and back 9 data from their counterpart:
 *   same pars, SI, slope, CR per physical hole, just repositioned.
 *
 * Eastern Waters has pars and distances assembled from source courses,
 * but SI, slope, and CR are left null for manual entry.
 *
 * After creating courses, sets api_locked = true on ALL Eastern courses
 * to prevent API sync from overwriting manually-curated data.
 *
 * Usage: npx tsx scripts/seed-eastern-extras.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!;
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bnhmaHV2b2N4eWlsaGxlbmthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDc5NzMyNywiZXhwIjoyMDg2MzczMzI3fQ.ueDZlsAM5neoBzWwXtoJy97nWn51ERaviCsa-W2GCf0';

const CLUB_API_ID = '141519519758903234';
const ID_SUFFIX = '1769153723593685';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Reverse course mappings: new course → counterpart name + API course ID
const REVERSE_COURSES = [
  {
    displayName: 'North/South Course',
    counterpartName: 'South/North Course',
    apiCourseId: `021${ID_SUFFIX}`,
  },
  {
    displayName: 'South/East Course',
    counterpartName: 'East/South Course',
    apiCourseId: `013${ID_SUFFIX}`,
  },
  {
    displayName: 'East/North Course',
    counterpartName: 'North/East Course',
    apiCourseId: `032${ID_SUFFIX}`,
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface HoleData {
  number: number;
  par: number;
  stroke_index?: number;
  strokeIndex?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TeeRow {
  id: string;
  name: string;
  color: string | null;
  golfapi_tee_id: string | null;
  slope: number | null;
  slope_front9: number | null;
  slope_back9: number | null;
  course_rating: number | null;
  course_rating_front9: number | null;
  course_rating_back9: number | null;
  slope_women: number | null;
  slope_women_front9: number | null;
  slope_women_back9: number | null;
  course_rating_women: number | null;
  course_rating_women_front9: number | null;
  course_rating_women_back9: number | null;
  measure_unit: string | null;
  length_hole_1: number | null;
  length_hole_2: number | null;
  length_hole_3: number | null;
  length_hole_4: number | null;
  length_hole_5: number | null;
  length_hole_6: number | null;
  length_hole_7: number | null;
  length_hole_8: number | null;
  length_hole_9: number | null;
  length_hole_10: number | null;
  length_hole_11: number | null;
  length_hole_12: number | null;
  length_hole_13: number | null;
  length_hole_14: number | null;
  length_hole_15: number | null;
  length_hole_16: number | null;
  length_hole_17: number | null;
  length_hole_18: number | null;
}

/**
 * Swap front 9 and back 9 hole data, renumbering to 1-18.
 */
function swapHoles(holes: HoleData[]): HoleData[] {
  const front9 = holes.filter((h) => h.number <= 9);
  const back9 = holes.filter((h) => h.number > 9);

  // Back 9 becomes new front 9 (renumber 10-18 → 1-9)
  const newFront = back9.map((h, i) => ({
    ...h,
    number: i + 1,
  }));
  // Front 9 becomes new back 9 (renumber 1-9 → 10-18)
  const newBack = front9.map((h, i) => ({
    ...h,
    number: i + 10,
  }));

  return [...newFront, ...newBack];
}

/**
 * Build a reversed tee record: swap hole distances and F9/B9 ratings.
 */
function buildReversedTee(tee: TeeRow, newCourseId: string): Record<string, unknown> {
  return {
    course_id: newCourseId,
    golfapi_tee_id: null, // No API equivalent for reversed tees
    name: tee.name,
    color: tee.color,
    // Overall ratings stay the same
    slope: tee.slope,
    course_rating: tee.course_rating,
    slope_women: tee.slope_women,
    course_rating_women: tee.course_rating_women,
    // Swap F9/B9 ratings
    slope_front9: tee.slope_back9,
    slope_back9: tee.slope_front9,
    course_rating_front9: tee.course_rating_back9,
    course_rating_back9: tee.course_rating_front9,
    slope_women_front9: tee.slope_women_back9,
    slope_women_back9: tee.slope_women_front9,
    course_rating_women_front9: tee.course_rating_women_back9,
    course_rating_women_back9: tee.course_rating_women_front9,
    // Swap hole distances: B9 → F9, F9 → B9
    measure_unit: tee.measure_unit,
    length_hole_1: tee.length_hole_10,
    length_hole_2: tee.length_hole_11,
    length_hole_3: tee.length_hole_12,
    length_hole_4: tee.length_hole_13,
    length_hole_5: tee.length_hole_14,
    length_hole_6: tee.length_hole_15,
    length_hole_7: tee.length_hole_16,
    length_hole_8: tee.length_hole_17,
    length_hole_9: tee.length_hole_18,
    length_hole_10: tee.length_hole_1,
    length_hole_11: tee.length_hole_2,
    length_hole_12: tee.length_hole_3,
    length_hole_13: tee.length_hole_4,
    length_hole_14: tee.length_hole_5,
    length_hole_15: tee.length_hole_6,
    length_hole_16: tee.length_hole_7,
    length_hole_17: tee.length_hole_8,
    length_hole_18: tee.length_hole_9,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Upsert a course, matching by (club_id, name).
 */
async function upsertCourse(
  clubId: string,
  name: string,
  courseRecord: Record<string, unknown>
): Promise<string> {
  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('club_id', clubId)
    .eq('name', name)
    .single();

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

/**
 * Upsert tees for a course, matching by (course_id, name).
 */
async function upsertTees(courseId: string, tees: Record<string, unknown>[]) {
  for (const tee of tees) {
    const teeName = tee.name as string;

    const { data: existing } = await supabase
      .from('tees')
      .select('id')
      .eq('course_id', courseId)
      .eq('name', teeName)
      .single();

    if (existing) {
      await supabase.from('tees').update(tee).eq('id', existing.id);
    } else {
      const { error } = await supabase.from('tees').insert(tee);
      if (error) console.warn(`    Tee insert error (${teeName}):`, error.message);
    }
  }
}

async function main() {
  console.log('=== Seed Eastern Extras ===\n');

  // Step 1: Find The Eastern club
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('golfapi_club_id', CLUB_API_ID)
    .single();

  if (clubErr || !club) {
    throw new Error(`Club not found (golfapi_club_id=${CLUB_API_ID}): ${clubErr?.message}`);
  }
  console.log(`Found club: ${club.name} (${club.id})\n`);

  // Step 2: Load existing courses and their tees
  const { data: existingCourses } = await supabase
    .from('courses')
    .select('id, name, holes, holes_women, measure_unit')
    .eq('club_id', club.id);

  if (!existingCourses?.length) {
    throw new Error('No existing courses found for The Eastern');
  }

  console.log('Existing courses:');
  existingCourses.forEach((c) => console.log(`  - ${c.name} (${c.id})`));
  console.log();

  const courseMap = new Map(existingCourses.map((c) => [c.name, c]));

  // Step 3: Create reverse courses
  for (const rev of REVERSE_COURSES) {
    console.log(`Creating: ${rev.displayName} (reverse of ${rev.counterpartName})...`);

    const counterpart = courseMap.get(rev.counterpartName);
    if (!counterpart) {
      console.warn(`  SKIP: counterpart "${rev.counterpartName}" not found in DB`);
      continue;
    }

    // Swap holes F9 ↔ B9
    const originalHoles = counterpart.holes as HoleData[];
    const swappedHoles = swapHoles(originalHoles);

    let swappedHolesWomen: HoleData[] | null = null;
    if (counterpart.holes_women) {
      swappedHolesWomen = swapHoles(counterpart.holes_women as HoleData[]);
    }

    const courseRecord = {
      club_id: club.id,
      golfapi_course_id: rev.apiCourseId,
      name: rev.displayName,
      num_holes: 18,
      measure_unit: counterpart.measure_unit,
      holes: swappedHoles,
      holes_women: swappedHolesWomen,
      api_locked: true,
      golfapi_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newCourseId = await upsertCourse(club.id, rev.displayName, courseRecord);

    // Load counterpart tees and create reversed copies
    const { data: counterpartTees } = await supabase
      .from('tees')
      .select('*')
      .eq('course_id', counterpart.id);

    if (counterpartTees?.length) {
      const reversedTees = counterpartTees.map((tee: TeeRow) =>
        buildReversedTee(tee, newCourseId)
      );
      await upsertTees(newCourseId, reversedTees);
      console.log(`  Done: ${reversedTees.length} tees created`);
    } else {
      console.log('  Done: no tees to copy');
    }
  }

  // Step 4: Create Eastern Waters composite
  console.log('\nCreating: Eastern Waters (East holes 1-7 + Par 3 + East holes 8-9)...');

  const eastSouth = courseMap.get('East/South Course');
  // Find Shark Waters by partial name match
  const sharkWaters = existingCourses.find(
    (c) => c.name.toLowerCase().includes('shark') || c.name.toLowerCase().includes('par 3')
  );

  if (!eastSouth) {
    console.warn('  SKIP: East/South Course not found — cannot build Eastern Waters');
  } else if (!sharkWaters) {
    console.warn('  SKIP: Shark Waters course not found — cannot build Eastern Waters');
  } else {
    const eastHoles = eastSouth.holes as HoleData[];
    const sharkHoles = sharkWaters.holes as HoleData[];

    // East holes 1-7 → positions 1-7
    const part1 = eastHoles
      .filter((h) => h.number >= 1 && h.number <= 7)
      .map((h) => ({
        number: h.number,
        par: h.par,
        stroke_index: null, // User fills in manually
      }));

    // Shark Waters holes 1-9 → positions 8-16
    const part2 = sharkHoles
      .filter((h) => h.number >= 1 && h.number <= 9)
      .map((h, i) => ({
        number: 8 + i,
        par: h.par,
        stroke_index: null,
      }));

    // East holes 8-9 → positions 17-18
    const part3 = eastHoles
      .filter((h) => h.number >= 8 && h.number <= 9)
      .map((h, i) => ({
        number: 17 + i,
        par: h.par,
        stroke_index: null,
      }));

    const compositeHoles = [...part1, ...part2, ...part3];
    console.log(
      `  Pars: ${compositeHoles.map((h) => h.par).join(', ')} (${compositeHoles.length} holes)`
    );

    const courseRecord = {
      club_id: club.id,
      golfapi_course_id: null, // No API equivalent
      name: 'Eastern Waters',
      num_holes: 18,
      measure_unit: eastSouth.measure_unit,
      holes: compositeHoles,
      holes_women: null,
      api_locked: true,
      updated_at: new Date().toISOString(),
    };

    const compositeId = await upsertCourse(club.id, 'Eastern Waters', courseRecord);

    // Build tees by matching names between East/South and Shark Waters
    const { data: eastTees } = await supabase
      .from('tees')
      .select('*')
      .eq('course_id', eastSouth.id);

    const { data: sharkTees } = await supabase
      .from('tees')
      .select('*')
      .eq('course_id', sharkWaters.id);

    if (eastTees?.length && sharkTees?.length) {
      const compositeTees: Record<string, unknown>[] = [];

      // For each East/South tee, try to find a matching Shark Waters tee
      for (const eTee of eastTees as TeeRow[]) {
        // Shark Waters likely has fewer tees — try exact name match first, then first available
        const sTee = (sharkTees as TeeRow[]).find(
          (s) => s.name.toLowerCase() === eTee.name.toLowerCase()
        ) || (sharkTees[0] as TeeRow);

        compositeTees.push({
          course_id: compositeId,
          golfapi_tee_id: null,
          name: eTee.name,
          color: eTee.color,
          measure_unit: eTee.measure_unit,
          // Slope/CR: null — user fills in manually
          slope: null,
          slope_front9: null,
          slope_back9: null,
          course_rating: null,
          course_rating_front9: null,
          course_rating_back9: null,
          slope_women: null,
          slope_women_front9: null,
          slope_women_back9: null,
          course_rating_women: null,
          course_rating_women_front9: null,
          course_rating_women_back9: null,
          // Distances: East holes 1-7 → positions 1-7
          length_hole_1: eTee.length_hole_1,
          length_hole_2: eTee.length_hole_2,
          length_hole_3: eTee.length_hole_3,
          length_hole_4: eTee.length_hole_4,
          length_hole_5: eTee.length_hole_5,
          length_hole_6: eTee.length_hole_6,
          length_hole_7: eTee.length_hole_7,
          // Distances: Shark Waters holes 1-9 → positions 8-16
          length_hole_8: sTee.length_hole_1,
          length_hole_9: sTee.length_hole_2,
          length_hole_10: sTee.length_hole_3,
          length_hole_11: sTee.length_hole_4,
          length_hole_12: sTee.length_hole_5,
          length_hole_13: sTee.length_hole_6,
          length_hole_14: sTee.length_hole_7,
          length_hole_15: sTee.length_hole_8,
          length_hole_16: sTee.length_hole_9,
          // Distances: East holes 8-9 → positions 17-18
          length_hole_17: eTee.length_hole_8,
          length_hole_18: eTee.length_hole_9,
          updated_at: new Date().toISOString(),
        });
      }

      await upsertTees(compositeId, compositeTees);
      console.log(`  Done: ${compositeTees.length} tees created (slope/CR/SI need manual entry)`);
    } else {
      console.log('  Done: no tees available to combine');
    }
  }

  // Step 5: Lock ALL Eastern courses from API updates
  console.log('\nLocking all Eastern courses from API updates...');
  const { data: allCourses, error: lockErr } = await supabase
    .from('courses')
    .update({ api_locked: true })
    .eq('club_id', club.id)
    .select('id, name');

  if (lockErr) {
    console.error('  Error locking courses:', lockErr.message);
  } else {
    console.log(`  Locked ${allCourses?.length || 0} courses:`);
    allCourses?.forEach((c: { id: string; name: string }) =>
      console.log(`    - ${c.name} (${c.id})`)
    );
  }

  // Step 6: Verification
  console.log('\n=== Verification ===');
  const { data: verify } = await supabase
    .from('courses')
    .select('id, name, num_holes, api_locked')
    .eq('club_id', club.id)
    .order('name');

  console.log(`\nThe Eastern Golf Club — ${verify?.length || 0} courses:`);
  verify?.forEach((c: { id: string; name: string; num_holes: number; api_locked: boolean }) =>
    console.log(
      `  ${c.api_locked ? '🔒' : '  '} ${c.name} (${c.num_holes}h) — ${c.id}`
    )
  );

  console.log('\nComplete.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
