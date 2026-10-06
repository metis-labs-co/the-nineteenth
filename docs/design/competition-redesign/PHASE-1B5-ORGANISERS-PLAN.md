# Phase 1B.5 — Multiple Organisers — Spec & Implementation Plan

> **For workers:** the big one. `organizer_id` is a single-owner assumption baked into **~21 tables'
> RLS, ~14 DB functions, and ~10 client derivations (238 gating sites)**, with **no shared choke-point**.
> The plan is **two phases: (A) consolidate to helpers with ZERO behaviour change, then (B) extend the
> helpers to co-organisers.** Do not attempt B without A — hand-editing 21 policies' logic is how this
> gets a security bug.

**Goal:** Let a competition have **co-organisers** alongside the single primary owner, with operational
parity but owner-only destructive/financial actions.

**Decisions (owner):**
- **Scope:** co-organisers have **operational parity** (rounds, players, settings, teams, scoring,
  skins/wolf). **Owner-only:** delete competition, transfer ownership, settle prize-pool payouts.
- **Add/remove:** **primary owner only, instant** (no accept flow) — pick an existing friend/player.
- **Notifications:** co-organisers **receive** organiser alerts; participant broadcasts retain their
  existing audiences. For organiser-initiated actions, attribute the actor from `auth.uid()` only when
  that user is an operational organiser. Automated/service-driven actions use a `NULL` actor and neutral
  copy — never fall back to `organizer_id`, which would falsely attribute the action to the owner.
