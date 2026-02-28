# Leagues Feature Phase 2 - Challenge a Friend

## Context

**Prerequisite**: Leagues Feature (Phase 1) must be implemented first.

This phase adds a standalone "Challenge a Friend" 1v1 feature. Players can challenge friends to a round — each plays any course, and the app compares WHS handicap differentials to determine the winner. Accessed from the Rounds screen.

**Key decisions:**
- Scoring: WHS Handicap Differential comparison (lower = better)
- Match Play (future): Stableford-based hole-by-hole comparison (normalizes different pars)
- Challenges are standalone — not part of leagues
- 7-day expiry on pending challenges
- 18 holes only

---

## Phase 1: Database Schema

Create migration: `supabase/migrations/YYYYMMDD000000_challenges.sql`

### 1.1 Table

**`challenges`** — standalone 1v1 challenges
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  challenger_scorecard_id UUID REFERENCES scorecards(id),
  opponent_scorecard_id UUID REFERENCES scorecards(id),
  challenger_differential NUMERIC(4,1),
  opponent_differential NUMERIC(4,1),
  winner_id UUID REFERENCES players(id),
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_challenge CHECK (challenger_id != opponent_id)
);
```

### 1.2 Indexes & RLS

**Indexes:**
```sql
CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_opponent ON challenges(opponent_id);
CREATE INDEX idx_challenges_status ON challenges(status);
```

**RLS Policies:**
```sql
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Players can view their own challenges
CREATE POLICY challenges_select ON challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Any authenticated user can create a challenge
CREATE POLICY challenges_insert ON challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Challenger can cancel; opponent can accept/decline; both can link their scorecard
CREATE POLICY challenges_update ON challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Only challenger can delete (cancel) a pending challenge
CREATE POLICY challenges_delete ON challenges FOR DELETE
  USING (auth.uid() = challenger_id AND status = 'pending');
```

**Triggers:**
```sql
-- Auto-update updated_at
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Challenge Completion Function

```sql
CREATE OR REPLACE FUNCTION complete_challenge(p_challenge_id UUID)
RETURNS void AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;

  -- Both scorecards must be linked
  IF v_challenge.challenger_scorecard_id IS NULL OR v_challenge.opponent_scorecard_id IS NULL THEN
    RAISE EXCEPTION 'Both players must submit scorecards';
  END IF;

  -- Determine winner by differential (lower = better)
  UPDATE challenges SET
    status = 'completed',
    winner_id = CASE
      WHEN v_challenge.challenger_differential < v_challenge.opponent_differential THEN v_challenge.challenger_id
      WHEN v_challenge.opponent_differential < v_challenge.challenger_differential THEN v_challenge.opponent_id
      ELSE NULL  -- tie
    END
  WHERE id = p_challenge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 2: TypeScript Types & Query Keys

### 2.1 Types: `src/types/database/challenge.types.ts`

```ts
export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

export interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: ChallengeStatus;
  challenger_scorecard_id: string | null;
  opponent_scorecard_id: string | null;
  challenger_differential: number | null;
  opponent_differential: number | null;
  winner_id: string | null;
  message: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithPlayers extends Challenge {
  challenger: { id: string; first_name: string; last_name: string; avatar_url: string | null };
  opponent: { id: string; first_name: string; last_name: string; avatar_url: string | null };
}
```

### 2.2 Query keys: `src/hooks/queryKeys.ts`

```ts
export const challengeKeys = {
  all: ['challenges'] as const,
  lists: () => [...challengeKeys.all, 'list'] as const,
  list: (status?: string) => [...challengeKeys.lists(), { status }] as const,
  active: () => [...challengeKeys.lists(), 'active'] as const,
  detail: (id: string) => [...challengeKeys.all, 'detail', id] as const,
};
```

### 2.3 Navigation types: `src/navigation/types.ts`

Add to `RootStackParamList`:
```ts
CreateChallenge: { opponentId?: string } | undefined;
ChallengeDetail: { id: string };
```

---

## Phase 3: API Service & Hooks

### 3.1 Service: `src/services/api/challenges.ts`

- `createChallenge(opponentId, message?)` — create with 7-day `expires_at`
- `respondToChallenge(id, 'accepted' | 'declined')` — accept or decline
- `getChallenges(status?)` — user's challenges (as challenger or opponent)
- `getChallenge(id)` — single challenge with player details
- `linkScorecardToChallenge(challengeId, scorecardId)` — attach scorecard + differential, auto-complete if both submitted

### 3.2 Hooks: `src/hooks/useChallenges.ts`

- `useChallenges(status?)` — query hook for challenge list
- `useChallenge(id)` — query hook for single challenge
- `useActiveChallenges()` — shorthand for pending + in_progress
- `useCreateChallenge()` — mutation
- `useRespondToChallenge()` — mutation
- `useLinkScorecard()` — mutation, invalidates challenge detail

---

## Phase 4: Screens

### 4.1 Screen structure

```
src/screens/challenges/
  CreateChallengeScreen.tsx    -- Friend picker + optional message
  ChallengeDetailScreen.tsx    -- Status, link scorecard, results
