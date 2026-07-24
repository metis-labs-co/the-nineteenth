# Phase 1 — decomposition & roadmap (Competition Detail Redesign)

> This is a **decomposition/roadmap**, not a task-by-task implementation plan. Phase 1 spans several
> independent subsystems; each gets its own implementation plan **when it is spec-ready** (a plan
> with placeholder tasks for un-specced features would be a plan failure). Below: what's grounded,
> what's decided, the subsystem breakdown with file structure + readiness, the open product sub-specs,
> and the sequencing. Reference: `PLAN.md` (strategy + Review corrections), `SPEC.md` (per-tab detail).

## Grounding — verified against current code (2026-07-24)

- **All 10 tab components already exist and are wired.** Detail-screen work is **visual/structural
  only** — no component creation. (`CompetitionDetailScreen/index.tsx`; tabs under
  `components/competitions/detail/`, `components/competitions/breakdown/`, `components/leaderboard/`,
  `components/knockout/`.)
- **The tab bar is dynamic and must be preserved:** tabs are conditionally spread in; order changes
  with status (`promoteLeaderboard` moves Leaderboard to 3rd when in-progress/completed); knockout
  swaps Leaderboard→Bracket; up to ~8 tabs can show at once (confirm `Tabs` horizontal scroll).
- **Role** = `isOrganizer`/`isPlayer` computed in `useCompetitionDetailData` (client-side vs
  `organizer_id` / players list). No dedicated role hook.
- **Status-driven hero/CTA is new work.** Status logic is duplicated (screen + `DetailsTab`), and
  there is **no** status-keyed hero/CTA strip today — the mock's upcoming/live/completed hero is net
  layout.
- **Realtime subscriptions are mounted at screen level** (one per round) regardless of active tab —
  any hero/layout restructure must keep them mounted.
- **`LeaderboardTab` is a large per-format sub-system** (26.7KB; switches Stroke/Stableford/Match/
  SubMatch/Team internally). Treat its redesign as its own slice, not a card.
- **Relocation target exists on the Details tab, not Settings:** Dates/Scoring/Handicap/Type/Format/
  Points live in `components/competitions/detail/sections/SettingsSection.tsx`, via edit sheets in
  `detail/sections/sheets/`, blanket-locked once a round starts (`structureLocked = hasStartedRound`).
  No editable **Tie-break** UI exists (it's only in scoring utils).
- **Settings screen today** owns only Name/Description/WhatsApp/PrizePool/Delete; **fetches its own
  competition data** (`useCompetitionData`, separate cache), and reaches into the Details tab's
  `sections/sheets/` for 3 of its sheets.
- **`visibility` is unsurfaced and inert:** hardcoded `'private' as const` at creation
  (`schemas/competition.ts:505`), no update path, no enforcement anywhere. Making it a real 3-state
  control is **backend work**, not a UI toggle.

## Decisions locked (owner)

1. **Settings data-model features INCLUDED in Phase 1** (guests, notification prefs, multi-organiser).
2. **Relocation: MOVE** Dates/Scoring/Handicap (and the other existing structural rows) into Settings
   (match mock). ⚠️ **Tie-break is NOT relocatable** — no editable Tie-break field exists in the
   schema/UI (verified). It's reclassified as a **net-new spec item** (field + values + editor +
   scoring integration), not part of 1B.1. See open sub-specs.
3. **Visibility: 3-option** (Private / Unlisted / Public), governing discoverability **and** public
   leaderboard access.

## Scope reality → two tracks

Phase 1 = **1A (visual/structural, presentational)** + **1B (settings expansion: relocation +
visibility + three net-new data-model features, backend/product)**. 1A depends only on Phase 0
tokens and is shippable per-tab. 1B's backend features each gate on their own migration/RLS/spec and
are **independent of 1A**. Recommendation (preserves incremental delivery): **ship 1A independently;
land each 1B feature when its backend is ready.**

---

## Subsystem breakdown

