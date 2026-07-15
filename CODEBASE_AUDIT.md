# Codebase Audit & Remediation Plan — The Nineteenth

_Generated: 2026-07-14. Validated against the repository on 2026-07-14. Snapshot of a full-codebase review (duplication, broken/dead code, test health, coverage gaps)._

> **Validation note:** The four principal correctness findings below are legitimate, with qualifications noted inline. Some original test-gap and dead-code claims were overstated and have been corrected. Duplication items are maintainability opportunities, not automatically bugs; consolidate only after confirming behavioral parity.
>
> **Re-verification (2026-07-14, second pass):** All four correctness bugs re-confirmed against the code, including full impact chains. Corrections applied inline below: Bug 1 Stableford helper is a duplicate (not a bug) and the fix target is disambiguated; Bug 3 also affects `handleRenewal`; Bug 4 fix hardened; several duplication citations corrected (score-category `PlayerScoreCard` misattribution; handicap constants live in `constants/scoring.ts`, hardcoded 54 in `utils/pairingAlgorithm.ts`); `FeatureLock.test.tsx` "weak assertions" downgraded.

## Baseline health (at time of audit)

- **Type-check:** clean — 0 errors
- **Lint:** clean — 0 errors, 128 style-only warnings (63 auto-fixable)
- **Tests:** green — 374 suites / 9061 passing / 0 failing / 15 intentional legacy skips
- **Git:** `main` clean, 0 commits ahead of `origin/main`

Overall the codebase is in good shape. The items below are localized, not systemic. Suggested order: real bugs → safety tests for money/sync → duplication cleanups.

---

## 🔴 Real bugs (correctness — do first)

- [x] **1. Handicap-stroke math diverges on the Contributions/Breakdown board** — **fixed** (`7522437e`, merged via `8e97df8b`)
  - File: `src/components/scorecard/ContributionLeaderboard/useContributionData.ts:77` (`getHandicapStrokesForHole`), plus local `calculateStablefordPoints` at `:64`
  - Diverges from canonical `getStrokesReceived` (`src/utils/scoring.ts:19`) for **many handicaps above 18**, including 19–35 and handicaps above 36 on affected stroke indexes. It does not diverge for every value (HC 36 is equivalent). E.g. HC 25 / SI 3 → returns 1 stroke vs canonical 2; HC 40 / SI 1 → returns 2 vs canonical 3. High-handicappers' net Stableford contributions are undercounted.
  - Note (re-verified): the local `calculateStablefordPoints` is **behaviorally correct** — it matches canonical `calculateStablefordPointsNet` (`src/utils/scoring.ts:216`), so it is a duplicate, not a bug. Only `getHandicapStrokesForHole` is wrong.
  - Fix: delete both locals and use the canonical scoring helpers — **`getStrokesReceived`** for strokes and **`calculateStablefordPointsNet(strokes, par, strokesReceived)`** for points. ⚠️ Do NOT import the same-named `calculateStablefordPoints(grossScore, playerHandicap, hole)` at `src/utils/scoring.ts:177` — it has a different signature and a 4-point (no-albatross) ladder; a naive import compiles but silently produces wrong points.
  - Regression cases: cover handicaps 18, 19, 25, 35, 36, 37, 40, and 54 across relevant stroke indexes.
  - ⚠️ Scoring guardrails: run `scoring-impact-analyst` on the file and lock a characterization test **before** editing.

- [x] **2. `getCompetitions()` returns organizer-only competitions** — **fixed** (`f8221974`, merged via `d1a8f4e5`)
  - File: `src/services/api/competitions.ts:326` — single-condition `.or('organizer_id.eq...')` despite comment/TODOs promising "organizer **or** player."
  - Impact (re-verified): main Competitions tab is fine (uses `useCompetitionGroups`, which joins `competition_players` at `useCompetitionGroups.ts:138`). But `useCompetitions()` → `useHomeData` (`:353`) means the **Home screen** omits *joined* competitions from the active section (`activeCompetitions`, `:442`) and misclassifies join-only users as new (`hasJoinedCompetition`, `:557`).
  - Fix (refined): extract the already-correct joined-comp query from `useCompetitionGroups` (`competition_players.select('competition:competitions!inner(...)').eq('player_id', userId).eq('status','accepted')`) into a shared helper and have `getCompetitions` union it with the organizer query. Do NOT repoint `useHomeData` directly at `useCompetitionGroups` — that hook returns *grouped* data the home path doesn't want; reuse its query logic, not its shape. Clears stale TODOs in `src/hooks/competitions/queries.ts:63,124,160`.

