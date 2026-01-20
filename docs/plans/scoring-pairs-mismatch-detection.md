# Plan: Scoring Pairs Enhancement - Self + Partner Scoring with Mismatch Detection

## Overview

Enhance the scoring pairs feature so users score **themselves AND their paired partner** (not just partner), with automatic mismatch detection on submission and a resolution UI for conflicts.

## Approach

1. **Dual Score Tracking**: Store both scorers' versions in a new `score_entries` table
2. **Wait for Partner**: Block submission until both scorers have entered scores
3. **Server-side Mismatch Detection**: Compare scores after both submit, create `score_mismatches` records
4. **Resolution Modal**: Simple modal for resolving conflicts inline

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Score storage | New `score_entries` table | Existing `hole_scores` is nested in per-player scorecards - can't store "B's version of A's score" there. New table keeps both versions independent until reconciliation. |
| Submission timing | Wait for partner (with 30-min bypass) | Ensures mismatches detected before finalization. 30-minute bypass prevents deadlock if partner unavailable. |
| Resolution authority | Either player (first-write-wins) | Flexible - whoever resolves first, that value is used. Second resolver sees "Already resolved" state. |
| Offline handling | Detect server-side after sync | Consistent state, resolution requires online. Offline scores sync to `score_entries` on reconnect. |
| Partner notification | Polling with refresh button | Simpler than realtime subscriptions for a once-per-round flow. Check on submit, show progress, manual refresh. |
| Group size | Always self + 1 partner | Each player scores exactly 2 people regardless of group size |
| UI complexity | Modal only (no full screen) | Most rounds have 0-2 mismatches; full screen is overkill |
| Hole count | Dynamic from round config | Support both 9 and 18 hole rounds (entries = holes × 2) |

---

## Flow Clarification

```
1. Player A enters scores for self (A) and partner (B) → saved to score_entries
2. Player B enters scores for self (B) and partner (A) → saved to score_entries
3. Player A attempts to submit:
   - Check: Has B completed all entries? (round.holeCount × 2 players)
   - If NO: Show "Waiting for partner" dialog with progress and refresh button
   - If YES: Trigger mismatch detection
4. Mismatch detection compares:
   - A's score for A vs B's score for A
   - A's score for B vs B's score for B
5. If mismatches found:
   - Create score_mismatches records
   - Show resolution modal
   - Block submission until all resolved
6. On resolution:
   - resolved_score written to score_mismatches
   - Final scorecard updated (remote DB + local SQLite)
   - If already resolved by partner, show "Already resolved" state
7. Submit proceeds normally

BYPASS FLOW (if partner doesn't respond):
1. Player A attempts to submit
2. Check: Both players have complete hole data? (all entries for both players)
3. If YES but partner hasn't submitted:
   - Record bypass_available_at = now() + 30 mins in score_submission_status table
   - Send push notification to BOTH players:
     "Scores complete - verification pending. Bypass available in 30 mins."
4. After 30 mins: "Submit without partner verification" button appears
5. If Player A uses bypass:
   - Player A's scores become source of truth for ALL holes (both players)
   - No mismatch detection/resolution needed
   - Submission flagged in leaderboard (⚠️ "Unverified")
```

---

## Phase 1: Database Schema

### Step 1.1: Create score_entries table
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a new Supabase migration file at `supabase/migrations/20260120000000_score_entries.sql`.

Create the `score_entries` table with:
- id (UUID, primary key, gen_random_uuid())
- round_id (UUID, FK to rounds, ON DELETE CASCADE)
- player_id (UUID, FK to players) - Player whose score this is FOR
- hole_number (INTEGER, CHECK 1-18)
- scorer_id (UUID, FK to players) - Who ENTERED this score
- strokes (INTEGER, CHECK > 0)
- putts (INTEGER, nullable)
- penalties (INTEGER, default 0)
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE constraint on (round_id, player_id, hole_number, scorer_id)

Add indexes:
- round_id
- (round_id, player_id, hole_number)
- (round_id, scorer_id)
```

**Deliverables:**
- [x] Migration file created
- [x] `score_entries` table with constraints
- [x] Indexes added

**Dependencies:** None
**Notes:** This allows storing A's score for A by A AND A's score for A by B (partner)

---

### Step 1.2: Create score_mismatches table
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add to the same migration file the `score_mismatches` table:

- id (UUID, primary key)
- round_id (UUID, FK to rounds, ON DELETE CASCADE)
- player_id (UUID, FK to players) - Player whose score has mismatch
- hole_number (INTEGER)
- self_score (INTEGER) - What the player recorded for themselves
- partner_score (INTEGER) - What their partner recorded for them
- self_scorer_id (UUID, FK to players)
- partner_scorer_id (UUID, FK to players)
- status (TEXT, default 'pending', CHECK IN ('pending', 'resolved'))
- resolved_score (INTEGER, nullable)
- resolved_by (UUID, FK to players, nullable)
- resolved_at (TIMESTAMPTZ, nullable)
- created_at (TIMESTAMPTZ)
- UNIQUE constraint on (round_id, player_id, hole_number)

Add indexes:
- round_id
- (round_id, status) for filtering pending mismatches

Also create `score_submission_status` table for bypass tracking:
- id (UUID, primary key)
- round_id (UUID, FK to rounds, ON DELETE CASCADE)
- player_id (UUID, FK to players) - Player attempting submission
- partner_id (UUID, FK to players) - Their scoring partner
- bypass_available_at (TIMESTAMPTZ, nullable) - When bypass becomes available
- bypassed_at (TIMESTAMPTZ, nullable) - When bypass was used
- bypassed (BOOLEAN, default false)
- created_at, updated_at (TIMESTAMPTZ)
- UNIQUE constraint on (round_id, player_id)

Also add `bypassed` column to existing `scorecards` table:
- ALTER TABLE scorecards ADD COLUMN bypassed BOOLEAN DEFAULT false;
- This flags submissions that skipped partner verification
```