### 1A — Visual/structural redesign of the detail screen + tabs
**Goal:** every surface × state × tab matches the mock on the retuned palette; behaviour preserved
except two deliberate IA changes below.
**Readiness:** ✅ **ready once Phase 0 tokens land.** No product decisions outstanding.
**Two NEW IA changes (not a pure re-skin — verified the tab array is not role-gated today):** (a) the
`'Leaderboard'` tab becomes status-driven **Standings/Results**; (b) competitors get a **reduced,
role-gated** tab set (Standings·Rounds·Players, +Payouts only when completed) that does not exist today.
Both are an explicit tested task (`PHASE-1A-PLAN.md` Task 1B — with the organiser/competitor sets locked
from the mock's own tab logic and `activeTab` reconciliation), plus the status-driven hero/CTA.
**Nature:** presentational — numbers come from existing utils/hooks (follow the `SettingsSection` →
`summarizeCompetition` precedent). Acceptance is the **side-by-side-vs-mock screenshot sign-off**
loop (per `PLAN.md` §Acceptance), not unit tests — so this track is an ordered per-tab checklist,
each tab an independently-reviewable PR.
**Files (modify):**
- `screens/competitions/CompetitionDetailScreen/index.tsx` — chrome, `PageHeader` (centered + gear),
  status-driven hero/CTA, upcoming green-calendar + "Nd" card. **Preserve** the dynamic tab array,
  status reorder, knockout swap, and screen-level realtime subs.
- `components/common/Tabs.tsx` — confirm horizontal-scroll behaviour with up to 8 tabs (pills already
  set by Phase 0; do not restyle to underline — `PLAN.md` #1).
- Per-tab (one slice each): `detail/DetailsTab.tsx` (+ `sections/*`), `detail/RoundsTab.tsx`,
  `detail/PlayersTab.tsx`, `detail/TeamsTab.tsx`, `detail/PayoutsTab.tsx`, `detail/SkinsTab.tsx`,
  `detail/StatsTab/*`, `breakdown/BreakdownTab.tsx`, `knockout/BracketTab.tsx`.
- **Own slice:** `leaderboard/LeaderboardTab.tsx` + tables (`LeaderboardTable`, `TeamLeaderboardTable`,
  `MatchPlayLeaderboard`, `SubMatchLeaderboardTab`, `TeamHeadToHeadCard`, `LeaderboardViewToggle`) —
  per-format shell; largest single piece.
- Competitor surface: "your team" hero (uses `userTeamId/userTeamName` already in
  `useCompetitionDetailData`); reduced tabs already handled by existing conditionals.
**Watch-outs:** don't convert the dynamic tab list to a static one; keep realtime subs mounted; the
duplicated round-scanning predicates (`showStatsTab/showRingerTab/showContributionsTab/
showLeaderboardToggle`) stay as-is (consolidation is out of scope for a visual pass — note only).

### 1B.1 — Relocate structural config into Settings
**Goal:** Dates/Scoring/Handicap/Type/Format/Points editing moves from the Details tab to the
Settings screen (match mock).
**Readiness:** ✅ **ready (no new schema)** — one micro-decision below.
**Files (modify):**
- Move `detail/sections/SettingsSection.tsx`'s rows into `screens/competitions/CompetitionSettingsScreen/index.tsx`.
- Re-home/keep-shared the sheets: `EditCompetitionTypeSheet`, `EditHandicapSystemSheet`,
  `EditTeamModeSheet`, `EditDatesSheet`, `EditScoringRulesModeSheet`, `EditCompetitionRulesSheet`,
  `PointsConfigSheet` (currently in `detail/sections/sheets/`).
- `DetailsTab.tsx` — remove the relocated section.
- Preserve `structureLocked = hasStartedRound`; account for the Settings screen's **separate** data
  fetch (`useCompetitionData`) so edits invalidate the right cache.
**Micro-decision:** does the Details tab keep a **read-only summary** of these fields, or drop them
entirely once editing lives in Settings? (Mock implies Settings owns editing; confirm the Details
read-only summary.)

### 1B.2 — Visibility control (3-state, governs discoverability + leaderboard)
**Goal:** organiser sets Private/Unlisted/Public; the value is enforced.
**Readiness:** ⚠️ **needs a short backend spec** (see open sub-specs). UI is small; enforcement is the
work.
**Files (modify/create):** `schemas/competition.ts` (stop hardcoding `'private'`; keep default,
allow updates); new visibility update mutation under `hooks/competitions/mutations`; RLS/policy +
discoverability enforcement in competition search/list queries; public-leaderboard access gate; a
3-option `SegmentedButton` row in Settings.

### 1B.3 — Allow guests
**Readiness:** ⚠️ **needs product + schema spec.** CLAUDE.md scopes guest management as a **Social-tier**
feature — tier-gating applies.
**Likely files:** competition schema (flag + guest representation), `CompetitionPlayer`/guest model,
permissions/RLS, a `ToggleSwitch` row, tier-gate via `useCheckFeature`/`useTierLimits`.

### 1B.4 — Competition notification settings
**Readiness:** ⚠️ **needs product + schema spec.** Three prefs (round reminders, live score alerts,
results summary) wired to the existing push infra (`PUSH_NOTIFICATIONS.md`, DB triggers).
**Likely files:** new prefs storage (per-competition vs per-user-per-competition — see sub-specs),
trigger changes, three `ToggleSwitch` rows, tier-gate.

### 1B.5 — Multiple organisers
**Readiness:** ⚠️ **needs product + schema spec; HIGH blast radius.** Today `organizer_id` is a single
column checked in many places (role derivation, edit gating, delete, RLS policies).
**Likely files:** new `competition_organizers` join table + migration/backfill; update **every**
`organizer_id` check + RLS policy; add/remove-organiser permissions + invite flow; a Manage-organisers
row + screen. **Treat as its own project** — sequence last, change the schema deliberately.

### Phase 2 (outline, unchanged)
App-wide sweep on the retuned tokens + canonical components; inventory-first; per-area PR + sign-off;
**includes the `textTertiary` essential-text audit (`PLAN.md` #14)**; translucent/backdrop
reconciliation stays deferred.

---

## Open product sub-specs (resolve before the ⚠️ subsystems get implementation plans)

- **1B.2 Visibility:** where is discoverability enforced (which search/list queries)? where is
  public-leaderboard access gated? default at creation? is Public a paid/tier-gated feature?
- **1B.3 Guests:** what does "allow guests" mean — guest **players** without accounts, or guest
  **scorers**? how are guests represented/stored? exact tier rule?
- **1B.4 Notifications:** whose prefs — organiser-set for all, or each user's own per competition?
  storage shape? per-trigger behaviour vs the existing push categories? tier rule?
- **1B.5 Organisers:** co-organiser permission scope (full vs limited)? add/remove/invite flow? the
  RLS blast radius (enumerate every policy/query touching `organizer_id`).
- **Tie-break (net-new, was mis-scoped as relocation):** there is no tie-break field today. Define the
  persisted column + allowed values, the editor UI, and how the **scoring engine** consumes it
  (tie-break logic currently lives only in scoring utils). Sequence with the other backend features;
  touches the scoring guardrail zone (`CLAUDE.md`).

## Sequencing & dependencies

1. **Phase 0** (in progress, other worker) — gates all visual work.
2. **1A** — starts after Phase 0; per-tab slices are parallelizable; `LeaderboardTab` is its own
   slice. Ships independently, per-tab, behind screenshot sign-off.
3. **1B.1 relocation** — after Phase 0 (uses retuned tokens); independent of 1A; one micro-decision.
4. **1B.2 → 1B.4** — each after its sub-spec + migration; independent of 1A; sequence by backend
   readiness.
5. **1B.5 multi-organiser** — **last**; highest blast radius; own schema-change project.
6. **Phase 2** — after 1A lands.

## Next actions

- **Ready to turn into implementation plans now:** **1A** (per-tab visual checklist + acceptance
  loop) and **1B.1** (relocation). Say the word and I'll write each as its own plan.
- **Need a product spec first (then a plan each):** **1B.2, 1B.3, 1B.4, 1B.5.** The open sub-specs
  above are the agenda — we can work through them one feature at a time (brainstorm → spec → plan).