- **Tier billing:** pinned to the **primary owner** for v1 (co-organised competitions do NOT count
  against a co-organiser's own tier limits; tier functions stay keyed on `organizer_id`).

## Representation

- **New `competition_organizers` join table** — `(competition_id, player_id, added_by, added_at)`,
  PK `(competition_id, player_id)`. FKs: `competition_id`→`competitions` and `player_id`→`players` are
  **`ON DELETE CASCADE`**; **`added_by` is nullable, `ON DELETE SET NULL`** (deleting the player who added
  a co-organiser must NOT delete the assignment — finding #4). Co-organisers are rows.
- **`competitions.organizer_id` stays the immutable primary owner** (delete/transfer/tier-billing anchor).
- Rationale (from the blast-radius map): organiser is a pure *ownership* attribute, orthogonal to
  `competition_players` (the `organizer_is_player` flag already decouples them) — so a role-flag on
  `competition_players` would conflate "plays" with "administers". No multi-admin precedent exists to
  clone; `competition_players` is the structural template.

## Two helpers (the crux)

Not every organiser check becomes a co-organiser check. Split into:
- **`is_competition_owner(comp_id, uid)`** = `organizer_id = uid` — for **owner-only** actions:
  **competition** delete/restore, transfer, prize-pool **payout settlement**, tier-limit resolution, and
  changing ownership-only columns (`organizer_id`, `deleted_at`). NB: **round** delete/restore and
  **settings edits** are operational, not owner-only (findings #1, #2).
- **`is_competition_organizer(comp_id, uid)`** = **operational** organiser — Phase A: `organizer_id = uid`
  (behaviour-preserving); Phase B: `organizer_id = uid OR EXISTS (competition_organizers …)`.

Every organiser-aware site gets **classified** into owner-only vs operational and routed to the right
helper. Flipping `is_competition_organizer` in Phase B then grants co-organisers everywhere operational,
while owner-only sites are untouched.

## Grounding — blast radius (from the map)

- **Client:** ~10 independent `isOrganizer` derivations (`useCompetitionDetailData.ts:136`,
  `CompetitionSettingsScreen:88`, `useViewRoundPermissions`, `RoundSettingsScreen`, `useSubMatchPermissions`,
  3 scoring screens, `SubMatchDetailScreen`, `useCompetitionGroups`) → ~40 files / 238 `isOrganizer` gating
  sites. Plus 2 service checks: `competitionPlayersService.removePlayerFromCompetition:239-266` (+ its
  self-removal special-case) and `hooks/rounds/mutations.ts` comments mirroring RLS.
- **RLS:** organiser-aware policies on ~21 tables; **each inlines `EXISTS (… organizer_id = auth.uid())`**
  (the `is_competition_organizer` helper from `20250111000000:43-50` exists but is barely used). Owner-only
  today: `competitions` (`FOR ALL USING organizer_id = auth.uid()` `20250109000000:350`),
  `competition_prize_pools`/`pool_transactions` (payouts, `20260111000000`/`20260112000000`).
- **DB fns/RPCs:** 5 notification triggers (target/exclude the single `organizer_id`), `soft_delete_/
  restore_competition` (`20260526000200`), `soft_delete_/restore_round` (`20260526000100`),
  `reorder_competition_rounds` (`20260429100000` — operational), 3 tier fns (`20250134000000`), the
  `is_competition_organizer`/`is_knockout_competition_member` helpers.
- **Ownership writes:** set at create (`services/api/competitions.ts:89`); **no transfer feature exists**;
  "my competitions" = `getCompetitions:352-393` (`organizer_id` ∪ accepted players) + `useCompetitionGroups`.

## Global constraints

- **Phase A is behaviour-preserving** — same access before/after. Characterization-test the RLS
  (especially `scorecards`/`rounds`, which have a friend-visibility + recursion history —
  `20250111`/`20260412010000`/`20260706000000`) — a mistake here is a data-leak.
- **No scoring calculation touched** — RLS/gating only.
- Owner-only actions (delete/transfer/payout) must remain on `is_competition_owner`; never route them
  through the operational helper.
- Colours via `useThemeColors()`; Settings screen pushed; Manage-organisers is owner-only.

---

## Phase A — Consolidate (no behaviour change)

### Task A1: Define the two helpers (both = owner today)
- [ ] Migration: `is_competition_owner(comp_id, uid)` (SECURITY DEFINER, `organizer_id = uid`); ensure
  `is_competition_organizer(comp_id, uid)` exists as the canonical operational helper (same body for now).
  Recursion-safe (no policy on `competitions` that re-enters these).
- [ ] Commit: `refactor(db): competition organiser/owner RLS helpers (1B.5.A1)`

### Task A2: Re-point RLS policies to the helpers (classified)
- [ ] **`competitions` must be SPLIT by operation (finding #1)** — settings edits UPDATE this table
  (`useUpdateCompetitionField`), so a co-organiser needs UPDATE. Replace the single `FOR ALL USING
  organizer_id = auth.uid()` with: **SELECT + UPDATE** via `is_competition_organizer(id, auth.uid())`
  (operational), **DELETE** via `is_competition_owner(...)`. Add a **`BEFORE UPDATE` guard trigger** on
  `competitions` that raises if a non-owner changes `organizer_id` or `deleted_at` (RLS can't restrict
  columns; the trigger sees OLD vs NEW). In Phase A both helpers = owner, so behaviour is unchanged.
- [ ] For every other organiser-aware policy across the ~21 tables, replace the inlined `organizer_id`
  subquery with the right helper: **owner-only** = prize pools + pool transactions (payout money);
  **operational** = rounds, scorecards, pairings, teams, team_members, round_results, scoring_pairs,
  score_entries/mismatches/submission_status, knockout_matches, sub_matches,
  competition_round_player_tees, skins/wolf, competition_players.
- [ ] **Characterization tests** (before/after): owner retains all access; non-member denied; friend
  visibility on scorecards/rounds unchanged; competitions still not UPDATE-able by non-organisers and
  `organizer_id`/`deleted_at` unchangeable except by owner. Run against staging.
- [ ] Commit: `refactor(db): route organiser RLS through helpers, no behaviour change (1B.5.A2)`

### Task A3: Route the DB functions/RPCs
- [ ] **Owner-only:** `soft_delete_/restore_competition` (whole competition) + the 3 tier fns →
  `is_competition_owner`.
- [ ] **Operational (finding #2):** `soft_delete_/restore_round` and `reorder_competition_rounds` are
  ordinary round management → for **competition** rounds use `is_competition_organizer`; **retain the
  standalone-round path** (authorise on the round's own `user_id`, which the RPC already branches on when
  `competition_id IS NULL`). Do not force round delete through the owner helper.
- [ ] Test each RPC still authorises exactly as before (Phase A: helpers = owner, so identical).
- [ ] Commit: `refactor(db): organiser RPCs via helpers (1B.5.A3)`

### Task A4: Consolidate the client derivations
- [ ] Add `useIsCompetitionOrganizer(competition)` (operational) and `useIsCompetitionOwner(competition)`
  selectors; both currently `=== organizer_id`. Replace the ~10 ad-hoc derivations. Prop-drilled
  `isOrganizer` consumers keep working (values identical).
- [ ] **Classify the ~40 gating sites:** delete affordances (Compete-list swipe `CompsContent:56`,
  Settings delete), prize-pool payout settlement (`PayoutsTab canSettle`) → `useIsCompetitionOwner`;
  everything else → `useIsCompetitionOrganizer`. (Behaviour identical now; sets up Phase B.)
- [ ] Tests green; `pnpm type-check`.
- [ ] Commit: `refactor(competition): consolidate organiser role selectors (1B.5.A4)`

---

## Phase B — Extend to co-organisers

### Task B1: `competition_organizers` table + RLS
- [ ] Migration: create the table per the Representation spec — `competition_id`/`player_id`
  `ON DELETE CASCADE`, **`added_by` nullable `ON DELETE SET NULL`** (finding #4). RLS — SELECT for
  competition members/organisers; INSERT/DELETE only by `is_competition_owner`. Index on `player_id`.
- [ ] Commit: `feat(db): competition_organizers table (1B.5.B1)`

### Task B2: Flip the operational helper
- [ ] `is_competition_organizer(comp_id, uid)` → `organizer_id = uid OR EXISTS (SELECT 1 FROM
  competition_organizers WHERE competition_id = comp_id AND player_id = uid)`. `is_competition_owner`
  unchanged. **Guard against RLS recursion** (helper is SECURITY DEFINER; the new EXISTS on
  `competition_organizers` must not re-enter a policy that calls the helper).
- [ ] Tests: a co-organiser gains operational access (rounds/players/scorecards/settings) across the
  re-pointed policies; a co-organiser is **denied** delete/payout (owner-only) and tier still on owner.
- [ ] Commit: `feat(db): grant co-organisers operational access (1B.5.B2)`

### Task B3: Flip the client selector + owner-only audit
- [ ] `useIsCompetitionOrganizer` includes co-organisers (fetch `competition_organizers`); `useIsCompetitionOwner`
  stays `=== organizer_id`. Verify the Task-A4 classification: delete/transfer/payout use the owner selector.
- [ ] Include co-organised competitions in "My Competitions": union `competition_organizers` into
  `getCompetitions:352` and `useCompetitionGroups`.
- [ ] Tests: co-organiser sees org affordances but not delete/settle; comp appears in their My Competitions.
- [ ] Commit: `feat(competition): co-organiser client access (1B.5.B3)`

### Task B4: Notifications — per-trigger recipient/actor matrix (finding #3)

These triggers have **different semantics** — do NOT blanket-add organisers to every recipient loop.
Classify and change per-trigger (grep the latest `CREATE OR REPLACE` for each body first):

| Trigger | Type | Recipient change | Actor change |
|---|---|---|---|
| `notify_competition_player_joined` | **organiser alert** | recipients → **owner ∪ co-organisers** (de-dup) | the joining player is the actor; exclude them if they are already a co-org |
| `notify_competition_player_added` | **added-player alert** | **unchanged** (notifies the added player) | use the validated acting organiser from `auth.uid()` |
| `notify_new_round_created` | **participant broadcast** | **unchanged** (accepted players) — do NOT add non-playing co-orgs | use and exclude the validated acting organiser from `auth.uid()`, not `organizer_id` |
| `notify_competition_status_changed` | **participant broadcast** | unchanged | use and exclude the validated acting organiser from `auth.uid()` |
| round-complete (`notify_round_completed`) | **participant broadcast** | unchanged | fired by scoring completion, not an organiser action — leave actor logic as-is |
| `notify_scorecard_submitted` | — | **trigger was DROPPED** (`20260629010000`) — verify; no change |

- [ ] **Actor-attribution decision:** capture `auth.uid()` inside the trigger transaction and retain it
  only when `is_competition_organizer(competition_id, auth.uid())` is true. Use that player as the actor
  and exclude them from the broadcast audience. If the action is automated/service-driven, or the caller
  is not an operational organiser, store `NULL` and render neutral notification copy. **Never** fall back
  to `organizer_id`. No new schema column is required for v1; add explicit `created_by`/audit columns later
  only if actor history must survive independently of notification creation.
- [ ] Tests per row: co-org receives player-joined; participant broadcasts keep their audience; the
  acting owner/co-org is correctly attributed and excluded; player-initiated joins use the player actor;
  automated/service calls use `NULL` and neutral copy; no duplicate to the owner.
- [ ] Commit: `feat(notifications): co-organiser recipient/actor matrix (1B.5.B4)`

### Task B5: Add/remove RPCs (owner-only) + Manage-organisers UI
- [ ] RPCs `add_competition_organizer(comp_id, player_id)` / `remove_competition_organizer(...)` —
  SECURITY DEFINER, assert caller `is_competition_owner`; instant (no accept).
- [ ] "Manage organisers" row in Settings → screen: owner picks from friends/players to add, removes
  co-organisers. Reuse `FriendSelector`/existing player-pick patterns. Owner-only.
- [ ] Reconcile the 2 service checks: `removePlayerFromCompetition` should allow co-organisers to remove
  players (operational) — route through the operational check; keep the organiser self-removal rule
  sensible for co-organisers too.
- [ ] Tests: owner adds/removes; co-organiser cannot add/remove; UI reflects roster.
- [ ] Commit: `feat(competition): manage co-organisers (1B.5.B5)`

### Task B6: Regression + owner-only audit
- [ ] Full matrix: co-organiser can add rounds/players, edit settings, manage teams, score, manage
  skins/wolf; **cannot** delete competition, settle payouts, add/remove organisers, or transfer.
- [ ] `organizer_is_player` + self-removal interplay verified for co-organisers.
- [ ] `pnpm verify:gate`; migrations to staging; characterization RLS suite green; on-device smoke.
- [ ] Commit: `test(competition): co-organiser regression + owner-only audit (1B.5.B6)`

---

## Open items to confirm

- **Tier-gating of the co-organiser *feature* itself** — is "multiple organisers" a paid/tier-limited
  feature? Not decided; plan assumes **ungated**. Confirm.
- **Transfer ownership** — decided owner-only, but a transfer *feature* doesn't exist and is **out of v1
  scope** unless wanted (would let the owner promote a co-organiser to primary and demote self).
- **`is_knockout_competition_member`** already OR's `organizer_id` — decide whether co-organisers count as
  members there (operational → yes; fold into the helper or update it).

## Self-review checklist

- [ ] Phase A merged and proven behaviour-identical (characterization RLS suite) BEFORE Phase B.
- [ ] Owner-only (delete/transfer/payout/tier) on `is_competition_owner`; operational on
  `is_competition_organizer`; no owner-only action routed through the operational helper.
- [ ] No RLS recursion introduced; scorecards/rounds friend-visibility unchanged.
- [ ] Co-organisers: operational access + notifications + My-Competitions; NOT delete/settle/manage-orgs.
- [ ] No scoring calc touched. Tier limits still resolve on the primary owner.