**Deliverables:**
- [x] `score_mismatches` table created
- [x] `score_submission_status` table created for bypass tracking
- [x] `bypassed` column added to scorecards
- [x] Constraints and indexes added

**Dependencies:** Step 1.1
**Notes:** Unique constraint ensures one mismatch record per player/hole. First-write-wins for resolution race conditions. Bypass status tracked separately per player.

---

### Step 1.3: Add RLS policies
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add Row Level Security policies for both tables:

For `score_entries`:
1. SELECT: Players can view entries for rounds they're participating in
2. INSERT: Players can insert entries where scorer_id = their user ID
3. UPDATE: Players can update their own entries (scorer_id = user ID)
4. DELETE: Organizers can delete entries in their competitions

For `score_mismatches`:
1. SELECT: Players involved (player_id or scorer_ids) can view
2. UPDATE: Players involved can resolve (update resolved_* fields)
3. INSERT/DELETE: Only through server functions or organizers

For `score_submission_status`:
1. SELECT: Player can view their own status (player_id = user ID)
2. INSERT/UPDATE: Player can manage their own status
3. DELETE: Organizers only

Reference existing RLS patterns in `supabase/migrations/20250124000000_scoring_pairs.sql`
```

**Deliverables:**
- [x] RLS enabled on all three tables
- [x] SELECT, INSERT, UPDATE, DELETE policies added
- [ ] Policies tested (requires manual testing)

**Dependencies:** Step 1.2
**Notes:** Follow existing RLS patterns for scoring_pairs table

---

## Phase 2: Enable Self + Partner Scoring

### Step 2.1: Update getPlayersToScore service function
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/services/scoringPairs/scoringPairsService.ts`:

Update `getPlayersToScore(roundId, scorerId)` to:
1. Fetch the assigned partner(s) from scoring_pairs (existing logic)
2. NEW: Also include the current user (scorerId) in the returned list
3. Return [self, ...partners] - self first, then partners

Add new function `getScoringPartner(roundId, userId)`:
- Query scoring_pairs to find who is assigned to score the user
- Return the partner Player object or null

Update the service export to include the new function.

Reference current implementation at lines 167-202.
```

**Deliverables:**
- [x] `getPlayersToScore` returns self + partners
- [x] New `getScoringPartner` function added
- [x] Service exports updated

**Dependencies:** Phase 1 complete
**Notes:** This is the core change that enables self-scoring. Each player always scores exactly 2 people (self + 1 partner).

---

### Step 2.2: Update useRoundScoringPairs hook
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/hooks/scorecard/useRoundScoringPairs.ts`:

1. Update the interface:
```typescript
interface UseRoundScoringPairsResult {
  playersToScore: Player[];      // Now includes [self, partner]
  scoringPairsEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  myScorer: Player | null;       // NEW: Who is scoring me
  isOwnScore: (playerId: string) => boolean;  // NEW: Helper
}
```

2. Fetch myScorer using new getScoringPartner service function
3. Implement isOwnScore helper: `(playerId) => playerId === currentUserId`
4. Keep team-round self-scoring logic for now (verify with manual testing whether it conflicts)

Reference current implementation at lines 1-121.
```

**Deliverables:**
- [x] Hook interface updated with new fields
- [x] `myScorer` populated
- [x] `isOwnScore` helper implemented
- [x] Team round logic removed (service now handles self-inclusion)

**Dependencies:** Step 2.1
**Notes:** The hook consumers will get self in playersToScore automatically

---

## Phase 3: Score Entry with Attribution

### Step 3.1: Add scoredBy to HoleScore type
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/types/database/base.ts`:

Add `scoredBy` field to HoleScore interface:
```typescript
interface HoleScore {
  strokes: number;
  putts?: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  penalties?: number;
  scoredBy?: string;  // NEW: UUID of who entered this score
}
```

