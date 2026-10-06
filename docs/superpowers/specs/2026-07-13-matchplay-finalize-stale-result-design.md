# Match-play sub-match finalize uses stale results — Design

**Date:** 2026-07-13
**Status:** Root cause confirmed (prod data); awaiting decision on fix approach before implementation.
**Reference:** "Murray Winter Classic 2026" (prod), round `3fd38de5-4f65-4e6f-a7e3-9f482d1bcd38` — 1v1 Singles Match Play (display_order 4), `round_format: split`, `sub_match_size: 1`, `team_format: match-play-team`, `pair_points {win:2, tie:0.5, loss:0}`.

## Symptom

The round's live sub-match header shows **Australia 4 – 4 England**, but the persisted competition standings for the round are **Australia 6 – 2 England** (`round_results`: team `986795da` Australia = 6, `3089e2a1` England = 2). The two disagree.

## Root cause (confirmed against prod data)

The scores are the source of truth; `sub_matches.result` is a **stale cache**, and the finalize path trusts the cache while the live view recomputes from scores.

Confirmed chain:
1. The 4 singles carry persisted `sub_matches.result` snapshots (all `manual_result: false`): SM1 `b-wins`, SM2 `b-wins`, SM3 `a-wins`, SM4 `b-wins`. Mapped to team membership, that is **Australia 3 / England 1 → 6–2**, which is exactly what `round_results` stores.
2. **SM3's snapshot is stale.** Its two scorecards are still `status: in-progress` with `daily_handicap_used: null` and **17 of 18 holes** entered. Gross hole-by-hole, England leads 8 holes to 7 (England should take SM3). The stored `a-wins` (Australia) froze at a mid-round "2 up / 2 to play" state (`final_differential: 2, final_holes_remaining: 2`) and was never refreshed after England came back. Flipping SM3 to England gives **2–2 → 4–4**, matching the live header.
3. The organiser used **force-submit** (`forceFinalizeRound`). It promotes a card to `completed` only if it has a score on **every** hole (`scored < holeCount → left DNF`). SM3's 17/18-hole cards are therefore **left `in-progress` (DNF)**.
4. `refinalizeRoundResults` then reads only **`completed`** scorecards, so the SM3 cards are invisible to it. For the split round it calls `finalizePairResults`, which uses `persistedOutcome(sm)` — the **stale `sub_matches.result`** — → **6–2**.
5. The live view (`SubMatchLeaderboardTab`) instead recomputes each sub-match from the round's scorecards (any status) via the match-play engine (`computeMatchPlaySubMatch` → `calculateMatchStatus`), and prefers that live result (precedence: manual → live → stored) → **4–4**.

Three compounding defects:
- **D1 — Finalize trusts a stale non-manual `sub_matches.result`** instead of recomputing from scores. Opposite precedence to the live view.
- **D2 — Finalize can't recompute anyway for match play:** it reads only `completed` cards, and `finalizePairResults`' non-persisted fallback (`resolveSubMatchOutcomeFromScores`) compares **best-ball net stroke totals**, which is wrong for match play (holes-up, not stroke totals).
- **D3 — Force-submit's 18-hole completeness gate is wrong for match play**, where matches close out early / concede, so legitimately-complete match cards are treated as DNF.

## User intent

The organiser expects submitting scores to **overwrite** player submissions and drive the standings from the entered scores. Today that doesn't hold for match-play sub-matches.

## Fix approaches

### Approach A — Recompute match-play outcomes inside finalize (recommended)
Make the split-round finalizer resolve **match-play** sub-matches from the round's scores using the same engine and precedence as the live view: **manual result → recompute holes-up (closeout-aware) → stored non-manual result**, reading the round's scorecards regardless of `completed` status. Retire the best-ball-stroke-total fallback for match play (D2). Optionally relax D3 so match cards decided by closeout aren't marked DNF.

- **Pros:** Single source of truth (scores); standings always equal the live header; fixes future recurrences; no dependence on cache freshness.
- **Cons:** Finalize (a service) must build the match-play view server-side, including the **handicap basis**. The live view uses each player's *playing handicap* (via `calculatePlayingHandicap` / the shared `getMatchPlayStrokes` difference method). Finalize currently only has `daily_handicap_used` (null on these cards) with a profile-handicap fallback. To match the display exactly, finalize must resolve the same playing-handicap/stroke basis — the main implementation risk. (For this specific round, handicaps are absent so a gross recompute already yields 4–4, but the general fix must use the correct basis.)

### Approach B — Keep `sub_matches.result` fresh on the write path
Recompute and re-persist each match-play sub-match's `result` whenever scores change and on organiser force-submit, so the cache finalize trusts is never stale.

- **Pros:** Finalize stays simple (keeps trusting `sub_matches.result`); computation lives where tee/handicap context is naturally available (scoring screens).
- **Cons:** Force-submit is a server-side service (`forceFinalizeRound`) without the UI scoring context, so it still needs a server-side recompute with the correct handicap basis — the same hard part as A. Also must cover every score-edit path, not just submit; easy to miss one and regress.

**Recommendation: Approach A.** Scores as the single source of truth is the correct architecture; the live view already does this and is trusted by users. Central to both approaches is a **server-side match-play resolver that uses the same playing-handicap/stroke basis as the live view** — that shared helper is the real deliverable and should be extracted once and reused.

## Open decisions (for the user)

1. **Handicap basis:** confirm the canonical match-play stroke basis to reuse server-side (the shared `getMatchPlayStrokes` difference method on playing handicaps). The fix must match the live view exactly.
2. **D3 (force-submit gate):** also fix the 18-hole completeness gate for match play (so closed-out matches count without being DNF), or leave it and rely on finalize recomputing from whatever scores exist?
3. **This round's immediate remediation:** re-finalize after the code lands (recompute → 4–4, no data patch), or a one-off prod patch of SM3's stale result now.

## Testing (once approach chosen)

- Unit: a match-play sub-match where holes-up winner differs from stored `sub_matches.result` and from best-ball stroke totals — finalize picks the holes-up winner; manual result overrides; closeout detection stops at the decided hole; handicap basis matches the live `computeMatchPlaySubMatch`.
- Integration: re-finalize the reference round after the fix → team rows 4–4; overall standings and winner update.
- Regression: existing pairs better-ball / alt-shot split rounds unchanged; combined team match play unchanged.

## Out of scope

- The Ryder-cup team-leaderboard redesign and the leaderboard round-header overflow (tracked separately, queued behind this bug).
