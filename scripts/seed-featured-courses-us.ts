/**
 * Seed Featured Courses Script — United States
 *
 * Imports ~100 popular US golf courses via GolfAPI.io and marks them
 * as featured so the Courses tab feels populated for US users.
 *
 * Usage:
 *   npx tsx scripts/seed-featured-courses-us.ts
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
// CURATED FEATURED CLUB LIST BY STATE
// =====================================================

interface FeaturedClubEntry {
  name: string;
  state: string;
}

const FEATURED_CLUBS: FeaturedClubEntry[] = [
  // ── California (~12 clubs) ─────────────────────────
  { name: 'Pebble Beach Golf Links', state: 'CA' },
  { name: 'Spyglass Hill Golf Course', state: 'CA' },
  { name: 'Torrey Pines Golf Course', state: 'CA' },
  { name: 'Pasatiempo Golf Club', state: 'CA' },
  { name: 'Pelican Hill Golf Club', state: 'CA' },
  { name: 'Rustic Canyon Golf Course', state: 'CA' },
  { name: 'Half Moon Bay Golf Links', state: 'CA' },
  { name: 'The Links at Spanish Bay', state: 'CA' },
  { name: 'TPC Harding Park', state: 'CA' },
  { name: 'PGA West', state: 'CA' },
  { name: 'Poppy Hills Golf Course', state: 'CA' },
  { name: 'Pacific Grove Golf Links', state: 'CA' },

  // ── Florida (~12 clubs) ────────────────────────────
  { name: 'TPC Sawgrass', state: 'FL' },
  { name: 'Streamsong Resort', state: 'FL' },
  { name: 'Bay Hill Club & Lodge', state: 'FL' },
  { name: 'PGA National Resort', state: 'FL' },
  { name: 'Innisbrook Resort', state: 'FL' },
  { name: 'Hammock Beach Resort', state: 'FL' },
  { name: 'Trump National Doral Miami', state: 'FL' },
  { name: 'Orange County National Golf Center', state: 'FL' },
  { name: 'ChampionsGate Golf Club', state: 'FL' },
  { name: 'Grand Cypress Golf Club', state: 'FL' },
  { name: 'World Golf Village', state: 'FL' },
  { name: 'Reunion Resort', state: 'FL' },

  // ── Arizona (~8 clubs) ─────────────────────────────
  { name: 'TPC Scottsdale', state: 'AZ' },
  { name: 'Troon North Golf Club', state: 'AZ' },
  { name: 'Grayhawk Golf Club', state: 'AZ' },
  { name: 'We-Ko-Pa Golf Club', state: 'AZ' },
  { name: 'Quintero Golf Club', state: 'AZ' },
  { name: 'The Boulders Golf Club', state: 'AZ' },
  { name: 'Gold Canyon Golf Resort', state: 'AZ' },
  { name: 'Ak-Chin Southern Dunes Golf Club', state: 'AZ' },

  // ── South Carolina (~8 clubs) ──────────────────────
  { name: 'Kiawah Island Golf Resort', state: 'SC' },
  { name: 'Harbour Town Golf Links', state: 'SC' },
  { name: 'TPC Myrtle Beach', state: 'SC' },
  { name: 'Caledonia Golf & Fish Club', state: 'SC' },
  { name: 'Barefoot Resort & Golf', state: 'SC' },
  { name: 'Tidewater Golf Club', state: 'SC' },
  { name: 'Dunes Golf & Beach Club', state: 'SC' },
  { name: 'Pawleys Plantation Golf & Country Club', state: 'SC' },

  // ── North Carolina (~8 clubs) ──────────────────────
  { name: 'Pinehurst Resort', state: 'NC' },
  { name: 'Tobacco Road Golf Club', state: 'NC' },
  { name: 'Pine Needles Lodge & Golf Club', state: 'NC' },
  { name: 'Mid Pines Inn and Golf Club', state: 'NC' },
  { name: 'Grandover Resort', state: 'NC' },
  { name: 'Tot Hill Farm Golf Club', state: 'NC' },
  { name: 'Uwharrie Point Golf Club', state: 'NC' },
  { name: 'Lonnie Poole Golf Course', state: 'NC' },

  // ── Georgia (~6 clubs) ─────────────────────────────
  { name: 'East Lake Golf Club', state: 'GA' },
  { name: 'Sea Island Golf Club', state: 'GA' },
  { name: 'Reynolds Lake Oconee', state: 'GA' },
  { name: 'TPC Sugarloaf', state: 'GA' },
  { name: 'Brasstown Valley Resort', state: 'GA' },
  { name: 'Cuscowilla Golf Resort', state: 'GA' },

  // ── Texas (~8 clubs) ───────────────────────────────
  { name: 'TPC San Antonio', state: 'TX' },
  { name: 'Barton Creek Resort & Spa', state: 'TX' },
  { name: 'Horseshoe Bay Resort', state: 'TX' },
  { name: 'La Cantera Resort & Spa', state: 'TX' },
  { name: 'Whispering Pines Golf Club', state: 'TX' },
  { name: 'Colonial Country Club', state: 'TX' },
  { name: 'The Clubs at Houston Oaks', state: 'TX' },
  { name: 'Wolfdancer Golf Club', state: 'TX' },

  // ── Hawaii (~6 clubs) ──────────────────────────────
  { name: 'Kapalua Golf', state: 'HI' },
  { name: 'Mauna Kea Golf Course', state: 'HI' },
  { name: 'Mauna Lani Golf Course', state: 'HI' },
  { name: 'Poipu Bay Golf Course', state: 'HI' },
  { name: 'Princeville Makai Golf Club', state: 'HI' },
  { name: 'Ko Olina Golf Club', state: 'HI' },

  // ── New York (~6 clubs) ────────────────────────────
  { name: 'Bethpage State Park Golf Course', state: 'NY' },
  { name: 'Turning Stone Resort', state: 'NY' },
  { name: 'Saratoga National Golf Club', state: 'NY' },
  { name: 'Montauk Downs State Park Golf Course', state: 'NY' },
  { name: 'Leatherstocking Golf Course', state: 'NY' },
  { name: 'Pound Ridge Golf Club', state: 'NY' },

  // ── Nevada (~5 clubs) ──────────────────────────────
  { name: 'Shadow Creek Golf Course', state: 'NV' },
  { name: 'Cascata Golf Club', state: 'NV' },
  { name: 'TPC Las Vegas', state: 'NV' },
  { name: 'Wolf Creek Golf Club', state: 'NV' },
  { name: 'Reflection Bay Golf Club', state: 'NV' },

  // ── Other notable states (~15 clubs) ───────────────
  { name: 'Bandon Dunes Golf Resort', state: 'OR' },
  { name: 'Chambers Bay', state: 'WA' },
  { name: 'Gamble Sands', state: 'WA' },
  { name: 'Whistling Straits', state: 'WI' },
  { name: 'Sand Valley Golf Resort', state: 'WI' },
  { name: 'Erin Hills', state: 'WI' },
  { name: 'Arcadia Bluffs Golf Club', state: 'MI' },
  { name: 'Forest Dunes Golf Club', state: 'MI' },
  { name: 'French Lick Resort', state: 'IN' },
  { name: 'Sweetens Cove Golf Club', state: 'TN' },
  { name: 'The Coeur d\'Alene Resort Golf Course', state: 'ID' },
  { name: 'Streamsong Resort Blue', state: 'FL' },
  { name: 'Pinon Hills Golf Course', state: 'NM' },
  { name: 'Barnsley Resort Golf Course', state: 'GA' },
  { name: 'Cabot Citrus Farms', state: 'FL' },
];

// =====================================================
// STATE MAPPING — full name → abbreviation (all 50 states + DC)
// =====================================================

function mapState(state: string | undefined): string | null {
  if (!state) return null;
  const mapping: Record<string, string> = {
    // Already abbreviated
    AL: 'AL', AK: 'AK', AZ: 'AZ', AR: 'AR', CA: 'CA',
    CO: 'CO', CT: 'CT', DE: 'DE', FL: 'FL', GA: 'GA',
    HI: 'HI', ID: 'ID', IL: 'IL', IN: 'IN', IA: 'IA',
    KS: 'KS', KY: 'KY', LA: 'LA', ME: 'ME', MD: 'MD',
    MA: 'MA', MI: 'MI', MN: 'MN', MS: 'MS', MO: 'MO',
    MT: 'MT', NE: 'NE', NV: 'NV', NH: 'NH', NJ: 'NJ',
    NM: 'NM', NY: 'NY', NC: 'NC', ND: 'ND', OH: 'OH',
    OK: 'OK', OR: 'OR', PA: 'PA', RI: 'RI', SC: 'SC',
    SD: 'SD', TN: 'TN', TX: 'TX', UT: 'UT', VT: 'VT',
    VA: 'VA', WA: 'WA', WV: 'WV', WI: 'WI', WY: 'WY',
    DC: 'DC',
    // Full names
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  };
  return mapping[state] || state;
}

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
  state: string
): Promise<GolfApiSearchResult | null> {
  // GolfAPI.io uses 'USA' not 'United States'
  const data = await golfApiRequest<{ clubs: GolfApiSearchResult[] }>('clubs', {
    name,
    state,
    country: 'USA',
  });

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

async function upsertClub(club: GolfApiClubResponse): Promise<string> {
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
    state: mapState(club.state),
    country: 'United States',
    continent: 'North America',
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
  console.log('Seeding featured United States golf courses...');
  console.log(`   Total clubs to import: ${FEATURED_CLUBS.length}`);
  console.log('');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < FEATURED_CLUBS.length; i++) {
    const entry = FEATURED_CLUBS[i];
    const progress = `[${i + 1}/${FEATURED_CLUBS.length}]`;

    try {
      const match = await searchClubByName(entry.name, entry.state);

      if (!match) {
        console.log(`${progress} SKIP "${entry.name}" (${entry.state}) — not found on GolfAPI.io`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`${progress} Importing "${match.clubName}" (${entry.state})...`);

      const clubDetails = await getClubDetails(match.clubID);
      const clubId = await upsertClub(clubDetails);

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
      console.error(`${progress} FAIL "${entry.name}" (${entry.state}):`, (err as Error).message);
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
    .eq('country', 'United States');

  console.log(`\nTotal featured US clubs in database: ${count}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