This change propagates automatically since HoleScore is used in Scorecard.scores
```

**Deliverables:**
- [x] `scoredBy` field added to HoleScore
- [ ] TypeScript compiles without errors (verify at end of phase)

**Dependencies:** Phase 2 complete
**Notes:** Optional field for backward compatibility

---

### Step 3.2: Create scoreMismatchService (combined service)
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create new file `src/services/scoreMismatch/scoreMismatchService.ts`:

This single service handles both score entries AND mismatch detection/resolution.

```typescript
import { supabase } from '@/services/supabase/client';
import type { HoleScore, Player } from '@/types';

// ============ TYPES ============

export interface ScoreEntry {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  scorer_id: string;
  strokes: number;
  putts?: number;
  penalties?: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreMismatch {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  self_score: number;
  partner_score: number;
  self_scorer_id: string;
  partner_scorer_id: string;
  status: 'pending' | 'resolved';
  resolved_score?: number;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  // Joined data
  player?: Player;
}

export interface SubmissionReadiness {
  canSubmit: boolean;
  reason?: 'waiting_for_partner' | 'unresolved_mismatches' | 'incomplete_scores';
  partnerName?: string;
  mismatchCount?: number;
  partnerProgress?: { completed: number; total: number };
}

// ============ SCORE ENTRIES ============

// Save or update a score entry (upsert)
export async function saveScoreEntry(
  roundId: string,
  playerId: string,
  holeNumber: number,
  scorerId: string,
  score: HoleScore
): Promise<ScoreEntry>

// Get all entries for a round
export async function getRoundScoreEntries(roundId: string): Promise<ScoreEntry[]>

// Get entries by scorer
export async function getScorerEntries(roundId: string, scorerId: string): Promise<ScoreEntry[]>

// Check if scorer has completed all entries (holeCount × 2 players)
export async function isScorerComplete(roundId: string, scorerId: string): Promise<boolean> {
  const entries = await getScorerEntries(roundId, scorerId);
  // Get round from existing rounds service to check hole count
  const { data: round } = await supabase.from('rounds').select('hole_count').eq('id', roundId).single();
  const expectedEntries = (round?.hole_count ?? 18) * 2;
  return entries.length >= expectedEntries;
}

// ============ MISMATCH DETECTION ============

// Detect mismatches by comparing score_entries with service-layer logic
export async function detectMismatches(roundId: string): Promise<ScoreMismatch[]> {
  const entries = await getRoundScoreEntries(roundId);

  // Group entries by (player_id, hole_number)
  const grouped = new Map<string, ScoreEntry[]>();
  for (const entry of entries) {
    const key = `${entry.player_id}-${entry.hole_number}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  const mismatches: ScoreMismatch[] = [];
  for (const [key, pair] of grouped) {
    if (pair.length === 2 && pair[0].strokes !== pair[1].strokes) {
      // Determine which is self vs partner score
      const selfEntry = pair.find(e => e.scorer_id === e.player_id);
      const partnerEntry = pair.find(e => e.scorer_id !== e.player_id);
      if (selfEntry && partnerEntry) {
        mismatches.push({
          round_id: roundId,
          player_id: selfEntry.player_id,
          hole_number: selfEntry.hole_number,
          self_score: selfEntry.strokes,
          partner_score: partnerEntry.strokes,
          self_scorer_id: selfEntry.scorer_id,
          partner_scorer_id: partnerEntry.scorer_id,
          status: 'pending',
          // ... other fields filled by insert
        });
      }
    }
  }
  return mismatches;
}

// Create mismatch records in database (uses ON CONFLICT DO NOTHING)
export async function createMismatchRecords(roundId: string): Promise<number>

// Get pending mismatches for a round
export async function getPendingMismatches(roundId: string): Promise<ScoreMismatch[]>

// Get single mismatch by ID (for checking if already resolved)
export async function getMismatch(mismatchId: string): Promise<ScoreMismatch | null>

// ============ RESOLUTION ============

// Resolve a mismatch (first-write-wins)
export async function resolveMismatch(
  mismatchId: string,
  resolvedScore: number,
  resolvedBy: string
): Promise<void>

// Apply resolved score to the actual scorecard
export async function applyResolvedScoreToScorecard(
  roundId: string,
  playerId: string,
  holeNumber: number,
  resolvedScore: number
): Promise<void> {
  // Update the hole_scores table with the resolved value
  // This ensures the final scorecard has the correct score
}

// ============ SUBMISSION READINESS ============

// Check if user can submit (partner complete + no pending mismatches)
export async function checkSubmissionReadiness(
  roundId: string,
  userId: string,
  scoringPairsEnabled: boolean
): Promise<SubmissionReadiness>

// Get partner's scoring progress
export async function getPartnerProgress(
  roundId: string,
  userId: string
): Promise<{ complete: boolean; partnerName: string; progress: { completed: number; total: number } }>

// ============ BYPASS HANDLING ============

// Start bypass timer (called when submit attempted with complete data but partner hasn't submitted)
export async function startBypassTimer(
  roundId: string,
  playerId: string,
  partnerId: string
): Promise<{ bypass_available_at: string }> {
  const bypassAvailableAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins from now
  // Upsert score_submission_status record
  // Return the timestamp
}

// Check bypass status
export async function getSubmissionStatus(
  roundId: string,
  playerId: string
): Promise<{ bypass_available_at: string | null; bypassed: boolean } | null>

// Mark submission as bypassed
export async function markSubmissionBypassed(
  roundId: string,
  playerId: string
): Promise<void>

// Apply bypass scores (use submitting player's scores as source of truth)
export async function applyBypassScores(
  roundId: string,
  bypassingPlayerId: string
): Promise<void> {
  // Get all score_entries where scorer_id = bypassingPlayerId
  // For each entry, update the final scorecard (hole_scores table)
  // This makes the bypassing player's version authoritative for ALL holes
}
```

Create index file at `src/services/scoreMismatch/index.ts`.
```

**Deliverables:**
- [x] `scoreMismatchService.ts` created with all functions
- [x] Service-layer mismatch detection (no DB functions needed)
- [x] `applyResolvedScoreToScorecard` ensures final scorecard is updated
- [x] Index file created

**Dependencies:** Step 3.1
**Notes:** Single combined service for simplicity. Mismatch detection is done in service layer, not PostgreSQL functions.

---

### Step 3.3: Update scorecardStore to track attribution
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/store/scorecardStore.ts`:

1. Update `setPlayerScore` signature to accept optional scoredBy:
```typescript
setPlayerScore: (playerId: string, hole: number, strokes: number, scoredBy?: string) => Promise<void>
```

2. In the implementation (around line 309):
   - Include scoredBy in the holeScore object
   - Default to current user if not provided (get from auth)

3. After saving to SQLite, also save to score_entries:
```typescript
// After saving to SQLite, also save to score_entries for mismatch detection
if (scoredBy && !scorecard.isStandalone) {
  await saveScoreEntry(roundId, playerId, hole, scoredBy, holeScore);
}
```

Reference current setPlayerScore at lines 309-396.
```

**Deliverables:**
- [x] `setPlayerScore` accepts scoredBy parameter
- [x] Attribution included in saved scores
- [x] score_entries populated on score entry
- [x] New `updateLocalScore(roundId, playerId, holeNumber, strokes)` function added for post-resolution SQLite updates

**Dependencies:** Step 3.2
**Notes:** Dual-write to SQLite (offline) and score_entries (mismatch detection)

---

### Step 3.4: Update SQLite schema for offline attribution
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/services/offline/dao/HoleScoreDAO.ts`:

1. Add `scored_by` column to the hole_scores table schema
2. Update saveHoleScore to include scored_by
3. Update getHoleScores to return scored_by

Also update `src/services/offline/database.ts` if the table creation is there.

Ensure backward compatibility - existing scores without scored_by should still work.
```

**Deliverables:**
- [x] SQLite schema updated (tables.ts)
- [x] DAO functions updated (HoleScoreDAO.ts)
- [x] Migration handles existing data (migrations.ts version 3)
- [x] Types updated (types.ts - HoleScoreRow)

**Dependencies:** Step 3.3
**Notes:** Offline scores need attribution too for eventual sync

---

### Step 3.5: Update offline sync to populate score_entries
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the offline sync logic in `src/services/offline/sync/`:

When syncing offline scores back to the server:
1. After syncing to hole_scores (existing flow)
2. Also sync to score_entries table for mismatch detection

In the sync service (likely `scorecardSyncService.ts` or similar):
```typescript
async function syncOfflineScores(scorecard: OfflineScorecard) {
  // Existing: sync to hole_scores
  await syncToHoleScores(scorecard);

  // NEW: Also populate score_entries for mismatch detection
  // Only if scoring pairs are enabled for this round
  if (scorecard.scoringPairsEnabled) {
    for (const [holeNumber, score] of Object.entries(scorecard.scores)) {
      await saveScoreEntry(
        scorecard.roundId,
        scorecard.playerId,
        parseInt(holeNumber),
        score.scoredBy ?? scorecard.userId, // Attribution from offline storage
        score
      );
    }
  }
}
```

This ensures offline scores are available for mismatch detection once online.
```

**Deliverables:**
- [x] Sync logic updated to populate score_entries
- [x] Only runs when scores have scoredBy attribution
- [x] Uses scoredBy attribution from SQLite

**Dependencies:** Step 3.4
**Notes:** Critical for offline-first flow - scores must reach score_entries for mismatch detection

---

## Phase 4: React Query Hooks

### Step 4.1: Create useScoreMismatch hooks
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create new file `src/hooks/useScoreMismatch.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import {
  getPendingMismatches,
  resolveMismatch,
  checkSubmissionReadiness,
  getPartnerProgress,
  applyResolvedScoreToScorecard,
} from '@/services/scoreMismatch';

// Query keys
export const scoreMismatchKeys = {
  all: ['scoreMismatch'] as const,
  mismatches: (roundId: string) => [...scoreMismatchKeys.all, 'mismatches', roundId] as const,
  readiness: (roundId: string, userId: string) => [...scoreMismatchKeys.all, 'readiness', roundId, userId] as const,
  partnerStatus: (roundId: string, userId: string) => [...scoreMismatchKeys.all, 'partner', roundId, userId] as const,
};

// Get pending mismatches for a round
export function usePendingMismatches(roundId: string | undefined)

// Check submission readiness
export function useSubmissionReadiness(
  roundId: string | undefined,
  userId: string | undefined,
  scoringPairsEnabled: boolean
)

// Partner status with manual refresh (simpler than realtime for once-per-round flow)
export function usePartnerStatus(roundId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scoreMismatchKeys.partnerStatus(roundId!, userId!),
    queryFn: () => getPartnerProgress(roundId!, userId!),
    enabled: !!roundId && !!userId,
    staleTime: 0, // Always refetch on manual refresh
  });

  // Manual refresh function for "Check again" button
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: scoreMismatchKeys.partnerStatus(roundId!, userId!) });
  }, [queryClient, roundId, userId]);

  return { ...query, refresh };
}

// Mutation to resolve a mismatch
export function useResolveMismatch() {
  const queryClient = useQueryClient();
  const { updateLocalScore } = useScorecardStore(); // For local SQLite update

  return useMutation({
    mutationFn: async ({ mismatchId, resolvedScore, resolvedBy, roundId, playerId, holeNumber }: {
      mismatchId: string;
      resolvedScore: number;
      resolvedBy: string;
      roundId: string;
      playerId: string;
      holeNumber: number;
    }) => {
      // Check if already resolved (first-write-wins)
      const existing = await getMismatch(mismatchId);
      if (existing?.status === 'resolved') {
        return { alreadyResolved: true, resolvedBy: existing.resolved_by };
      }

      await resolveMismatch(mismatchId, resolvedScore, resolvedBy);
      // Update remote scorecard
      await applyResolvedScoreToScorecard(roundId, playerId, holeNumber, resolvedScore);
      // Update local SQLite to prevent drift
      await updateLocalScore(roundId, playerId, holeNumber, resolvedScore);

      return { alreadyResolved: false };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: scoreMismatchKeys.mismatches(variables.roundId) });
      queryClient.invalidateQueries({ queryKey: scoreMismatchKeys.readiness(variables.roundId, variables.resolvedBy) });
    },
  });
}
```

Follow patterns from `src/hooks/useScoringPairs.ts` for query structure.
```

**Deliverables:**
- [x] Query hooks implemented (usePendingMismatches, useSubmissionReadiness, usePartnerStatus, useSubmissionStatus)
- [x] Manual refresh function for partner status
- [x] Mutation hook with scorecard update (useResolveMismatch)
- [x] Proper cache invalidation
- [x] Helper hook useMismatchResolutionFlow for combined data access
- [x] Query keys added to centralized queryKeys.ts

**Dependencies:** Phase 3 complete
**Notes:** Polling with manual refresh is simpler than realtime for this once-per-round flow

---

## Phase 5: Submission Validation

### Step 5.1: Update useScoreSubmission hook
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts`:

1. Add new parameters to the hook interface:
```typescript
interface UseScoreSubmissionParams {
  // ... existing params
  scoringPairsEnabled?: boolean;  // NEW
  currentUserId?: string;         // NEW
}
```

2. Import service functions:
```typescript
import { checkSubmissionReadiness, createMismatchRecords, getPendingMismatches } from '@/services/scoreMismatch';
```

3. Update handleSubmit (around line 106):
```typescript
const handleSubmit = useCallback(async () => {
  // Existing incomplete validation
  const incomplete = validateScores();
  if (incomplete.length > 0) { ... }

  // NEW: Check submission readiness when scoring pairs enabled
  if (scoringPairsEnabled && currentUserId) {
    const readiness = await checkSubmissionReadiness(roundId, currentUserId, true);

    if (!readiness.canSubmit) {
      if (readiness.reason === 'waiting_for_partner') {
        // Show waiting dialog with refresh option
        // Progress shown in holes (user-friendly) not entries
        const holesComplete = Math.floor((readiness.partnerProgress?.completed ?? 0) / 2);
        const totalHoles = Math.floor((readiness.partnerProgress?.total ?? 36) / 2);
        Alert.alert(
          'Waiting for Partner',
          `${readiness.partnerName} hasn't finished entering scores yet.\n\nProgress: ${holesComplete}/${totalHoles} holes completed.`,
          [
            { text: 'Check Again', onPress: () => refetchPartnerStatus() },
            { text: 'OK', style: 'cancel' },
          ]
        );
        return;
      }

