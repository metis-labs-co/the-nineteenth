/**
 * Seed Featured Courses Script — United Kingdom
 *
 * Imports ~80 popular UK golf courses via GolfAPI.io and marks them
 * as featured so the Courses tab feels populated for UK users.
 *
 * IMPORTANT: GolfAPI.io indexes UK clubs under constituent countries
 * (England, Scotland, Wales, Northern Ireland) — NOT "United Kingdom".
 * The search uses the constituent country name, but stores
 * country: 'United Kingdom' and state: <constituent country> in the DB.
 *
 * Usage:
 *   npx tsx scripts/seed-featured-courses-uk.ts
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
  /** Constituent country — used as search param AND stored in `state` column */
  region: string;
}

const FEATURED_CLUBS: FeaturedClubEntry[] = [
  // ── England (~40 clubs) ────────────────────────────

  // London / South East
  { name: 'Wentworth Club', region: 'England' },
  { name: 'Sunningdale Golf Club', region: 'England' },
  { name: 'Royal St George\'s Golf Club', region: 'England' },
  { name: 'Walton Heath Golf Club', region: 'England' },
  { name: 'The Berkshire Golf Club', region: 'England' },
  { name: 'Royal Cinque Ports Golf Club', region: 'England' },
  { name: 'Prince\'s Golf Club', region: 'England' },
  { name: 'Chart Hills Golf Club', region: 'England' },
  { name: 'West Sussex Golf Club', region: 'England' },
  { name: 'Woking Golf Club', region: 'England' },
  { name: 'St George\'s Hill Golf Club', region: 'England' },
  { name: 'Queenwood Golf Club', region: 'England' },

  // North West / Lancashire
  { name: 'Royal Birkdale Golf Club', region: 'England' },
  { name: 'Royal Lytham & St Annes Golf Club', region: 'England' },
  { name: 'Formby Golf Club', region: 'England' },
  { name: 'Hillside Golf Club', region: 'England' },
  { name: 'The Belfry', region: 'England' },
  { name: 'West Lancashire Golf Club', region: 'England' },
  { name: 'Southport & Ainsdale Golf Club', region: 'England' },

  // North East / Yorkshire
  { name: 'Alwoodley Golf Club', region: 'England' },
  { name: 'Ganton Golf Club', region: 'England' },
  { name: 'Moortown Golf Club', region: 'England' },
  { name: 'Lindrick Golf Club', region: 'England' },
  { name: 'Fulford Golf Club', region: 'England' },
  { name: 'Slaley Hall', region: 'England' },

  // South West
  { name: 'Saunton Golf Club', region: 'England' },
  { name: 'St Enodoc Golf Club', region: 'England' },
  { name: 'Burnham & Berrow Golf Club', region: 'England' },
  { name: 'Royal North Devon Golf Club', region: 'England' },
  { name: 'Trevose Golf & Country Club', region: 'England' },

  // Midlands
  { name: 'Woodhall Spa Golf Club', region: 'England' },
  { name: 'Woburn Golf Club', region: 'England' },
  { name: 'The Belfry Hotel & Resort', region: 'England' },
  { name: 'Little Aston Golf Club', region: 'England' },
  { name: 'Notts Golf Club', region: 'England' },

  // East
  { name: 'Royal West Norfolk Golf Club', region: 'England' },
  { name: 'Hunstanton Golf Club', region: 'England' },
  { name: 'Royal Worlington & Newmarket Golf Club', region: 'England' },
  { name: 'Aldeburgh Golf Club', region: 'England' },

  // ── Scotland (~25 clubs) ───────────────────────────

  // St Andrews area
  { name: 'St Andrews Links', region: 'Scotland' },
  { name: 'Kingsbarns Golf Links', region: 'Scotland' },
  { name: 'Crail Golfing Society', region: 'Scotland' },
  { name: 'Elie Golf House Club', region: 'Scotland' },

  // Edinburgh / East Lothian
  { name: 'Muirfield', region: 'Scotland' },
  { name: 'North Berwick Golf Club', region: 'Scotland' },
  { name: 'Gullane Golf Club', region: 'Scotland' },
  { name: 'Renaissance Club', region: 'Scotland' },
  { name: 'Archerfield Links', region: 'Scotland' },

  // Ayrshire
  { name: 'Royal Troon Golf Club', region: 'Scotland' },
  { name: 'Trump Turnberry', region: 'Scotland' },
  { name: 'Prestwick Golf Club', region: 'Scotland' },
  { name: 'Western Gailes Golf Club', region: 'Scotland' },
  { name: 'Dundonald Links', region: 'Scotland' },

  // Highlands
  { name: 'Royal Dornoch Golf Club', region: 'Scotland' },
  { name: 'Castle Stuart Golf Links', region: 'Scotland' },
  { name: 'Nairn Golf Club', region: 'Scotland' },
  { name: 'Brora Golf Club', region: 'Scotland' },

  // Central
  { name: 'Gleneagles', region: 'Scotland' },
  { name: 'Carnoustie Golf Links', region: 'Scotland' },
  { name: 'Loch Lomond Golf Club', region: 'Scotland' },
  { name: 'Dumbarnie Links', region: 'Scotland' },
  { name: 'Trump International Golf Links', region: 'Scotland' },

  // ── Wales (~8 clubs) ──────────────────────────────

  { name: 'Royal Porthcawl Golf Club', region: 'Wales' },
  { name: 'Celtic Manor Resort', region: 'Wales' },
  { name: 'Pennard Golf Club', region: 'Wales' },
  { name: 'Royal St David\'s Golf Club', region: 'Wales' },
  { name: 'Aberdovey Golf Club', region: 'Wales' },
  { name: 'Tenby Golf Club', region: 'Wales' },
  { name: 'Nefyn & District Golf Club', region: 'Wales' },
  { name: 'Machynlleth Golf Club', region: 'Wales' },

  // ── Northern Ireland (~7 clubs) ────────────────────

  { name: 'Royal County Down Golf Club', region: 'Northern Ireland' },
  { name: 'Royal Portrush Golf Club', region: 'Northern Ireland' },
  { name: 'Portstewart Golf Club', region: 'Northern Ireland' },
  { name: 'Ardglass Golf Club', region: 'Northern Ireland' },
  { name: 'Castlerock Golf Club', region: 'Northern Ireland' },
  { name: 'Malone Golf Club', region: 'Northern Ireland' },
  { name: 'Belvoir Park Golf Club', region: 'Northern Ireland' },
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

let apiCallCount = 0;

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

  apiCallCount++;

  if (!res.ok) {
    throw new Error(`GolfAPI ${res.status}: ${res.statusText} — ${endpoint}`);
  }

  return res.json() as Promise<T>;
}

