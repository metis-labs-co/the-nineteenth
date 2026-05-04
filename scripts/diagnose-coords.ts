/**
 * One-off diagnostic: compare our DB hole_coordinates against the raw
 * GolfAPI.io coordinates response for a given course. Used to confirm
 * whether the green-marker-on-tee-box bug is upstream (bad GolfAPI data)
 * or in our ingestion (mis-mapped poi codes).
 *
 * Usage:
 *   pnpm tsx scripts/diagnose-coords.ts "Cobram-Barooga Golf Club" "Old"
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL_PROD ?? process.env.EXPO_PUBLIC_SUPABASE_URL!;
// Use service role / secret key to bypass RLS for read-only diagnostics.
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY_PROD ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const GOLFAPI_URL = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL!;
const GOLFAPI_KEY = process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY || !GOLFAPI_URL || !GOLFAPI_KEY) {
  console.error('Missing env vars — need SUPABASE_URL/KEY and GOLFAPI_URL/KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fmt = (n: number) => n.toFixed(6);
const haversineMetres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(R * 2 * Math.asin(Math.sqrt(x)));
};

async function main() {
  const clubQuery = process.argv[2] ?? 'Cobram-Barooga';
  const courseQuery = process.argv[3] ?? 'Old';

  console.log(`\n=== Looking up club "${clubQuery}" / course "${courseQuery}" ===`);

  // 1. Find the club
  const { data: clubs, error: clubErr } = await supabase
    .from('clubs')
    .select('id, name, golfapi_club_id, city, state')
    .ilike('name', `%${clubQuery}%`);
  if (clubErr) throw clubErr;
  if (!clubs?.length) {
    console.log('No clubs matched. Try a different query.');
    return;
  }
  console.log(`\nMatching clubs (${clubs.length}):`);
  for (const c of clubs) {
    console.log(`  ${c.name}  [club_id=${c.id}]  golfapi_club_id=${c.golfapi_club_id}  ${c.city ?? ''} ${c.state ?? ''}`);
  }
  const club = clubs[0];

  // 2. Find course at that club
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, name, golfapi_course_id, num_holes, measure_unit')
    .eq('club_id', club.id)
    .ilike('name', `%${courseQuery}%`);
  if (courseErr) throw courseErr;
  if (!courses?.length) {
    console.log(`\nNo courses matched at ${club.name}.`);
    const { data: allCourses } = await supabase
      .from('courses')
      .select('name, golfapi_course_id')
      .eq('club_id', club.id);
    console.log('All courses at this club:', allCourses?.map((c) => c.name));
    return;
  }
  console.log(`\nMatching courses (${courses.length}):`);
  for (const c of courses) {
    console.log(`  ${c.name}  [course_id=${c.id}]  golfapi_course_id=${c.golfapi_course_id}  num_holes=${c.num_holes}`);
  }
  const course = courses[0];

  // 3. Pull DB coords for first 3 holes
  const { data: dbCoords, error: dbErr } = await supabase
    .from('hole_coordinates')
    .select('hole_number, poi_type, latitude, longitude')
    .eq('course_id', course.id)
    .lte('hole_number', 3)
    .order('hole_number', { ascending: true })
    .order('poi_type', { ascending: true });
  if (dbErr) throw dbErr;
  console.log(`\n--- DB hole_coordinates for ${course.name} (holes 1-3) ---`);
  for (const c of dbCoords ?? []) {
    console.log(`  hole ${c.hole_number}  ${c.poi_type.padEnd(13)}  ${fmt(c.latitude)}, ${fmt(c.longitude)}`);
  }

  // 4. Fetch raw GolfAPI coords
  if (!course.golfapi_course_id) {
    console.log('\nNo golfapi_course_id stored — cannot fetch upstream.');
    return;
  }
  console.log(`\n--- Fetching GolfAPI.io coordinates for course ${course.golfapi_course_id} ---`);
  const url = `${GOLFAPI_URL.replace(/\/$/, '')}/coordinates/${course.golfapi_course_id}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${GOLFAPI_KEY}` },
  });
  if (!resp.ok) {
    console.error(`GolfAPI returned ${resp.status}: ${await resp.text()}`);
    return;
  }
  const apiBody = (await resp.json()) as {
    courseID: string;
    numCoordinates?: number;
    coordinates?: Array<{
      poi: number;
      location: number;
      sideFW: number;
      hole: number;
      latitude: number;
      longitude: number;
    }>;
    apiRequestsLeft?: string;
  };
  console.log(`Total coords from API: ${apiBody.numCoordinates}, requests left: ${apiBody.apiRequestsLeft}`);

  const POI_LABEL: Record<number, string> = {
    1: 'Tee',
    2: 'FwyL',
    3: 'FwyR',
    4: 'Hazard',
    5: 'Layup',
    6: 'Cross',
    9: 'DglAim',
    11: 'GreenFront',
    12: 'GreenCenter',
    13: 'GreenBack?',
  };
  const LOC_LABEL: Record<number, string> = { 1: 'Front', 2: 'Center', 3: 'Back' };

  const holes123 = (apiBody.coordinates ?? [])
    .filter((c) => c.hole >= 1 && c.hole <= 3)
    .sort((a, b) => a.hole - b.hole || a.poi - b.poi || a.location - b.location);

  console.log(`\n--- Raw GolfAPI coordinates (holes 1-3) ---`);
  for (const c of holes123) {
    const poiLabel = POI_LABEL[c.poi] ?? `poi=${c.poi}`;
    const locLabel = LOC_LABEL[c.location] ?? `loc=${c.location}`;
    console.log(
      `  hole ${c.hole}  poi=${c.poi}(${poiLabel.padEnd(11)}) loc=${c.location}(${locLabel.padEnd(6)}) sideFW=${c.sideFW}  ${fmt(c.latitude)}, ${fmt(c.longitude)}`
    );
  }

  // 5. Distance check: tee_back vs green_center per hole (should be ~hole length)
  console.log(`\n--- DB sanity: distance from tee_back to green_center ---`);
  for (let h = 1; h <= 3; h++) {
    const tb = (dbCoords ?? []).find((c) => c.hole_number === h && c.poi_type === 'tee_back');
    const gc = (dbCoords ?? []).find((c) => c.hole_number === h && c.poi_type === 'green_center');
    if (tb && gc) {
      const m = haversineMetres(
        { lat: tb.latitude, lng: tb.longitude },
        { lat: gc.latitude, lng: gc.longitude }
      );
      console.log(`  hole ${h}: ${m}m  (real par-4/5 should be ~250-450m)`);
    } else {
      console.log(`  hole ${h}: missing tee_back or green_center`);
    }
  }
  console.log(`\n--- API sanity: distance from poi=1 loc=3 to poi=12 loc=2 ---`);
  for (let h = 1; h <= 3; h++) {
    const tb = holes123.find((c) => c.hole === h && c.poi === 1 && c.location === 3);
    const gc = holes123.find((c) => c.hole === h && c.poi === 12);
    if (tb && gc) {
      const m = haversineMetres(
        { lat: tb.latitude, lng: tb.longitude },
        { lat: gc.latitude, lng: gc.longitude }
      );
      console.log(`  hole ${h}: ${m}m`);
    } else {
      console.log(`  hole ${h}: missing tee_back or green_center in API`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
