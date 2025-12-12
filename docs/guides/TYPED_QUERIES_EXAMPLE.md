# Typed Supabase Queries - Pattern Guide

This guide explains how to eliminate `any` types from Supabase queries using typed query helpers.

## The Problem

When you write a Supabase query with nested selects, TypeScript loses type information:

```typescript
// ❌ Current approach - scattered `as any` throughout the codebase
const { data: teamsData } = await (supabase.from('teams') as any)
  .select(`
    id,
    competition_id,
    team_members (
      player_id,
      players!player_id (id, name, handicap)
    )
  `)
  .eq('competition_id', competitionId);

// Now you have to do this everywhere you use the data:
const teams = teamsData.map((team: any) => ({
  id: team.id,
  competitionId: team.competition_id,
  members: (team.team_members || []).map((tm: any) => ({
    playerId: tm.player_id,
    player: tm.players ? {
      id: tm.players.id,
      name: tm.players.name,
      handicap: tm.players.handicap ?? 0,
    } : undefined,
  })),
}));
```

**Problems with this approach:**
1. `any` everywhere means no type safety
2. Same transformation code duplicated in 5+ files
3. If schema changes, you update 5+ places
4. Easy to make typos (`team.competiton_id` won't error)

---

## The Solution: Typed Query Helpers

Create a single file that:
1. Defines the exact shape Supabase returns
2. Defines the shape your app uses
3. Has a transform function to convert between them
4. Exports a typed query function

```typescript
// src/services/supabase/queries/teams.ts

// 1. Define what Supabase returns (database format)
interface TeamRowWithMembers {
  id: string;
  competition_id: string;
  name: string;
  team_members: Array<{
    player_id: string;
    players: { id: string; name: string; handicap: number | null } | null;
  }> | null;
}

// 2. Define what your app uses (clean format)
export interface TeamWithMembers {
  id: string;
  competitionId: string;  // camelCase
  name: string;
  members: Array<{
    playerId: string;
    player?: { id: string; name: string; handicap: number };
  }>;
}

// 3. Transform function (one place to maintain)
function transformTeam(row: TeamRowWithMembers): TeamWithMembers {
  return {
    id: row.id,
    competitionId: row.competition_id,
    name: row.name,
    members: (row.team_members ?? []).map((tm) => ({
      playerId: tm.player_id,
      player: tm.players
        ? {
            id: tm.players.id,
            name: tm.players.name,
            handicap: tm.players.handicap ?? 0,
          }
        : undefined,
    })),
  };
}

// 4. Typed query function
export async function fetchTeamsWithMembers(
  competitionId: string
): Promise<TeamWithMembers[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id, competition_id, name,
      team_members (player_id, players!player_id (id, name, handicap))
    `)
    .eq('competition_id', competitionId);

  if (error) throw new Error(`Failed to fetch teams: ${error.message}`);

  // ONE type assertion here
  const rows = data as TeamRowWithMembers[];
  return rows.map(transformTeam);
}
```

---

## Before vs After

### Before: useRoundData.ts (15 instances of `any`)

```typescript
// Line 89-156: Fetching teams
const { data: teamsData } = await (supabase.from('teams') as any)
  .select(`
    id, competition_id, name, created_at, updated_at,
    team_members (
      team_id, player_id, joined_at,
      players!player_id (id, name, email, phone, handicap, photo_url)
    )
  `)
  .eq('competition_id', competitionId);

if (teamsData) {
  fetchedTeams = teamsData.map((team: any) => ({
    id: team.id,
    competition_id: team.competition_id,
    name: team.name,
    created_at: team.created_at,
    updated_at: team.updated_at,
    members: (team.team_members || []).map((tm: any) => ({
      team_id: tm.team_id,
      player_id: tm.player_id,
      joined_at: tm.joined_at,
      player: tm.players
        ? {
            id: tm.players.id,
            name: tm.players.name,
            email: tm.players.email,
            phone: tm.players.phone,
            handicap: tm.players.handicap ?? 0,
            photo_url: tm.players.photo_url,
          }
        : undefined,
    })),
  }));
}
```

**Same code repeated at lines: 110-156, 245-296, 395-452** (3x duplication!)

### After: useRoundData.ts (0 instances of `any`)

```typescript
import { fetchTeamsWithMembers } from '@/services/supabase/queries/teams';

