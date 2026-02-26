/**
 * Seed Featured Courses Script
 *
 * Imports ~100 popular Australian golf courses via GolfAPI.io and marks them
 * as featured so the Courses tab feels populated for new users.
 *
 * Usage:
 *   npx tsx scripts/seed-featured-courses.ts
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
// Club names from existing course-data migration files.
// The script will search GolfAPI.io to find matching club IDs.

interface FeaturedClubEntry {
  name: string;
  state: string;
}

const FEATURED_CLUBS: FeaturedClubEntry[] = [
  // VIC (~25 clubs) — Sandbelt, Mornington Peninsula, Bellarine, regional
  { name: 'Royal Melbourne Golf Club', state: 'VIC' },
  { name: 'Kingston Heath Golf Club', state: 'VIC' },
  { name: 'Victoria Golf Club', state: 'VIC' },
  { name: 'Metropolitan Golf Club', state: 'VIC' },
  { name: 'Commonwealth Golf Club', state: 'VIC' },
  { name: 'Huntingdale Golf Club', state: 'VIC' },
  { name: 'Yarra Yarra Golf Club', state: 'VIC' },
  { name: 'Peninsula Kingswood Country Golf Club', state: 'VIC' },
  { name: 'Woodlands Golf Club', state: 'VIC' },
  { name: 'Spring Valley Golf Club', state: 'VIC' },
  { name: 'Cranbourne Golf Club', state: 'VIC' },
  { name: 'Southern Golf Club', state: 'VIC' },
  { name: 'Rosebud Country Club', state: 'VIC' },
  { name: 'Moonah Links', state: 'VIC' },
  { name: 'The National Golf Club', state: 'VIC' },
  { name: 'Portsea Golf Club', state: 'VIC' },
  { name: 'Barwon Heads Golf Club', state: 'VIC' },
  { name: '13th Beach Golf Links', state: 'VIC' },
  { name: 'Curlewis Golf Club', state: 'VIC' },
  { name: 'Settlers Run Golf & Country Club', state: 'VIC' },
  { name: 'Eastern Golf Club', state: 'VIC' },
  { name: 'Riversdale Golf Club', state: 'VIC' },
  { name: 'Box Hill Golf Club', state: 'VIC' },
  { name: 'Waverley Golf Club', state: 'VIC' },
  { name: 'Sandhurst Club', state: 'VIC' },

  // NSW (~25 clubs) — Sydney, Central Coast, Hunter, regional
  { name: 'Royal Sydney Golf Club', state: 'NSW' },
  { name: 'New South Wales Golf Club', state: 'NSW' },
  { name: 'The Australian Golf Club', state: 'NSW' },
  { name: 'The Lakes Golf Club', state: 'NSW' },
  { name: 'Concord Golf Club', state: 'NSW' },
  { name: 'St Michael\'s Golf Club', state: 'NSW' },
  { name: 'Moore Park Golf Course', state: 'NSW' },
  { name: 'Bonnie Doon Golf Club', state: 'NSW' },
  { name: 'Eastlake Golf Club', state: 'NSW' },
  { name: 'Manly Golf Club', state: 'NSW' },
  { name: 'Long Reef Golf Club', state: 'NSW' },
  { name: 'Terrey Hills Golf & Country Club', state: 'NSW' },
  { name: 'Pymble Golf Club', state: 'NSW' },
  { name: 'Castle Hill Country Club', state: 'NSW' },
  { name: 'Penrith Golf Club', state: 'NSW' },
  { name: 'Camden Lakeside Country Club', state: 'NSW' },
  { name: 'Stonecutters Ridge Golf Club', state: 'NSW' },
  { name: 'The Coast Golf & Recreation Club', state: 'NSW' },
  { name: 'Shellharbour Golf Club', state: 'NSW' },
  { name: 'Shelly Beach Golf Club', state: 'NSW' },
  { name: 'Cypress Lakes Golf & Country Club', state: 'NSW' },
  { name: 'Nelson Bay Golf Club', state: 'NSW' },
  { name: 'Newcastle Golf Club', state: 'NSW' },
  { name: 'Coffs Harbour Golf Club', state: 'NSW' },
  { name: 'Bathurst Golf Club', state: 'NSW' },

  // QLD (~15 clubs) — Brisbane, Gold Coast, Sunshine Coast
  { name: 'Royal Queensland Golf Club', state: 'QLD' },
  { name: 'Brisbane Golf Club', state: 'QLD' },
  { name: 'Brookwater Golf & Country Club', state: 'QLD' },
  { name: 'Gailes Golf Club', state: 'QLD' },
  { name: 'Indooroopilly Golf Club', state: 'QLD' },
  { name: 'Royal Pines Resort', state: 'QLD' },
  { name: 'Lakelands Golf Club', state: 'QLD' },
  { name: 'The Glades Golf Club', state: 'QLD' },
  { name: 'Pelican Waters Golf Club', state: 'QLD' },
  { name: 'Noosa Springs Golf & Spa Resort', state: 'QLD' },
  { name: 'Twin Waters Golf Club', state: 'QLD' },
  { name: 'Pacific Harbour Golf & Country Club', state: 'QLD' },
  { name: 'Wynnum Golf Club', state: 'QLD' },
  { name: 'Redland Bay Golf Club', state: 'QLD' },
  { name: 'Sanctuary Cove Golf & Country Club', state: 'QLD' },

  // SA (~10 clubs) — Adelaide, Barossa
  { name: 'Royal Adelaide Golf Club', state: 'SA' },
  { name: 'Kooyonga Golf Club', state: 'SA' },
  { name: 'Glenelg Golf Club', state: 'SA' },
  { name: 'The Grange Golf Club', state: 'SA' },
  { name: 'Tea Tree Gully Golf Club', state: 'SA' },
  { name: 'Blackwood Golf Club', state: 'SA' },
  { name: 'Mount Osmond Golf Club', state: 'SA' },
  { name: 'Tanunda Pines Golf Club', state: 'SA' },
  { name: 'Victor Harbor Golf Club', state: 'SA' },
  { name: 'Murray Bridge Golf Club', state: 'SA' },

  // WA (~10 clubs) — Perth, South West
  { name: 'Joondalup Country Club', state: 'WA' },
  { name: 'Links Kennedy Bay', state: 'WA' },
  { name: 'Mount Lawley Golf Club', state: 'WA' },
  { name: 'Western Australian Golf Club', state: 'WA' },
  { name: 'The Cut Golf Course', state: 'WA' },
  { name: 'Lake Karrinyup Country Club', state: 'WA' },
  { name: 'Royal Perth Golf Club', state: 'WA' },
  { name: 'Meadow Springs Golf & Country Club', state: 'WA' },
  { name: 'Secret Harbour Golf Links', state: 'WA' },
  { name: 'Busselton Golf Club', state: 'WA' },

  // TAS (~8 clubs) — Hobart, Launceston
  { name: 'Royal Hobart Golf Club', state: 'TAS' },
  { name: 'Tasmania Golf Club', state: 'TAS' },
  { name: 'Kingston Beach Golf Club', state: 'TAS' },
  { name: 'Ratho Farm Golf Links', state: 'TAS' },
  { name: 'Country Club Tasmania', state: 'TAS' },
  { name: 'Launceston Golf Club', state: 'TAS' },
  { name: 'Barnbougle Dunes', state: 'TAS' },
  { name: 'Devonport Golf Club', state: 'TAS' },

  // ACT (~5 clubs)
  { name: 'Royal Canberra Golf Club', state: 'ACT' },
  { name: 'Federal Golf Club', state: 'ACT' },
  { name: 'Yowani Country Club', state: 'ACT' },
  { name: 'Gungahlin Lakes Golf & Community Club', state: 'ACT' },
  { name: 'Gold Creek Country Club', state: 'ACT' },

  // NT (~2 clubs)
  { name: 'Darwin Golf Club', state: 'NT' },
  { name: 'Alice Springs Golf Club', state: 'NT' },
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
  state: string
): Promise<GolfApiSearchResult | null> {
  const data = await golfApiRequest<{ clubs: GolfApiSearchResult[] }>('clubs', {
    name,
    state,
    country: 'Australia',
  });

  if (!data.clubs?.length) return null;

  // Find best match — prefer exact name match, then substring match
  const lowerName = name.toLowerCase();
  const exact = data.clubs.find((c) => c.clubName.toLowerCase() === lowerName);
  if (exact) return exact;

  // Substring match
  const partial = data.clubs.find((c) => c.clubName.toLowerCase().includes(lowerName));
  if (partial) return partial;

  // Reverse substring (our name might be a substring of the API result)
  const reverse = data.clubs.find((c) => lowerName.includes(c.clubName.toLowerCase()));
  if (reverse) return reverse;

  // Return first result as fallback
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

function mapState(state: string | undefined): string | null {
  if (!state) return null;
  const mapping: Record<string, string> = {
    VIC: 'VIC', Victoria: 'VIC',
    NSW: 'NSW', 'New South Wales': 'NSW',
    QLD: 'QLD', Queensland: 'QLD',
    SA: 'SA', 'South Australia': 'SA',
    WA: 'WA', 'Western Australia': 'WA',
    TAS: 'TAS', Tasmania: 'TAS',
    ACT: 'ACT', 'Australian Capital Territory': 'ACT',
    NT: 'NT', 'Northern Territory': 'NT',
  };
  return mapping[state] || state;
}

async function upsertClub(club: GolfApiClubResponse): Promise<string> {
  // Check if club already exists
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
    country: club.country || 'Australia',
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
  clubApiId: string,
  courseSummary: { courseID: string; longCourseID?: string; courseName: string; numHoles: number }
): Promise<string | null> {
  try {
    const courseData = await getCourseDetails(courseSummary.courseID);

    // Build holes array
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

    // Check if course already exists
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
    console.warn(`    ⚠ Failed to import course "${courseSummary.courseName}":`, (err as Error).message);
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

const DELAY_MS = 500; // Rate limiting delay between clubs

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🏌️ Seeding featured Australian golf courses...');
  console.log(`   Total clubs to import: ${FEATURED_CLUBS.length}`);
  console.log('');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < FEATURED_CLUBS.length; i++) {
    const entry = FEATURED_CLUBS[i];
    const progress = `[${i + 1}/${FEATURED_CLUBS.length}]`;

    try {
      // Search GolfAPI.io for this club
      const match = await searchClubByName(entry.name, entry.state);

      if (!match) {
        console.log(`${progress} ⏭ "${entry.name}" (${entry.state}) — not found on GolfAPI.io`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`${progress} 📥 Importing "${match.clubName}" (${entry.state})...`);

      // Get full club details
      const clubDetails = await getClubDetails(match.clubID);

      // Upsert club (with is_featured = true)
      const clubId = await upsertClub(clubDetails);

      // Import each course
      const courses = clubDetails.courses || [];
      let courseCount = 0;
      for (const course of courses) {
        const courseId = await upsertCourse(clubId, match.clubID, course);
        if (courseId) courseCount++;
        await sleep(200); // Small delay between course requests
      }

      console.log(`   ✅ ${match.clubName} — ${courseCount} course(s)`);
      imported++;
    } catch (err) {
      console.error(`${progress} ❌ "${entry.name}" (${entry.state}):`, (err as Error).message);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log('═══════════════════════════════════════');

  // Verify featured count
  const { count } = await supabase
    .from('clubs')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true);

  console.log(`\n📊 Total featured clubs in database: ${count}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
