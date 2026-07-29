# Competition Redesign

A visual redesign of the competition-detail experience, then an app-wide look-and-feel sweep.
The first implementation was merged (`f16e59a6`) then **reverted** (`55bafc4e`) because it did not
match the mocks — see `PLAN.md` for the verified root cause (a palette + surface-model mismatch, not
just "hardcoded colours").

## Current status (2026-07-29)

The visual core plus **3 of the 5 backend features are implemented and committed to local `main`**.
The work is **not pushed** (local `main` is ahead of `origin/main`) and **no migrations are deployed**.

| Item | State | Where |
|---|---|---|
| **Phase 0** — solid palette retune | ✅ done | `e613a5e4` |
| **1A core** — tab model + hero (+ inaccessible-tab flash fix) | ✅ done | `cac407ee`, `aeb65ae8` |
| **1B.2 Visibility** — 3-state picker + RLS tighten + lookup RPC | ✅ done | `e897428b`, `358d5e36` |
| **1B.3 Guests** — `allow_guests` toggle + trigger | ✅ done | `e897428b`, `4e7ad007` |
| **1B.4 Notifications** — reminder + results-summary toggles + gates | ✅ done | `647ea61f` |
| Code-review fixes (competitor Skins, visibility rollback, pending-lock, RPC casing) | ✅ done | `358d5e36` |
| **1A per-tab visual passes** + 1A review fixes | ⛔ outstanding | — |
| **1B.5 Multiple Organisers** | ⛔ plan/docs only | `6c5e73c4`, `79db4d39` |
| **1B.6 Configurable Tie-break** | ⛔ plan/docs only | `5e7671dd` |
| **Phase 2** — app-wide sweep | ⛔ not started | — |

**Cross-cutting outstanding:** not pushed to `origin/main`; the 7 migrations
(`20260706…` → `20260728000100`) are **written but unapplied to prod** — and
`20260728000000_competition_visibility_tier1` carries a **client-coordination requirement** (it drops
the `USING(true)` competitions SELECT policy the old client's join-by-code relies on; only apply once
the build with the `lookup_competition_by_invite_code` RPC is live); on-device QA pending across the
implemented features.

## Start here

| File | What it is |
|---|---|
| **[`PLAN.md`](./PLAN.md)** | **The plan — read first.** Corrected strategy, the palette decision, Phase 0/1/2, acceptance loop, definition of done. |
| [`PHASE-1-PLAN.md`](./PHASE-1-PLAN.md) | Phase 1 decomposition & roadmap — grounded in the real code: the 1A (visual) / 1B (settings+data) split, per-subsystem file structure + readiness, open product sub-specs, and sequencing. |
| [`PHASE-1A-PLAN.md`](./PHASE-1A-PLAN.md) | Ready-to-execute plan for the **visual** redesign (screen chrome + hero + per-tab passes). Depends on Phase 0. |
| [`PHASE-1B1-PLAN.md`](./PHASE-1B1-PLAN.md) | Ready-to-execute plan for **relocating** structural config into Settings (move + rewire; no new schema). |
| [`PHASE-1B2-VISIBILITY-PLAN.md`](./PHASE-1B2-VISIBILITY-PLAN.md) | Spec + plan for **Visibility (Tier 1)** — 3-state picker + real Private via tightened RLS + invite-code lookup RPC. Browse/public-leaderboards deferred. |
| [`PHASE-1B3-GUESTS-PLAN.md`](./PHASE-1B3-GUESTS-PLAN.md) | Spec + plan for **Allow Guests** — a per-competition toggle on the **existing** placeholder-player system; no tier tightening. |
| [`PHASE-1B4-NOTIFICATIONS-PLAN.md`](./PHASE-1B4-NOTIFICATIONS-PLAN.md) | Spec + plan for **Notification settings** — organiser toggles for round reminders + results summary (gate existing notifications); live score alerts deferred. |
| [`PHASE-1B5-ORGANISERS-PLAN.md`](./PHASE-1B5-ORGANISERS-PLAN.md) | Spec + plan for **Multiple organisers** — a `competition_organizers` join table via a **consolidate-then-extend** RLS refactor (operational parity; owner-only delete/transfer/payouts). The largest backend item. |
| [`PHASE-1B6-TIEBREAK-PLAN.md`](./PHASE-1B6-TIEBREAK-PLAN.md) | Spec + plan for **Configurable Tie-break** — payout-affecting (Split/Countback/Handicap). Scoring-guardrail + money-critical: characterization-first, `scoring-impact-analyst` gate. |
| [`SPEC.md`](./SPEC.md) | The design handoff — per-tab detail, token map, component map, tab-label→component map, settings §4. Accurate reference; `PLAN.md` states the one correction (the neutral palette must be retuned). |
| [`mocks/`](./mocks/) | The hi-fi HTML prototypes. Open a `.dc.html` in a browser; toggle its `dark` prop for the dark variant. |
| [`ORIGINAL_PROMPT.superseded.md`](./ORIGINAL_PROMPT.superseded.md) | The original strategy brief. **Superseded by `PLAN.md`** — kept for provenance. |

