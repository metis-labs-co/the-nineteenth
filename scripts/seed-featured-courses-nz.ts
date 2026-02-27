/**
 * Seed Featured Courses Script — New Zealand
 *
 * Imports ~40 popular New Zealand golf courses via GolfAPI.io and marks them
 * as featured so the Courses tab feels populated for NZ users.
 *
 * Usage:
 *   npx tsx scripts/seed-featured-courses-nz.ts
 *
 * Prerequisites:
 *   - .env must have EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   - .env must have EXPO_PUBLIC_GOLFAPI_IO_KEY, EXPO_PUBLIC_GOLFAPI_IO_URL
 *   - The 20260225000000_add_featured_clubs.sql migration must be applied
 *
 * Idempotent: safe to re-run. Uses upsert on golfapi_club_id.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env from project root
config({ path: resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const GOLFAPI_URL = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL || 'https://www.golfapi.io/api/v2.3';
const GOLFAPI_KEY = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}
if (!GOLFAPI_KEY) {
  console.error('Missing EXPO_PUBLIC_GOLFAPI_IO_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================
// CURATED FEATURED CLUB LIST BY REGION
// =====================================================

interface FeaturedClubEntry {
  name: string;
  /** NZ region — stored in the `state` column for consistent filtering */
  region: string;
}

const FEATURED_CLUBS: FeaturedClubEntry[] = [
  // Auckland (~10 clubs)
  { name: 'Titirangi Golf Club', region: 'Auckland' },
  { name: 'Gulf Harbour Country Club', region: 'Auckland' },
  { name: 'Muriwai Golf Club', region: 'Auckland' },
  { name: 'The Royal Auckland Golf Club', region: 'Auckland' },
  { name: 'Akarana Golf Club', region: 'Auckland' },
  { name: 'Remuera Golf Club', region: 'Auckland' },
  { name: 'Formosa Golf Resort', region: 'Auckland' },
  { name: 'Windross Farm Golf Course', region: 'Auckland' },
  { name: 'Pakuranga Golf Club', region: 'Auckland' },
  { name: 'North Shore Golf Club', region: 'Auckland' },

  // Waikato (~7 clubs)
  { name: 'Waikato Golf Club', region: 'Waikato' },
  { name: 'Hamilton Golf Club', region: 'Waikato' },
  { name: 'Cambridge Golf Club', region: 'Waikato' },
  { name: 'Lochiel Golf Club', region: 'Waikato' },
  { name: 'Narrows Golf Club', region: 'Waikato' },
  { name: 'Te Awamutu Golf Club', region: 'Waikato' },
  { name: 'Riverside Golf Club', region: 'Waikato' },

  // Bay of Plenty (~5 clubs)
  { name: 'Tauranga Golf Club', region: 'Bay of Plenty' },
  { name: 'Mount Maunganui Golf Club', region: 'Bay of Plenty' },
  { name: 'Omanu Golf Club', region: 'Bay of Plenty' },
  { name: 'Rotorua Golf Club', region: 'Bay of Plenty' },
  { name: 'Whakatane Golf Club', region: 'Bay of Plenty' },

  // Canterbury (~8 clubs)
  { name: 'Christchurch Golf Club', region: 'Canterbury' },
  { name: 'Clearwater Golf Club', region: 'Canterbury' },
  { name: 'Russley Golf Club', region: 'Canterbury' },
  { name: 'Harewood Golf Club', region: 'Canterbury' },
  { name: 'Pegasus Golf & Sports Club', region: 'Canterbury' },
  { name: 'Rangiora Golf Club', region: 'Canterbury' },
  { name: 'Ashburton Golf Club', region: 'Canterbury' },
  { name: 'Timaru Golf Club', region: 'Canterbury' },

  // Wellington (~6 clubs)
  { name: 'Royal Wellington Golf Club', region: 'Wellington' },
  { name: 'Paraparaumu Beach Golf Club', region: 'Wellington' },
  { name: 'Manor Park Golf Club', region: 'Wellington' },
  { name: 'Shandon Golf Club', region: 'Wellington' },
  { name: 'Hutt Golf Club', region: 'Wellington' },
  { name: 'Miramar Golf Club', region: 'Wellington' },

  // Otago (~5 clubs)
  { name: 'Millbrook Resort', region: 'Otago' },
  { name: 'The Hills', region: 'Otago' },
  { name: 'Arrowtown Golf Club', region: 'Otago' },
  { name: 'Queenstown Golf Club', region: 'Otago' },
  { name: 'Otago Golf Club', region: 'Otago' },
];

// =====================================================
// GOLFAPI.IO HELPERS
// =====================================================

interface GolfApiSearchResult {
  clubID: string;
  clubName: string;
  city?: string;
  state?: string;
  country: string;
  latitude: string;
  longitude: string;
  courses?: Array<{
    courseID: string;
    courseName: string;
    numHoles: number;
  }>;
}