// Line 89: Fetching teams
if (roundIsTeamRound) {
  fetchedTeams = await fetchTeamsWithMembers(competitionId);
}
```

That's it. **60 lines reduced to 3 lines**, and fully type-safe.

---

## Visual Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     BEFORE (scattered any)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  useRoundData.ts          TeamManagementScreen.tsx              │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │ as any         │       │ as any         │                    │
│  │ (team: any)    │       │ (team: any)    │                    │
│  │ (tm: any)      │       │ (tm: any)      │                    │
│  │ transform...   │       │ transform...   │  (DUPLICATED!)     │
│  └────────────────┘       └────────────────┘                    │
│                                                                  │
│  api/teams.ts             ScoringPairsScreen.tsx                │
│  ┌────────────────┐       ┌────────────────┐                    │
│  │ as any         │       │ as any         │                    │
│  │ (t: any)       │       │ (cp: any)      │                    │
│  │ (m: any)       │       │ transform...   │  (DUPLICATED!)     │
│  │ transform...   │       └────────────────┘                    │
│  └────────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓ REFACTOR ↓

┌─────────────────────────────────────────────────────────────────┐
│                    AFTER (typed query helpers)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  queries/teams.ts (SINGLE SOURCE OF TRUTH)                      │
│  ┌────────────────────────────────────────┐                     │
│  │ interface TeamRowWithMembers { ... }   │ ← DB shape          │
│  │ interface TeamWithMembers { ... }      │ ← App shape         │
│  │ function transformTeam() { ... }       │ ← Conversion        │
│  │ async function fetchTeamsWithMembers() │ ← Query + transform │
│  └────────────────────────────────────────┘                     │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  useRoundData.ts    api/teams.ts    TeamManagement.tsx          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ import {...} │  │ import {...} │  │ import {...} │           │
│  │ const teams  │  │ const teams  │  │ const teams  │           │
│  │   = await    │  │   = await    │  │   = await    │           │
│  │ fetchTeams() │  │ fetchTeams() │  │ fetchTeams() │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ✅ Full type safety    ✅ No duplication    ✅ Easy to update  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/services/supabase/queries/
├── index.ts              # Re-exports all query functions
├── teams.ts              # Team queries (created)
├── rounds.ts             # Round queries (to create)
├── competitions.ts       # Competition queries (to create)
├── players.ts            # Player queries (to create)
└── scorecards.ts         # Scorecard queries (to create)
```

---

## Step-by-Step Migration

### Step 1: Create the query helper file

Already done: `src/services/supabase/queries/teams.ts`

### Step 2: Add an index file for clean imports

```typescript
// src/services/supabase/queries/index.ts
export * from './teams';
// export * from './rounds';  // add as you create them
```

### Step 3: Update consumers one at a time

```typescript
// In useRoundData.ts, replace:
import { fetchTeamsWithMembers } from '@/services/supabase/queries';

// Old code:
const { data: teamsData } = await (supabase.from('teams') as any)...

// New code:
const teamsData = await fetchTeamsWithMembers(competitionId);
```

### Step 4: Remove the duplicated transformation code

Since `fetchTeamsWithMembers` returns already-transformed data, delete the `.map()` blocks.

---

## FAQ

### Q: Why not use Supabase's generated types?

Supabase can generate types via `supabase gen types typescript`, but:
1. They don't cover nested `select()` queries properly
2. They're in snake_case (your app probably uses camelCase)
3. They include all columns, not just what you select

Typed query helpers give you exactly the shape you need.

### Q: Doesn't this add more code?

Yes, initially. But it **removes** more code from consumers:
- 15 files × 20 lines of transformation = 300 lines removed
- 1 file × 80 lines of helpers = 80 lines added
- Net: **220 lines removed**, plus type safety

### Q: What about mutations (insert/update/delete)?

Same pattern works:

```typescript
export async function createTeam(input: TeamCreateInput): Promise<TeamWithMembers> {
  const { data, error } = await supabase
    .from('teams')
    .insert({ competition_id: input.competitionId, name: input.name })
    .select()
    .single();

  if (error) throw new Error(`Failed to create team: ${error.message}`);

  // Transform and return
  return transformTeam(data as TeamRowWithMembers);
}
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Type safety | ❌ None (`any` everywhere) | ✅ Full |
| Duplication | ❌ Same code in 5+ files | ✅ Single source |
| Maintenance | ❌ Update 5+ places | ✅ Update 1 place |
| Code volume | ~300 lines scattered | ~80 lines centralized |
| IDE autocomplete | ❌ No suggestions | ✅ Full autocomplete |

The typed query helper pattern is the recommended approach for Supabase + TypeScript projects.
