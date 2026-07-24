# Phase 1A — Visual Redesign (Competition Detail) Implementation Plan

> **For workers:** implement task-by-task; steps use `- [ ]` checkboxes. **This is a visual-fidelity
> re-skin, so tasks intentionally do NOT contain fabricated final JSX** — the exact layout is defined
> by the mock (`./mocks/Competition Details - Redesign.dc.html`), and inventing pixel JSX here would be
> guesses the implementer shouldn't trust. Each task gives: the files, the mock region, the token/
> component mapping to apply, the guardrails, and a concrete verification (existing suite green +
> grep-clean + side-by-side screenshot sign-off). The "test" for a visual pass is the sign-off loop,
> not a unit assertion.

**Goal:** Every competition-detail surface (organiser team cup, competitor team cup, knockout) × state
(upcoming/live/completed) × tab matches the mock on the Phase 0 palette, with **no behaviour change**.

**Architecture:** Presentational-only. All 10 tab components already exist and are wired; we restyle
the screen chrome, the hero/CTA, and each tab's layout in place. Numbers keep coming from existing
utils/hooks (follow the `SettingsSection` → `summarizeCompetition` precedent). No component creation,
no data-hook changes, no navigation changes.

**Tech stack:** React Native + Expo, `useThemeColors()`, static tokens from `@/constants/theme`,
`@/components/common` (`PageHeader`, `Tabs`, `CardContainer`, `StatusBadge`, `EmptyState`, …).

## Global Constraints

- **Depends on Phase 0** — the retuned solid palette must be merged before starting; the look is wrong
  without it. Do not re-add palette values here.
- **Tabs stay PILLS** (the existing `Tabs`); the mock's underline is a rejected artifact (`PLAN.md` #1).
- **Zero colour literals** in screens/components — `useThemeColors()` only; static tokens imported.
  Grep the diff for `#`, `rgb(`, `rgba(`, `var(--`.
- **Preserve behaviour exactly:** the dynamic tab array, the status-driven reorder (`promoteLeaderboard`
  moves Leaderboard to 3rd), the knockout Leaderboard→Bracket swap, and the screen-level
  `ScorecardsRealtimeSubscription` mounts must all keep working.
- **No scoring/standings math** in components (`CLAUDE.md` guardrails; scoring screens are out of scope).
- Required component pattern (`CLAUDE.md`): functional, `const colors = useThemeColors()`, inline colour
  props, static tokens in `StyleSheet.create`, Paper `Text`/`Icon`, `TouchableOpacity` not Paper `Button`.
- **AU conventions:** `DD/MM/YYYY` (existing `formatDateAustralian`), currency via the app util (not £).
- **Solid light + solid dark** only (translucent deferred). Verify both per task.
- **Delivery:** one tab (or the chrome) per PR, each behind screenshot sign-off vs the mock. Never a
  single big-bang PR.

---

### Task 0: Prerequisite & branch

- [ ] Confirm the Phase 0 palette retune is merged to `main` (solid light + dark). If not, stop.
- [ ] Create the worktree off latest `main`: `git worktree add ../the-nineteenth-redesign-1a -b feature/redesign-1a main`
- [ ] `pnpm install` in the worktree; run `pnpm type-check` and the existing competition tests to record a green baseline (`pnpm test --testPathPattern='competitions/detail'`).

### Task 1: Screen chrome, hero & status-driven CTA (the main new build)

**Files:**
- Modify: `src/screens/competitions/CompetitionDetailScreen/index.tsx` (header ~line 359; tab array
  ~372–408; content blocks ~440–581)
- Create (if helpful): a small presentational hero component, e.g.
  `src/components/competitions/detail/CompetitionHero.tsx`

**What the mock defines:** the header (`PageHeader` centered variant + organiser gear right-action),
and a status-driven hero: **upcoming** = surface card with green calendar icon + "Nd" countdown pill
(NOT blue); **live** = in-progress emphasis + quick-score entry; **completed** = results emphasis.
`StatusBadge` drives the state; layout switches on competition status on ONE screen (no forked screens).

**Guardrails/watch-outs:**
- Keep the existing gear right-action visible only to organisers (current line 359–368) — it's the only
  entry to Settings.
- Do **not** convert the dynamic tab array to a static list; restyle the `<Tabs>` usage only.
- Keep the `ScorecardsRealtimeSubscription` mounts intact regardless of hero layout.
- Status logic is currently duplicated (screen + `DetailsTab`); prefer reading it once and passing down —
  but do not change WHEN things show, only how they look.

