# Competition Details — Redesign implementation plan

Source of truth: Claude Design project `70770db0-c756-47f1-a30a-c5cd28ef33f8`,
file `Competition Details - Redesign.dc.html` (local copy in session scratchpad:
`/private/tmp/claude-501/-Users-samkay-Documents-MetisCo-Dev-the-nineteenth/4f771114-ca13-48a7-9902-4b537a14c677/scratchpad/competition-details-redesign.html`).

The design is a full visual redesign of the Competition Details surface
(organiser + competitor + knockout variants) demoed on a multi-format team cup.
**All data plumbing already exists** — this is a presentational redesign that
reuses existing hooks. One structural change: the Standings/Leaderboard tab
gains a *round-scope switcher* (Overall vs per-round board) instead of stacking
every round's board below the overall table.

## Ground rules

- Worktree: `../the-nineteenth-comp-detail-redesign`, branch `feature/competition-detail-redesign`.
- Presentational only. NO changes to scoring math, hooks' derived values, or
  anything under `src/services/scoring` / scoring store slices / shared scoring
  utils. Leaderboard components that import scoring utils keep those imports
  and calculations untouched — restyle markup only.
- Theme: use `useThemeColors()` tokens; the design was authored on the app's
  actual brand palette. Mapping:
  - `--c-screen`→`colors.background`, `--c-surface`→`colors.surface`,
    `--c-tint`→`colors.surfaceVariant`, `--c-green-tint`→`colors.primaryBackground`,
    `--c-primary`→`colors.primary`, `--c-on-green`→`colors.primaryDark`,
    `--c-text`→`colors.textPrimary`, `--c-muted`→`colors.textSecondary`,
    `--c-muted2/faint`→`colors.textTertiary`, `--c-border`→`colors.border`,
    `--c-divider`→`colors.borderLight`, amber→`colors.warning*`,
    danger→`colors.error`.
  - Dark hero cards (`linear-gradient(160deg,#1f2a19,#131a0f)`) are fixed dark
    green in BOTH themes → new shared `HeroCard` using `expo-linear-gradient`.
  - Team home/away accents (#c0563e / #3a6ea5) — reuse existing team color
    system where present; otherwise add to a local constants module for the
    leaderboard area.
- Per design: section labels are uppercase, cards radius 16-18, chips/pills
  radius 6-999, count badges on tabs, underline active-tab indicator.
- Commit per phase; run `pnpm type-check` + targeted tests before each commit;
  `pnpm verify:gate` before finishing.
- Scoring guardrails: if any file under `src/components/scorecard/**` or shared
  scoring utils must change, run `scoring-impact-analyst` first and run the
  scoring test subset after. Goal is to avoid touching them at all.

## Phases

### P1 — Shared primitives (new, `src/components/common/`)
- `UnderlineTabs.tsx`: horizontally scrollable underline tabs w/ count pills
  (design L71-78). Props mirror `Tabs` (`TabItem[]`, selectedTab, onTabChange).
- `HeroCard.tsx`: dark-green gradient card (fixed dark in both themes) with
  optional radial glow accent (design L445, L203).
- `ScopeChips.tsx`: two-line chip row (eyebrow + label), scrollable, for the
  standings round-scope switcher (design L197-201, L476-480).
- `SectionLabel.tsx`: uppercase letter-spaced section label (design L91) — only
  if `SectionHeader` can't be reused with a variant.
- Export from `components/common/index`.

### P2 — Screen chrome (`CompetitionDetailScreen/index.tsx`)
- Swap `Tabs` → `UnderlineTabs` on CompetitionDetail only.
- Header: keep `PageHeader`, add subtitle (competition type/format summary,
  e.g. "Wales vs West · Team cup" / dates), gear icon unchanged (design L65-79).
- Tab order/visibility logic unchanged.

### P3 — Details tab (`components/competitions/detail/`)
- Status banner card at top: upcoming = "Starts in Nd" calendar card;
  live = green tint "Round N in progress" flag card; completed = amber trophy
  winner card (design L138-140). New `CompetitionStatusBanner.tsx`.
- Organiser "Manage" grid: 3-col quick actions (Add round, Formats & points,
  Manage teams, Pairings, Settings, Share invite) → navigate to existing
  screens/sheets (design L142-150). New `ManageGrid.tsx`.
- "Scoring & format" summary list (rows: scoring model, points, teams w/ lock
  when live/completed, handicap) → restyle existing `SettingsSection` rows
  (design L152-160).
- Competitor Details content folds into Standings (design has no competitor
  Details tab; keep our Details tab for players but simplified: About card
  design L523-530).

### P4 — Rounds tab (`CompetitionRoundCard.tsx`, `RoundsTab.tsx`)
- Card: status pill + "N pts" badge + "Round N" chip top row; format title;
  course · date line w/ pin icon; result strip (completed rounds, winner
  tinted); organiser pairings row for split rounds (configured vs amber "Set
  pairings"); action row Standings / Score / bolt; force-submit outline button
  (design L164-191). Keep drag-reorder + swipe-delete wiring intact.
- Competitor variant: personal line ("Your points 33" / "Your match 2 UP thru
  12") + single action button (design L534-551).
- Summary strip above list ("4 rounds · 12 points · mixed formats", L167-170)
  + dashed "Add round" (organiser, L190).

### P5 — Standings tab (`components/leaderboard/LeaderboardTab.tsx` area)
- NEW `RoundScopeSwitcher` row using `ScopeChips`: Overall + one chip per round
  (label = short format name).
- Overall scope: cup/points board in `HeroCard` (team names, big score,
  progress bar w/ target marker, outcome pill) → restyle
  `TeamHeadToHeadCard`/`TeamLeaderboardTable` visuals; below it "Round by
  round" rows (badge, name, sub, score, win dot) that switch scope on tap
  (design L203-241). Individual (non-team) comps: overall board = existing
  individual table restyled w/ rank rows (pos, dot, name, YOU pill, pts).
- Round scopes: header board (format headline + team totals or match tally) +
  format-shaped list: rank rows (stableford/stroke), match rows (singles;
  home/away tinted, live amber), teamline rows (scramble) — reuse existing
  `RoundLeaderboard` / `InProgressRoundLeaderboard` / `RoundSubMatchLeaderboard`
  data, restyle rows (design L831-899).
- Competitor: hero card above switcher (team eyebrow + cup score / countdown /
  won pill, L444-465), live "Your match is live" CTA (L467-473), About card at
  bottom (L523-530).
- CAREFUL: keep all point/margin calculations exactly as-is.

### P6 — Players + Teams tabs
- Players: team-grouped cards (team dot + name + count header, member rows w/
  avatar, YOU pill, HC) for team comps; flat list for individual (design
  L246-262). Organiser keeps Add players CTA + trophy shortcut.
- Teams: summary row ("2 teams · 6 players each" + Edit teams), team cards w/
  abbr chip + 2-col member grid (design L264-282).

### P7 — Stats + Breakdown tabs
- Stats: Net/Gross segmented control (existing `SegmentedButton`), grouped
  leader cards (label + unit, leader avatar + big value, runner-up rows)
  (design L284-312). Restyle `StatsTab` presentation only.
- Breakdown: Ringer/Contributions segmented (exists); ringer table w/ header
  row + YOU highlight; contributions cards w/ progress bars (design L314-348).
  Mostly restyling `RingerBoard`/`ContributionsBoard`.

### P8 — Payouts + Skins tabs
- Payouts: dark pot hero (label, amount, state pill, meta line), placements
  list, settle CTA / locked note / transactions (design L350-372, competitor
  winnings hero L567-587).
- Skins: dark gold summary hero (games/awarded/top winner), per-round groups
  of skin cards (scope chip, status pill, title, winner row, amount)
  (design L374-397).

### P9 — Settings screen (`CompetitionSettingsScreen`)
- Grouped list redesign: Competition (name/type/dates), Scoring & handicaps,
  Visibility toggles, Notifications toggles, Organisers, Archive/Delete
  (design L81-131). Map to existing sheets/mutations only — no new settings
  backends; omit groups with no existing backing (e.g. notification toggles)
  rather than stubbing dead switches.

### P10 — Knockout (`components/knockout/`)
- Upcoming: dark blue "Seed & generate" hero + seeds list (design L623-639).
- Generated: champion gold banner, main/plate segmented, stage pager buttons,
  match cards (seed chips, vs divider, winner tint + check, badge footer,
  YOU border) (design L641-677). Restyle `BracketTab`/`KnockoutMatchCard`.

### Verify
- `pnpm type-check`, `pnpm lint` (changed files), scoring subset
  `pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard)'`,
  then `pnpm verify:gate`. On-device QA checklist at the end.

## Status

- [x] P1 shared primitives
- [x] P2 screen chrome
- [x] P3 details tab
- [x] P4 rounds tab
- [x] P5 standings tab
- [x] P6 players+teams
- [x] P7 stats+breakdown
- [x] P8 payouts+skins
- [x] P9 settings screen
- [x] P10 knockout
- [x] verify:gate green (type-check ✓, full jest 379 suites/9090 pass ✓, verify:gate PASSED)

---

# Part 2 — Score & Round redesign

Source: same design project, file `Score & Round - Redesign.dc.html` (local copy:
`/private/tmp/claude-501/-Users-samkay-Documents-MetisCo-Dev-the-nineteenth/4f771114-ca13-48a7-9902-4b537a14c677/scratchpad/score-round-redesign.html`).
Six screens: Score entry (L39-156), Review scorecard (L158-298), View round
(L300-488), Match play (L490-595), Quick entry (L597-658), Team match play
(L660-770). Same token mapping as Part 1. Purely visual restyle — scoring
guardrails apply (scoring-impact-analyst report obtained 2026-07-15; key
constraints: keep strings/testIDs/a11y labels, keep DistanceToPin branch order,
QuickScorecardView width constant ↔ holeButton dims lockstep, ScorecardTable
widths ↔ utils/scorecardLayout coupling, never touch computed expressions or
score→color token mappings).

## Phases

- S0: baseline scoring subset green + NEW RoundHeader characterization test
  (title fallback, change-tees online gating, offline-status derivation).
- S1 (guardrail chrome, 3-screen blast radius): RoundHeader (centered
  title/subtitle + Synced pill + Hole N/18 progress bar), HoleHeader family
  (bordered nav buttons, big hole number, PAR/SI/YDS trio), DistanceToPin
  (dark green gradient full-width strip presentation; keep state machine; no
  front/back split — no backing data).
- S2 (guardrail): PlayerScoreCard family (card: YOUR SCORE eyebrow, name+HC,
  SHOTS/PTS header, divider, PICK UP / stepper / PAR row 62px, score label
  pop) + QuickScorecardView ("Your card" strip w/ tinted ring cells).
- S3: MatchPlayScoringScreen locals — match status bar (tint by standing),
  local PlayerScoreCard (UP/DN badge), "Match by hole" strip, footer.
- S4: TeamMatchPlayScoringScreen locals — TeamScorePanel, status bar, strip,
  footer (inline color logic stays inline; restyle only).
- S5: QuickScoreEntryScreen — GROSS/TO PAR/POINTS header trio, hole rows
  (score circle + steppers + pts), "Holes complete N/18 + Save card" footer.
  GPS strip omitted (organizer backfill screen, no GPS wiring by design).
- S6: ReviewScorecardScreen — saved banner, underline tabs, ReviewActions
  footer (Edit scores outline + gradient Submit); ScorecardTable restyle
  (dark header band w/ initials+YOU, OUT/IN subtotal bands, GROSS dark band
  w/ to-par, NET row, POINTS green band, cell rings via existing colors).
- S7: ViewRoundScreen — Details tab (Continue scoring CTA, course card, info
  list card, dark progress hero), RoundScorecardTab (strip / front-back /
  full-list 3-view toggle + totals trio + legend), stats grid restyle.

## Status (Part 2)

- [x] S0 baseline + RoundHeader char test
- [x] S1 shared chrome
- [x] S2 player score card + quick strip
- [x] S3 match play screen
- [x] S4 team match play screen
- [x] S5 quick entry screen
- [x] S6 review scorecard
- [x] S7 view round
- [x] scoring subset + verify:gate green (full jest 9104 pass, scoring subset 1348, gate PASSED)

---

# Part 3 — App-wide polish ("The Nineteenth - Polished")

Source: same design project, file `The Nineteenth - Polished.dc.html` (local:
`/private/tmp/claude-501/-Users-samkay-Documents-MetisCo-Dev-the-nineteenth/4f771114-ca13-48a7-9902-4b537a14c677/scratchpad/polished.html`).
Sections: HOME L66-186, SCORECARD L187-304 (already done — Part 2 S2, skip),
ROUNDS L305-406, COMPETE L407-523, ACTIVITY L524-602, COURSES L603-720,
LEADERBOARD L721-785, ROUND SUMMARY L786-849, PROFILE L850-951, ONBOARDING
L952-984, bottom nav L985-999. Same token mapping + ground rules as Parts 1-2.

Product-shape decisions: keep the app's current 5 nav tabs
(home/compete/activity/courses/profile — design's "rounds" tab was already
replaced by Home upstream); Round summary maps to PlayerScorecardScreen;
podium = new presentational component over existing leaderboard entries.

## Phases

- T1 Home (HomeScreen + components; handicap hero w/ existing trend data,
  gradient Score CTA, continue-scoring card w/ progress, 2x2 tiles, gold
  next-comp card, find-a-course, mates rows)
- T2 Rounds list (RoundListScreen: score CTA, in-progress card, filter
  pills, round history cards)
- T3 Compete hub (CompeteScreen: segmented Comps/Leagues, cards)
- T4 Activity feed (ActivityScreen + ActivityRoundCard)
- T5 Courses (CourseListScreen: search, filter pills, club rows)
- T6 Profile + bottom nav restyle (ProfileScreen family; BottomNavigation
  visual only, current 5 tabs kept)
- T8 Leaderboard screen (podium top-3 + restyled table)
- T9 Round summary (PlayerScorecardScreen: hero result, stat row, grid
  chrome — guardrail-adjacent, presentational only)
- T10 Onboarding (steps + dots + cards)

## Status (Part 3)

- [x] T1 home
- [x] T2 rounds list
- [x] T3 compete hub
- [x] T4 activity feed
- [x] T5 courses
- [x] T6 profile + nav
- [x] T8 leaderboard podium
- [x] T9 round summary
- [x] T10 onboarding
- [ ] full suite + verify:gate green
