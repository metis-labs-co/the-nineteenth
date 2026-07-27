# Phase 1B.3 — "Allow Guests" setting — Spec & Implementation Plan

> **For workers:** implement task-by-task; `- [ ]` steps. This is **small** — a per-competition toggle
> on top of the **existing** placeholder-player system. Do NOT build a guest model; one exists.

**Goal:** Add a per-competition **"Allow guests"** setting (Settings toggle) that controls whether
non-account "guest" players (existing **placeholder players**) can be added to that competition.

**Decisions (owner):** Per-competition toggle; **no tier tightening** — adding guests stays available to
**all tiers** (as today). `manage_guests` (Social) keeps gating **only** the link-placeholder-to-real-
account workflow (`LinkPlaceholderScreen`), unchanged.

**Reframe (verified):** guests already exist as **placeholder players** — `players.is_placeholder=true`,
`created_by`, `linked_player_id`; migration `20250329000000_placeholder_players.sql`; RPCs
`create_placeholder_player` / `link_placeholder_player` / `claim_competition_placeholder`; scoring + RLS
already handle them transparently (they key on `players.id`; the acting authenticated user does the
writes). This plan only adds an on/off gate + Settings surface. **Reuse, do not reinvent.**

## Semantics

- New column `competitions.allow_guests BOOLEAN NOT NULL DEFAULT true` — **opt-out**, so existing and new
  competitions keep today's behaviour (guests allowed) with no regression. (Confirm default with owner;
  `true` is the no-downgrade choice.)
- When `allow_guests = true`: guest-add affordances behave exactly as today.
- When `allow_guests = false`: the "add guest / add placeholder" affordance is hidden/disabled for that
  competition, and creation auto-fill-to-`max_players`-with-placeholders is skipped. **Existing** guests
  already in the competition are **left untouched** (never auto-remove player data).
- Tier behaviour unchanged (no `checkFeature` on the toggle or on adding guests).

## Grounding — key locations (from the guests map)

- Player add paths → `competition_players` (`player_id → players.id`): organiser create + auto-fill
  (`src/services/api/competitions.ts:187-282`), invite-code slot-claim
  (`JoinCompetitionScreen.tsx:256-330`), inline guest create (`FriendSelector.tsx:120-150`,
  `AddPlayersStep.tsx:203`).
- Guest system: `migrations/20250329000000_placeholder_players.sql`; types
  `src/types/database/player.types.ts:19-56`; hooks `src/hooks/placeholderPlayers/{queries,mutations}.ts`.
- Update path: add `'allow_guests'` to `useUpdateCompetitionField`'s `CompetitionUpdate` Pick (organiser
  RLS already permits the write; onSuccess invalidates the right keys).
- Tier gate (leave as-is): `manage_guests` → `LinkPlaceholderScreen.tsx:356` /
  `ProfileMenuSection.tsx:83`; validator `src/hooks/subscription/validators.ts:281`.

## Global constraints

- No tier gate on the toggle or on guest addition.
- Never delete existing guest/placeholder data when the toggle flips off.
- Colours via `useThemeColors()`; `ToggleSwitch` from `@/components/common`; Settings screen is pushed.

---

### Task 1: Migration — `allow_guests` column

**Files:** new `supabase/migrations/<ts>_competition_allow_guests.sql`.
- [ ] `ALTER TABLE competitions ADD COLUMN allow_guests BOOLEAN NOT NULL DEFAULT true;`
- [ ] No RLS change (organiser `FOR ALL` already covers the write; SELECT unaffected).
- [ ] Regenerate/adjust Supabase types if the repo commits generated types (`src/types/supabase.ts`).
- [ ] Commit: `feat(db): add competitions.allow_guests (1B.3.1)`

### Task 2: Types + update path

**Files:** `src/types/index.ts` + `src/types/database/competition.types.ts` (`allow_guests: boolean`);
`src/components/competitions/detail/sections/sheets/useUpdateCompetitionField.ts` (add `'allow_guests'`
to the `Pick<…>`).
- [ ] Add `allow_guests` to the `Competition` types.
- [ ] Add `'allow_guests'` to `CompetitionUpdate`.
- [ ] Test: `useUpdateCompetitionField({ allow_guests })` updates + invalidates.
- [ ] Commit: `feat(competition): allow_guests type + update path (1B.3.2)`

### Task 3: Settings toggle

**Files:** `CompetitionSettingsScreen` (a "Guests" row in the settings groups) — reuse `ToggleSwitch`.
- [ ] Add an "Allow guests" `ToggleSwitch` row (organiser-only), bound to `competition.allow_guests`,
  optimistic local state → `useUpdateCompetitionField({ allow_guests })`. Short helper copy
  ("Let non-account players be added to this competition"). **No `checkFeature`.**
- [ ] Test: toggling persists; reflects current value.
- [ ] `pnpm type-check` + `pnpm lint`; grep diff for colour literals.
- [ ] Commit: `feat(settings): allow-guests toggle (1B.3.3)`

### Task 4: Honour the flag in the add-guest affordances

**Files:** the post-creation "add players to this competition" flow (reuses `FriendSelector`) + the
creation auto-fill in `services/api/competitions.ts`.
- [ ] Audit where guests get added for an EXISTING competition (the add-players handler in
  `useCompetitionDetailHandlers` + `FriendSelector`'s inline "add guest"). Pass the competition's
  `allow_guests` in; when `false`, hide/disable the "add guest" option (real friends still addable).
- [ ] In `services/api/competitions.ts` auto-fill (`:187-282`): skip placeholder auto-fill when
  `allow_guests === false`. (Creation defaults `true`, so this only bites if a creation-time toggle is
  added later — see deferred.)
- [ ] Test: with `allow_guests=false`, the add-guest affordance is absent and no placeholders are
  auto-created; with `true`, unchanged. Existing placeholders remain regardless.
- [ ] Commit: `feat(competition): gate guest-add on allow_guests (1B.3.4)`

### Task 5: Regression

- [ ] Guests addable/scoreable as before when allowed; invite-code slot-claim of existing placeholders
  unaffected; `manage_guests`/Social linking gate unchanged; Free tier can still add guests when allowed.
- [ ] Toggling off does not remove existing guests.
- [ ] `pnpm verify:gate`; migration to staging; on-device smoke.
- [ ] Commit: `test(competition): allow-guests regression (1B.3.5)`

---

## Deferred / open

- **Creation-time toggle:** the wizard keeps today's default-allow behaviour; an explicit "allow guests"
  step at creation (feeding the auto-fill decision) is optional — add only if the owner wants it.
- **Default value:** confirm `true` (opt-out, no regression) vs `false` (opt-in, but disables current
  guest-adding for all existing competitions — a downgrade). Plan assumes `true`.

## Self-review checklist

- [ ] Reuses placeholder players; no second guest model. No tier gate added; `manage_guests` untouched.
- [ ] `allow_guests=false` hides add-guest + skips auto-fill; never deletes existing guests.
- [ ] Toggle persists; default `true`; scoring/join/RLS for guests unchanged.
