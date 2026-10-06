# Phase 1B.6 — Configurable Tie-break — Spec & Implementation Plan

> **For workers:** SCORING GUARDRAIL ZONE + MONEY-CRITICAL. Read `docs/guides/SCORING_ARCHITECTURE.md`
> and CLAUDE.md → "Scoring changes (guardrails)" first. **Do not write implementation code until (a) the
> `scoring-impact-analyst` agent has been run on the target files and its blast radius stated, and (b)
> characterization tests lock current tie/position behaviour** at every site you will touch. This whole
> domain currently has NO golden coverage (`scoring-invariant-coverage.md` has no I-number for ties).

**Goal:** Add a competition **`tie_break`** setting that decides placement (and therefore **payouts**)
among players/teams tied on score: **Split** (current), **Countback**, or **Lowest handicap**.

**Decision (owner):** Full scope — **payout-affecting**, not display-only.

## Method semantics

- **`split`** (DEFAULT — current behaviour, no regression): tied entries share the position (T2, T2) and
  any prize for the tied positions is split evenly. Do not change existing behaviour when this is set.
- **`countback`**: break ties by **back 9 → back 6 → back 3 → back 1 (last hole)**; if still tied, fall
  through to `handicap`, then `split`. **9-hole rounds:** back 6 → back 3 → back 1 (the existing dead code
  skips countback entirely under 18 holes — v1 must define the 9-hole variant, not silently skip).
- **`handicap`**: lower daily/playing handicap wins; if still tied, `split`.
- **Scope of application:** score-based standings only — **stroke play, Stableford, Par, and team
  aggregate/best-ball**. **Match play is OUT** — a "tie" there is a halved match (`matchMargin` +
  `win_tie_loss` points in `competitionPoints/calculations.ts`), a different, already-configurable concept;
  do not conflate (per the map).

## Reuse

A fully-formed but **dead** implementation exists — `src/services/scoring/utils/leaderboardUtils.ts:104-170`
(`applyBackNineTiebreaker` back-9/6/3, `applyHandicapTiebreaker`). Treat it as a **design reference**:
promote its logic into a single live, golden-tested comparator; its current unit tests must become
golden/characterization tests once wired. `ALGORITHMS.md:775-852` describes it as live — **stale**, ignore.

## Grounding — the injection surface (from the map)

- **No single choke point.** Ties are resolved by ~11 hand-rolled sort+share-position loops (exact-score
  equality, no secondary sort). Three tiers:
  - **Tier 1 (persisted — highest leverage):** `utils/competitionPoints/calculations.ts:57-88`
    (`calculateCompetitionPoints` → `round_results.position`, called from `services/rounds/
    roundResultsService.ts:521,597`) and `utils/competitionPoints/aggregation.ts:90-127`
    (`aggregateCompetitionStandings`, feeds `useCompetitionLeaderboard`, `winnerService`).
  - **Tier 1.5 (MONEY — its own dedicated read + analyst + characterization):** `PayoutsTab.tsx:150-196`
    (`leaderByPosition`/`placementViews`/`hasTiesAtPaying`) → `useSettleCompetitionPayouts`
    (`hooks/prizePool/mutations.ts`). The current split-on-tie math was NOT fully traced — read it in full
    before touching; countback here changes real amounts.
  - **Tier 2 (live display, ~9 sites, per-hole data already in hand):** `StrokePlayLeaderboardFull`,
    `StrokePlayLeaderboard`, `StablefordLeaderboardFull`, `ParLeaderboardFull`, `LeaderboardTable`,
    `TeamLeaderboardTable`, `TeamLeaderboardView` (the no-tie-sharing outlier — fix it), `RoundLeaderboardTab`,
    `ScrambleTeamLeaderboard`.
- **Per-hole data:** free at Tier 2 (those components already loop holes). **Tier 1 needs plumbing** —
  the persisted layer only has reduced `{participantId, rawScore}`; `raw_result_data` stores summaries,
  not an 18-hole array. Finalize (`calculateCompetitionPoints`) is computed from scorecards, so per-hole
  is available *at finalize time* — plumb the back-9/6/3 sums in there; the aggregation layer reads
  persisted results.

## Global constraints