      if (readiness.reason === 'unresolved_mismatches') {
        // Mismatches already exist, show modal
        setShowMismatchModal(true);
        return;
      }
    }

    // Partner complete - now detect and create any mismatches
    await createMismatchRecords(roundId);
    const mismatches = await getPendingMismatches(roundId);

    if (mismatches.length > 0) {
      setShowMismatchModal(true);
      return;
    }
  }

  // Continue with existing submission flow...
}, [...]);
```

4. Add state for mismatch modal:
```typescript
const [showMismatchModal, setShowMismatchModal] = useState(false);
```

5. Return the new state in the hook result.

Reference current implementation at lines 39-263.
```

4. Add bypass timer logic:
```typescript
// Check if bypass is available (30 mins after first submit attempt with complete data)
const { data: submissionStatus } = useSubmissionStatus(roundId, currentUserId);

if (submissionStatus?.bypass_available_at) {
  const bypassAvailable = new Date(submissionStatus.bypass_available_at) <= new Date();
  if (bypassAvailable) {
    // Show "Submit without verification" button
    setBypassAvailable(true);
  }
}
```

5. Handle bypass submission:
```typescript
const handleBypassSubmit = async () => {
  // Mark as bypassed
  await markSubmissionBypassed(roundId, currentUserId);

  // Use current user's scores as source of truth for ALL holes
  await applyBypassScores(roundId, currentUserId);

  // Continue with normal submission (will be flagged)
  await submitScorecard({ bypassed: true });
};
```

