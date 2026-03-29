# League Rejoin & Error Handling Fix

## Context

A league member disappeared from the league (likely status changed to 'removed'). Two problems surfaced:

1. **Invite code rejoin fails with RLS error**: When the removed player tries to rejoin via invite code, the upsert on `league_players` fails because the SELECT RLS policy prevents them from seeing their own existing row (required for PostgREST upsert conflict detection).
2. **Admin add-player has no error feedback**: When the league organiser tries to re-add the player via the "Add Players" bottom sheet, the operation either fails silently or succeeds without visible confirmation. The `onError` handler only logs to console.

## Changes

### 1. New Migration: Fix `league_players` SELECT RLS Policy

**File**: `supabase/migrations/<timestamp>_league_players_select_own_row.sql`

Update the SELECT policy to allow players to always see their own `league_players` row, regardless of status:

```sql
DROP POLICY IF EXISTS league_players_select ON league_players;

CREATE POLICY league_players_select ON league_players FOR SELECT
  USING (
    auth.uid() = player_id
    OR is_league_member(league_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_players.league_id AND created_by = auth.uid()
    )
  );
```

**Rationale**: Players can already UPDATE their own rows (the UPDATE policy has `auth.uid() = player_id`). Allowing SELECT on your own row is logically consistent and is required for the upsert conflict detection to work when rejoining.

**Impact**: A removed/declined player can now see their own membership row. They still cannot see other members' rows unless they are an accepted member or the creator. The `get_my_leagues()` function still filters by `status = 'accepted'`, so removed players won't see the league in their league list.

### 2. Error Feedback in `AddLeaguePlayersBottomSheet`

**File**: `src/components/leagues/AddLeaguePlayersBottomSheet.tsx`

Add `Alert.alert()` calls for both success and error outcomes when adding players:

- **On error**: `Alert.alert('Error', 'Failed to add players. Please try again.')` — follows the pattern used in `useLeagueDetail.ts`, `LeagueSettingsScreen.tsx`, and 15+ other league screen locations.
- **On success**: `Alert.alert('Done', 'X player(s) added to the league.')` then close the sheet — gives the organiser clear confirmation.

### 3. Friendlier Error Message for Invite Code Rejoin

**File**: `src/services/api/leagues/mutations.ts`

In the `joinLeague` function, replace the raw Supabase error passthrough with a user-friendly message:

```typescript
if (joinError) {
  console.error('[Leagues] Error joining league:', joinError);
  throw new Error('Unable to join this league. Please ask the organiser to add you directly, or try again later.');
}
```

The `JoinLeagueScreen` already displays errors via its `error` state — no UI changes needed there.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/<new>_league_players_select_own_row.sql` | New migration: updated SELECT RLS policy |
| `src/components/leagues/AddLeaguePlayersBottomSheet.tsx` | Add Alert.alert for success/error feedback |
| `src/services/api/leagues/mutations.ts` | Friendlier error message in joinLeague |

## Verification

1. **Invite code rejoin**: Have a removed player use the league invite code to rejoin. Should succeed without RLS error and navigate to the league detail screen.
2. **Admin add player**: As league organiser, open the Add Players bottom sheet, select a previously-removed friend, tap "Add Player". Should see success alert and player reappears in members list.
3. **Error feedback**: Simulate a network error or invalid state. Both flows should show user-facing error alerts instead of failing silently.
4. **No regression**: Existing members should still see league players. Non-members should NOT see other people's membership rows. `get_my_leagues()` should still only return leagues where status is 'accepted'.