- [x] **3. RevenueCat webhook — partial upsert wipes tier on cancel/uncancel** — **fixed and covered by Deno regression tests** (`829a516d`, merged via `dcb67e28`)
  - File: `supabase/functions/revenuecat-webhook/index.ts:165` (`updateSubscription` full-row upsert)
  - `handleCancellation` auto-renew branch (`:305`) and `handleUncancellation` (`:357`) pass only a few fields; defaults `updates.tier ?? 'free'` / `product_id ?? null` (`:168-172`) reset tier to `free` and null product/external ids — contradicting "keeps access until expiry." Also `started_at: now` (`:173`) resets original start date on every write.
  - Also affects `handleRenewal` (re-verified): `:276` omits `external_id`, so a normal renewal nulls it every cycle and resets `started_at`. Same root cause — fold into this fix.
  - Fix: separate create/full-upsert handling for purchase events (`INITIAL_PURCHASE`, `NON_RENEWING_PURCHASE`, `PRODUCT_CHANGE`) from `.update()` handling for partial lifecycle events (`CANCELLATION` auto-renew, `UNCANCELLATION`, `RENEWAL`); `.update()` writes only provided columns and avoids the create-vs-update race a fetch-merge would introduce. Add cancellation, uncancellation, and renewal regression tests.

- [x] **4. RevenueCat webhook — enterprise products silently map to `free`** — **fixed and covered by Deno regression tests** (`829a516d`, merged via `dcb67e28`)
  - File: `supabase/functions/revenuecat-webhook/index.ts:81` (`PRODUCT_ID_TO_TIER` has no enterprise entries; `src/constants/products.ts` defines `enterprise.monthly/yearly`) → falls through `mapProductToTier` to `'free'` (`:104`). The webhook's local `SubscriptionTier` type (`:66`) also omits `enterprise` (and `developer`), despite the application (`src/types/subscription.types.ts:54`) and database enum (migration `20260421000000`) supporting it.
  - Fix (refined): the webhook's `PRODUCT_ID_TO_TIER` is a **drifted duplicate** of `src/constants/products.ts` — the root cause of this bug. Deno can't easily import from `src/`, so move the mapping + tier type into a `supabase/functions/_shared/` module imported by the webhook (single source of truth) rather than patching the inline copy. Add `enterprise` to the type and map, and to the `mapProductToTier` `includes()` fallback.
  - Related hardening: unknown event types return `success:false` → HTTP 500 (`:498`) → RevenueCat retry storm — change the `default`/unknown branch to return HTTP 200 (acknowledge-and-drop). Record `event.id` for idempotency (retries/re-orders can overwrite newer state).

---

## 🟠 Duplication still live ("double-ups")

_These are confirmed or plausible maintainability opportunities, not correctness findings by themselves. Scoring and ranking implementations may encode different semantics, so characterize behavior before consolidating. Scoring items carry correctness risk (follow guardrails); the rest are primarily consistency/line-count wins._

- [ ] **Score-category ladder re-encoded in 3 cards** — `QuickScorecardView.tsx:81`, `StrokePlayScoreCard.tsx:135`, `ScrambleScorecardTable.tsx:152` → use shared `getScoreColor`/`getScoreCategory` (`utils/scoring.ts:340,375`). Same "cards must be presentational" violation as bug #1. **Each differs subtly** (null/undefined guards, `eagle ?? birdie` fallback, `relativeToPar`-vs-`score,par` signature) so a naive merge is not drop-in. **Correction:** the cited `PlayerScoreCard.tsx:60` is misattributed — the real file is `PlayerScoreCard/PlayerScoreCard.tsx` and that line is `getPointsColor` (a Stableford-points→color map), a different concern; do not consolidate it into `getScoreColor`.
- [ ] **Four `assignPositions`/tie-ranking impls** — `services/scoring/utils/leaderboardUtils.ts:51`, `utils/competitionPoints/aggregation.ts:90`, `utils/ringer/computeRingerBoard.ts:61`, `utils/wolf/standings.ts:72` → consider one generic `assignPositions(entries, scoreKey)` after verifying ascending/descending order, competition vs dense ranking, equality rules, and mutation behavior.
- [x] **`formatToPar` consolidation (audited sites)** — the five cited local helpers now use shared `formatRelativeToPar` (`utils/formatting.ts:277`), preserving nullable/no-score display behavior. Other inline formatting sites remain separate pending semantic review.
- [x] **Byte-identical finished-scorecard fetchers** — consolidated into `fetchFinishedScorecardsForRound(roundId)` under `services/scorecards/`.
- [ ] **Copied mega-selects** — player-stats scorecard select (`playerStatistics/queries.ts:94` vs `courseQueries.ts:56`); Skins vs Wolf statistics-enrichment (`hooks/skins/statistics.ts:251` vs `hooks/wolf/statistics.ts:126`); `ROUND_SELECT` drift (`useInProgressRounds.ts:38` vs `useUpcomingRounds.ts:29`); handicap-differential select (`player/handicapHistory.ts:96,154`).
- [ ] **Markup** — `CompetitionMiniLeaderboard.tsx:110` ≡ `LeagueMiniLeaderboard.tsx:164`; "tracking-disabled" inline empty state copied across 5 stats sections (`DrivingSection`, `ApproachSection`, `ShortGameSection`, `HazardStatsSection`, `BunkerStatsSection`); Skins/Wolf summary popovers (`SkinsSummaryModal.tsx:70` vs `WolfSummaryModal.tsx:179`).
- [x] **Handicap range constants/copy** — audited hardcoded defaults now use `MAX_HANDICAP`, and user-facing/profile/onboarding/edit copy consistently describes the validator's −5 to 54 range. **Correction:** the handicap constants (`MAX_HANDICAP`, `MIN_HANDICAP`, `HANDICAP_RANGE_ERROR`, `isHandicapInRange`) live in `src/constants/scoring.ts:78-96`, not `constants/app.ts`.

