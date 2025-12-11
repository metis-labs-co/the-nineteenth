# Migration Fix - Reserved Keyword Issue

## Issue
When running the initial migration `20250109000000_mvp_phase_1_schema.sql` in Supabase SQL Editor, you encountered:

```
Error: Failed to run sql query: ERROR: 42601: syntax error at or near "position" LINE 584: position INTEGER,
```

## Root Cause
`position` is a reserved keyword in PostgreSQL and cannot be used as a column name without double quotes.

## Fix Applied
Changed the column name from `position` to `rank` in the `get_competition_leaderboard()` function.

### Changed Files
1. ✅ `supabase/migrations/20250109000000_mvp_phase_1_schema.sql` - Line 584
2. ✅ `src/types/database.types.ts` - LeaderboardEntry interface
3. ✅ `docs/database/DATABASE_SCHEMA.md` - Documentation examples

### Before
```sql
CREATE OR REPLACE FUNCTION get_competition_leaderboard(comp_id UUID)
RETURNS TABLE (
  position INTEGER,  -- ❌ Reserved keyword
  player_id UUID,
  ...
)
```

### After
```sql
CREATE OR REPLACE FUNCTION get_competition_leaderboard(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,  -- ✅ Safe column name
  player_id UUID,
  ...
)
```

## TypeScript Impact
The `LeaderboardEntry` interface now uses `rank` instead of `position`:

```typescript
export interface LeaderboardEntry {
  rank: number;  // Changed from position
  player_id: string;
  player_name: string;
  handicap: number;
  total_gross: number;
  total_net: number;
  total_points: number;
  rounds_played: number;
}
```

## Usage Example
```typescript
// Get leaderboard
const { data: leaderboard } = await supabase
  .rpc('get_competition_leaderboard', {
    comp_id: competitionId,
  });

// Access rank instead of position
leaderboard.forEach(entry => {
  console.log(`${entry.rank}. ${entry.player_name} - ${entry.total_points} points`);
});
```

## Status
✅ **FIXED** - Migration should now run successfully in Supabase SQL Editor

## Next Steps
1. Copy the updated migration SQL to Supabase SQL Editor
2. Run the migration
3. Verify tables are created successfully
4. Continue with database setup as per [DATABASE_SETUP.md](../docs/database/DATABASE_SETUP.md)

---

*Fixed: January 2025*