**Steps:**
- [ ] Build the hero/CTA per the mock's three states using tokens + `StatusBadge`; wire the "Nd"
  countdown from the existing start-date data.
- [ ] Restyle `PageHeader` usage (centered + gear) to match the mock.
- [ ] Run `pnpm type-check` + `pnpm lint`; grep the diff for colour literals (expect none).
- [ ] Capture screenshots in solid light + dark for all three states; compare side-by-side to the mock;
  get sign-off.
- [ ] Commit: `feat(design): competition detail chrome + status hero (1A.1)`

### Task 2: Tab bar overflow check

**Files:** Modify `src/components/common/Tabs.tsx` only if needed.
- [ ] Verify the pill `Tabs` scrolls horizontally with up to 8 tabs (organiser team cup shows the most).
  If it doesn't already, add horizontal scroll without changing the pill visual. Confirm no regression
  on 2–3-tab screens (fills width).
- [ ] Screenshot the 8-tab case light+dark; sign-off; commit `fix(ui): tabs horizontal overflow (1A.2)`.

### Tasks 3–11: Per-tab visual passes (one PR each)

For **each** tab below, the loop is identical: restyle the tab's layout to the mock using tokens +
canonical components (`CardContainer`, `SectionHeader`, `EmptyState`, `StatusBadge`, `Pill`), keep all
numbers coming from the existing hooks/utils, verify `type-check`/`lint`/grep-clean, then screenshot
light+dark vs the mock and get sign-off. Commit `feat(design): <tab> tab (1A.N)`.

- [ ] **Task 3 — Details** (`src/components/competitions/detail/DetailsTab.tsx` + `sections/*`). Note:
  the structural config section (`SettingsSection.tsx`) is being **moved out** by Phase 1B.1 — coordinate
  ordering; do not both restyle and relocate it in conflicting PRs.
- [ ] **Task 4 — Rounds** (`detail/RoundsTab.tsx`, `detail/CompetitionRoundCard.tsx`) — status pills,
  points badges, summary strip; keep organiser add/reorder/delete gating.
- [ ] **Task 5 — Leaderboard/Standings** (`components/leaderboard/LeaderboardTab.tsx` + tables). **Largest
  slice — treat as its own sub-project.** It switches per game type (`LeaderboardTable`,
  `TeamLeaderboardTable`, `MatchPlayLeaderboard`, `SubMatchLeaderboardTab`, `TeamHeadToHeadCard`) and
  hosts `LeaderboardViewToggle`. Restyle the shell + each table variant; label flips Standings→Results
  when completed (already wired). Consider splitting into shell + per-table sub-PRs.
- [ ] **Task 6 — Players** (`detail/PlayersTab.tsx`) — player rows w/ `PlayerAvatar`.
- [ ] **Task 7 — Teams** (`detail/TeamsTab.tsx`) — team cards; keep organiser edit gating.
- [ ] **Task 8 — Stats** (`detail/StatsTab/*`).
- [ ] **Task 9 — Breakdown** (`components/competitions/breakdown/BreakdownTab.tsx`).
- [ ] **Task 10 — Payouts** (`detail/PayoutsTab.tsx`) — currency via app util.
- [ ] **Task 11 — Skins** (`detail/SkinsTab.tsx`) — use `skinsColor` by name.
- [ ] **Task 12 — Bracket (knockout)** (`components/knockout/BracketTab.tsx`) — Main/Plate
  `SegmentedButton`; bracket connectors are the one place custom drawing is expected — colours from
  `colors.*`. Champion banner on completed.

### Task 13: Competitor "your team" hero + reduced surface

**Files:** `CompetitionDetailScreen/index.tsx` (role branch), hero component from Task 1.
- [ ] Build the competitor "your team" hero (data already in `useCompetitionDetailData`:
  `userTeamId`/`userTeamName`). Confirm the reduced competitor tab set (Standings/Rounds/Players/Payouts)
  renders — it's produced by the existing conditionals; verify no organiser-only actions leak.
- [ ] Screenshot competitor surface across states light+dark; sign-off; commit `feat(design): competitor your-team hero (1A.13)`.

---

## Self-review checklist (run before calling 1A done)

- [ ] Every mock tab across all three surfaces/states renders and matches (screenshots signed off).
- [ ] Dynamic tab array, status reorder, knockout swap, realtime subs all still work (behaviour unchanged).
- [ ] Grep-clean for colour literals outside `colors.ts`/`theme.ts`. `pnpm lint` + `pnpm verify:gate` pass.
- [ ] Tabs are pills everywhere (no underline crept in). No scoring math added to any component.
- [ ] Solid light + solid dark verified per tab.