- **Characterization-first** (CLAUDE.md rule 3): lock current tie behaviour before changing it, at every
  touched site (including `TeamLeaderboardView`'s no-sharing outlier and the payout split-on-tie).
- **`scoring-impact-analyst` pass required** on the chosen target files, blast radius stated, before edits.
- **Default `split` = exact current behaviour** — zero change for existing competitions.
- Numbers come from utils/selectors; cards stay presentational. Run the scoring subset after each change:
  `pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard)'` plus `utils/competitionPoints` + payout tests.

---

## Phase 0 — Guardrail gate (no behaviour change)

### Task 0.1: scoring-impact-analyst + blast radius
- [ ] Run `scoring-impact-analyst` on `utils/competitionPoints/calculations.ts`,
  `utils/competitionPoints/aggregation.ts`, and `PayoutsTab.tsx`/`useSettleCompetitionPayouts`. **State the
  reported blast radius** in the PR before writing code.

### Task 0.2: Characterization tests locking CURRENT tie behaviour
- [ ] Write golden/characterization tests capturing today's behaviour at each site to be touched:
  exact-score tie-sharing in `calculateCompetitionPoints` + `aggregateCompetitionStandings`; the
  **payout split among tied paying positions** (read `useSettleCompetitionPayouts` first); `TeamLeaderboardView`'s
  strict no-share ordering; and representative Tier-2 boards. Assign these a new invariant number in
  `docs/guides/scoring-invariant-coverage.md`.
- [ ] Run the scoring subset — all green (locks the baseline).
- [ ] Commit: `test(scoring): characterize current tie/position behaviour (1B.6.0)`

## Phase 1 — The shared tie-break comparator (live, golden-tested)

### Task 1.1: `resolveTieBreak` util
- [ ] Create a single `resolveTieBreak(tiedEntries, method, holeData, handicaps)` (promote the dead
  `applyBackNineTiebreaker`/`applyHandicapTiebreaker` logic into it), covering `split`/`countback`/`handicap`
  + the 9-hole variant + the fall-through chain. Pure; no I/O.
- [ ] **Golden tests** for every branch (18- and 9-hole; back-9/6/3/1; handicap fallback; still-tied→split).
- [ ] Commit: `feat(scoring): resolveTieBreak comparator + golden tests (1B.6.1)`

## Phase 2 — Field, config, types

### Task 2.1: Migration + types
- [ ] `ALTER TABLE competitions ADD COLUMN tie_break TEXT NOT NULL DEFAULT 'split' CHECK (tie_break IN
  ('split','countback','handicap'));`
- [ ] Add `tie_break` to the DB-domain `Competition` (`competition.types.ts`); update fixtures/factories
  for the new non-optional field (Round-6 caveat #29). Add `'tie_break'` to `useUpdateCompetitionField` Pick.
- [ ] Commit: `feat(competition): tie_break field + type/update path (1B.6.2)`

## Phase 3 — Wire into persisted standings (Tier 1)

### Task 3.1: Round-level positions
- [ ] In `calculateCompetitionPoints`, when resolving a tie group, apply `resolveTieBreak` using per-hole
  data available at finalize (plumb back-9/6/3 sums from the scorecards being finalized). `split` path
  unchanged. Update `roundResultsService` callers to pass the competition's `tie_break`.
- [ ] Golden tests: countback/handicap change `round_results.position`; `split` identical to baseline.
- [ ] Commit: `feat(scoring): tie_break in round finalize positions (1B.6.3)`

### Task 3.2: Cross-round standings
- [ ] Apply in `aggregateCompetitionStandings`. **Sub-decision to confirm:** the countback *basis* for a
  competition-wide points tie (final-round countback vs aggregate) — flag and confirm before implementing;
  don't guess.
- [ ] Golden tests; `split` unchanged.
- [ ] Commit: `feat(scoring): tie_break in cross-round standings (1B.6.4)`

## Phase 4 — Payouts (Tier 1.5, MONEY — dedicated care)

### Task 4.1: Tie-break at paying positions
- [ ] **Read `useSettleCompetitionPayouts` fully first.** Where a tie-break method is set and a tie lands
  at a paying position, the tied entries are ordered by `resolveTieBreak` so the prize goes to the countback
  winner instead of splitting. `split` keeps the even-split behaviour exactly.
- [ ] Re-run the Task-0.2 payout characterization; add cases: countback resolves a paying tie to a single
  winner; split unchanged; partial ties spanning a paying/non-paying boundary.
- [ ] Commit: `feat(payouts): tie_break-aware prize placement (1B.6.5)`

## Phase 5 — Live display consistency (Tier 2)

### Task 5.1: Inject the comparator into the ~9 display sites
- [ ] Route each Tier-2 board's position assignment through `resolveTieBreak` (per-hole data already
  present) so the live leaderboard matches the persisted/paid result. Fix `TeamLeaderboardView`'s
  no-share outlier to share positions consistently.
- [ ] Update/extend the characterization tests per site; `split` visually unchanged.
- [ ] Commit: `feat(leaderboard): tie_break-consistent live display (1B.6.6)`

## Phase 6 — Settings UI + regression

### Task 6.1: Tie-break picker
- [ ] Add a "Tie-break" row (Split / Countback / Lowest handicap) in the Settings "Scoring & handicaps"
  group (organiser-only) → `useUpdateCompetitionField({ tie_break })` with **local optimistic state +
  rollback** (Round-6 caveat #28). Helper copy per method. No tier gate (unless owner says).
- [ ] Commit: `feat(settings): tie-break picker (1B.6.7)`

### Task 6.2: Regression
- [ ] Full matrix across formats: `split` = baseline everywhere (leaderboard, standings, payouts);
  `countback`/`handicap` change placement + payout consistently across Tier 1/1.5/2; match play untouched;
  9-hole variant correct.
- [ ] `pnpm verify:gate` + the scoring subset; migration to staging; on-device smoke incl. a real
  tie-at-paying-position payout.
- [ ] Commit: `test(scoring): tie-break full regression (1B.6.8)`

---

## Open sub-decisions (confirm during the build)

- **Cross-round countback basis** (Task 3.2) — final-round countback vs aggregate.
- **Tier-gating** — is Tie-break a paid feature? Assumed **ungated**; confirm.
- **Whether to consolidate the ~11 hand-rolled position loops** into one shared `assignPositions(tieBreak)`
  as part of this work, or only inject the comparator at the sites that matter. Full consolidation is a
  bigger, separate dedup (flagged in memory) — v1 injects, doesn't unify.

## Self-review checklist

- [ ] analyst pass done + blast radius stated; characterization tests written BEFORE changes; new I-number
  added to `scoring-invariant-coverage.md`.
- [ ] `split` default = exact current behaviour everywhere (golden-verified).
- [ ] Payout tie-break re-derived from a full read of `useSettleCompetitionPayouts`; money paths tested.
- [ ] Persisted (Tier 1) + payout (Tier 1.5) + display (Tier 2) all consistent for a given `tie_break`.
- [ ] Match play untouched; 9-hole variant defined; no scoring math re-implemented in a card.
