/**
 * Fix manually-entered slope/CR for The Eastern's North/East (and reverse East/North).
 *
 * BACKGROUND
 * ----------
 * GolfAPI returns no slope/CR for course 023 (North/East) — the API has a known
 * data bug for this combo (see scripts/seed-eastern.ts:8-12 and
 * src/services/api/multiNineFilter.ts:60-62). The slope/CR sitting on those tees
 * today were entered by hand. For the Blue tee at least, the value CR=71 looks
 * to have been copied from South/East, which does NOT include the (harder)
 * North nine. The correct value should be closer to South/North, which DOES
 * include North (Blue: slope 128, CR 73 per live GolfAPI data).
 *
 * The defaults in TEE_DEFAULTS below mirror South/North as the best-guess
 * extrapolation. **Verify them against the official Eastern Golf Club scorecard
 * (or the WHS GolfLink rating) before running with --apply.** Adjust the table
 * to match the official numbers if they differ.
 *
 * East/North (course 032, also locally seeded as a reverse) is updated to the
 * same overall slope/CR values — slope and CR are direction-independent.
 *
 * Usage
 * -----
 *   pnpm tsx scripts/fix-eastern-north-east-ratings.ts            # dry-run
 *   pnpm tsx scripts/fix-eastern-north-east-ratings.ts --apply    # write to PROD
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL_PROD!;
// Service role key — matches existing pattern in scripts/seed-eastern.ts
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bnhmaHV2b2N4eWlsaGxlbmthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDc5NzMyNywiZXhwIjoyMDg2MzczMzI3fQ.ueDZlsAM5neoBzWwXtoJy97nWn51ERaviCsa-W2GCf0';

const CLUB_API_ID = '141519519758903234';
const COURSE_NAMES = ['North/East Course', 'East/North Course'];

// =====================================================
// EDIT THESE VALUES — verify against the official Eastern scorecard
// =====================================================
// Best-guess extrapolation: mirrors South/North (Blue 128/73) since both
// pairings contain the North nine. Set any field to null to leave it unchanged.

interface TeeRating {
  slope: number | null;
  course_rating: number | null;
  slope_women: number | null;
  course_rating_women: number | null;
}

const TEE_DEFAULTS: Record<string, TeeRating> = {
  Black:  { slope: 130, course_rating: 74,   slope_women: null, course_rating_women: null },
  Blue:   { slope: 128, course_rating: 73,   slope_women: null, course_rating_women: null },
  White:  { slope: 122, course_rating: 71,   slope_women: 130,  course_rating_women: 76 },
  Red:    { slope: 118, course_rating: 69,   slope_women: 126,  course_rating_women: 74 },
  Yellow: { slope: 112, course_rating: 66,   slope_women: 120,  course_rating_women: 71 },
};
// =====================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TeeRow {
  id: string;
  name: string;
  color: string | null;
  slope: number | null;
  course_rating: number | null;
  slope_women: number | null;
  course_rating_women: number | null;
}

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : String(v);
}

function diff(label: string, before: number | null, after: number | null): string {
  if (before === after) return `${label}: ${fmt(after).padStart(4)} (unchanged)`;
  return `${label}: ${fmt(before).padStart(4)} → ${fmt(after).padStart(4)}  *`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`\n=== Fix Eastern North/East slope/CR — mode: ${apply ? 'APPLY' : 'DRY-RUN'} ===\n`);

  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('golfapi_club_id', CLUB_API_ID)
    .single();
  if (clubErr || !club) throw new Error(`Club not found: ${clubErr?.message}`);
  console.log(`Club: ${club.name} (${club.id})\n`);

  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, name, api_locked')
    .eq('club_id', club.id)
    .in('name', COURSE_NAMES);
  if (courseErr) throw courseErr;
  if (!courses?.length) throw new Error(`No matching courses found (looked for: ${COURSE_NAMES.join(', ')})`);

  let totalChanges = 0;

  for (const course of courses) {
    console.log(`\nCourse: ${course.name} (api_locked=${course.api_locked})`);
    console.log('─'.repeat(70));

    const { data: tees, error: teesErr } = await supabase
      .from('tees')
      .select('id, name, color, slope, course_rating, slope_women, course_rating_women')
      .eq('course_id', course.id)
      .order('name');
    if (teesErr) throw teesErr;

    for (const tee of (tees ?? []) as TeeRow[]) {
      const target = TEE_DEFAULTS[tee.name];
      if (!target) {
        console.log(`  Tee "${tee.name}" — no entry in TEE_DEFAULTS, skipping`);
        continue;
      }

      const newSlope        = target.slope        ?? tee.slope;
      const newCr           = target.course_rating ?? tee.course_rating;
      const newSlopeWomen   = target.slope_women   ?? tee.slope_women;
      const newCrWomen      = target.course_rating_women ?? tee.course_rating_women;

      const changed =
        newSlope !== tee.slope ||
        newCr !== tee.course_rating ||
        newSlopeWomen !== tee.slope_women ||
        newCrWomen !== tee.course_rating_women;

      console.log(`  Tee ${tee.name.padEnd(8)} ${(tee.color ?? '-').padEnd(8)}`);
      console.log(`    ${diff('slope    ', tee.slope, newSlope)}`);
      console.log(`    ${diff('CR       ', tee.course_rating, newCr)}`);
      console.log(`    ${diff('slope_w  ', tee.slope_women, newSlopeWomen)}`);
      console.log(`    ${diff('CR_w     ', tee.course_rating_women, newCrWomen)}`);

      if (!changed) continue;
      totalChanges++;

      if (apply) {
        const { error: updateErr } = await supabase
          .from('tees')
          .update({
            slope: newSlope,
            course_rating: newCr,
            slope_women: newSlopeWomen,
            course_rating_women: newCrWomen,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tee.id);
        if (updateErr) {
          console.error(`    ! UPDATE failed: ${updateErr.message}`);
        } else {
          console.log(`    ✓ updated`);
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  if (apply) {
    console.log(`Applied ${totalChanges} tee update(s).`);
  } else {
    console.log(`DRY-RUN: ${totalChanges} tee(s) would change. Re-run with --apply to write.`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