```

### 4.2 CreateChallengeScreen

- Friend picker (build reusable `FriendPickerList` from existing `src/components/social/` components)
- Optional message field
- "Send Challenge" button
- Pre-selects opponent if navigated with `opponentId` param

### 4.3 ChallengeDetailScreen

**States:**
- **Pending**: Show accept/decline buttons (opponent) or "Waiting..." (challenger)
- **Accepted/In Progress**: Show "Link Scorecard" button for each player, status indicators
- **Completed**: Show both differentials, winner banner, match summary
- **Declined/Cancelled/Expired**: Show status message

---

## Phase 5: Rounds Screen Integration

### 5.1 UI integration in `RoundListScreen`

- Add "Challenges" section above or below rounds list
- Show active challenges as compact cards (opponent name, status)
- "Challenge a Friend" button → `CreateChallengeScreen`
- Tapping a challenge → `ChallengeDetailScreen`

### 5.2 Scorecard submission integration

After scorecard submission in `ReviewScorecardScreen`:
- Check if user has any `in_progress` challenges
- If yes, prompt "Link this round to your challenge with [opponent]?"
- On confirm, call `linkScorecardToChallenge`

---

## Phase 6: Notifications

Add notification types to push notification system:
- `challenge_received` — "[Player] challenged you to a round!"
- `challenge_accepted` — "[Player] accepted your challenge"
- `challenge_completed` — "Challenge complete! You [won/lost/tied] against [Player]"

---

## Phase 7: Polish & Navigator

- Add `CreateChallenge` and `ChallengeDetail` to `RootNavigator.tsx`
- Build `FriendPickerList` component (reusable from existing social components)
- Dark mode support (all components use `useThemeColors()`)
- Accessibility (labels, roles, 44x44px touch targets)
- Handle expired challenges (cron job or check on fetch)

---

## Future Enhancement: Stableford Match Play

When both players' courses have full hole data (pars, stroke indexes), offer optional hole-by-hole match play comparison:

**`src/utils/challengeMatchPlay.ts`:**
- Compare two scorecards hole-by-hole using **net Stableford points**
- Reuses existing `calculateStablefordPointsNet()` from `src/utils/scoring.ts`
- For each hole: higher Stableford points wins, equal = halved
- Standard match play result format (e.g., "3&2", "1 UP", "A/S")

This is deferred because it only works reliably when both players play 18 holes with known pars and stroke indexes — differential comparison is simpler and always works.

---

## Existing Code to Reuse

| Utility | File | Purpose |
|---------|------|---------|
| `calculateScoreDifferential()` | `src/utils/handicapDifferential.ts` | WHS differential formula |
| `calculateStablefordPointsNet()` | `src/utils/scoring.ts` | Net stableford per hole (future match play) |
| `getStrokesOnHole()` | `src/utils/scoring.ts` | Strokes received per hole |
| `calculateGADailyHandicap()` | `src/utils/dailyHandicap.ts` | Course-specific daily HC |
| Friend components | `src/components/social/` | Friend cards for picker |
| `ReviewScorecardScreen` | `src/screens/scoring/` | Scorecard linking integration point |

---

## Verification Plan

1. **Database**: Run `supabase db reset` — verify migration applies cleanly
2. **Create Challenge**: Send challenge to friend, verify pending state
3. **Accept/Decline**: Opponent accepts, verify status update + notification
4. **Link Scorecard**: Both players link scorecards, verify auto-completion
5. **Winner**: Verify lower differential wins, ties handled
6. **Expiry**: Verify 7-day-old pending challenges handled
7. **Rounds Screen**: Verify challenges section shows active challenges
8. **Dark mode**: Verify all new screens respect theme
