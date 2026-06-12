# Scheduled Social Rounds + Format-First Wizard — Design

**Date:** 2026-06-12
**Status:** Approved (pending spec review)

## Goal

Two related changes to standalone (non-competition) rounds:

- **A. Format-first wizard** — the create-round wizard asks for game format first, sourced from the competition preset catalog (including team formats, tier-gated), and the chosen format drives a required player count that must be met before the wizard can complete.
- **B. Schedule a round with friends** — the same wizard can create a future round with a date and tee time, inviting friends who accept or decline; any accepted player can start the round on the day.

A ships first; B builds on A's player-count validation.

## Background (current state)

- Standalone rounds exist with a `CreateRoundBottomSheet` wizard: Course → Nine Type → Match Type → Partners → Scoring Setup / Your Setup / Ball Count (`src/screens/rounds/CreateRoundBottomSheet/`).
- The wizard's format list is its own `MATCH_TYPES` array (`CreateRoundBottomSheet/types.ts`), with team formats flagged `comingSoon`. Competition rounds use the richer preset catalog `src/constants/roundPresets.ts` (presets carry `game_type`, `is_team_round`, `team_format`, `round_format`, `sub_match_size`, `rules_override`, and a `tier`).
- `rounds.date`, `rounds.tee_time`, and round status `'upcoming'` already exist in the schema but are never populated by the wizard. `RoundListScreen` already renders an "Upcoming Rounds" section.
- A `social_round_invitation` notification type exists (`src/types/database/enums.ts`) but is unused.
- Friends system (pending/accepted/blocked) is fully implemented (`src/hooks/friends/`).
- Round creation + navigation to scoring lives in `useStartNewRound` (`src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts`), routing to `Scorecard`, `MatchPlayScoring`, or `TeamMatchPlayScoring` by game type.

## Part A — Format-first wizard

### Step order

1. **Game Format** (was step 3 "Match Type", renamed)
2. **Course Selection** (unchanged)
3. **Nine Type** (unchanged)
4. **When** (new — see Part B; "Play now" is the default)
5. **Partners** (gains player-count validation)
6. **Scoring Setup / Your Setup / Ball Count** (existing conditional steps; play-now path only)

### Format catalog

- Replace the wizard's `MATCH_TYPES` array with the preset catalog from `roundPresets.ts` — one source of truth shared with competition rounds.
- Filter out presets that are competition-structural (e.g. knockout-style formats) and keep those that make sense for a social round: Individual Stableford / Stroke / Par / Match Play, Pairs Better Ball 2v2, Team Best Ball / Scramble / Shamble, and any future presets flagged as social-eligible.
- Tier gating comes from each preset's `tier` field via the existing `useSubscriptionStatus` / `useFeatureGate` hooks. Locked formats remain visible but blocked (graceful degradation, consistent with the rest of the app).
- Remove the `comingSoon` flags from team formats for standalone rounds; they become playable.

### Player-count metadata and validation

- Each preset gains explicit player-count metadata: `minPlayers` and `maxPlayers` (e.g. Scramble 4/4, Pairs Better Ball 2v2 4/4, Match Play 2/2, Individual formats 1/4).
- The Partners step shows the requirement ("Scramble needs 4 players — add 2 more") and disables Continue until `minPlayers` is met and `maxPlayers` is not exceeded.
- For scheduled rounds, invitees count toward the requirement at creation time (re-validated at start; see Part B).
- Downstream conditional steps derive from the format chosen at step 1: solo-only steps (Your Setup, Ball Count) only appear for individual formats with one player; team formation in Scoring Setup is pre-seeded from the format's team structure.

### Out of scope for A

No schema changes. Scoring screens already exist per game type and are reused as-is.

## Part B — Scheduled rounds with friends

### Wizard: the "When" step

- New step between Nine Type and Partners: **Play now** (default; identical behaviour to today) or pick a **date + tee time**.
- Choosing a future date switches the wizard to the scheduled path: it ends at the Partners step with a **"Schedule Round"** CTA instead of continuing to Scoring Setup. Side-game and scoring-pair configuration is deferred to start time because the group can change before the day.
- Scheduling creates the round with status `'upcoming'`, populated `date` and `tee_time`, and sends invitations.

### Data model

- `round_players` gains `invitation_status text not null default 'pending'` (`pending` | `accepted` | `declined`) and `responded_at timestamptz`. The organizer's own row is created as `accepted`.
- Migration backfills existing `round_players` rows to `accepted` (they were all created at round start).
- Invitations use the existing `social_round_invitation` notification type through the existing push pipeline (DB trigger → edge function), deep-linking to the scheduled round.

### RLS

- Invited players (a `round_players` row exists for them) can read the round and its players, and update `invitation_status`/`responded_at` on **their own** row only.
- **Accepted** players (not just the creator) can transition the round `upcoming → in-progress` and create scorecards for the group, matching the app's "score the whole group from one device" model.

### Lifecycle

- **Upcoming**: the round appears in the existing Upcoming Rounds section for the organizer and all invitees. A scheduled-round detail view shows course, date/tee time, format, and per-player invitation status, with Accept/Decline for invitees and Edit/Cancel for the organizer.
- **Organizer edits while upcoming**: change date/tee time (re-notifies accepted + pending invitees), invite additional/replacement friends, cancel (notifies everyone; round removed). If a decline drops the group below the format's `minPlayers`, the organizer is notified and prompted to invite a replacement.
- **Start (on/after the round date)**: organizer or any accepted player taps **Start Round**. If any invitees are still `pending`, the starter gets a per-person **keep or drop** prompt (kept players get scorecards; dropped players are removed). Declined players are excluded automatically. The format's player count is re-validated against the final group; if it no longer fits, the starter must adjust (drop to an individual-compatible format is not automatic — they pick players or change format). Then the existing Scoring Setup step runs (skins, wolf, scoring pairs, teams) and the round flows into the existing scoring screens exactly like a play-now round.

### Limits, offline, edge cases

- A scheduled round counts toward social-round tier limits at creation time.
- Creating a scheduled round and responding to invitations require connectivity (server-side invites/notifications). Starting and scoring on the day work offline as today, provided the round has synced to the starting device.
- Declines and cancellations generate notifications via existing notification categories.

## Testing

- **Unit**: step-list derivation (play-now vs scheduled, solo vs group, per-format), player-count validation (min/max, invitees counted), invitation status transitions, preset filtering and tier gating.
- **Integration**: invite → push → accept/decline → start → scorecard creation, including RLS checks that non-accepted users cannot start or score, and that invitees can only update their own row.
- **Manual**: keep/drop prompt, decline-below-minimum nudge, organizer edit/cancel notifications, offline start of a synced scheduled round.

## Build order

1. **A — Format-first wizard** (no schema change): adopt preset catalog, add player-count metadata, reorder steps, Partners validation, un-gate team formats.
2. **B — Scheduling** (schema migration + invites + lifecycle): When step, `invitation_status`, RLS, scheduled-round detail view, start-day flow.

Each part is independently shippable; B depends on A's player-count validation.