## Mocks

- `Competition Details - Redesign.dc.html` — the reference (all three phones, all states, all tabs, settings screen).
- `Competition Details - Redesign v1 (single-format).dc.html` — earlier single-format variant, for context.
- `Score & Round - Redesign.dc.html` — scoring/round reference. **Context only — out of scope** for this job.
- `support.js` — runtime that lets the prototypes open in a browser.

## Decisions on record

- **Palette:** make the mock's styling the **default for solid light mode**; adapt it into **solid
  dark mode**; **defer** any translucent / photo-backdrop reconciliation to a later phase.
- **Tabs:** keep the app's existing **filled-pill** `Tabs` app-wide; the mock's underline tabs are a
  prototype artifact (accepted divergence). See `PLAN.md` §Review corrections #1.

## Execution order & gates (read before starting a plan)

**Sequence:**
1. **Phase 0 — palette retune** (`colors.ts`, per `PLAN.md` Phase 0). ⛔ **Gates ALL visual work** — 1A
   and the settings-screen visuals render wrong until this lands. Solid light + solid dark; leave the
   translucent branches. *(✅ done — `e613a5e4`.)*
2. **1A visual** (per-tab, after Phase 0) **+ 1B.1 relocation** — parallelizable; each a PR behind
   screenshot sign-off. (1A tab-model/hero done — `cac407ee`/`aeb65ae8`; **remaining** = per-tab passes,
   the 1A review fixes, and 1B.1 PointsConfig-invalidation + regression.)
3. **Backend features — independent of 1A, each gated on its own migration deploy:** 1B.2 Visibility ✅ →
   1B.3 Guests ✅ → 1B.4 Notifications ✅ → **1B.5 Organisers ⛔ → 1B.6 Tie-break ⛔**. **1B.5 and 1B.6 are
   the big/risky ones — plan/docs only so far, sequence them last.**
4. **Phase 2** — app-wide sweep, after 1A lands (includes the `textTertiary` essential-text audit).

**Hard stop-points — surface to the owner, don't push through:**
- **Visibility Task 1** (enforcement audit): if tightening the `competitions` SELECT RLS would break
  friend-activity/feed, STOP.
- **Organisers Phase A** must be proven **behaviour-identical** (characterization RLS suite) BEFORE Phase B
  — never hand-edit 21 policies' logic.
- **Tie-break Phase 0**: `scoring-impact-analyst` pass + characterization tests locking current
  tie/position behaviour BEFORE any change (money-critical, unprotected scoring domain).

**Plan-wide caveats (every settings feature — `PLAN.md` Rounds 6–7):**
- Settings toggles/pickers need **local optimistic state + rollback** — `useUpdateCompetitionField` has
  none (1B.2/1B.3/1B.4/1B.6).
- New competition fields go on the **DB-domain `Competition`** (`competition.types.ts` via
  `@/types/database.types`), and you must update **fixtures/factories** (non-optional fields break the suite).
- **Migrations:** copy the **latest** function body — `grep -rl "FUNCTION <name>" supabase/migrations | sort | tail -1`; deploy each feature's migration to staging.
- **Scoring guardrails:** anything touching the scoring files needs the analyst pass + characterization-first.

## Review corrections

**Seven rounds** of review found **33 issues** so far — rounds 1–3 on strategy/spec (tab style,
modal-route, data-model, tab fade, the palette maths: over-collapse, dark targets, contrast/AA,
`primaryLight` role, `primaryBackground` drift, currency, Visibility 3-state, translucent spillover, …),
rounds 4–5 on the Phase-1 plans (competitor tabs not role-gated, tab labels/topology, Tie-break not
relocatable, 1B.1 query-key + `SettingsSection` refactor, `activeTab` reconciliation, organiser/competitor
sets locked from the mock, Payouts completed-only), round 6 on Notifications (stale SQL sources, both-channel
gating, optimistic toggles, type surface), round 7 on Multiple organisers (split `competitions` policy,
round-delete operational, per-trigger notification matrix, `added_by` cascade). All are in **`PLAN.md`
§"Review corrections" (rounds 1–7, #1–#33)** — it **supersedes `SPEC.md`** where they conflict; `SPEC.md`
is annotated inline (⚠️ CORRECTED).

## Open items (per-plan)

Global product decisions are all made; remaining open sub-decisions live in each plan's "Open items"
section — notably: Tie-break cross-round countback basis + tier-gating; Organisers feature tier-gating +
transfer-ownership (out of v1). Each is flagged in its own `PHASE-1B*` file. *(Phase 0 palette, Visibility
default/tier-gating, and Guests default are now resolved and shipped — see Current status above.)*