interface GolfApiClubResponse {
  clubID: string;
  clubName: string;
  city?: string;
  state?: string;
  country: string;
  continent?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude: string;
  longitude: string;
  totalHoles?: number;
  courses?: Array<{
    courseID: string;
    longCourseID?: string;
    courseName: string;
    numHoles: number;
  }>;
}

interface GolfApiCourseResponse {
  courseID: string;
  longCourseID?: string;
  courseName: string;
  numHoles: number;
  measureUnit?: string;
  par?: number[];
  parWomen?: number[];
  strokeIndex?: number[];
  strokeIndexWomen?: number[];
  matchPlayStrokeIndex?: number[];
  tees?: Array<{
    teeID: string;
    teeName: string;
    teeColor?: string;
    slope?: number;
    slopeFront9?: number;
    slopeBack9?: number;
    courseRating?: number;
    courseRatingFront9?: number;
    courseRatingBack9?: number;
    slopeWomen?: number;
    slopeWomenFront9?: number;
    slopeWomenBack9?: number;
    courseRatingWomen?: number;
    courseRatingWomenFront9?: number;
    courseRatingWomenBack9?: number;
    measureUnit?: string;
    lengthHole1?: number;
    lengthHole2?: number;
    lengthHole3?: number;
    lengthHole4?: number;
    lengthHole5?: number;
    lengthHole6?: number;
    lengthHole7?: number;
    lengthHole8?: number;
    lengthHole9?: number;
    lengthHole10?: number;
    lengthHole11?: number;
    lengthHole12?: number;
    lengthHole13?: number;
    lengthHole14?: number;
    lengthHole15?: number;
    lengthHole16?: number;
    lengthHole17?: number;
    lengthHole18?: number;
  }>;
}

