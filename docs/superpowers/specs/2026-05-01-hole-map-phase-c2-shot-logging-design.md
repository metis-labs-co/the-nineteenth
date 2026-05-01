# Hole Map Phase C2 — Shot Logging + Trail (Premium tier)

**Status:** Draft
**Date:** 2026-05-01
**Owner:** Sam
**Type:** Feature spec — depends on Phase A + Phase B

---

## 1. Goal & non-goals

### Goal

Premium-tier users playing a **solo round** can tap a floating action button to log each shot's position via current GPS. Each tap inserts a new `shot_log` row scoped to `(round_id, hole_number, player_id, sequence)`. The hole map view renders a numbered, persisted shot trail that the user can edit during play (delete a shot, drag to reposition) and view read-only after the round.

### Non-goals (v1)

- **Multi-player rounds.** Feature is hidden when the round has more than one `RoundPlayer`. Self-only data model already locked in Phase B brainstorm.
- **Per-shot club / shot-type / outcome.** Schema reserves nullable columns for v2 but neither UI nor write path uses them.
- **Auto shot detection.** No swing/accelerometer integration. Manual taps only.
- **Aggregate analytics.** Yards-per-club, dispersion, GIR% etc. become possible once data exists, but the analytics screens are out of scope.
- **Score reconciliation.** Mismatches between shots logged and strokes entered show a soft warning, never block submission.

---

## 2. Eligibility gate

The toggle, FAB, and editing affordances are visible only when **all** of:

- `useMapTier()` returns `'premium'`
- The round has exactly one `RoundPlayer` AND that player is the authenticated user
- The round-level `trackShots` flag is `true`

If any gate fails: the toggle does not render in the scorecard header, the FAB does not render, and the hole map renders the existing Phase B view (no shot affordances). Existing shot data on the round (if any from a prior session) still renders read-only on the hole map for premium users — a useful "I logged shots last time and now I'm not premium" graceful-degradation case.

A new hook `useShotTrackingEligibility(roundId)` encapsulates the gate logic and returns `{ eligible: boolean, reason?: 'not-premium' | 'multi-player' | 'not-current-user' }` for diagnostic UI if needed.

---

## 3. UX flow

### 3.1 Round entry — opting in

- A new toggle row appears on the scorecard entry top bar for solo rounds when the user is on the premium tier.
- Label: "Track my shots". Subtext: "Log shot positions and see them on the hole map."
- Default `false`. Per-round only — does not persist across rounds.
- Once flipped on, the FAB appears immediately and remains across all 18 holes for that round.

### 3.2 Logging a shot (FAB)

- `LogShotFAB` is rendered bottom-right of the scorecard entry screen, above the safe area, fixed position.
- Single tap → reads current GPS via `useUserLocation()` → calls `useLogShot.mutate({ roundId, holeNumber, latitude, longitude })`.
- Mutation computes the next `sequence` for the `(round_id, hole_number, player_id)` triple and inserts.
- A 5-second `LogShotUndoToast` appears: copy `Shot 3 logged · Undo`. Tap "Undo" → `useDeleteShot.mutate(shotId)` and toast dismisses.
- If GPS lock is missing (no location yet), the FAB is disabled with a subtle visual cue.

### 3.3 Viewing the trail (hole map)