6. Send notification when bypass timer starts (use existing push notification service):
```typescript
// When both have complete data but partner hasn't submitted
// Use sendPushToUsers from src/services/notifications/pushService.ts
await sendPushToUsers([currentUserId, partnerId], {
  title: 'Scores Ready for Verification',
  body: 'Both players have completed scoring. Verification bypass available in 30 minutes.',
  data: { type: 'score_verification', roundId },
});
```

Reference current implementation at lines 39-263.
```

**Deliverables:**
- [x] Hook accepts scoring pairs params (scoringPairsEnabled, currentUserId, holeCount)
- [x] Submission readiness check integrated
- [x] Mismatch modal state added (showMismatchModal, setShowMismatchModal)
- [x] Appropriate alerts shown with "Check Again" option
- [x] 30-minute bypass timer logic implemented (bypassAvailable, bypassAvailableAt)
- [x] Bypass submission handler that uses submitting player's scores as truth (handleBypassSubmit)
- [ ] Push notification sent to both players when bypass timer starts (TODO: requires server-side Edge Function)
- [x] Partner waiting state added (isWaitingForPartner, partnerName, partnerProgress, refreshPartnerStatus)
- [x] getScoringPartner exported from scoringPairs service

**Dependencies:** Phase 4 complete
**Notes:** This is where the "wait for partner" flow is enforced. 30-minute bypass prevents deadlock if partner unavailable. Bypassing player's scores become authoritative.

---

### Step 5.2: Add bypass flag to leaderboard
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update leaderboard components to show bypass indicator:

1. In the leaderboard component (likely `src/components/leaderboard/` or similar):

2. Check if scorecard was submitted with bypass:
```typescript
const wasBypassed = scorecard.bypassed === true;
```

3. Show visual indicator next to player name/score:
- Icon: ⚠️ or warning icon
- Tooltip/press: "Submitted without partner verification"

4. Consider adding a legend at bottom of leaderboard explaining the indicator.
```

