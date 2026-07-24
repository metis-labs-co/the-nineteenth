# Handoff: Competition Details Redesign

> ⚠️ **This is the original vendor handoff. `PLAN.md` is authoritative and corrects it.**
> Verified-wrong claims below — see `PLAN.md` §"Review corrections" for the resolutions:
> - "Segmented-pill / `Tabs`" fidelity vs the mock's underline tabs — **decision: keep pills** (#1).
> - Settings as a `presentation:'modal'` route requiring `SystemModalTheme` — **it's a pushed
>   screen** (#2).
> - New settings ("add a mutation") — **need schema + product spec first** (#3).
> - "Tab content uses the standard fade `Tabs` animates" — **`Tabs` has no content fade** (#4).
> - Token map collapsing the mock's neutrals — **use the explicit collapse table** (#5).
> - "Mock follows AU conventions / AUD" — **the mock is £-denominated; use app currency** (#7).
> The real reason the last attempt failed was a **palette/surface mismatch**, not just hardcoding —
> see `PLAN.md` §"Why the last two attempts failed".

> **Read this whole file before writing any code.** The first implementation
> attempt failed because it hardcoded colours and replaced existing components.
> This document tells you exactly what to reuse, what NOT to touch, and how to
> match the app's conventions. Treat the "Hard rules" section as blocking.

---

## Overview

A visual + interaction redesign of the **competition detail experience** in
*The Nineteenth* (React Native / Expo golf-competition app). The redesign
covers three phone surfaces, each across three competition states
(upcoming / live / completed):

1. **Organiser — team cup** (multi-round, Ryder-Cup-style standings)
2. **Competitor — team cup**
3. **Knockout bracket**

Plus role-specific tab sets, the organiser actions, and an **expanded competition
settings screen** reached from the header gear icon (the screen already exists —
the redesign grows it; see §4).

A **dark-mode** version of every surface is available by toggling the `dark`
prop on the main design file. The app already supports light/dark via
`useThemeColors()` — the dark variant exists only so you can verify contrast;
you do **not** build a second set of components for dark mode.

---

## ⚠️ About the design files — READ FIRST

The `.dc.html` files in this bundle are **design references**, not code to port.
They are HTML/CSS prototypes that show the intended **look, hierarchy, spacing,
copy, and interactions**. They use CSS custom properties (`var(--c-…)`), inline
styles, and hardcoded hex values **because that is how an HTML prototype works** —
**none of those values should appear in the React Native code.**

Your job is to **recreate these designs inside the existing
`the-nineteenth` codebase**, using its established components, theme tokens, and
patterns. This is a *re-skin / re-layout of screens that already exist*, not a
greenfield build.

The relevant existing code lives at:

| Design surface | Existing code to modify |
|---|---|
| Competition detail (all tabs) | `src/screens/competitions/CompetitionDetailScreen/index.tsx` |
| Individual tabs | `src/components/competitions/detail/*Tab.tsx` |
| Settings screen (already exists — extend) | `src/screens/competitions/CompetitionSettingsScreen/index.tsx` |
| Knockout bracket | `src/components/knockout/` |
| Breakdown / ringer / stats | `src/components/competitions/{breakdown,ringer,detail/StatsTab}/` |

**Modify these files in place.** Do not create parallel `*V2`, `*New`, or
`*Redesign` components and swap them in.

---

## Fidelity: HIGH

These are hi-fi mockups — final layout, spacing rhythm, type hierarchy,
component states, and copy are all intentional. Match them closely. But
"match closely" means **reproduce the visual result using the app's own
tokens and components** — not copy pixel values. See the token map below to
translate every measurement in the HTML into a theme token.

---

## 🚫 Hard rules (these are why the last attempt failed)

1. **NEVER hardcode a colour.** No hex codes, no `rgb()`, no `var(--c-…)` copied
   from the HTML. Every colour comes from `const colors = useThemeColors();`
   (e.g. `colors.surface`, `colors.textPrimary`, `colors.primary`). Static
   tokens (`spacing`, `typography`, `borderRadius`, `shadows`) are imported from
   `@/constants/theme`. The only pre-approved literal colours in the whole app
   are the feature constants already exported from `theme.ts`
   (`skinsColor`, `wolfColor`, `featureColors`, `medalColors`) — use those by
   name, don't re-type their hex.
   - If a colour in the mock has no matching token, **stop and ask** rather than
     inventing one. Do not add new keys to the palette without flagging it.

2. **NEVER replace or re-implement an existing component.** Before building any
   UI element, check the "Component map" below and search
   `src/components/common` and `src/components/competitions`. If a component
   exists (tabs, badges, cards, toggles, avatars, segmented controls, headers,
   empty states…), **use it and pass props**. Extend it with a new prop only if
   truly necessary — never fork it.

3. **NEVER re-implement scoring/standings math in a presentational component.**
   Numbers come from existing utils/selectors/hooks. Cards are presentational.
   See `CLAUDE.md` → "Scoring changes (guardrails)" and
   `docs/guides/SCORING_ARCHITECTURE.md` before touching anything that computes
   points, margins, handicaps, or leaderboard order.

4. **Follow the required component pattern** from `CLAUDE.md` exactly: functional
   component, `const colors = useThemeColors()`, colour props applied inline
   `style={[styles.x, { backgroundColor: colors.surface }]}`, static tokens in
   the `StyleSheet.create` block. Use **React Native Paper** `Text`/`Icon`, and
   **`TouchableOpacity` for buttons — never Paper's `Button`.**

5. **Modal/sheet screens must be wrapped in `<SystemModalTheme>`** (from
   `@/components/common`) when presented as `presentation: 'modal'` or inside an
   RN `<Modal>`. ⚠️ **CORRECTED (PLAN #2):** the settings screen is **NOT** a modal route (it's a
   pushed stack screen in `RootNavigator`), so this rule does **not** apply to the screen — but it
   **does** apply to any bottom sheets in this redesign.

6. **Australian conventions:** dates `DD/MM/YYYY`, currency via the app's
   `formatCurrency`. ⚠️ **CORRECTED (PLAN #7):** the mock is the UK-themed "Severn Cup" and is
   **£-denominated** — it does **not** follow AUD. Do not copy the `£`; use the app's currency util.

7. **Do the whole redesign.** The previous attempt did a few screens partially.
   Every surface + state + tab in the "Screens" section must be completed and
   visually consistent before you consider this done.

---

## Token map — translate the HTML into the codebase

Use this to convert every value you see in the `.dc.html` into a real token.
Do **not** eyeball new numbers; snap to the scale.

### Colours (HTML var → `colors.<key>` from `useThemeColors()`)

| HTML prototype role | Use this theme token |
|---|---|
| Screen background (`--c-screen`, page bg) | `colors.background` |
| Card / section surface (`--c-surface`, `#fff`) | `colors.surface` |
| Raised / elevated card | `colors.surfaceElevated` |
| Tinted inset / track (`--c-tint`, `--c-disabled-bg`) | `colors.surfaceVariant` |
| Primary text (`--c-text`, `#141b10`) | `colors.textPrimary` |
| Secondary / muted text (`--c-muted`, `--c-text-med`) | `colors.textSecondary` |
| Faint labels / chevrons (`--c-label`, `--c-chevron`) | `colors.textTertiary` |
| Primary green (`--c-primary`, `--c-on-green`, `#6eac4d`/`#4e7d34`) | `colors.primary` |
| Green tint chips (`--c-green-tint`) | `colors.primaryBackground` — **NOT** `primaryLight` (that's an accent). ⚠️ CORRECTED (PLAN #9/#12): dark chip is hard-set to `#21301a` (the formula gives too-dark `#16220f`). |
| Borders / dividers (`--c-border`, `--c-tint` hairlines) | `colors.border` |
| Danger / delete (`--c-danger`, `#d24b4b`) | `colors.error` |
| Skins gold accents | `skinsColor` (imported from `@/constants/theme`) |
| Medal/podium (1st/2nd/3rd) | `medalColors.gold/silver/bronze` |
| Score colours (birdie/par/bogey) | `colors.birdie` / `colors.par` / `colors.bogey` / `colors.doubleBogey` |

> The blue date card in the original mock was **removed** — the upcoming card now
> uses the surface + green-tint language (green calendar icon, "Nd" countdown
> chip). Match that; do not reintroduce a blue accent.

### Spacing (px in HTML → `spacing.*`)

`2→xxs · 4→xs · 8→sm · 12→md · 16→lg · 20→xl · 24→xxl · 32→xxxl · 40→huge · 48→massive`
Snap odd values (13, 14, 15px paddings in the mock) to the nearest token.

### Radius (px → `borderRadius.*`)

`4→sm · 8→md · 12→lg · 16→xl · 20→xxl · 24→xxxl · 9999→full`
(Mock uses 11–18px on cards/chips → `lg`/`xl`; pills → `full`.)

### Typography (map to `typography.*` from theme)

`display(40) · h1(32) · h2(24) · h3(20) · h4(18) · body(16) · bodyBold(16/600) · small(14) · smallBold(14/600) · caption(12) · captionBold(12/600)`
The mock's 15px/800 titles → `bodyBold`; 12.5px muted subtitles → `caption`;
uppercase section labels → `captionBold` + `textTertiary` + letterSpacing.

### Shadows

Cards in the mock (`0 1px 2px rgba(...)`) → `shadows.sm`. Don't invent shadows;
use `shadows.sm/md/lg`. Respect `CardContainer`'s `elevated` prop instead of
hand-rolling shadow where you use that component.

---

## Component map — what to reuse (do NOT rebuild these)

All are exported from `@/components/common` (verify props in the source before
use). Prefer these over any hand-built equivalent seen in the HTML.

| Design element in the mock | Existing component | Key props |
|---|---|---|
| Screen header + back + gear/right actions | `PageHeader` | `title`, `subtitle`, `showBack`, `onBack`, `variant="centered"`, `rightActions`, `infoAction` |
| Tab bar (Details/Rounds/Standings/…) | `Tabs` | `tabs=[{key,label,count?}]`, `selectedTab`, `onTabChange`, `size` |
| Segmented toggle (Net/Gross, Main/Plate, scope) | `SegmentedButton` | `value`, `onValueChange`, `buttons=[{value,label,icon?}]`, `size` |
| Status chip (Upcoming/Live/Completed) | `StatusBadge` | `status`, `size` (maps state → colour automatically) |
| Generic labelled chip / count pill | `Pill` / `Badge` | see source |
| Section card / row container | `CardContainer` | `padding`, `noBorder`, `elevated`, `onPress`, `swipeable` |
| Titled section with header row | `SectionHeader` / `InfoCard` | `title`, `action`, … |
| Settings toggle rows | `ToggleSwitch` | `value`, `onValueChange`, `disabled`, `accessibilityLabel` |
| Player row w/ avatar + meta | `PlayerAvatar` (+ existing row patterns) | `player`, `size` |
| Winner / podium row | `WinnerRow` | `WinnerInfo` |
| Progress / round completion bar | `ProgressBar` | `progress`, … |
| Empty tab / no-data | `EmptyState` | `icon`, `title`, `message`, `action` |
| Game-type indicator | `GameIndicatorBadge` | see source |
| Segmented list filters | `FilterPill` | see source |

### ⚠️ Tab label → component map (READ — a tab was missed last time)

The mock's tab **labels do not always match the component file names.** The last
implementation **failed to build the Standings tab** because it searched for a
"Standings" component and there isn't one — it's called `LeaderboardTab`. Map
every tab explicitly:

| Tab label in mock | Existing component to render | Import from |
|---|---|---|
| **Standings** / **Results** (completed) | **`LeaderboardTab`** | `@/components/competitions/detail` (re-exported from `@/components/leaderboard`) |
| Details | `DetailsTab` | `@/components/competitions/detail` |
| Rounds | `RoundsTab` | `@/components/competitions/detail` |
| Players | `PlayersTab` | `@/components/competitions/detail` |
| Teams | `TeamsTab` | `@/components/competitions/detail` |
| Stats | `StatsTab` | `@/components/competitions/detail` |
| Breakdown | `BreakdownTab` | `@/components/competitions/breakdown` |
| Payouts | `PayoutsTab` | `@/components/competitions/detail` |
| Skins | `SkinsTab` | `@/components/competitions/detail` |
| Bracket (knockout) | `BracketTab` | `@/components/knockout` |

Rules for tabs:
- **"Standings" and "Results" are the same tab** (`LeaderboardTab`) — the label
  changes to "Results" only when the competition is completed. Wire the label off
  status; render `LeaderboardTab` for both. Do **not** create a new component.
- The Ryder-Cup **round switcher** inside Standings (Overall / R1 / R2 / …) is a
  view scope within `LeaderboardTab` — use the existing
  `LeaderboardViewToggle` / leaderboard hooks (`useCompetitionLeaderboard`),
  not a new standings screen.
- Every tab the mock shows for a role **must be present in `CompetitionDetailScreen`'s
  tab array and its render switch.** Confirm each label above resolves to a
  rendered component before you finish — the Standings/Results tab is the one to
  double-check.

Competition-specific existing pieces to reuse/extend rather than replace:
`CompetitionListCard`, `CompetitionMiniLeaderboard`,
`components/competitions/detail/*Tab.tsx`,
`components/competitions/breakdown/`, `components/competitions/ringer/`,
`components/knockout/BracketTab`, `components/leaderboard/*`.

If the mock shows a component variant these don't cover, **add a prop/variant to
the existing component** — don't create a competing one.

---

## Screens / Views

For each, the HTML reference file + the code file to modify. Layout, copy, and
states are defined by the mock; this section calls out intent and gotchas.

### 1. Competition Detail — Organiser, Team Cup
- **Ref:** `Competition Details - Redesign.dc.html` (organiser phone)
- **Code:** `CompetitionDetailScreen/index.tsx` + `detail/*Tab.tsx`
- **Tabs:** Details · Rounds · Standings · Stats · Breakdown · Payouts · Skins
- **States:** upcoming / live / completed (drive off competition status; reuse
  `StatusBadge`).
- **Notes:**
  - Upcoming **Details** card = surface + green calendar icon + "Nd" countdown
    chip (NOT blue). Sits above the Manage/Scoring cards.
  - Standings is Ryder-Cup style (team points vs par). Points come from existing
    standings util — presentational only.
  - Header gear opens the **Settings screen** (see §4).

### 2. Competition Detail — Competitor, Team Cup
- **Ref:** `Competition Details - Redesign.dc.html` (competitor phone)
- **Code:** same screen, role-gated (competitor sees a reduced tab set +
  "your team" hero; no organiser actions).
- **Tabs:** Standings · Rounds · Players · Payouts
- **Notes:** the "your team" hero card is the primary hierarchy anchor — keep it
  visually dominant. Reuse `CompetitionMiniLeaderboard` where it fits.

### 3. Competition Detail — Knockout Bracket
- **Ref:** `Competition Details - Redesign.dc.html` (knockout phone)
- **Code:** `components/knockout/BracketTab` + detail screen
- **Notes:** Main/Plate switch = `SegmentedButton`. Champion banner on completed
  state. Bracket lines/connectors are the one place custom drawing is expected —
  keep colours from `colors.*`.

### 4. Competition Settings (EXPAND existing screen — from header gear)
- **Ref:** organiser phone, settings screen (gear → full-screen settings)
- **Code:** `CompetitionSettingsScreen/index.tsx` — **this screen already exists.**
  Extend it; do not create a new one.
- **How it opens:** the header gear calls
  `navigation.navigate('CompetitionSettings', { competitionId })`. ⚠️ **CORRECTED (PLAN #2):** it is
  registered in `RootNavigator` as a **normal pushed stack screen — NOT `presentation: 'modal'`**.
  So `<SystemModalTheme>` is **not** required on the screen itself; it **is** still required on any
  bottom sheets it opens. (The original "modal route… applies (not optional)" claim was wrong.)
- **What already exists in it:** organiser-only edit of name & description
  (via `EditNameSheet` / `EditDescriptionSheet` from
  `components/competitions/detail/sections/sheets`), invite-code sharing,
  WhatsApp link, prize-pool editing (`EditPrizePoolBottomSheet`), and delete
  competition (`useDeleteCompetition`). **Reuse these — don't re-implement.**
  It uses `PageHeader`, `SectionHeader`, `ConfirmationDialog`.
- **⚠️ Conflict to resolve, don't guess:** the mock's settings screen also shows
  **Dates, Scoring model, Handicap allowance, Tie-break**. Today those edits
  live on the **Details tab**, not in settings (see the screen's own docstring).
  Moving them into settings is a product decision — **flag it and confirm with
  the owner before relocating**; do not silently duplicate the controls in both
  places.
- **New sections the redesign adds:** Visibility (public leaderboard, allow
  guests — `ToggleSwitch`), Notifications (round reminders, live score alerts,
  results summary — `ToggleSwitch`), Manage organisers row. ⚠️ **CORRECTED (PLAN #3):** only the
  **Visibility → public** toggle is buildable now (reuses the existing `visibility` field). **Allow
  guests, the notification toggles, and multiple organisers do NOT exist in the schema** —
  `organizer_id` is a single UUID. "Add a settings mutation" is **insufficient**: these need a
  schema/migration, RLS/permissions, notification-trigger behaviour, and tier-gating specced first.
  **Stub or omit them until specified** — do not fake persistence.
- **Notes:** rows use `SectionHeader` + list-row / `CardContainer` pattern;
  toggles use `ToggleSwitch`; delete/danger uses `colors.error`. Respect
  subscription tier gating (`useCheckFeature` / `useTierLimits`) for
  guest/visibility features — see `SUBSCRIPTION_TIERS.md`.

---

## Interactions & Behavior
- **Tab switching:** `Tabs.onTabChange` → local state. ⚠️ **CORRECTED (PLAN #4):** `Tabs` does **not**
  fade content — `animated` only runs `LayoutAnimation` on the tab bar before `onTabChange`; it
  renders no content. There is **no built-in content transition**; don't rely on one (content
  transitions are out of scope).
- **Segmented toggles** (Net/Gross, Main/Plate, scope): controlled via
  `SegmentedButton`.
- **Settings toggles:** optimistic local state → persist via the settings
  screen's existing hooks (`CompetitionSettingsScreen/hooks`). ⚠️ **CORRECTED (PLAN #3):** for the
  spec-blocked settings (guests/notifications/organisers) a mutation is **not** enough — they need a
  data model first; build only the Visibility toggle until specced. Reuse the existing edit sheets
  (`EditNameSheet`, `EditDescriptionSheet`, `EditPrizePoolBottomSheet`) for
  name/description/prize edits rather than building new editors.
- **Row taps** (settings edit rows, player rows): navigate or open existing
  sheets/modals — reuse `SelectionModal`, `BottomSheet`, `ConfirmationDialog`.
- **Destructive actions:** `ConfirmationDialog` before archive/delete.
- **State-driven layout:** upcoming vs live vs completed changes hero/CTA/empty
  content — gate on competition status, not new components.
- **Loading / error / empty:** reuse `LoadingSpinner` / `ErrorState` /
  `EmptyState` — the mock's populated states imply these exist.

## State Management
- Server data via existing React Query hooks (`useCompetitionDetailData`,
  `useCompetitionDetailHandlers`, `useCompetitionSkinsGames`, etc.) — don't add
  new fetching for data that's already loaded.
- Local UI state (selected tab, segmented value, toggle optimistic state) via
  `useState`. ⚠️ **CORRECTED (PLAN #3):** there is no single "existing settings mutation" that covers
  the new fields — guests/notifications/organisers have no data model yet (see PLAN #3). Only the
  Visibility control persists today, and it maps to a **3-state** `visibility` enum, not a boolean
  (see PLAN #14).
- Client state that's global stays in Zustand where it already is.

## Assets
- Icons: **React Native Paper `Icon`** with Material Community icon names (the
  mock's inline SVGs map to MCI names — pick the closest, e.g. calendar,
  cog/gear, trophy, chevron-right, archive-outline, trash-can-outline).
- Logos/brand: use existing `Logo` / `LogoHorizontal` / brand config; never
  re-import raw SVGs for brand marks.
- No new image assets are required by this redesign.

## Design Tokens
All tokens are already defined — **do not add new ones without flagging.**
Source of truth: `src/constants/theme.ts` (spacing, typography, borderRadius,
shadows, iconSizes, buttonSizes, layout, feature/medal colours) and
`src/constants/colors.ts` (light/dark palettes via `useThemeColors()`).

## Files in this bundle
- `Competition Details - Redesign.dc.html` — the reference (all three phones, all
  states, all tabs, settings screen). Toggle its `dark` prop for the dark-mode
  variant used to verify contrast.
- `Competition Details - Redesign v1 (single-format).dc.html` — earlier
  single-format variant, for context.
- `Score & Round - Redesign.dc.html` — adjacent scoring/round reference (context
  for shared components; not part of this scope unless stated).
- `support.js` — runtime for the HTML prototypes (lets them open in a browser).

> The HTML files are Design Component prototypes. To view one, open it directly
> in a browser. Read them for **layout, spacing rhythm, hierarchy, copy, and
> states** — then translate to RN via the token/component maps above.

---

## Definition of done
- [ ] All three phones × three states × their full tab sets recreated in the
      existing screens/components — no partial screens.
- [ ] Settings screen **extended (not recreated)**, reusing its existing edit sheets/delete flow.
      ⚠️ **CORRECTED (PLAN #2/#3):** it's a **pushed** screen (no `SystemModalTheme` on the screen —
      only on its bottom sheets), and only the Visibility toggle is built now; guests/notifications/
      organisers are deferred pending a data-model spec. The Details-tab-vs-settings overlap
      (dates/scoring/handicap) was flagged to the owner rather than duplicated.
- [ ] Zero hardcoded colours — every colour via `useThemeColors()` /
      named theme constants. (`grep` your diff for `#`, `rgb(`, `var(--`.)
- [ ] No existing component replaced/forked; reuse confirmed against the
      component map.
- [ ] Light and dark both look correct (toggle the theme in-app, compare to the
      `dark` prop variant of the reference).
- [ ] **Standings/Results tab renders** — confirm the "Standings" (and
      "Results" when completed) tab maps to `LeaderboardTab` and is present in the
      tab array + render switch for every role. (This was missed last time.)
- [ ] Every tab label in the mock resolves to a rendered component (see the tab
      label → component map) — no dead/blank tabs.
- [ ] No scoring/standings math added to presentational components.
- [ ] `pnpm lint` and `pnpm type-check` pass.