- `HoleMapScreen` extended with a `mode: 'live' | 'review'` prop. Live = the existing entry from a `'in_progress'` round; review = entered from a completed round detail view.
- New `ShotTrail` component renders inside the existing `<MapView>` children:
  - One numbered `<Marker>` per `shot_log` entry.
  - A `<Polyline>` connecting them sequentially (shot 1 → 2 → ... → N).
  - A final segment from the last shot to the current target (the green POI selected in Phase B's state, or `markers.pin` if no target chosen).
- Markers and polyline use a new colour role distinct from the existing measurement-line variants — recommend `colors.primary` for the trail polyline and a numbered, contrast-on-white circle for each marker.
- The Phase A/B measurement lines (`gps-to-pin`, `gps-to-tap`, `tap-to-pin`) still work — measurement and shot-trail coexist on the map.

### 3.4 Editing a shot (live mode only)

- Tapping a shot marker on the map opens `ShotMarkerActionSheet` — a bottom sheet with two actions:
  - **Delete** → `useDeleteShot.mutate(shotId)`, sheet dismisses.
  - **Move on map** → enters a per-marker drag mode. The selected marker becomes draggable; map taps no longer drop measurement points until the user taps "Save" (or cancels). On save → `useUpdateShot.mutate({ shotId, latitude, longitude })`.
- Sequence numbers do **not** auto-renumber when a shot is deleted. The hole's shots are renumbered server-side via a `BEFORE INSERT` / `AFTER DELETE` trigger that compacts the sequence within the (round_id, hole_number, player_id) group. (Alternative if the trigger feels heavy: renumber client-side post-delete and ship a `useRenumberShots()` mutation.)

### 3.5 Score / shot mismatch warning

- The score row for a hole shows a soft inline warning when `shots.length !== score`. Format: `Logged 4 shots · entered 5 strokes`.
- Tappable "Add shot" link in the warning navigates to the hole map in live mode and surfaces the FAB highlight.
- The warning is purely advisory. Score submission is never blocked.

### 3.6 Post-round read-only

- The completed-round detail screen (existing) gets a "View shot map" entry that opens `HoleMapScreen` in `mode='review'`.
- Review mode hides: the FAB, the marker action sheet, and the drag affordance.
- Review mode shows: the shot trail, all measurement lines (still tap-to-measure-able for distance preview), and POI markers per the user's tier.
- The `enableHoleMap` feature flag still gates entry to the screen.

### 3.7 Per-hole reset

- Shot sequence is per-`(round_id, hole_number, player_id)`. Navigating to the next hole on the scorecard starts a new sequence at 1 for that hole; previous holes' shots remain persisted.
- The FAB toast resets per shot, not per hole. No special hole-change handling.

---

## 4. Data model

### 4.1 New table

```sql
CREATE TABLE shot_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number  SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  player_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence     SMALLINT NOT NULL CHECK (sequence > 0),
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  location     GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS
                 (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
  -- Reserved nullable columns for v2:
  club_used    TEXT,
  shot_type    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, hole_number, player_id, sequence)
);

CREATE INDEX shot_log_round_hole_idx
  ON shot_log (round_id, hole_number, player_id, sequence);

CREATE INDEX shot_log_player_round_idx
  ON shot_log (player_id, round_id);
```

### 4.2 RLS

```sql
ALTER TABLE shot_log ENABLE ROW LEVEL SECURITY;

-- Read: own shots, OR any participant on the same round (matches scorecards policy)
CREATE POLICY shot_log_select ON shot_log FOR SELECT
USING (
  auth.uid() = player_id
  OR EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = shot_log.round_id AND rp.user_id = auth.uid()
  )
);

-- Write: only own shots, only on in-progress rounds
CREATE POLICY shot_log_insert ON shot_log FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in_progress'
  )
);

CREATE POLICY shot_log_update ON shot_log FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in_progress'
  )
);

CREATE POLICY shot_log_delete ON shot_log FOR DELETE
USING (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in_progress'
  )
);
```

### 4.3 Sequence compaction trigger

```sql
CREATE OR REPLACE FUNCTION compact_shot_log_sequence()
RETURNS TRIGGER AS $$
BEGIN
  -- After deletion, renumber remaining shots in the (round, hole, player) group
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sequence) AS new_seq
    FROM shot_log
    WHERE round_id = OLD.round_id
      AND hole_number = OLD.hole_number
      AND player_id = OLD.player_id
  )
  UPDATE shot_log SET sequence = ranked.new_seq
  FROM ranked
  WHERE shot_log.id = ranked.id AND shot_log.sequence != ranked.new_seq;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shot_log_compact_after_delete
  AFTER DELETE ON shot_log
  FOR EACH ROW EXECUTE FUNCTION compact_shot_log_sequence();
```

---

## 5. Architecture

### 5.1 New hooks

| Hook | Purpose |
|------|---------|
| `useShotLog(roundId, holeNumber)` | TanStack query → `ShotLogEntry[]` for the hole, sorted by sequence. Cache key: `['shotLog', roundId, holeNumber]`. |
| `useLogShot()` | Mutation: `(roundId, holeNumber, lat, lng)` → INSERT, computes next sequence client-side, optimistically appends to cache. |
| `useUpdateShot()` | Mutation: `(shotId, { latitude, longitude })` → UPDATE, optimistic. |
| `useDeleteShot()` | Mutation: `shotId` → DELETE, optimistic; relies on server trigger for sequence compaction. |
| `useShotTrackingEligibility(roundId)` | Returns `{ eligible, reason? }`. Reads tier, round players, current user. |
| `useTrackShotsToggle(roundId)` | Returns `[trackShots, setTrackShots]`. Backed by Zustand slice keyed by `roundId`. |

### 5.2 New components

| Component | Responsibility |
|-----------|----------------|
| `LogShotFAB` | Bottom-right floating button, gated. Calls `useLogShot()`. Disabled when no GPS. |
| `LogShotUndoToast` | Reads `shotLoggingUiStore`. Auto-dismisses after 5s. Tap "Undo" → delete most recent shot. |
| `TrackShotsToggle` | Toggle row on scorecard entry header. Renders only when `useShotTrackingEligibility` reports eligible without `reason='not-premium'`. |
| `ShotTrail` | Renders shot markers + connecting polyline. Final segment to selected target if provided. |
| `ShotMarkerActionSheet` | Bottom sheet for marker actions. Delete + Move-on-map. |
| `ShotMismatchWarning` | Tiny inline warning row inside the score row when shots ≠ strokes. Tappable to navigate to map. |

### 5.3 Modified components

- `HoleMapScreen` — accepts `mode: 'live' | 'review'` prop. Reads shot log via `useShotLog()`. Renders `ShotTrail` in both modes. Renders `LogShotFAB` + marker editing only in `live`.
- `ScorecardEntryScreen` — embeds `TrackShotsToggle`, `LogShotFAB`, `LogShotUndoToast`, and (per-hole) the `ShotMismatchWarning`.
- `useHoleMapMarkers` — unchanged. Shot data is queried separately via `useShotLog` since it's per-hole and high-churn.

### 5.4 Client state

- `shotLoggingUiStore` (new Zustand slice) — `{ undoToastVisible, lastShotId, dismissAt }`. The FAB writes; the toast reads.
- Per-round `trackShots` flag — Zustand slice `shotLoggingPrefStore` keyed by `roundId`. Cleared when round status transitions to completed (via subscription to round status, or simply lazy expiry).

### 5.5 Navigation

- `RootStackParamList.HoleMap` route adds optional `mode?: 'live' | 'review'`. Default `'live'` for backward compatibility with the Phase A entry from the distance badge.
- Completed-round detail screens add a "View shot map" CTA that navigates with `mode: 'review'`.

---

## 6. Offline support

`shot_log` mutations follow the same offline-aware pattern as `scorecards`:

- Inserts/updates/deletes write to a local SQLite mirror first (via the existing offline persistence layer used by `scoreUpdateSlice`).
- A background sync replays queued mutations to Supabase when network returns.
- Read queries (`useShotLog`) hit the local mirror first, then refresh from server.

The shot trail is fully usable offline — markers render from local state.

---

## 7. Tests

### 7.1 Unit

- `useShotLog`: query key shape; sort order is sequence asc.
- `useLogShot`: optimistic append computes next sequence as `max(existing.sequence) + 1` when cache has data; falls back to `1` for empty.
- `useShotTrackingEligibility`: decision matrix — premium × player count × auth user vs other.
- `compact_shot_log_sequence` trigger (integration test against local Supabase): deleting middle shot renumbers remaining.
- RLS: insert on a round the user isn't a participant of fails.

### 7.2 Component

- `LogShotFAB`: not rendered when ineligible; rendered + tappable when eligible; disabled when no GPS lock.
- `LogShotUndoToast`: shows after a shot is logged; auto-dismisses; tap "Undo" calls `useDeleteShot`.
- `ShotTrail`: renders N markers + N-1 polyline segments; with target, adds final segment.
- `ShotMarkerActionSheet`: invokes delete and move callbacks.
- `TrackShotsToggle`: renders only when eligible per the tier check; toggling sets the per-round flag.
- `ShotMismatchWarning`: appears when shots ≠ strokes; absent when equal.

### 7.3 Screen

- `HoleMapScreen` `mode='live'`: FAB present; trail rendered; tap-marker triggers action sheet.
- `HoleMapScreen` `mode='review'`: no FAB; trail rendered; marker tap is a no-op or only opens info, not edit sheet.
- `ScorecardEntryScreen`: with toggle on, FAB visible; toast surfaces post-log; mismatch warning appears.

### 7.4 Manual

- Real-device GPS lock at a known course; log 5 shots walking the hole; verify trail visually correct.
- Airplane mode after first shot; log 4 more; reconnect; verify all 5 sync.
- Open completed round → verify trail in review mode, no edit affordances.

---

## 8. Open questions

1. **Where the per-round `trackShots` flag lives.** Options:
   - Client-side Zustand keyed by `roundId` (default in this spec). Fast to ship, no migration.
   - Column on `rounds` table. More correct (handles multi-device for the same auth user; persists if user closes the app and reopens). Requires a small migration.

   Recommendation: ship client-side first; add server column in v2 if multi-device sync becomes a real complaint.
2. **Sequence compaction strategy.** Server trigger (default in this spec) vs client-side post-delete renumber. Trigger is cleaner but binds client and DB. Decide during implementation if RLS interactions get tricky.
3. **`mode='review'` measurement preview.** Should tap-to-measure work in review mode? Default in this spec: yes — viewing a completed round and pulling up "how far was that approach shot?" is genuinely useful. Implement as no-op for any write paths but keep the measurement state machine.

---

## 9. Considered alternatives

- **Multi-player shot logging.** Rejected per Phase B brainstorm. Self-only is the universal pattern (Arccos, 18Birdies, GolfShot all do this).
- **Auto-detect shots from accelerometer / motion.** Rejected — requires significant battery/permission work and doesn't fit the social-golf product positioning.
- **Map-based shot placement (tap on map at ball's location).** Rejected — too much friction mid-round; auto-GPS + drag-to-correct on the map covers the same use case with one-third the taps.
- **Score-blocking on shot mismatch.** Rejected — would frustrate users who only want partial logging or want to skip a hole.

---

## 10. Risks

- **GPS drift on dense urban courses.** Buildings/trees can cause 10–20m drift. Mitigation: drag-to-correct affordance on the map; toast undo for immediate mis-taps.
- **Battery drain.** GPS at 10s interval (existing behaviour) plus map view plus shot taps doesn't add much. No new background work. Verify under 18-hole sustained use.
- **Storage growth.** ~80 shots per round × N rounds × M users — at scale this gets meaningful but not for v1. Index strategy (`shot_log_round_hole_idx`, `shot_log_player_round_idx`) covers the access patterns.
- **Solo-round eligibility false negatives.** If a multi-player round somehow has only one `RoundPlayer` row temporarily during creation, the FAB might briefly appear. Mitigation: gate also reads `rounds.status === 'in_progress'` so the window is narrow.

---

## 11. Phased rollout

- Land behind the existing `enableHoleMap` flag (Phase A). The Phase A flag continues to gate the entire hole-map system; Phase C2 only matters when Phase A is enabled.
- No separate `enableShotLogging` flag — shot logging is always-on for premium users with the tier eligibility gate. The per-round `trackShots` toggle is the user-facing on/off.

---

## 12. File touch list

### New

- `supabase/migrations/<ts>_create_shot_log.sql` — table, indexes, RLS, trigger
- `src/types/database/shotLog.types.ts` — `ShotLogEntry` interface mirroring the schema
- `src/hooks/shots/queries.ts` — `useShotLog`
- `src/hooks/shots/mutations.ts` — `useLogShot`, `useUpdateShot`, `useDeleteShot`
- `src/hooks/shots/eligibility.ts` — `useShotTrackingEligibility`
- `src/hooks/shots/index.ts` — barrel
- `src/store/shotLoggingUiStore.ts` — Zustand slice for the toast
- `src/store/shotLoggingPrefStore.ts` — Zustand slice for the per-round track-shots flag
- `src/components/scorecard/HoleMap/ShotTrail.tsx`
- `src/components/scorecard/HoleMap/ShotMarkerActionSheet.tsx`
- `src/components/scorecard/ShotLogging/LogShotFAB.tsx`
- `src/components/scorecard/ShotLogging/LogShotUndoToast.tsx`
- `src/components/scorecard/ShotLogging/TrackShotsToggle.tsx`
- `src/components/scorecard/ShotLogging/ShotMismatchWarning.tsx`
- `src/components/scorecard/ShotLogging/index.ts` — barrel

### Modified

- `src/screens/scoring/HoleMapScreen.tsx` — `mode` prop, conditional rendering of FAB / action sheet, render `ShotTrail`
- `src/screens/scoring/ScorecardEntryScreen.tsx` (or its components dir) — embed toggle, FAB, toast, mismatch warning
- `src/navigation/types.ts` — add `mode?: 'live' | 'review'` to `HoleMap` route
- `src/components/scorecard/HoleMap/index.ts` — export `ShotTrail`, `ShotMarkerActionSheet`
- `docs/guides/SUBSCRIPTION_TIERS.md` — clarify shot logging is solo-rounds only

### Tests

- `src/__tests__/hooks/shots/useShotLog.test.ts`
- `src/__tests__/hooks/shots/mutations.test.ts`
- `src/__tests__/hooks/shots/eligibility.test.ts`
- `src/__tests__/components/scorecard/HoleMap/ShotTrail.test.tsx`
- `src/__tests__/components/scorecard/HoleMap/ShotMarkerActionSheet.test.tsx`
- `src/__tests__/components/scorecard/ShotLogging/LogShotFAB.test.tsx`
- `src/__tests__/components/scorecard/ShotLogging/LogShotUndoToast.test.tsx`
- `src/__tests__/components/scorecard/ShotLogging/TrackShotsToggle.test.tsx`
- `src/__tests__/components/scorecard/ShotLogging/ShotMismatchWarning.test.tsx`
- `src/__tests__/screens/HoleMapScreen.review.test.tsx` (new file for review mode)