**Deliverables:**
- [x] Bypass indicator shown on leaderboard (warning icon in LeaderboardRow)
- [x] Tooltip/explanation for bypassed submissions (React Native Paper Tooltip)
- [x] Legend or help text explaining the indicator (shown at bottom when bypassed entries exist)

**Completed:**
- Added `bypassed` field to BaseLeaderboardEntry type in useRoundLeaderboard.ts
- Updated useRoundLeaderboard to fetch bypassed status from scorecards table
- Added warning icon (IconAlertTriangle) with Tooltip in LeaderboardRow component
- Added legend component in RoundLeaderboard that appears when entries have bypassed scores
- Updated test helper functions to include bypassed field

**Dependencies:** Step 5.1
**Notes:** Users should know which scores were verified vs bypassed for transparency.

---

## Phase 6: UI Components

### Step 6.1: Create MismatchResolutionModal component
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create new file `src/components/scoring/MismatchResolutionModal.tsx`:

A modal for resolving all mismatches inline (no separate screen needed):

Props:
- visible: boolean
- mismatches: ScoreMismatch[]
- currentUserId: string
- partnerName: string
- onResolve: (mismatchId: string, score: number, roundId: string, playerId: string, holeNumber: number) => Promise<{ alreadyResolved: boolean }>
- onClose: () => void
- isOnline: boolean  // For offline state

UI Design:
- Modal with backdrop
- Header: "Resolve Score Differences" with close button
- Subheader: "You and [partnerName] recorded different scores for these holes:"
- Progress: "X of Y resolved"
- ScrollView list of mismatches:
  - Each item shows:
    - "Hole [X] - [Player Name]"
    - Two buttons side by side: "Your Score: [X]" | "[Partner]'s Score: [Y]"
    - Resolved items show checkmark and selected value
    - If resolved by partner: Show "Resolved by [partnerName]: [score]" (no buttons)
