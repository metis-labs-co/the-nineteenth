# Phase 1B.2 — Competition Visibility (Tier 1) — Spec & Implementation Plan

> **For workers:** implement task-by-task; `- [ ]` steps. This is a **backend/security + small UI**
> feature. The picker is trivial; the substance and risk are in the **RLS hardening** — treat Task 1
> (enforcement audit) as a gate before writing any migration.

**Goal:** Give organisers a working 3-state Visibility control (Private / Unlisted / Public) and make
**Private genuinely private** by closing the current `USING (true)` read policy on `competitions`.

**Scope decision (owner):** **Tier 1 only.** Public *discovery* (browse screen + RPC) and *public
leaderboards* (non-member access to rounds/scorecards) are **deferred to Tier 2/3** — see "Deferred".
**Ungated** — available on all tiers (matches the leagues precedent). **Default at creation: `private`.**

**Tech stack:** Supabase Postgres (RLS + SECURITY DEFINER RPC), TanStack Query, existing
`useUpdateCompetitionField` + `Edit*Sheet` pattern, `SegmentedButton`.

## State semantics in Tier 1 (be honest about what differs now vs later)

| State | Tier 1 behaviour | Becomes distinct in |
|---|---|---|
| **private** | Readable only by organiser + accepted members. Joinable by invite code via the new lookup RPC. Not discoverable. | — (fully meaningful now) |
| **unlisted** | Tier 1: **same as private** (code/link accessible, not discoverable). The unlisted-vs-private distinction only appears once a shareable public link / browse exists. | Tier 2 |
| **public** | Tier 1: **same as unlisted** (no browse yet, leaderboards still member-only). | Tier 2 (browse) / Tier 3 (public leaderboards) |

**Consequence to state plainly in the UI/spec:** in Tier 1 the picker is stored and Private is enforced,
but Unlisted/Public don't yet behave differently from each other. That's intended — the differentiators
(discovery, public standings) are the deferred tiers. (If the owner wants a *visible* Tier-1 difference,
the smallest add is a shareable public link for unlisted/public — flag before assuming.)

## Grounding — verified enforcement surface (2026-07-25)

- **No public discovery exists** — competitions are 100% invite-only; `getCompetitions()`
  (`services/api/competitions.ts:352`) lists organiser + accepted-member only. Building "public" =
  new browse RPC + screen (Tier 2), cloning **leagues** (`get_public_leagues` / `usePublicLeagues`).
- **`private` is a no-op today:** `competitions` SELECT policy
  `"Authenticated users can view competitions by invite code" USING (true)`
  (`migrations/20250171000000_fix_competition_invite_code_rls.sql:16-19`) lets **any authenticated
  user read any competition row**. Join-by-code relies on this blanket policy (no RPC today).
- **Leaderboard data is already member-gated** at `rounds`/`scorecards`/`round_results`/
  `competition_players` — *not* at `competitions`. So Tier 1 does **not** touch those; public
  leaderboards (Tier 3) would, and that RLS has a recursion history
  (`20250111000000_fix_rls_recursion.sql`, `20260412010000_fix_rounds_friend_visibility_recursion.sql`)
  — handle with care later.
- **Leagues precedent to clone:** `migrations/20260325000000_league_visibility.sql` —
  `lookup_league_by_invite_code` (SECURITY DEFINER RPC), tightened `leagues_select`. Not tier-gated.
- **Update path trivial:** organiser RLS is `FOR ALL USING (auth.uid() = organizer_id)` (no column
  restriction) — organiser can already UPDATE `visibility`; just add `'visibility'` to
  `useUpdateCompetitionField`'s `CompetitionUpdate` Pick type.
- **`visibility` hardcoded at creation:** `schemas/competition.ts:505` and
  `screens/admin/CreateCompetitionScreen/hooks/useCompetitionFormSubmit.ts:83` both force `'private'`;
  `services/api/competitions.ts:87` already honours an input value if supplied.

## Global constraints

