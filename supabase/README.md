# Supabase Database

This directory contains database migrations and configuration for The Nineteenth golf app.

## Structure

```
supabase/
├── migrations/
│   └── 20250109000000_mvp_phase_1_schema.sql  # MVP Phase 1 schema
├── seed.sql                                    # (Future) Seed data for development
└── config.toml                                 # (Future) Supabase CLI config
```

## Migrations

### Current Migrations

| Migration | Date | Description |
|-----------|------|-------------|
| `20250109000000_mvp_phase_1_schema.sql` | 2025-01-09 | Initial schema with 7 tables for MVP |

### Migration Contents

**Tables Created:**
1. `players` - Player profiles
2. `competitions` - Competition metadata
3. `courses` - Golf course information
4. `rounds` - Individual rounds
5. `competition_players` - Many-to-many join table
6. `pairings` - Player groupings
7. `scorecards` - Hole-by-hole scores

**Features:**
- ✅ Row-Level Security (RLS) policies for multi-tenant data isolation
- ✅ Indexes for common queries (leaderboard, competition lookup)
- ✅ Triggers for automatic timestamps (`updated_at`)
- ✅ Auto-generate unique invite codes (e.g., `COMP-12345`)
- ✅ Helper functions (`calculate_stableford_points`, `get_competition_leaderboard`)
- ✅ PostGIS extension for course location data

## Setup

See [docs/DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) for complete setup instructions.

**Quick Start:**

```bash
# Option 1: Supabase Cloud (Recommended)
# 1. Create project at https://supabase.com
# 2. Copy migration SQL to SQL Editor
# 3. Run migration
# 4. Copy API keys to .env

# Option 2: Local Development
supabase init
supabase start
supabase db reset
```

## Documentation

- [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md) - Full schema documentation with examples
- [DATABASE_SETUP.md](../docs/DATABASE_SETUP.md) - Setup instructions
- [database.types.ts](../src/types/database.types.ts) - TypeScript types

## TypeScript Types

The migration includes corresponding TypeScript types at `src/types/database.types.ts`.

**Usage:**
```typescript
import { Database } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient<Database>(url, key);

// Type-safe queries
const { data } = await supabase
  .from('competitions')
  .select('*')
  .eq('invite_code', 'COMP-12345')
  .single();
```

## Common Operations

### Create Competition

```sql
INSERT INTO competitions (name, start_date, handicap_system, organizer_id)
VALUES ('Summer Classic 2025', '2025-02-15', 'honor', 'user-id')
RETURNING *;
```

### Get Leaderboard

```sql
SELECT * FROM get_competition_leaderboard('competition-id');
```

### Calculate Stableford Points

```sql
SELECT calculate_stableford_points(5, 4, 12, 7);
-- Returns: 2 (par)
```

## Future Migrations

Phase 2+ features will require new migrations:

- Multi-round competitions (use existing `rounds` table)
- Team competitions (new `teams` table)
- Advanced statistics (extend `scorecards.scores` JSONB)
- Public competitions (use existing `visibility` column)
- Golf Australia API integration (extend `players` table)

## Testing

Test RLS policies:

```sql
-- As authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';

-- Should only see your competitions
SELECT * FROM competitions;
```

Test functions:

```sql
-- Test Stableford calculation
SELECT calculate_stableford_points(4, 4, 12, 1);
-- Should return: 3 (birdie with 1 stroke received)
```

## Rollback

To rollback migrations:

```bash
# Supabase CLI
supabase db reset

# Manual (Supabase Dashboard)
# 1. Go to SQL Editor
# 2. Run DROP TABLE statements in reverse order:
DROP TABLE scorecards;
DROP TABLE pairings;
DROP TABLE competition_players;
DROP TABLE rounds;
DROP TABLE courses;
DROP TABLE competitions;
DROP TABLE players;
```

**⚠️ WARNING: This will delete all data!**

## Support

For questions:
- Review [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md)
- Check [Supabase Docs](https://supabase.com/docs)
- See [CLAUDE.md](../CLAUDE.md) for project context

---

*Last Updated: January 2025*
