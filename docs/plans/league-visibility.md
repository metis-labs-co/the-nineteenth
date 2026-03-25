# Plan: League Visibility (Public/Private) & Browse

## Context

Currently, all authenticated users can see all leagues due to a permissive RLS policy (`USING (true)`). The user wants leagues restricted to members/creators by default, with a new "Browse" section for public leagues that organisers opt into during creation.

**Outcome:** Users see only their leagues by default. A "Browse" tab lets anyone search and discover public leagues, navigating to the detail screen to join.

---

## 1. Database Migration — ✅ Complete (2026-03-24)

**Create:** `supabase/migrations/20260325000000_league_visibility.sql`

### a) Add `is_public` column
```sql
ALTER TABLE leagues ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_leagues_is_public ON leagues(is_public) WHERE status = 'active' AND is_public = TRUE;
```

### b) Replace `leagues_select` RLS policy
```sql
DROP POLICY IF EXISTS leagues_select ON leagues;
CREATE POLICY leagues_select ON leagues FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR is_league_member(id, auth.uid())
    OR (is_public = TRUE AND status = 'active')
  );
```

### c) SECURITY DEFINER function for invite code lookup
The new RLS blocks non-members from finding private leagues by invite code. Fix with an RPC:
```sql
CREATE OR REPLACE FUNCTION lookup_league_by_invite_code(p_invite_code TEXT)
RETURNS SETOF leagues AS $$
  SELECT * FROM leagues
  WHERE invite_code = UPPER(TRIM(p_invite_code)) AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### d) RPC for user's own leagues
Returns only leagues where the user is creator or accepted member (used by "My Leagues" tab):
```sql
CREATE OR REPLACE FUNCTION get_my_leagues()
RETURNS SETOF leagues AS $$
  SELECT l.* FROM leagues l
  WHERE l.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM league_players lp
      WHERE lp.league_id = l.id AND lp.player_id = auth.uid() AND lp.status = 'accepted'
    )
  ORDER BY l.created_at DESC;
$$ LANGUAGE sql STABLE;
```

### e) RPC for public league browsing (includes player count)
Uses SECURITY INVOKER (default) — the RLS policy already allows authenticated users to see public active leagues.
```sql
CREATE OR REPLACE FUNCTION get_public_leagues(
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID, name TEXT, description TEXT, created_by UUID,
  league_type TEXT, status TEXT, is_public BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  player_count BIGINT
) AS $$
  SELECT l.id, l.name, l.description, l.created_by,
    l.league_type, l.status, l.is_public, l.created_at, l.updated_at,
    COUNT(lp.player_id) FILTER (WHERE lp.status = 'accepted') AS player_count
  FROM leagues l
  LEFT JOIN league_players lp ON lp.league_id = l.id
  WHERE l.is_public = TRUE AND l.status = 'active'
    AND (p_search IS NULL OR l.name ILIKE '%' || p_search || '%')
  GROUP BY l.id
  ORDER BY player_count DESC, l.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

---

## 2. TypeScript Types — ✅ Complete (2026-03-24)

**File:** `src/types/database/league.types.ts`

- Add `is_public: boolean` to the `League` interface (after `partnership_format`)
- Reuse existing `LeagueWithPlayerCount` interface for browse results (no new type needed)

---

## 3. Service Layer — ✅ Complete (2026-03-24)

**File:** `src/services/api/leagues.ts`

### a) Add `is_public` to `CreateLeagueInput`
Add `is_public?: boolean` to the interface.

### b) Update `createLeague()`
Include `is_public: input.is_public ?? false` in the insert payload.

### c) Replace `getLeagues()` with `get_my_leagues` RPC
Replace the current unfiltered query with an RPC call:
```typescript
const { data, error } = await supabase.rpc('get_my_leagues');
```

### d) Add `getPublicLeagues(search?: string)`
Call the `get_public_leagues` RPC.

### e) Update `joinLeague()` — use RPC for invite code lookup
Replace the direct `.from('leagues').eq('invite_code', ...)` query with:
```typescript
const { data } = await supabase.rpc('lookup_league_by_invite_code', { p_invite_code: inviteCode.trim() });
```

### f) Add `joinPublicLeague(leagueId: string)`
Upsert into `league_players` with the given league ID (no invite code needed — the user taps "Join" from the browse list/detail screen).

### g) Update `updateLeague()` input type
Add `is_public?: boolean` to the update input.

---

## 4. Query Keys & Hooks — ✅ Complete (2026-03-24)

**File:** `src/hooks/queryKeys/features.ts`
- Add: `publicList: (search?: string) => [...leagueKeys.all, 'public', search] as const`

**File:** `src/hooks/useLeagues.ts`
- Add `usePublicLeagues(search?: string)` hook (2 min stale time)
- Add `useJoinPublicLeague()` mutation (invalidates `leagueKeys.all` on success)
- Import new service functions

---

## 5. Create League Screen — Visibility Toggle — ✅ Complete (2026-03-24)

**File:** `src/screens/leagues/CreateLeagueScreen.tsx`

- Add `const [isPublic, setIsPublic] = useState(false)` state
- Add a checkbox toggle in Step 1 (below the Description field) using the existing `toggleRow` styles (already in the stylesheet at line ~895):
  - Label: "Public League"
  - Description: "Allow anyone to find and join this league"
