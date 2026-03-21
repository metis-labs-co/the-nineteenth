/**
 * One-off script to seed The Eastern Golf Club from GolfAPI.io into PROD.
 *
 * Only imports the 3 standard 18-hole combinations:
 *   South/North, North/East, East/South
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Only import these 3 combinations (1st=South, 2nd=North, 3rd=East)
const COURSES_TO_IMPORT: { apiCourseId: string; displayName: string }[] = [
  { apiCourseId: '0121769153723593685', displayName: 'South/North Course' },
  { apiCourseId: '0231769153723593685', displayName: 'North/East Course' },
  { apiCourseId: '0311769153723593685', displayName: 'East/South Course' },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRating(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

async function golfApiGet(endpoint: string) {
  const res = await fetch(`${GOLFAPI_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${GOLFAPI_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GolfAPI ${res.status}: ${res.statusText}`);
  return res.json();
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

  // Import only the 3 correct course combinations
  for (const entry of COURSES_TO_IMPORT) {
    console.log(`  Importing: ${entry.displayName}...`);

    const course = await golfApiGet(`courses/${entry.apiCourseId}`);

    const parsMen: number[] = course.parsMen || [];
    const indexesMen: number[] = course.indexesMen || [];
    const parsWomen: number[] = course.parsWomen || [];
    const indexesWomen: number[] = course.indexesWomen || [];

    // Build holes as plain arrays (NOT stringified — Supabase handles JSONB serialization)
    const holes = parsMen.map((par: number, i: number) => ({
      number: i + 1,
      par,
      stroke_index: indexesMen[i] || i + 1,
    }));

    const holesWomen = parsWomen.length
      ? parsWomen.map((par: number, i: number) => ({
          number: i + 1,
          par,
          stroke_index: indexesWomen[i] || i + 1,
        }))
      : null;

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

    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('golfapi_course_id', entry.apiCourseId)
      .single();

    let courseId: string;
    if (existingCourse) {
      await supabase.from('courses').update(courseRecord).eq('id', existingCourse.id);
      courseId = existingCourse.id;
    } else {
      const { data, error } = await supabase.from('courses').insert(courseRecord).select('id').single();
      if (error) throw error;
      courseId = data.id;
    }

    // Upsert tees
    const tees = course.tees || [];
    for (const tee of tees) {
      const teeRecord = {
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
        measure_unit: course.measure || null,
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

      const { data: existingTee } = await supabase
        .from('tees')
        .select('id')
        .eq('golfapi_tee_id', tee.teeID)
        .eq('course_id', courseId)
        .single();

      if (existingTee) {
        await supabase.from('tees').update(teeRecord).eq('id', existingTee.id);
      } else {
        const { error } = await supabase.from('tees').insert(teeRecord);
        if (error) console.warn(`    Tee insert error (${tee.teeName}):`, error.message);
      }
    }

    console.log(`    Done: ${entry.displayName} — ${tees.length} tees`);
    await sleep(300);
  }

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
