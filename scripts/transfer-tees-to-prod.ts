/**
 * Backfill tees from staging to prod for featured clubs.
 * Matches courses by golfapi_course_id and inserts missing tees.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

const staging = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);
const prod = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!,
  process.env.SUPABASE_SECRET_KEY_PROD!
);

async function fetchAll(client: SupabaseClient, table: string, filter?: { col: string; val: string | number | boolean }) {
  let query = client.from(table).select('*');
  if (filter) query = query.eq(filter.col, filter.val);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function main() {
  // Get all courses from prod that belong to featured clubs
  const prodClubs = await fetchAll(prod, 'clubs', { col: 'is_featured', val: true });
  console.log(`Prod featured clubs: ${prodClubs.length}`);

  let teeCount = 0;
  let skipped = 0;
  let failed = 0;

  for (const club of prodClubs) {
    const prodCourses = await fetchAll(prod, 'courses', { col: 'club_id', val: club.id });

    for (const prodCourse of prodCourses) {
      // Check if this course already has tees in prod
      const existingTees = await fetchAll(prod, 'tees', { col: 'course_id', val: prodCourse.id });
      if (existingTees.length > 0) {
        skipped += existingTees.length;
        continue;
      }

      // Find matching course in staging by golfapi_course_id
      if (!prodCourse.golfapi_course_id) continue;

      const { data: stagingCourses } = await staging
        .from('courses')
        .select('id')
        .eq('golfapi_course_id', prodCourse.golfapi_course_id);

      if (!stagingCourses?.length) continue;

      const stagingTees = await fetchAll(staging, 'tees', { col: 'course_id', val: stagingCourses[0].id });

      for (const tee of stagingTees) {
        const { id: _, created_at: _ca, course_id: _ci, total_length: _tl, front9_length: _f9, back9_length: _b9, ...teeData } = tee;
        teeData.course_id = prodCourse.id;

        const { error } = await prod.from('tees').insert(teeData);
        if (error) {
          console.warn(`  ⚠ Tee "${tee.name}" (${prodCourse.name}): ${error.message}`);
          failed++;
        } else {
          teeCount++;
        }
      }
    }

    if (teeCount > 0 || failed > 0) {
      process.stdout.write('.');
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log(`✅ Tees inserted:  ${teeCount}`);
  console.log(`⏭  Already exist:  ${skipped}`);
  console.log(`❌ Failed:         ${failed}`);
  console.log('═══════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
