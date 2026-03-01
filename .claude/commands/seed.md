---
description: Generate a SQL seed file for test data based on a prompt (project)
---

Generate a SQL seed file for: **$ARGUMENTS**

## Instructions

### Phase 1: Research

1. **Read the staging data reference first**:
   - `supabase/seeds/STAGING_DATA.md` - All 8 staging user IDs, 8 course IDs with tee/hole data, required tables per feature, copy-paste SQL arrays, UUID collision avoidance patterns, subscription tier assignments, and friendship setup

2. Read the database schema documentation:
   - `docs/database/DATABASE_SCHEMA.md` - Full schema with SQL tables and TypeScript types
   - `docs/database/database-schema.sql` - Raw SQL schema

3. Read existing seed files in `supabase/seeds/` to understand patterns and existing test data:
   - Check which users, courses, competitions, and other entities already exist
   - Note the UUID patterns used for deterministic test data

4. If the seed request involves a specific feature, read the relevant guide:
   - Leagues: `docs/guides/LEAGUES.md`
   - Subscriptions: `docs/guides/SUBSCRIPTION_TIERS.md`
   - Scoring: `docs/guides/ALGORITHMS.md`
   - Skins: `docs/guides/SKINS_GAME.md`
   - Wolf: `docs/guides/WOLF_GAME.md`
   - Push notifications: `docs/guides/PUSH_NOTIFICATIONS.md`

5. Check recent migration files in `supabase/migrations/` for any schema changes not yet reflected in the docs.

6. Identify **all tables** that need data for the seed request, including:
   - Primary tables directly mentioned
   - Join/bridge tables for relationships
   - Parent tables that must exist first (foreign key dependencies)
   - Any enum values or constraints that apply

### Phase 2: Plan

Before writing SQL, determine:
- Which existing test users to reference (check `supabase/seeds/` for established UUIDs)
- Which existing courses/clubs to reference (prefer real GolfAPI-imported data already in the DB)
- The insertion order to satisfy foreign key constraints
- Whether to use deterministic UUIDs (for repeatable test data) or `gen_random_uuid()`
- What cleanup/deletion logic is needed for re-runnability

### Phase 3: Generate SQL

Write the seed file to `supabase/seeds/seed-{descriptive-name}.sql` following these **exact conventions**:

#### File Structure

```sql
-- =====================================================
-- SEED: {TITLE IN CAPS}
-- =====================================================
-- Description of what this seed creates
-- List of user IDs, entity IDs, and other references
--
-- Creates:
--   - Summary of entities created
--   - With quantities and key details
-- =====================================================

-- =====================================================
-- STEP 0: CLEAN UP EXISTING SEED DATA
-- =====================================================
-- Delete in reverse dependency order
-- Use DO $$ block for complex cleanup

-- =====================================================
-- STEP 1: {FIRST LOGICAL GROUP}
-- =====================================================

-- =====================================================
-- STEP N: {NEXT GROUP}
-- =====================================================

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- SELECT queries to confirm the seed worked correctly
```

#### SQL Conventions

- **UUIDs**: Use deterministic patterns for test data (e.g., `'aaaa1111-xxxx-xxxx-xxxx-xxxxxxxxxxxx'`)
  - Avoid collision with existing seed data patterns (`aaaaa001`, `bbbbb001`, etc.)
- **Cleanup**: Always start with STEP 0 that deletes existing seed data safely
  - Delete in reverse foreign-key dependency order
  - Use `DO $$ ... $$;` blocks for complex cleanup with arrays
- **Conflict handling**: Use `ON CONFLICT (id) DO NOTHING` or `DO UPDATE SET` for idempotent re-runs
- **JSONB**: Use `jsonb_build_object()` for construction, `->` and `->>` for extraction
- **Date casting**: Always cast explicitly: `'2026-01-05'::DATE`, `::TIMESTAMP`, `::TIMESTAMPTZ`
- **Arrays**: Declare as `UUID[]`, `TEXT[]`, `INTEGER[]`, `NUMERIC[]`, `DATE[]`
- **DO blocks**: Use `DO $$ DECLARE ... BEGIN ... END $$;` for loops, conditionals, and dynamic lookups
- **Comments**: Use uppercase section headers with `-- ====` separators and descriptive step comments
- **Verification**: Always end with SELECT queries that verify the seed data was created correctly
  - Use `COUNT(*)`, `FILTER (WHERE ...)`, and JOIN queries
  - Show human-readable summaries (player names, counts, statuses)

#### Data Quality

- Generate **realistic** golf data:
  - Scores should be realistic for the player's handicap (par + handicap-based variation)
  - Stableford points calculated correctly from net scores
  - Handicap differentials calculated with WHS formula: `(113 / slope) * (gross - course_rating)`
  - Use real course data from the DB when possible (look up holes JSONB, tee ratings)
- Include variety: different statuses, dates spread over time, mix of game types
- Reference the 6 established test users when possible (see existing seeds for UUIDs and handicaps)

#### Staging Users, Courses & Required Data

**Always read `supabase/seeds/STAGING_DATA.md` first** — it contains:
- All 8 staging user IDs with handicaps (copy-paste SQL arrays)
- 8 course IDs with confirmed tee + hole data (copy-paste SQL arrays)
- Required tables checklist per feature type
- Subscription tier assignments for testing
- Friendship setup SQL (all 28 pairs)
- UUID collision avoidance patterns
- Dynamic course data lookup pattern

## Output

After generating the seed file:
1. State the file path created
2. List the tables affected and row counts
3. Explain the data relationships created
4. Note any assumptions made about the data
5. Provide the command to run it: `psql "$DATABASE_URL" -f supabase/seeds/{filename}.sql`
   or via Supabase: `supabase db reset` (runs all seeds)