- Footer: "Done" button (disabled until all resolved)
- If !isOnline: Show message "You must be online to resolve score differences" and disable buttons
- Loading spinner while resolution is in progress

Handle "already resolved" response:
- If onResolve returns { alreadyResolved: true }, refetch mismatches and show updated state
- Toast: "Already resolved by [partner]"

Use React Native Paper Modal or custom modal following existing patterns.
Use useThemeColors() for theming.
```

**Deliverables:**
- [x] Modal component created
- [x] Handles multiple mismatches in scrollable list
- [x] Progress tracking
- [x] Offline state handled (disabled with message)
- [x] Done button closes modal when all resolved

**Completed:**
- Created `src/components/scoring/MismatchResolutionModal.tsx` with full implementation
- Added export to `src/components/scoring/index.ts`
- Features: Progress bar, optimistic UI updates, first-write-wins handling, accessibility labels

**Dependencies:** Phase 5 complete
**Notes:** Single modal handles all mismatches - no need for separate screen

---

### Step 6.2: Integrate into ReviewScorecardScreen
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/screens/scoring/ReviewScorecardScreen/index.tsx`:

1. Import new components and hooks:
```typescript
import { MismatchResolutionModal } from '@/components/scoring/MismatchResolutionModal';
import { usePendingMismatches, useResolveMismatch, usePartnerStatus } from '@/hooks/useScoreMismatch';
import { useNetInfo } from '@react-native-community/netinfo';
```

2. Use the hooks:
```typescript
const { data: mismatches } = usePendingMismatches(roundId);
const { mutate: resolveMismatch } = useResolveMismatch();
const { data: partnerStatus } = usePartnerStatus(roundId, currentUser?.id);
const netInfo = useNetInfo();
```

3. Get showMismatchModal state from useScoreSubmission hook

4. Handle resolution:
```typescript
const handleResolveMismatch = (mismatchId: string, score: number, roundId: string, playerId: string, holeNumber: number) => {
  resolveMismatch({
    mismatchId,
    resolvedScore: score,
    resolvedBy: currentUser.id,
    roundId,
    playerId,
    holeNumber,
  });
};
```

5. Render modal:
```typescript
<MismatchResolutionModal
  visible={showMismatchModal}
  mismatches={mismatches ?? []}
  currentUserId={currentUser?.id}
  partnerName={partnerStatus?.partnerName ?? 'Partner'}
  onResolve={handleResolveMismatch}
  onClose={() => setShowMismatchModal(false)}
  isOnline={netInfo.isConnected ?? false}
/>
```

6. Optionally show partner waiting status in UI:
```typescript
{scoringPairsEnabled && partnerStatus && !partnerStatus.complete && (
  <Text style={styles.waitingText}>
    Waiting for {partnerStatus.partnerName} ({partnerStatus.progress.completed}/36)
  </Text>
)}
```
```

**Deliverables:**
- [x] Modal integrated
- [x] Resolution handler connected
- [x] Partner status shown (optional)
- [x] Offline state passed to modal

**Completed:**
- Updated `src/screens/scoring/ReviewScorecardScreen/index.tsx` to import and render MismatchResolutionModal
- Added hooks: usePendingMismatches, useResolveMismatch, usePartnerStatus, useRoundScoringPairs, useRoundDetails
- Integrated with useScoreSubmission hook's showMismatchModal/setShowMismatchModal state
- Created handleResolveMismatch callback for mismatch resolution
- Passes isOnline and isResolving states to modal

**Dependencies:** Step 6.1
**Notes:** Simple integration - modal handles everything

---

### Step 6.3: Add mismatch indicators to scorecard table (DEFERRED)
**Status:** 🔮 Future Enhancement
**Type:** Custom
**Command:** N/A

**Prompt:**
```
DEFERRED: This is a polish item. The modal already lists all mismatches clearly.
Consider implementing in a follow-up if users request it.

Update the scorecard table component to show mismatch indicators:

1. Find the scorecard table component (likely in ReviewScorecardScreen or a subcomponent)

2. For each hole cell, check if there's a pending mismatch:
```typescript
const hasMismatch = mismatches?.some(
  m => m.player_id === playerId && m.hole_number === holeNumber && m.status === 'pending'
);
```

3. If mismatch exists, add visual indicator:
- Warning background color (colors.warning with low opacity)
- Small warning icon in corner
- OnPress opens the mismatch modal

This helps users quickly identify which holes need attention.
```

**Deliverables:**
- [ ] Mismatch cells highlighted
- [ ] Warning icons shown
- [ ] Tap opens mismatch modal

**Dependencies:** Step 6.2
**Notes:** DEFERRED - Modal provides sufficient UX. Revisit based on user feedback.

---

### Step 6.4: Update score entry screen for self vs partner
**Status:** ✅ Complete (2026-01-20)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update `src/screens/scoring/ScorecardEntryScreen/` to visually distinguish self-scores from partner-scores:

1. Use the `isOwnScore` helper from useRoundScoringPairs:
```typescript
const { playersToScore, isOwnScore } = useRoundScoringPairs(...);
```

2. In the player score cards, add visual distinction:
- Self score: Regular styling with "Your Score" label above
- Partner score: Slightly muted styling with "[Partner Name]'s Score" label

3. Pass scoredBy (current user ID) to setPlayerScore:
```typescript
await setPlayerScore(playerId, currentHole, strokes, currentUser.id);
```

This ensures attribution is tracked from the moment of entry.
```