---

## 🟡 Test gaps (highest-risk paths)

- [ ] **Offline sync** — **existing coverage is substantial, so the original “zero tests” claim was false.** `src/__tests__/services/offline/sync.test.ts` directly exercises the sync service and imports `syncScorecard`, covering initialization, queue handling, retry/manual-sync behavior, and related operations. Audit remaining branch coverage in `scorecardSync.ts`, `syncOrchestrator.ts`, and `dao/SyncQueueDAO.ts`, then add only missing characterization cases—especially concurrent-edit conflicts, standalone skips, and direct DAO behavior.
- [x] **Money settlement utility coverage** — added invariants for combined standings/tie ranks, zero-sum normalization/debt settlement, share output, handicap-adjusted team best ball, carryovers, and gross-vs-net team scoring. Database transaction paths in `hooks/prizePool/mutations.ts` and `services/skins/finalizeForSubMatch.ts` remain candidates for integration coverage.
- [ ] **Subscription access control** — direct coverage for `services/subscription/grandfathering.ts`, `RevenueCatProvider.ts` / `ManualProvider.ts`, and the Supabase/Deno edge functions appears thin or absent. Jest does not automatically cover Deno edge functions; prioritize RevenueCat purchase, renewal, cancel, uncancel, product change, enterprise, duplicate-event, and out-of-order-event cases.
- [ ] **Scoring store slices** — the original claim was too broad. `PICKUP_SCORE` and net-double-bogey behavior are covered across multiple scoring, store-utility, golden, screen, and component suites. If the risk is specifically store mutation/initialization wiring, add focused slice-level integration coverage in `scoreUpdateSlice.ts` / `initializeRoundSlice.ts` rather than duplicating already-covered scoring math.

---

## ⚪ Dead-code candidates & test smells

- [x] **Dead-code candidates:** removed `useSwipeToDelete` and `useFilteredCompetitions` after confirming they had no consumers beyond exports/documentation.
- [ ] **`EditRoundScreen` is not proven dead:** it remains registered in `RootNavigator`, navigation tests mock it, and helpers under its directory are imported by active round-editing components. Establish whether its route is reachable through UI/deep links before removing the screen. If it is obsolete, first relocate shared helpers such as `updateRound` so live components do not depend on a deprecated screen directory.
- [x] **Placeholder test:** converted the `courseImport.test.tsx` trivially-passing placeholder to an explicit `it.todo`. **Correction:** `FeatureLock.test.tsx` is not grouped with this item because it also contains real behavioral assertions.
- [x] **Unused var:** removed the unused RPC `data` binding in `services/notifications/tokens.ts`.
- [x] **Jest leaked handle investigation:** the parallel targeted run reproduced Jest's generic forced-worker-exit warning. Re-running the suspected `courseImport.test.tsx` suite serially with `--detectOpenHandles` passed without reporting an open handle; no actionable handle was identified. The suite still emits pre-existing duplicate-key and expected error-path console noise.
- [ ] **Verify liveness of legacy scoring engines:** `Stableford/StrokePlay/Par/TeamScoringEngine` + `ScoringOrchestrator` may not be on the live path (leaderboards use `utils/scoring.ts`). Current production references appear largely internal to the scoring subsystem/barrels, which makes this a legitimate investigation, but dynamic imports and external barrel consumers must be checked before deletion.

---

## Suggested execution order

1. Bug #3 (webhook cancel/uncancel) — isolated, high-severity correctness fix; add lifecycle regression tests.
2. Bug #4 (enterprise mapping) — fix the webhook type/mapping and add enterprise/idempotency/event-order tests.
3. Bug #1 (contribution handicap divergence) — after `scoring-impact-analyst` + characterization test.
4. Bug #2 (`getCompetitions` participant membership) — choose the correct cross-table query/hook architecture.
5. Additive safety: money-settlement tests and targeted offline-sync tests based on measured gaps in the existing suite.
6. Prove liveness before deleting routed screens or legacy scoring engines.
7. Duplication cleanups (the score-category/`assignPositions` work also removes bug #1's whole class).

_All feature work per repo convention: dedicated git worktree branched from `main`._