async function golfApiRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${GOLFAPI_URL}/${endpoint.replace(/^\//, '')}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.append(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${GOLFAPI_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`GolfAPI ${res.status}: ${res.statusText} — ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

async function searchClubByName(
  name: string,
): Promise<GolfApiSearchResult | null> {
  const data = await golfApiRequest<{ clubs: GolfApiSearchResult[] }>('clubs', {
    name,
    country: 'New Zealand',
  });

  if (!data.clubs?.length) return null;

  // Find best match — prefer exact name match, then substring match
  const lowerName = name.toLowerCase();
  const exact = data.clubs.find((c) => c.clubName.toLowerCase() === lowerName);
  if (exact) return exact;

  const partial = data.clubs.find((c) => c.clubName.toLowerCase().includes(lowerName));
  if (partial) return partial;

  const reverse = data.clubs.find((c) => lowerName.includes(c.clubName.toLowerCase()));
  if (reverse) return reverse;

  return data.clubs[0];
}

async function getClubDetails(clubId: string): Promise<GolfApiClubResponse> {
  return golfApiRequest<GolfApiClubResponse>(`clubs/${clubId}`);
}

async function getCourseDetails(courseId: string): Promise<GolfApiCourseResponse> {
  return golfApiRequest<GolfApiCourseResponse>(`courses/${courseId}`);
}

// =====================================================
// DATABASE UPSERT HELPERS
// =====================================================

async function upsertClub(club: GolfApiClubResponse, region: string): Promise<string> {
  const { data: existing } = await supabase
    .from('clubs')
    .select('id')
    .eq('golfapi_club_id', club.clubID)
    .single();

  const clubData = {
    source: 'api',
    golfapi_club_id: club.clubID,
    name: club.clubName,
    address: club.address || null,
    city: club.city || null,
    postal_code: club.postalCode || null,
    state: region, // NZ region stored in state column
    country: 'New Zealand',
    continent: club.continent || 'Oceania',
    phone: club.phone || null,
    email: club.email || null,
    website: club.website || null,
    total_holes: club.totalHoles || null,
    ...(club.latitude && club.longitude
      ? { location: `SRID=4326;POINT(${club.longitude} ${club.latitude})` }
      : {}),
    is_featured: true,
    last_synced: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('clubs')
      .update(clubData)
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('clubs')
    .insert(clubData)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertCourse(
  clubId: string,
  courseSummary: { courseID: string; longCourseID?: string; courseName: string; numHoles: number }
): Promise<string | null> {
  try {
    const courseData = await getCourseDetails(courseSummary.courseID);

    const holes = (courseData.par || []).map((par: number, i: number) => ({
      number: i + 1,
      par,
      stroke_index: courseData.strokeIndex?.[i] || i + 1,
    }));

    const holesWomen =
      courseData.parWomen?.length
        ? courseData.parWomen.map((par: number, i: number) => ({
            number: i + 1,
            par,
            stroke_index: courseData.strokeIndexWomen?.[i] || i + 1,
          }))
        : null;

    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('golfapi_course_id', courseSummary.courseID)
      .single();

    const courseRecord = {
      club_id: clubId,
      golfapi_course_id: courseSummary.courseID,
      golfapi_long_course_id: courseSummary.longCourseID || courseData.longCourseID || null,
      name: courseData.courseName || courseSummary.courseName,
      num_holes: courseData.numHoles || courseSummary.numHoles || 18,
      measure_unit: courseData.measureUnit || null,
      holes: JSON.stringify(holes),
      holes_women: holesWomen ? JSON.stringify(holesWomen) : null,
      match_play_indexes: courseData.matchPlayStrokeIndex
        ? JSON.stringify(courseData.matchPlayStrokeIndex)
        : null,
      golfapi_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let courseId: string;

    if (existing) {
      const { error } = await supabase
        .from('courses')
        .update(courseRecord)
        .eq('id', existing.id);
      if (error) throw error;
      courseId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('courses')
        .insert(courseRecord)
        .select('id')
        .single();
      if (error) throw error;
      courseId = data.id;
    }

    // Upsert tees
    if (courseData.tees?.length) {
      for (const tee of courseData.tees) {
        await upsertTee(courseId, tee);
      }
    }

    return courseId;
  } catch (err) {
    console.warn(`    Warning: Failed to import course "${courseSummary.courseName}":`, (err as Error).message);
    return null;
  }
}

async function upsertTee(
  courseId: string,
  tee: NonNullable<GolfApiCourseResponse['tees']>[0]
): Promise<void> {
  const { data: existing } = await supabase
    .from('tees')
    .select('id')
    .eq('golfapi_tee_id', tee.teeID)
    .single();

  const teeData = {
    course_id: courseId,
    golfapi_tee_id: tee.teeID,
    name: tee.teeName,
    color: tee.teeColor || null,
    slope: tee.slope || null,
    slope_front9: tee.slopeFront9 || null,
    slope_back9: tee.slopeBack9 || null,
    course_rating: tee.courseRating || null,
    course_rating_front9: tee.courseRatingFront9 || null,
    course_rating_back9: tee.courseRatingBack9 || null,
    slope_women: tee.slopeWomen || null,
    slope_women_front9: tee.slopeWomenFront9 || null,
    slope_women_back9: tee.slopeWomenBack9 || null,
    course_rating_women: tee.courseRatingWomen || null,
    course_rating_women_front9: tee.courseRatingWomenFront9 || null,
    course_rating_women_back9: tee.courseRatingWomenBack9 || null,
    measure_unit: tee.measureUnit || null,
    length_hole_1: tee.lengthHole1 || null,
    length_hole_2: tee.lengthHole2 || null,
    length_hole_3: tee.lengthHole3 || null,
    length_hole_4: tee.lengthHole4 || null,
    length_hole_5: tee.lengthHole5 || null,
    length_hole_6: tee.lengthHole6 || null,
    length_hole_7: tee.lengthHole7 || null,
    length_hole_8: tee.lengthHole8 || null,
    length_hole_9: tee.lengthHole9 || null,
    length_hole_10: tee.lengthHole10 || null,
    length_hole_11: tee.lengthHole11 || null,
    length_hole_12: tee.lengthHole12 || null,
    length_hole_13: tee.lengthHole13 || null,
    length_hole_14: tee.lengthHole14 || null,
    length_hole_15: tee.lengthHole15 || null,
    length_hole_16: tee.lengthHole16 || null,
    length_hole_17: tee.lengthHole17 || null,
    length_hole_18: tee.lengthHole18 || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from('tees').update(teeData).eq('id', existing.id);
  } else {
    await supabase.from('tees').insert(teeData);
  }
}

// =====================================================
// MAIN
// =====================================================

const DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Seeding featured New Zealand golf courses...');
  console.log(`   Total clubs to import: ${FEATURED_CLUBS.length}`);
  console.log('');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < FEATURED_CLUBS.length; i++) {
    const entry = FEATURED_CLUBS[i];
    const progress = `[${i + 1}/${FEATURED_CLUBS.length}]`;

    try {
      const match = await searchClubByName(entry.name);

      if (!match) {
        console.log(`${progress} SKIP "${entry.name}" (${entry.region}) — not found on GolfAPI.io`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`${progress} Importing "${match.clubName}" (${entry.region})...`);

      const clubDetails = await getClubDetails(match.clubID);
      const clubId = await upsertClub(clubDetails, entry.region);

      const courses = clubDetails.courses || [];
      let courseCount = 0;
      for (const course of courses) {
        const courseId = await upsertCourse(clubId, course);
        if (courseId) courseCount++;
        await sleep(200);
      }

      console.log(`   OK ${match.clubName} — ${courseCount} course(s)`);
      imported++;
    } catch (err) {
      console.error(`${progress} FAIL "${entry.name}" (${entry.region}):`, (err as Error).message);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log('');
  console.log('=======================================');
  console.log(`OK Imported: ${imported}`);
  console.log(`SKIP Skipped:  ${skipped}`);
  console.log(`FAIL Failed:   ${failed}`);
  console.log('=======================================');

  const { count } = await supabase
    .from('clubs')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true)
    .eq('country', 'New Zealand');

  console.log(`\nTotal featured NZ clubs in database: ${count}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