**Deliverables:**
- [x] Self vs partner visual distinction
- [x] scoredBy passed on score entry
- [x] Labels updated

**Completed:**
- Added `isOwnScore` prop to `PlayerScoreCard` component (src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx)
- Added `isOwnScore` prop to `StrokePlayScoreCard` component (src/components/scorecard/StrokePlayScoreCard/StrokePlayScoreCard.tsx)
- Both components now display "YOUR SCORE" (primary color) or "PARTNER'S SCORE" (secondary color) label above the player name when scoring pairs are enabled
- Updated `ScorecardScoreContent` to pass `isOwnScore` to both PlayerScoreCard and StrokePlayScoreCard
- Updated `ScorecardEntryScreen` to pass `user?.id` as `scoredBy` parameter to `setPlayerScore`
- The `scoredBy` value is logged and saved to both SQLite (offline) and `score_entries` table (for mismatch detection)

**Dependencies:** Step 6.2
**Notes:** UX improvement for clarity - users can now clearly see which card is for their own score vs their partner's score

---

## Critical Files

### To Create
| File | Description |
|------|-------------|
| `supabase/migrations/20250126000000_score_entries.sql` | Database migration for new tables (score_entries, score_mismatches, score_submission_status) |
| `src/services/scoreMismatch/scoreMismatchService.ts` | Combined score entries + mismatch service |
| `src/hooks/useScoreMismatch.ts` | React Query hooks with realtime |
| `src/components/scoring/MismatchResolutionModal.tsx` | Resolution modal |

### To Modify
| File | Changes |
|------|---------|
| `src/services/scoringPairs/scoringPairsService.ts` | Add self to players, add getScoringPartner |
| `src/hooks/scorecard/useRoundScoringPairs.ts` | Return self + partner, add helpers |
| `src/types/database/base.ts` | Add scoredBy to HoleScore |
| `src/store/scorecardStore.ts` | Track attribution, save to score_entries, add `updateLocalScore` |
| `src/services/offline/dao/HoleScoreDAO.ts` | Add scored_by column |
| `src/services/offline/sync/scorecardSyncService.ts` | Sync offline scores to score_entries |
| `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreSubmission.ts` | Add readiness check, 30-min bypass timer |
| `src/components/leaderboard/*.tsx` | Add bypass indicator for unverified submissions |
| `src/screens/scoring/ReviewScorecardScreen/index.tsx` | Integrate mismatch modal |

---

## Verification

### Automated Tests
- [x] Unit test: `detectMismatches` correctly identifies differing scores
- [x] Unit test: `resolveMismatch` updates mismatch AND scorecard (remote + local)
- [x] Unit test: `checkSubmissionReadiness` returns correct states
- [x] Unit test: `isScorerComplete` uses dynamic hole count (9 and 18)
- [ ] Integration test: End-to-end submission with mismatches (deferred - covered by manual testing)
- [ ] Integration test: Offline sync populates score_entries (deferred - covered by manual testing)

**Test File:** `src/__tests__/services/scoreMismatch/scoreMismatchService.test.ts` (55 passing tests)

### Manual Testing
- [ ] Create round with scoring pairs enabled
- [ ] Player A scores A=4, B=5 on hole 10
- [ ] Player B scores B=5, A=5 on hole 10
- [ ] Verify Player A can't submit until B finishes (waiting dialog with progress in holes)
- [ ] Verify "Check Again" button refreshes partner status
- [ ] Verify mismatch detected for Player A hole 10 (A recorded 4, B recorded 5)
- [ ] Verify modal shows "Your Score: 4" vs "Partner's Score: 5"
- [ ] Verify tapping "Accept 5" resolves the mismatch
- [ ] Verify final scorecard shows resolved score (5) in both remote DB and local SQLite
- [ ] Verify submission allowed after all resolved
- [ ] Test offline: Verify modal shows disabled state with message
- [ ] Test race condition: Both players resolve same mismatch - second sees "Already resolved by [partner]"
- [ ] Test 9-hole round: Verify expected entries = 18 (not 36)
- [ ] Test bypass flow: After 30 mins, "Submit without verification" button appears
- [ ] Test bypass: Submitting player's scores become source of truth
- [ ] Test bypass notification: Both players receive push notification when bypass timer starts
- [ ] Test bypass flag: Bypassed submission shows indicator on leaderboard
- [ ] Test offline sync: Scores entered offline appear in score_entries after reconnect
- [ ] Test no mismatches: All scores match - submission proceeds without modal (log verification occurred)
