/**
 * Transfer Production Data to Staging
 *
 * Exports data from production and imports it into staging.
 * Designed to be run AFTER wipe-staging.ts has cleared the staging DB.
 *
 * Transfers: clubs, courses, tees, hole_coordinates, achievements, cosmetics,
 * tier_limits, and (optionally) players.
 *
 * Does NOT transfer: auth.users, competitions, rounds, scorecards, notifications,
 * subscriptions, or any user-activity data (these are user-specific).
 *
 * Usage:
 *   npx tsx scripts/transfer-prod-to-staging.ts                # dry run (default)
 *   npx tsx scripts/transfer-prod-to-staging.ts --confirm       # actually transfer
 *   npx tsx scripts/transfer-prod-to-staging.ts --confirm --include-players
 *
 * Prerequisites:
 *   - .env must have staging and prod Supabase credentials
 *   - Run wipe-staging.ts --confirm first
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

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  console.error('Missing staging Supabase credentials');
  process.exit(1);
}
if (!process.env.EXPO_PUBLIC_SUPABASE_URL_PROD || !process.env.SUPABASE_SECRET_KEY_PROD) {
  console.error('Missing production Supabase credentials');
  process.exit(1);
}

const DRY_RUN = !process.argv.includes('--confirm');
const INCLUDE_PLAYERS = process.argv.includes('--include-players');

// Batch size for inserts (Supabase has row limits per request)
const BATCH_SIZE = 500;

// Computed/generated columns to strip before insert (DB generates these)
const STRIP_COLUMNS: Record<string, string[]> = {
  tees: ['total_length', 'front9_length', 'back9_length'],
  clubs: ['location'], // PostGIS generated column
  hole_coordinates: ['location'], // PostGIS generated column
};

interface TransferResult {
  table: string;
  fetched: number;
  inserted: number;
  errors: string[];
}

async function fetchAll(client: ReturnType<typeof createClient>, table: string): Promise<unknown[]> {
  const allRows: unknown[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`  Error fetching ${table}: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

function stripColumns(rows: Record<string, unknown>[], table: string): Record<string, unknown>[] {
  const cols = STRIP_COLUMNS[table];
  if (!cols) return rows;
  return rows.map((row) => {
    const clean = { ...row };
    for (const col of cols) {
      delete clean[col];
    }
    return clean;
  });
}

async function transferTable(table: string): Promise<TransferResult> {
  const result: TransferResult = { table, fetched: 0, inserted: 0, errors: [] };

  // Fetch from prod
  const rows = await fetchAll(prod, table) as Record<string, unknown>[];
  result.fetched = rows.length;

  if (rows.length === 0) {
    return result;
  }

  if (DRY_RUN) {
    result.inserted = rows.length;
    return result;
  }

  // Strip computed columns
  const cleanRows = stripColumns(rows, table);

  // Insert in batches
  for (let i = 0; i < cleanRows.length; i += BATCH_SIZE) {
    const batch = cleanRows.slice(i, i + BATCH_SIZE);
    const { error } = await staging
      .from(table)
      .insert(batch as never[]);

    if (error) {
      result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    } else {
      result.inserted += batch.length;
    }
  }

  return result;
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  TRANSFER PROD → STAGING ${DRY_RUN ? '(DRY RUN)' : '⚠️  LIVE'}`);
  console.log(`  Source: ${process.env.EXPO_PUBLIC_SUPABASE_URL_PROD}`);
  console.log(`  Target: ${process.env.EXPO_PUBLIC_SUPABASE_URL}`);
  console.log(`  Include players: ${INCLUDE_PLAYERS}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Safety check
  if (process.env.EXPO_PUBLIC_SUPABASE_URL!.includes('prod') ||
      process.env.EXPO_PUBLIC_SUPABASE_URL!.includes('bvnxfhuvocxyilhlenka')) {
    console.error('🛑 ABORT: Staging URL looks like production! Check your .env');
    process.exit(1);
  }

  // Tables to transfer (in insertion order - parents first)
  // Note: tier_limits, achievement_definitions, cosmetic_definitions are
  // seeded by migrations and already exist in staging — no need to transfer.
  const tables = [
    // Club & course data
    'clubs',
    'courses',
    'tees',
    'hole_coordinates',
  ];

  if (INCLUDE_PLAYERS) {
    tables.push('players');
  }

  const results: TransferResult[] = [];

  for (const table of tables) {
    process.stdout.write(`  ${table}... `);
    const result = await transferTable(table);
    results.push(result);

    if (result.errors.length > 0) {
      console.log(`⚠️  ${result.fetched} fetched, ${result.inserted} inserted, ${result.errors.length} errors`);
      result.errors.forEach((e) => console.log(`    → ${e}`));
    } else if (result.fetched === 0) {
      console.log('empty');
    } else {
      console.log(`${DRY_RUN ? '🔍' : '✅'} ${result.inserted} rows ${DRY_RUN ? 'would be inserted' : 'inserted'}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Summary:');
  let totalInserted = 0;
  let totalErrors = 0;
  for (const r of results) {
    if (r.fetched > 0) {
      console.log(`    ${r.table}: ${r.inserted}/${r.fetched}${r.errors.length > 0 ? ` (${r.errors.length} errors)` : ''}`);
      totalInserted += r.inserted;
      totalErrors += r.errors.length;
    }
  }
  console.log(`\n  Total: ${totalInserted} rows ${DRY_RUN ? 'would be inserted' : 'inserted'}`);
  if (totalErrors > 0) console.log(`  Errors: ${totalErrors}`);
  if (DRY_RUN) console.log('\n  Run with --confirm to execute transfer.');
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