- Follow the **leagues** implementation as the canonical pattern for the RPC + tightened policy.
- **Privacy-default:** creation default stays `private`.
- No tier-gating; no new `FeatureId`.
- Tier 1 must **not** touch `rounds`/`scorecards` RLS (that's Tier 3).
- Settings screen is pushed (not modal); the picker uses `SegmentedButton` inside the existing
  Visibility group in `CompetitionSettingsScreen`.

---

### Task 1: Enforcement audit + policy design (GATE — no migration until done)

Tightening the `competitions` SELECT policy is the risky heart. Before changing it, enumerate
**everything that reads a `competitions` row for a non-member**, because those break when `USING (true)`
is removed.

**Steps:**
- [ ] Grep + trace all readers of `competitions` rows: the invite-code join lookup, the activity/feed
  RPCs (friends' rounds show competition context — see the `friend-scorecard` RLS history), notifications,
  deep links, AI generation, any `select().eq('invite_code'|'id', …)` on `competitions`.
- [ ] For each, classify: (a) needs the row as a non-member → must route through the new lookup RPC or a
  feed-specific SECURITY DEFINER path; (b) already member/organiser → unaffected.
- [ ] Produce the tightened policy design: replace `USING (true)` with
  `auth.uid() = organizer_id OR is_competition_member(id, auth.uid())`, plus a
  `lookup_competition_by_invite_code(p_code)` SECURITY DEFINER RPC for the join path (mirror
  `lookup_league_by_invite_code`). Confirm no RLS recursion (competitions ↔ competition_players helpers).
- [ ] **Decision gate:** if the audit shows the tightening breaks friend-activity/feed broadly, STOP and
  bring options to the owner (narrower enforcement, feed RPC, or defer Private-enforcement). Do not
  proceed to Task 2 on assumption.
- [ ] Deliverable: written reader list + final policy/RPC design. Commit as a doc note.

### Task 2: Migration — lookup RPC + tightened SELECT policy + join path

**Files:** new `supabase/migrations/<ts>_competition_visibility_tier1.sql`; update the join-by-code
client path (`services/api/competitions.ts` invite-code lookup) to call the RPC.

**Steps:**
- [ ] Write `lookup_competition_by_invite_code(p_code text)` SECURITY DEFINER STABLE, returning the
  minimal columns the join screen needs; `GRANT EXECUTE ... TO authenticated`.
- [ ] `DROP POLICY "Authenticated users can view competitions by invite code"`; add the tightened SELECT
  policy from Task 1. Keep the organiser `FOR ALL` and member SELECT policies.
- [ ] Point the client join-by-code lookup at the RPC (not a direct `select().eq('invite_code')`).
- [ ] Test: member/organiser can SELECT; non-member cannot SELECT by id; RPC returns the row by code;
  join-by-code still works end-to-end.
- [ ] Apply to a local/staging DB and smoke-test join + any Task-1 feed readers.
- [ ] Commit: `feat(competition): enforce private visibility via lookup RPC + tightened RLS (1B.2.2)`

### Task 3: Allow visibility to be set/updated

**Files:** `src/schemas/competition.ts:505`,
`src/screens/admin/CreateCompetitionScreen/hooks/useCompetitionFormSubmit.ts:83`,
`src/components/competitions/detail/sections/sheets/useUpdateCompetitionField.ts`.

**Steps:**
- [ ] Keep creation **default `private`** but stop hard-forcing it where a value could legitimately be
  supplied (leave the create default; the point is the *update* path). Confirm `services/api/
  competitions.ts:87` continues to default `private`.
- [ ] Add `'visibility'` to `useUpdateCompetitionField`'s `CompetitionUpdate` `Pick<…>`. (Its onSuccess
  already invalidates `['competition', id]`, `…'details'`, `['competitions']`.)
- [ ] Test: the mutation updates `visibility` and invalidates caches.
- [ ] Commit: `feat(competition): allow organiser to update visibility (1B.2.3)`

### Task 4: The Visibility picker UI (ungated)

**Files:** new `src/components/competitions/detail/sections/sheets/EditVisibilitySheet.tsx` (mirror the
sibling `Edit*Sheet.tsx`); render a Visibility row/group in `CompetitionSettingsScreen` (or the
`SettingsSection` groups).

**Steps:**
- [ ] Build `EditVisibilitySheet` with a `SegmentedButton` (Private / Unlisted / Public) + short helper
  copy per option; on select → `useUpdateCompetitionField({ visibility })`. Colours via `useThemeColors()`.
- [ ] Add a "Visibility" row (current value) in Settings that opens the sheet; organiser-only. **No**
  `checkFeature` gate (ungated).
- [ ] Copy must be honest for Tier 1 (e.g. Unlisted/Public: "Discoverable browsing coming soon"); confirm
  final wording with the owner.
- [ ] Test: sheet renders 3 options, selecting persists, current value reflected.
- [ ] `pnpm type-check` + `pnpm lint`; grep diff for colour literals.
- [ ] Commit: `feat(settings): competition visibility picker (1B.2.4)`

### Task 5: Regression sweep

- [ ] Join-by-code (the core flow) works under the tightened policy.
- [ ] Task-1 non-member readers (friend activity/feed, notifications, deep links) still work.
- [ ] Non-member can no longer read an arbitrary competition by id.
- [ ] `pnpm verify:gate`; deploy migration to staging; on-device smoke.
- [ ] Commit: `test(competition): visibility tier-1 regression (1B.2.5)`

---

## Deferred (explicitly NOT in this pass)

- **Tier 2 — public discovery:** `get_public_competitions(search, limit)` RPC + `usePublicCompetitions`
  hook + a browse screen (mirror leagues). Makes `public` ≠ `unlisted`.
- **Tier 3 — public leaderboards:** visibility-aware SELECT branches on `rounds`/`scorecards`/
  `round_results`/`competition_players` so non-members can view public standings. **Highest blast
  radius** (RLS recursion history) — its own carefully-audited project.

## Self-review checklist

- [ ] Private is actually enforced (non-member cannot read by id); join-by-code preserved via RPC.
- [ ] No `rounds`/`scorecards` RLS touched. No tier gate added. Default stays private.
- [ ] Picker persists all three states; Tier-1 copy is honest about unlisted/public parity.
- [ ] Migration deployed + smoke-tested; feed/friend-activity readers verified.
