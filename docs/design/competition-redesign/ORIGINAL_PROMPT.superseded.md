# Claude Code task — evolve The Nineteenth's look & feel to the competition redesign, then propagate it app-wide

Paste this whole file to Claude Code as the task brief. Read it top to bottom before writing any code. There is a companion spec in the same folder — **`README.md`** — with the exhaustive token map, component map, and per-screen/per-tab breakdown. This file is the *strategy and scope*; that file is the *reference detail*. Use both.

---

## What you're doing (and why this is different from a normal re-skin)

This is **not** "port three mock screens." It is a **look-and-feel evolution of the app's existing design system**, proven out on the competition-detail surfaces first, then swept across the rest of the app so nothing looks half-migrated.

Two phases, in order:

- **Phase 1 — Establish the new look on the designed screens.** Recreate the redesigned competition-detail experience (organiser team cup, competitor team cup, knockout bracket; upcoming/live/completed states; the expanded settings screen) exactly as the mock shows. This includes **new tab sets and layout changes** per role/state. Land the visual language here first because these screens define it.
- **Phase 2 — Propagate the same language across the codebase.** Do a full sweep of the remaining screens (home, rounds, scoring, leagues, profile, courses, social, subscription, activity, notifications, onboarding…) and bring them up to the same look and feel — same tab pattern, card language, spacing rhythm, header treatment, status/empty/loading conventions — so the app feels like one redesigned product, not one redesigned screen.

The reference is `Competition Details - Redesign.dc.html` (open in a browser; toggle its `dark` prop to verify dark mode). It is an HTML/CSS prototype — read it for **layout, hierarchy, spacing rhythm, type scale, component states, and copy**, never for literal values to paste.

---

## The design language, stated explicitly

These are the deltas that define "the new look." Apply them everywhere, not just on the competition screens.

1. **Segmented-pill tabs are the standard tab pattern.** A `surfaceVariant` track holding pill segments; the selected segment sits on `surfaceSelected` with `primary` text; counts render inline as `Label (n)`. **The existing `src/components/common/Tabs.tsx` already renders exactly this** — so the job is to make `Tabs` the single tab pattern app-wide and retire any bespoke tab bars / underline tab rows / one-off `SegmentedButton`-as-tabs found during the sweep. Sub-scopes within a tab (Net/Gross, Overall/R1/R2, Main/Plate) stay on `SegmentedButton`.
2. **Surface + green card language; no blue.** Cards are `colors.surface` on a `colors.background` page, hairline `colors.border`, `borderRadius.lg`/`xl`, `shadows.sm`. Accent is the brand green (`colors.primary` / `primaryLight`). The old **blue date card is gone** — upcoming states use a surface card with a **green calendar icon + "Nd" countdown pill**. If you find blue accent cards elsewhere in the sweep, migrate them to this language.
3. **Status drives layout, not new components.** upcoming / live / completed change the hero, CTA, and empty content on one screen via competition status + `StatusBadge` — never a forked screen per state.
4. **Consistent header + settings pattern.** `PageHeader` (centered variant, gear/right actions) everywhere; full settings surfaces use grouped `SectionHeader` + list-row/`CardContainer` sections with `ToggleSwitch` rows and a `colors.error` danger footer, wrapped in `SystemModalTheme` when modal.
5. **Rhythm & scale come from tokens.** `spacing`, `typography`, `borderRadius`, `shadows` from `@/constants/theme`; every colour from `useThemeColors()`. Snap the mock's odd paddings (13/14/15px) to the nearest token — see README token map.

---

## How to make a look-and-feel change correctly (the important part)

The last attempt failed by **hardcoding colours and forking components per screen.** Do the opposite: **change the look in shared code, once, and let every screen inherit it.**

- **Evolve the shared component, don't re-skin at the call site.** If the new look needs a different card padding, tab weight, or header treatment, change `CardContainer` / `Tabs` / `PageHeader` (or add a variant prop to them) so all consumers update together. Never copy a component's JSX into a screen to tweak it there.
- **Colour only ever comes from `useThemeColors()`;** static tokens from `@/constants/theme`. Zero hex, `rgb()`, or `var(--…)` in screens. The only literal colours allowed are the named exports already in `theme.ts` (`skinsColor`, `wolfColor`, `featureColors`, `medalColors`) — use them by name.
- **If the new language genuinely needs a token that doesn't exist** (a new radius, a palette key, a shadow), **add it to `theme.ts` / `colors.ts` centrally and STOP to flag it** in your summary — don't scatter one-off values. Changing the design system is allowed *when it's done in the design-system files*; it is never allowed as inline literals in a screen.
- **Never fork a component** into `*V2` / `*New` / `*Redesign`. Extend in place or add a prop.
- **Don't touch scoring/standings math.** Presentational components only; numbers come from existing utils/hooks. See `CLAUDE.md` → "Scoring changes (guardrails)".

