/**
 * Wipe Staging Database
 *
 * Deletes ALL user-generated data from the staging database.
 * Preserves schema, migrations, auth users, and system tables.
 *
 * Usage:
 *   npx tsx scripts/wipe-staging.ts              # dry run (default)
 *   npx tsx scripts/wipe-staging.ts --confirm     # actually delete
 *
 * Prerequisites:
 *   - .env must have EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const DRY_RUN = !process.argv.includes('--confirm');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tables in deletion order (respecting foreign key constraints)
// Children first, parents last
const TABLES_IN_ORDER = [
  // Wolf
  'wolf_payouts',
  'wolf_hole_decisions',
  'wolf_games',
  // Skins
  'skins_player_statistics',
  'skins_payouts',
  'skins_results',
  'skins_games',
  // Prize pools
  'pool_transactions',
  'competition_prize_pools',
  // Leagues
  'league_rounds',
  'league_players',
  'leagues',
  // Knockout
  'knockout_matches',
  // Scoring
  'score_entries',
  'round_results',
  'scoring_pairs',
  'scorecards',
  // Rounds
  'pairings',
  'round_players',
  // Teams
  'team_members',
  'teams',
  // Rounds & Competitions
  'rounds',
  'competition_players',
  'competitions',
  // Notifications
  'notifications',
  'push_tokens',
  // Achievements & Cosmetics
  'player_achievements',
  'player_cosmetics',
  // Friends
  'friendships',
  // Favorites & Home
  'favorite_courses',
  // Course data
  'hole_coordinates',
  'tees',
  'courses',
  // Players & Clubs
  'placeholder_players',
  'players',
  'clubs',
  // Subscriptions & Preferences
  'user_subscriptions',
  'user_preferences',
];

async function getCount(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count ?? 0;
}

// Tables that use composite keys instead of an `id` column
const COMPOSITE_KEY_COLUMN: Record<string, string> = {
  league_players: 'league_id',
  team_members: 'team_id',
  competition_players: 'competition_id',
};

async function deleteTable(table: string): Promise<{ deleted: number; error: string | null }> {
  const count = await getCount(table);
  if (count <= 0) return { deleted: 0, error: null };

  if (DRY_RUN) {
    return { deleted: count, error: null };
  }

  // Use a column that exists on the table for the filter
  const col = COMPOSITE_KEY_COLUMN[table] || 'id';
  const { error } = await supabase
    .from(table)
    .delete()
    .neq(col, '00000000-0000-0000-0000-000000000000');

  if (error) {
    return { deleted: 0, error: error.message };
  }

  const remaining = await getCount(table);
  return { deleted: count - Math.max(remaining, 0), error: null };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  WIPE STAGING DATABASE ${DRY_RUN ? '(DRY RUN)' : '⚠️  LIVE'}`);
  console.log(`  Target: ${SUPABASE_URL}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (SUPABASE_URL.includes('prod') || SUPABASE_URL.includes('bvnxfhuvocxyilhlenka')) {
    console.error('🛑 ABORT: This looks like a production URL! Refusing to proceed.');
    process.exit(1);
  }

  let totalDeleted = 0;
  let errors = 0;

  for (const table of TABLES_IN_ORDER) {
    const { deleted, error } = await deleteTable(table);
    if (error) {
      console.log(`  ⚠️  ${table}: ${error}`);
      errors++;
    } else if (deleted > 0) {
      console.log(`  ${DRY_RUN ? '🔍' : '🗑️'}  ${table}: ${deleted} rows ${DRY_RUN ? 'would be deleted' : 'deleted'}`);
      totalDeleted += deleted;
    } else {
      console.log(`  ⏭️  ${table}: empty`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Total: ${totalDeleted} rows ${DRY_RUN ? 'would be deleted' : 'deleted'}`);
  if (errors > 0) console.log(`  Errors: ${errors} tables had issues`);
  if (DRY_RUN) console.log('\n  Run with --confirm to execute deletion.');
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