- Pass `is_public: isPublic` in the `CreateLeagueInput` payload
- Add `isPublic` to dependency arrays

---

## 6. League List Screen — Tabs + Browse — ✅ Complete (2026-03-24)

**File:** `src/screens/leagues/LeagueListScreen/index.tsx`

### Structure
Add `Tabs` component (reuse from `src/components/common/Tabs.tsx`) with two tabs:
- **My Leagues** (default) — existing list of user's leagues
- **Browse** — searchable list of public leagues

### My Leagues tab
Keep existing content (Create button, limit indicator, FlatList of user's leagues, empty state, delete flow).

### Browse tab
- `SearchBar` at top (reuse from `src/components/common/SearchBar.tsx`)
- Debounce search input using existing `useDebouncedValue` hook (`src/hooks/useDebouncedValue.ts`)
- FlatList of `LeagueWithPlayerCount` from `usePublicLeagues(debouncedSearch)`
- Each card shows league name, type, description, and **player count**
- Tapping navigates to `LeagueDetail` (user joins from there)
- Empty states: "No public leagues yet" / "No leagues match your search"

### New imports needed
`Tabs`, `SearchBar`, `usePublicLeagues`, `useDebouncedValue`

---

## 7. LeagueCard — Player Count Display — ✅ Complete (2026-03-24)

**File:** `src/components/leagues/LeagueCard.tsx`

- Add optional `playerCount?: number` prop
- When provided, render a small text line (e.g., "12 players") below the description using `colors.textSecondary`

---

## 8. League Detail Screen — Non-Member Join Flow — ✅ Complete (2026-03-24)

**File:** `src/screens/leagues/LeagueDetailScreen/hooks/useLeagueDetail.ts`

- Add `isMember` derived value: check if current user's ID appears in the `players` array OR is the creator
- Export `isMember` and a `joinPublicLeague` mutation handler

**File:** `src/screens/leagues/LeagueDetailScreen/index.tsx`

- When `!isMember && league?.is_public`: show a preview view with league info (name, type, description, player count) and a prominent "Join League" button
- After joining, invalidate queries so the full detail view loads
- When `!isMember && !league?.is_public`: show "You don't have access to this league" (edge case, shouldn't normally happen)

---

## 9. League Settings Screen — Visibility Toggle — ✅ Complete (2026-03-24)

**File:** `src/screens/leagues/LeagueSettingsScreen.tsx`

- Add `const [isPublic, setIsPublic] = useState(league?.is_public ?? false)` state
- Add checkbox toggle in the Details section (below description)
- Include `is_public: isPublic` in the save payload at line 71-73

---

## Files to Modify (in order)

1. `supabase/migrations/20260325000000_league_visibility.sql` — **CREATE**
2. `src/types/database/league.types.ts` — add `is_public`, reuse `LeagueWithPlayerCount`
3. `src/services/api/leagues.ts` — new queries, update existing functions
4. `src/hooks/queryKeys/features.ts` — add `publicList` key
5. `src/hooks/useLeagues.ts` — add `usePublicLeagues`, `useJoinPublicLeague`
6. `src/components/leagues/LeagueCard.tsx` — add `playerCount` prop
7. `src/screens/leagues/CreateLeagueScreen.tsx` — visibility toggle
8. `src/screens/leagues/LeagueListScreen/index.tsx` — tabs + browse tab
9. `src/screens/leagues/LeagueDetailScreen/hooks/useLeagueDetail.ts` — `isMember` + join
10. `src/screens/leagues/LeagueDetailScreen/index.tsx` — non-member preview
11. `src/screens/leagues/LeagueSettingsScreen.tsx` — visibility toggle

## Existing Utilities to Reuse

- `Tabs` component — `src/components/common/Tabs.tsx`
- `SearchBar` component — `src/components/common/SearchBar.tsx`
- `EmptyState` component — `src/components/common/EmptyState.tsx`
- `useDebouncedValue` hook — `src/hooks/useDebouncedValue.ts`
- `toggleRow` styles — already in CreateLeagueScreen stylesheet (~line 895)
- `is_league_member()` DB function — already exists for RLS
- `LeagueCard` component — `src/components/leagues/LeagueCard.tsx`
- `LeagueWithPlayerCount` type — already in `src/types/database/league.types.ts`
- FriendsScreen tab pattern — `src/screens/social/FriendsScreen.tsx` (reference)

---

## Verification

1. **Create private league** → confirm `is_public = false` in DB, not visible in Browse tab for other users
2. **Create public league** → confirm visible in Browse tab with correct player count
3. **Search public leagues** → verify filtering works and debounce doesn't cause excessive queries
4. **View public league detail as non-member** → see preview with Join button
5. **Join public league from detail** → joins, shows full league data, appears in My Leagues
6. **Join private league via invite code** → still works with the new RPC lookup
7. **My Leagues tab** → shows only created/joined leagues, not all public leagues
8. **Toggle visibility in settings** → league appears/disappears from Browse tab
9. **Existing leagues stay private** → `DEFAULT FALSE` migration preserves current behavior
10. **RLS enforcement** → direct Supabase query confirms non-members can't see private leagues