---

## Phase 1 — the designed screens (do these first, completely)

Full detail (tab→component map, per-tab gotchas, the settings-screen conflict to flag) is in **`README.md` §Screens** and **§Component map**. Summary of scope:

| Surface | Tab set (new) | Code to modify |
|---|---|---|
| Organiser · team cup | Details · Rounds · Standings · Stats · Breakdown · Payouts · Skins | `screens/competitions/CompetitionDetailScreen/index.tsx` + `components/competitions/detail/*Tab.tsx` |
| Competitor · team cup | Standings · Rounds · Players · Payouts | same screen, role-gated (reduced tabs, "your team" hero, no organiser actions) |
| Knockout bracket | Bracket (+ Main/Plate `SegmentedButton`), Standings/Players as shown | `components/knockout/BracketTab` + detail screen |
| Competition settings (gear) | grouped sections — **extend the existing screen** | `screens/competitions/CompetitionSettingsScreen/index.tsx` |

Critical carry-overs from README (don't rediscover the hard way):
- **"Standings" and "Results" are the same tab = `LeaderboardTab`;** label flips to "Results" when completed. It is NOT a component called "Standings" — this is the tab that got missed last time. Confirm every tab label resolves to a rendered component.
- The Ryder-Cup round switcher inside Standings is `LeaderboardViewToggle` + leaderboard hooks, not a new screen.
- The **settings screen already exists** as a modal route — extend it (add Visibility / Notifications toggles / Manage-organisers), reuse its existing edit sheets and delete flow, keep `SystemModalTheme`. The mock also relocates Dates/Scoring/Handicap/Tie-break into settings — **those currently live on the Details tab; flag this as a product decision and confirm before moving, don't duplicate.**

## Phase 2 — sweep the rest of the app

After Phase 1 is visually consistent and passing, go screen-directory by screen-directory under `src/screens/` and bring each up to the new language. Method:

1. **Inventory first.** List each screen area and note where it diverges from the new language: bespoke tab bars, blue/legacy accent cards, ad-hoc headers, hardcoded colours, one-off spacing, inconsistent empty/loading/error states. Produce this inventory as a checklist in your summary before editing so scope is visible.
2. **Fix centrally where possible.** Most divergence should resolve by routing screens through the now-canonical `Tabs`, `CardContainer`, `PageHeader`, `StatusBadge`, `EmptyState`, `ErrorState`, `LoadingSpinner`, `ToggleSwitch`. Replace bespoke equivalents with these.
3. **Grep-driven cleanup.** Search the whole `src/` for hardcoded colour literals (`#`, `rgb(`, `rgba(`) and legacy blue accents; migrate them to tokens. Search for custom tab implementations and replace with `Tabs`.
4. **Per-area passes**, roughly in priority order: home → rounds/scoring → leagues → competitions (non-detail) → profile → courses → social → subscription → activity/notifications → onboarding/auth. Keep each area's information architecture; change only the look-and-feel skin unless the mock implies a layout change that clearly generalises.
5. **Verify light + dark** after each area.

Don't rewrite business logic, navigation structure, or data hooks during the sweep — this is a visual/layout consistency pass.

---

## Guardrails (blocking — from README §Hard rules)

- No hardcoded colours anywhere; `useThemeColors()` only. Grep your diff for `#`, `rgb(`, `var(--`.
- No forked/duplicated components; reuse + extend in place.
- No scoring/standings math in presentational components.
- Follow the required component pattern from `CLAUDE.md` (functional, `const colors = useThemeColors()`, inline colour props, static tokens in `StyleSheet.create`, Paper `Text`/`Icon`, `TouchableOpacity` not Paper `Button`).
- Modal/sheet screens wrapped in `SystemModalTheme`.
- Australian conventions: `DD/MM/YYYY`, AUD.
- Any new design-system token added centrally must be flagged in your summary.

## Definition of done

- [ ] Phase 1: all three surfaces × three states × their full (new) tab sets recreated in the existing screens/components; no partial screens; every tab label resolves to a rendered component (double-check Standings/Results → `LeaderboardTab`).
- [ ] Settings screen extended (not recreated) with new sections/toggles, existing edit + delete flows reused, `SystemModalTheme` intact; Dates/Scoring/Handicap overlap flagged, not duplicated.
- [ ] The new look lives in shared components/tokens — screens inherit it; no per-screen re-skins.
- [ ] Phase 2: inventory checklist produced; each screen area swept and passing; bespoke tab bars / legacy accent cards / hardcoded colours migrated.
- [ ] Zero hardcoded colours (grep-clean). No forked components. No scoring math moved.
- [ ] Light and dark both correct across Phase 1 and Phase 2 screens.
- [ ] `pnpm lint` and `pnpm type-check` pass.
- [ ] Summary lists: any centrally-added tokens, the settings-screen product decision flagged, and the Phase 2 inventory with what changed per area.
