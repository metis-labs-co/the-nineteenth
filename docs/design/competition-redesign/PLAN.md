# Competition redesign — plan (fidelity-corrected, v2.1)

Read this whole file before writing any code. It supersedes
[`ORIGINAL_PROMPT.superseded.md`](./ORIGINAL_PROMPT.superseded.md). It works **together with
[`SPEC.md`](./SPEC.md)** (the design handoff), which remains the correct reference for per-tab
detail (token map, component map, tab-label→component map, settings §4) — with **one correction**
stated below. The mocks it refers to live in [`./mocks/`](./mocks/) (open the `.dc.html` files in a
browser; toggle each file's `dark` prop for the dark variant).

---

## Why the last two attempts failed — the real, verified root cause

The prior implementation was merged (`f16e59a6`) then reverted (`55bafc4e`) because **it did not
look like the mocks.** `SPEC.md` blamed "hardcoded colours + forked components." That was a
symptom, not the cause. The verified cause is a **palette + surface-model mismatch** between the
mock and the app's tokens:

1. **The mock is a bespoke green-tinted neutral palette.** Its greys carry a deliberate olive
   cast — text `#141b10`, muted `#7a8472`, label `#8a9382`, border `#e7ebe2`, tints
   `#f2f4ef`/`#eef5e8`. That warmth *is* the design's character.
2. **The app's solid tokens are pure neutral greys.** In `src/constants/colors.ts`, solid light
   mode resolves `surface=grays.white`, `surfaceVariant=grays.gray200`, `border=grays.gray200`,
   `textSecondary=grays.gray500`, `textTertiary=grays.gray400` — no green.
3. So `SPEC.md`'s own crosswalk ("map `--c-muted #7a8472` → `colors.textSecondary`") maps a
   green-tinted neutral onto a **pure grey**. Repeated across every surface/border/text level, the
   output converges on the *existing app look*, not the mock. **The "reuse existing tokens, never
   add palette keys, stop-and-ask" rule, followed faithfully, guarantees the miss** — the mock's
   neutrals simply aren't in the app.
4. **Compounding it:** the app's surfaces are user-configurable — `surfaceStyle` (solid/translucent)
   × `backdropStyle` (image/none). Translucent+image renders cards as frosted glass over a
   *photograph*; translucent+none as a lime wash. The mock is **solid opaque** always. The same
   code renders wildly differently by user setting, and only one setting could ever match the mock.

**Correction to `SPEC.md`:**
- `SPEC.md` is right that `spacing` / `borderRadius` / `typography` already map cleanly — **do not
  add scale tokens.**
- `SPEC.md` is wrong that the palette needs no change. **The neutral palette genuinely must change**
  to hit the mock. That change is the core of Phase 0 below. (Where `SPEC.md`'s Hard Rule 1 says
  "if a colour has no matching token, stop and ask" — this plan *is* that answer for the neutral
  palette: retune it, per the owner decision below.)

---

## The decision (from the owner) — scope of the palette change

> Make the mock's styling the **default for solid light mode**. Adapt the appropriate changes into
> **solid dark mode**. **Defer** any translucent / photo-backdrop reconciliation to a **later
> phase** (not this job).

Consequences, binding:
- Phase 0 retunes **only the solid-mode branch** of the light palette to the mock's green-tinted
  neutrals, then adapts solid dark. **Leave the `translucent` branches** (`withOpacity(...)`, image
  frosted-glass) **exactly as they are.** The backdrop/translucency feature keeps working unchanged.
- **Known spillover (expanded in Review corrections #10):** `background` (non-image),
  `surfaceElevated`, and all text tokens are *not* branched on surface mode, so the retune also
  applies to translucent (non-image) light **and** dark. Accepted + documented — do **not** add
  solid-only branching unless the owner asks. Only the `tinted.*` surface/border tokens stay
  solid-only.

---

## Review corrections (2026-07-24) — these supersede `SPEC.md` where they conflict

A review found seven issues in this plan + `SPEC.md`, all verified against the code/mock. Resolutions:

1. **Tabs — keep pills (owner decision).** The mock uses transparent **underline** tabs with pill
   count badges; the app's shared `Tabs` renders **filled pills** (verified `Tabs.tsx`). **Decision:
   keep the pill `Tabs` app-wide; treat the mock's underline treatment as a prototype artifact.** A
   deliberate, accepted divergence from the mock on tab chrome only. Do **not** restyle `Tabs` to
   underline and do **not** hand-roll underline tabs per screen. Count renders inline as `Label (n)`
   (the component's behaviour), not the mock's separate badge.
2. **Settings is NOT a modal route.** `CompetitionSettings` is a normal pushed stack screen
   (`RootNavigator.tsx` — no `presentation:'modal'`). **Keep it pushed; drop the `SystemModalTheme`
   requirement for the screen.** `SystemModalTheme` still applies to any **bottom sheets** opened
   from it (those are real modals) — just not the screen itself. Override only if you deliberately
   convert it to a modal route.
3. **New settings need data-model/product spec before Phase 1 — "add a mutation" is insufficient.**
   `visibility` already exists on Competition (reuse it). But **allow-guests, the three competition
   notification settings, and multiple organisers do NOT exist** (`organizer_id` is a single UUID).
   Before those ship, specify: schema/migration, persistence + permissions (RLS), notification
   trigger behaviour, and subscription-tier gating. **Prerequisite — until specified, build only the
   Visibility toggle (existing field) + the existing edit/delete flows; stub or omit the rest.**
4. **`Tabs` does not fade content.** `animated` only runs `LayoutAnimation` on the tab bar before
   `onTabChange`; it renders no content. `SPEC.md`'s "content swaps with the standard fade the Tabs
   component already animates" is false. **There is no built-in content transition — don't rely on
   one.** Content transitions are out of scope (the screen would own one if ever wanted).
5. **Palette neutral collapse — explicit mapping (fixes the `textTertiary` double-assignment).** The
   mock has ~10 neutral roles; the app has 4 text tokens. Collapse them as:

   | Mock roles | App token |
   |---|---|
   | `--c-text`, `--c-text-hd`, `--c-text-med` | `textPrimary` |
   | `--c-text2`, `--c-muted`, `--c-muted2` | `textSecondary` |
   | `--c-label`, `--c-faint`, `--c-faint2`, `--c-chevron` | `textTertiary` |

   Accepted losses (flag in the changelog): `text-med` emphasis merges into `textPrimary`; chevrons
   render at `textTertiary` (darker than the mock's faint `#cfd6c8`). This replaces the ambiguous
   `textTertiary` row in the Phase 0 table below.
6. **Solid dark targets are exact — from the mock's `themeDark` block.** Do not hand-wave "adapt".
   Use these (replaces Phase 0 step 2's prose):

   | Token | Dark target | Mock var |
   |---|---|---|
   | `surface` / `surfaceElevated` | `#1c281a` | `--c-surface` |
   | `surfaceVariant` | `#232f20` | `--c-tint` |
   | `surfaceSelected` | `#24331b` | `--c-sel` |
   | `background` | `#0e140d` | `--c-screen` |
   | `border` | `#2d3b27` | `--c-border` |
   | `borderLight` | `#26331f` | `--c-border-h` |
   | `textPrimary` | `#eef3ea` | `--c-text` |
   | `textSecondary` | `#909e7c` | `--c-muted` |
   | `textTertiary` | `#8b9980` | `--c-label` |
   | `primary` | `#8bc26e` | `--c-primary` |
   | `primaryBackground` (green-tint chip **bg**) | `#21301a` | `--c-green-tint` |
   | green icon/text on chip (**foreground**) | `#a9d38a` (→ `primary` / `primaryLight`) | `--c-on-green` |

   Verify each pairing meets WCAG AA against its surface and record the ratios in the changelog.
7. **Currency — use the app's convention, not the mock's £.** The mock is the UK-themed "Severn Cup";
   its `£` is thematic. Amounts go through the existing `src/utils/currency.ts` `formatCurrency` util
   (app-wide symbol). Do **not** hardcode `£`, and do **not** introduce per-competition currency
   unless the owner asks.

### Round 2 (2026-07-24)

8. **Light text contrast — fix the secondary regression; exempt tertiary (owner decision).** The
   mock's muted greens fail WCAG AA for normal 12–14px text. `textSecondary #7a8472` (3.91 on white)
   would regress today's passing `#6b7280` (4.83), so meet AA — **use `#66705c`** (5.20 on `#fff`,
   **4.73 on the page background `#f3f4f6`**). NB: the first candidate `#6c7566` passed on white
   (4.80) but **failed on `#f3f4f6` (4.36)** — since `textSecondary` renders directly on the page
   background, the target must clear AA on **both** surfaces (see #13). `textTertiary #8a9382`
   (3.19) still fails but beats today's `#9ca3af` (2.54); **keep the mock value as a documented
   exception** — but it is **not** currently usage-limited (see #14). Record final ratios in the
   changelog.
9. **`primaryLight` must not double as the green-tint surface.** `primaryLight` (`#8bc26e`) is a
   widely-used **accent** (and happens to be the mock's *dark* primary) — it cannot also be the pale
   chip background, and it cannot be both a dark foreground and a dark background. Use
   **`primaryBackground`** for green-tint chip **surfaces** and leave `primaryLight` as an accent.
   Exact values (see #12 for why the dark formula can't be trusted):
   - **Light chip bg:** `primaryBackground` = `adjustLightness(primary,.95)` = `#f1f7ed` — accept
     (≈ mock `#eef5e8`, imperceptible).
   - **Dark chip bg:** **hard-set `#21301a`** (mock). Do **not** use `darkenColor(primary,.8)` — it
     yields `#16220f`, which is *darker* than the dark surface `#1c281a` and reads as a hole, not a
     raised tint.
   - **Green icon/text on the chip (foreground):** `primaryDark` (light) / a bright green such as
     `primary` (dark), verified AA against the chip.
10. **Retune spillover is broader than "text in light".** `background` (non-image), `surfaceElevated`,
    and **all** text tokens are **not** branched on `surfaceStyle` (`colors.ts`), so the solid retune
    also shifts **translucent (non-image)** light **and** dark. The surface/border tokens that *are*
    branched (`tinted.*`) stay solid-only. **Decision: accept + document** — in translucent+image,
    `background` is already `transparent` and surfaces are frosted, so only bg(non-image)/elevated/
    text move, keeping the neutral family consistent; solid-only branching for these adds complexity
    for little gain. (Override for strict isolation.) Supersedes the narrower spillover note in §The
    decision.
11. **`SPEC.md` corrected inline.** Its stale directives (settings modal + `SystemModalTheme`,
    "add a mutation"/build-all-settings, tab content fade, and its DoD) are annotated in `SPEC.md`
    itself — not just flagged here — because Phase 1 follows its screen sections closely. Use
    `SPEC.md` **except where these corrections apply.**

### Round 3 (2026-07-24)

12. **`primaryBackground` formulas drift from the mock — specify exact values.** Verified:
    `adjustLightness(primary,.95)` = `#f1f7ed` (≈ mock `#eef5e8`, accept) but `darkenColor(primary,.8)`
    = `#16220f` (mock `#21301a`), which is *darker than the dark surface* — wrong for a tint chip.
    **Light: accept the formula output. Dark: hard-set `#21301a`.** Do not change the shared
    `primaryBackground` formula (other consumers) — set the dark chip value explicitly where used.
    (Folded into #9.)
13. **`textSecondary` must clear AA on the page background, not just white.** `#6c7566` was 4.36 on
    `#f3f4f6` (fail). Final target **`#66705c`** clears both (`#fff` 5.20, `#f3f4f6` 4.73). (Folded
    into #8.)
14. **The tertiary exception is NOT usage-limited today — add a Phase 2 audit.** `textTertiary` is
    already used app-wide for meaningful text (weather values, handicap details, descriptions,
    empty-state messages, placeholders). Do **not** claim the exception is limited to non-essential
    text. **Phase 2 must include an audit** that moves genuinely essential text off `textTertiary`
    onto `textSecondary`/`textPrimary`; the documented sub-AA exception then applies only to the
    residual faint labels/chevrons. (Net note: the redesign's `#8a9382` is still an improvement over
    today's `#9ca3af` everywhere it's used.)
15. **Visibility is a 3-state enum, not a boolean — needs a small spec decision.** `visibility` is
    `private | public | unlisted` (`enums.ts`). A boolean "public" toggle is lossy. **Before building
    the Visibility control, decide:** (a) the control shape — recommended a 3-option segmented
    control (Private / Unlisted / Public), not a switch; (b) if kept as a switch, the unchecked value
    and how a stored `unlisted` is displayed/preserved; (c) semantics — does it govern **discoverability**,
    **leaderboard access**, or both? Until decided, Visibility is **not** "buildable now" — it joins
    the settings items pending spec (#3). This is the only settings control that reuses an existing
    field, so resolving (a)–(c) unblocks it independently of the guests/notifications/organisers work.

### Round 4 (2026-07-24) — corrections to the Phase 1 plans

16. **Competitor tab reduction is NEW IA (tabs aren't role-gated today).** The tab array in
    `CompetitionDetailScreen` has no `isOrganizer`/`isPlayer` condition — competitors see the full set.
    The reduced competitor set (Standings·Rounds·Players·Payouts) must be built + tested, not "verified".
    → `PHASE-1A-PLAN.md` Task 1B.
17. **Tab labels/topology ARE part of the redesign — don't "preserve exactly".** Today's label is
    `Leaderboard`; the mock needs status-driven **Standings/Results**. Knockout's `Bracket` replaces
    Standings (mutually exclusive). Preserve the availability MECHANISM (reorder, realtime, conditional
    tabs), not the labels/sets. → `PHASE-1A-PLAN.md` Task 1B + reworded constraints.
18. **Tie-break can't be relocated — no such field exists.** Removed from 1B.1; reclassified as a
    net-new spec item (field + values + editor + scoring integration). → `PHASE-1-PLAN.md` decision #2 +
    open sub-specs; `PHASE-1B1-PLAN.md` exclusion note.
19. **1B.1 query-key strategy was wrong.** Settings (`['competition', id]`, counts) and Detail
    (`['competition', id, 'details']`, full rounds) have different shapes — they can't share a key. Use
    `useCompetitionDetailsData` in Settings for rounds. Also: `useUpdateCompetitionField` **already**
    invalidates both keys, so only `PointsConfigSheet` needs an invalidation check — the broad
    "stale rows" risk was unfounded. → `PHASE-1B1-PLAN.md` Tasks 1 & 3.
20. **`SettingsSection` can't be reused verbatim for the mock's two groups.** It's one header + one card.
    In-place refactor into row/group primitives (or a grouping variant) — not a fork. →
    `PHASE-1B1-PLAN.md` Task 2.
21. **1A wording fixed:** "no component creation / no behaviour change" → "no business-logic/data-model
    changes; small presentational extraction allowed; tab labels/role sets are deliberate redesign
    changes." → `PHASE-1A-PLAN.md` architecture + constraints.

### Round 5 (2026-07-24) — tab-model detail, verified against the mock's own logic

22. **`activeTab` must reconcile with the gated set.** Init is `initialTab ?? 'details'` (`index.tsx:74`).
    After role-gating removes Details for competitors, a stale `activeTab='details'` renders hidden
    content with no selected pill. Clamp `activeTab`/`initialTab` to the available set; default
    organiser→`details`, competitor→`leaderboard`; reject inaccessible `initialTab`. Tested. →
    `PHASE-1A-PLAN.md` Task 1B.
23. **Organiser set LOCKED (mock `orgTabs`):** Details · Rounds · Standings/Results · Stats · Breakdown ·
    **Players · Teams** · Payouts · Skins (subject to availability flags). SPEC had omitted Players/Teams;
    the mock includes both. No more "confirm". → Task 1B.
24. **Competitor Payouts is completed-only, and no Teams tab (mock `pTabs`):** Standings/Results · Rounds
    · Players, `+ payouts` pushed only when `isCompleted`. My matrix had listed Payouts unconditionally
    and implied Teams. → Task 1B + `PHASE-1-PLAN.md`.
25. **1B.1 self-review checklist wording fixed:** dropped "SHARED query key"; Settings consumes the
    existing details query for rounds while keeping its separate counts query. → `PHASE-1B1-PLAN.md`.

---

## 0. Blockers — do not start until these are true

- [ ] You can open [`./mocks/Competition Details - Redesign.dc.html`](./mocks/) in a browser and
      toggle its `dark` prop.
- [ ] You are in a **fresh git worktree off latest `main`** (`git worktree add
      ../the-nineteenth-redesign -b feature/redesign main`). **Do not** reuse the stale
      `the-nineteenth-comp-detail-redesign` worktree (it sits on a revert commit).
- [ ] **Scope of scoring screens confirmed = OUT.** The prior attempt also restyled the whole
      scoring flow (score entry, match play, view/review scorecard — guardrail zone). This job is
      competition-detail + app-wide chrome only. (`Score & Round - Redesign.dc.html` in `./mocks/`
      is context only, not in scope.)

---

## Phase 0 — retune the solid neutral palette to the mock (the core visual fix)

This is where the new look becomes real. It is **narrow and surgical** — a palette retune, not a
token free-for-all. All work in `src/constants/colors.ts` (and `theme.ts` only if a *named*
feature colour is involved).

1. **Introduce the mock's green-tinted neutral ramp for solid LIGHT mode.** Wire these token sites
   (the solid `!translucent` branches + the shared text tokens) to the mock's values:

   | Token | Today (solid light) | Mock target | Mock var |
   |---|---|---|---|
   | `surface` | `grays.white` | keep `#fff` | `--c-surface` |
   | `surfaceElevated` | `grays.white` | `#fff` | — |
   | `surfaceVariant` | `grays.gray200` | green tint `#f2f4ef` | `--c-tint` |
   | `surfaceSelected` | `grays.white` | `#f7f9f4` | `--c-active` |
   | `background` | `grays.gray100` | `#f3f4f6` | `--c-screen` |
   | `border` | `grays.gray200` | `#e7ebe2` | `--c-border` |
   | `borderLight` | `grays.gray100` | `#ecefe8` | `--c-border-h` |
   | `textPrimary` | `grays.gray900` | `#141b10` | `--c-text` |
   | `textSecondary` | `grays.gray500` | **`#66705c`** (AA on `#fff` 5.20 & page bg `#f3f4f6` 4.73 — see #8/#13) | `--c-muted` |
   | `textTertiary` | `grays.gray400` | `#8a9382` (collapse #5; AA exception, not usage-limited — see #8/#14) | `--c-label` |
   | `primary` | (already ~`#6eac4d`) | confirm matches `--c-primary` | `--c-primary` |
   | `primaryBackground` (green-tint chip **bg**) | `adjustLightness(primary,.95)`=`#f1f7ed` | accept ≈ mock `#eef5e8`; `primaryLight` stays accent — see #9/#12 | `--c-green-tint` |

   Prefer a **named neutral set** (e.g. `neutralsLight = { … }`) over inline hex, so it reads as a
   deliberate palette and dark can mirror its structure. Do **not** mutate the shared `grays` scale
   (it feeds dark + translucent) — change the *light-palette assignments*.
2. **Adapt solid DARK mode using the exact `themeDark` targets** in Review corrections #6 (not a
   hand-wave). Verify each pairing meets WCAG AA and record the ratios in the changelog.
3. **Do NOT touch** the `translucent` branches or the image frosted-glass logic. That's a later
   phase.
4. **Deliverable:** a short palette changelog (every token changed, old→new, mock var it encodes)
   for owner sign-off **before** building screens. If the token layer is wrong, everything
   downstream is wrong — so it gets reviewed first, in isolation, in solid light **and** solid dark.

Everything below (`spacing`, `borderRadius`, `typography`, `shadows`) stays as-is — `SPEC.md`'s
scale maps are correct.

---

## Phase 1 — build the competition surfaces, fidelity-verified

Build against **`SPEC.md` §Screens / §Component map / §tab-label→component map** — those are
accurate; follow them **except where the Review corrections above apply** (SPEC is annotated inline
too). Surfaces & tab sets:

| Surface | Tabs | Code |
|---|---|---|
| Organiser · team cup | Details · Rounds · Standings · Stats · Breakdown · Payouts · Skins | `CompetitionDetailScreen/index.tsx` + `detail/*Tab.tsx` |
| Competitor · team cup | Standings · Rounds · Players · Payouts | same screen, role-gated ("your team" hero, no organiser actions) |
| Knockout bracket | Bracket (+ Main/Plate `SegmentedButton`), Standings/Players | `components/knockout/BracketTab` + detail screen |
| Settings (gear) | grouped sections — **extend existing** `CompetitionSettingsScreen/index.tsx` | pushed stack screen (NOT modal — see Review corrections #2) |

Non-negotiable carry-overs (`SPEC.md` verified against tree):
- **"Standings" and "Results" are the same tab → `LeaderboardTab`** (label flips to "Results" when
  completed). This is the tab missed last time — confirm every label resolves to a rendered
  component in the tab array *and* the render switch.
- Ryder-Cup round switcher inside Standings = `LeaderboardViewToggle` + `useCompetitionLeaderboard`,
  not a new screen.
- Settings screen **already exists** — extend it. Reuse
  `EditNameSheet`/`EditDescriptionSheet`/`EditPrizePoolBottomSheet` and `useDeleteCompetition`. It is
  a **pushed** screen (Review corrections #2) — no `SystemModalTheme` on the screen itself.
  - **Buildable now:** the existing edit / delete flows.
  - **Needs a small spec decision first (#15):** the Visibility control — `visibility` is a 3-state
    enum (private/unlisted/public), so pick the control shape + semantics before building. Unblocks
    independently of the items below.
  - **Blocked on data-model spec (#3):** allow-guests, competition notification settings, and
    Manage-organisers need new schema + product decisions. Stub or omit until specified.
  - **Product decision to confirm, not guess:** the mock relocates Dates/Scoring/Handicap/Tie-break
    into settings; today they live on the Details tab. Flag before moving — do not duplicate.
- Status (upcoming/live/completed) drives hero/CTA/empty on **one** screen via status + `StatusBadge`
  — no forked screens. Upcoming card = surface + green calendar icon + "Nd" countdown chip (no blue).

**Because Phase 0 fixed the palette, building here means routing through the existing components
(`PageHeader`, `Tabs`, `CardContainer`, `StatusBadge`, `ToggleSwitch`, `EmptyState`, …) with
`useThemeColors()` — and the result now actually matches the mock.** If you ever reach for a literal
value to hit the look, the value belongs in Phase 0 — go back and add it there, never inline.

---

## Phase 2 — sweep the rest of the app

Only after Phase 0 palette is signed off and Phase 1 fidelity is signed off. Because the look now
lives in the retuned tokens + shared components, most screens update **for free** once routed through
the canonical components. Method:

1. **Inventory** each `src/screens/` area: bespoke tab bars, legacy/blue accent cards, ad-hoc
   headers, hardcoded colours, one-off spacing, inconsistent empty/loading/error. Checklist first.
2. **Fix centrally** — replace bespoke equivalents with `Tabs`, `CardContainer`, `PageHeader`,
   `StatusBadge`, `EmptyState`, `ErrorState`, `LoadingSpinner`, `ToggleSwitch`. Any look the tokens
   can't express → fix in Phase 0's files, not the screen.
3. **Grep cleanup** across `src/` for `#`, `rgb(`, `rgba(`, `var(--`, and legacy blue accents →
   migrate to tokens. Replace custom tab implementations with `Tabs`.
4. **Order:** home → rounds → leagues → competitions (non-detail) → profile → courses → social →
   subscription → activity/notifications → onboarding/auth. **(Scoring screens excluded.)** Keep each
   area's IA and data hooks; look/layout only.
5. Each area = its own PR, fidelity-reviewed and signed off before the next. No big-bang.

> Note: the "translucent-effect update" the owner mentioned is a **separate, later** palette phase —
> not part of this sweep. This sweep is solid light + solid dark only.

---

## Hard rules (from `SPEC.md` §Hard rules — still binding)

- **No hardcoded colours in screens/components.** Every colour via `useThemeColors()`; static tokens
  from `@/constants/theme`. Only pre-approved literals are named exports (`skinsColor`, `wolfColor`,
  `featureColors`, `medalColors`) — by name. **The one place hex is expected is the Phase 0 palette
  definition in `colors.ts` itself** — that is the design system, not a call site.
- **No forked/duplicated components** (`*V2`/`*New`/`*Redesign`). Reuse + extend in place / add prop.
- **No scoring/standings math in presentational components** — numbers from existing utils/hooks
  (`CLAUDE.md` guardrails; scoring screens out of scope anyway).
- Required component pattern from `CLAUDE.md` (functional, `const colors = useThemeColors()`, inline
  colour props, static tokens in `StyleSheet.create`, Paper `Text`/`Icon`, `TouchableOpacity` not
  Paper `Button`).
- Modal/sheet screens wrapped in `SystemModalTheme` — i.e. true `presentation:'modal'` routes and
  RN `<Modal>`/bottom sheets. **Not** the settings screen (it's pushed — Review corrections #2), but
  **yes** any bottom sheet it opens.
- Australian conventions: `DD/MM/YYYY`, AUD.

---

## Acceptance — fidelity is checked, not assumed

`lint` + `type-check` never caught what got this reverted. Add the real loop:
1. Render each surface on device/simulator in **solid light and solid dark**.
2. **Side-by-side vs the mock** (screenshot compare) — note every divergence in hue, surface,
   spacing, type, hierarchy.
3. **Owner signs off per area before it merges.** Delivery is incremental (Phase 0 palette → Phase 1
   screens → each Phase 2 area), each independently reviewable and revertible. Never a 150-file merge.
4. Then code gates: `pnpm verify:gate` + `pnpm lint`, and a diff grep for `#`/`rgb(`/`rgba(`/`var(--`
   returning clean **outside `colors.ts`/`theme.ts`**.

---

## Definition of done

- [ ] **Phase 0:** solid-light neutral palette retuned to the mock's green-tinted values; solid dark
      adapted; translucent branches untouched; text-token spillover flagged; palette changelog signed
      off in solid light + dark.
- [ ] **Phase 1:** all three surfaces × three states × full tab sets built via existing components on
      the retuned palette; every tab label resolves to a rendered component (Standings/Results →
      `LeaderboardTab` confirmed); fidelity signed off vs mock.
- [ ] Settings screen **extended** (not recreated), existing edit/delete flows reused; Visibility
      control built per the #15 decision (3-state, not a lossy boolean); spec-blocked sections
      (guests/notifications/organisers) stubbed or omitted per #3; Dates/Scoring/Handicap relocation
      flagged, not duplicated. (Screen is pushed — `SystemModalTheme` only on any bottom sheets.)
- [ ] **Phase 2:** inventory checklist produced; each area swept, fidelity-reviewed, merged as its own
      PR; bespoke tab bars / legacy accent cards / hardcoded colours migrated.
- [ ] No forked components; no scoring math moved; scoring screens untouched.
- [ ] Diff grep-clean for colour literals outside the palette files. `pnpm lint` + `pnpm verify:gate`
      pass. Solid light + solid dark correct vs mock across all delivered areas.
- [ ] Summary lists: the Phase 0 palette changelog, the text-token spillover note, the
      settings-screen product decision, and the Phase 2 inventory with what changed per area.
