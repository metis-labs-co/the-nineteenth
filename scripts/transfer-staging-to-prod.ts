/**
 * Transfer featured clubs from staging to prod.
 * Copies clubs, courses, and tees that exist in staging but are missing in prod.
 *
 * Usage:
 *   npx tsx scripts/transfer-staging-to-prod.ts                           # all countries
 *   npx tsx scripts/transfer-staging-to-prod.ts --country="New Zealand"   # one country
 *   npx tsx scripts/transfer-staging-to-prod.ts --country="United Kingdom"
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

const staging = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);
const prod = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!,
  process.env.SUPABASE_SECRET_KEY_PROD!
);

// Parse --country flag from CLI args
function parseCountryFilter(): string | null {
  const args = process.argv.slice(2);
  for (const arg of args) {
    const match = arg.match(/^--country=["']?(.+?)["']?$/);
    if (match) return match[1];
  }
  return null;
}

async function main() {
  const countryFilter = parseCountryFilter();

  if (countryFilter) {
    console.log(`Filtering by country: ${countryFilter}\n`);
  }

  let stagingQuery = staging.from('clubs').select('*').eq('is_featured', true);
  let prodQuery = prod.from('clubs').select('*').eq('is_featured', true);

  if (countryFilter) {
    stagingQuery = stagingQuery.eq('country', countryFilter);
    prodQuery = prodQuery.eq('country', countryFilter);
  }

  const { data: stagingClubs } = await stagingQuery;
  const { data: prodClubs } = await prodQuery;

  if (!stagingClubs || !prodClubs) {
    console.error('Failed to fetch clubs');
    process.exit(1);
  }

  const prodApiIds = new Set(prodClubs.map((c: any) => c.golfapi_club_id));
  const missing = stagingClubs.filter((c: any) => c.golfapi_club_id && !prodApiIds.has(c.golfapi_club_id));

  console.log(`Staging: ${stagingClubs.length} featured clubs`);
  console.log(`Prod: ${prodClubs.length} featured clubs`);
  console.log(`Missing in prod: ${missing.length}\n`);

  let clubCount = 0;
  let courseCount = 0;
  let teeCount = 0;

  for (const club of missing) {
    // Get courses for this club from staging
    const { data: courses } = await staging.from('courses').select('*').eq('club_id', club.id);

    // Get tees for each course
    const courseTees: Record<string, any[]> = {};
    for (const course of courses || []) {
      const { data: tees } = await staging.from('tees').select('*').eq('course_id', course.id);
      courseTees[course.id] = tees || [];
    }

    // Insert club into prod (strip id and created_at so prod generates fresh ones)
    const { id: _cid, created_at: _cca, ...clubData } = club;
    const { data: newClub, error: clubErr } = await prod
      .from('clubs')
      .insert(clubData)
      .select('id')
      .single();

    if (clubErr) {
      console.error(`  ❌ Club "${club.name}": ${clubErr.message}`);
      continue;
    }
    clubCount++;

    let cc = 0;
    for (const course of courses || []) {
      const { id: _id, created_at: _ca, club_id: _vi, ...courseData } = course;
      courseData.club_id = newClub.id;

      const { data: newCourse, error: courseErr } = await prod
        .from('courses')
        .insert(courseData)
        .select('id')
        .single();

      if (courseErr) {
        console.warn(`    ⚠ Course "${course.name}": ${courseErr.message}`);
        continue;
      }
      cc++;
      courseCount++;

      // Insert tees
      const tees = courseTees[course.id] || [];
      for (const tee of tees) {
        const { id: _tid, created_at: _tca, course_id: _tci, total_length: _tl, front9_length: _f9, back9_length: _b9, ...teeData } = tee;
        teeData.course_id = newCourse.id;
        const { error: teeErr } = await prod.from('tees').insert(teeData);
        if (teeErr) {
          console.warn(`    ⚠ Tee "${tee.name}": ${teeErr.message}`);
          continue;
        }
        teeCount++;
      }
    }

    console.log(`[${clubCount}/${missing.length}] ✅ ${club.name} — ${cc} course(s)`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Clubs transferred:   ${clubCount}`);
  console.log(`✅ Courses transferred: ${courseCount}`);
  console.log(`✅ Tees transferred:    ${teeCount}`);
  console.log('═══════════════════════════════════════');

  const { count } = await prod
    .from('clubs')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true);
  console.log(`\n📊 Total featured clubs in prod: ${count}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