async function searchClubByName(
  name: string,
  constituentCountry: string,
): Promise<GolfApiSearchResult | null> {
  // GolfAPI.io uses constituent country names for England/Scotland/Wales,
  // but Northern Ireland clubs aren't indexed under any country — search without country filter
  const params: Record<string, string> = { name };
  if (constituentCountry !== 'Northern Ireland') {
    params.country = constituentCountry;
  }
  const data = await golfApiRequest<{ clubs: GolfApiSearchResult[] }>('clubs', params);

  if (!data.clubs?.length) return null;

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
    state: region, // Constituent country stored in state column
    country: 'United Kingdom',
    continent: 'Europe',
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
  console.log('Seeding featured United Kingdom golf courses...');
  console.log(`   Total clubs to import: ${FEATURED_CLUBS.length}`);
  console.log('');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < FEATURED_CLUBS.length; i++) {
    const entry = FEATURED_CLUBS[i];
    const progress = `[${i + 1}/${FEATURED_CLUBS.length}]`;

    try {
      // Search using constituent country name (England, Scotland, etc.)
      const match = await searchClubByName(entry.name, entry.region);

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
  console.log(`API calls used: ${apiCallCount}`);
  console.log('=======================================');

  const { count } = await supabase
    .from('clubs')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true)
    .eq('country', 'United Kingdom');

  console.log(`\nTotal featured UK clubs in database: ${count}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
