# Competition Redesign

A visual redesign of the competition-detail experience, then an app-wide look-and-feel sweep.
The first implementation was merged (`f16e59a6`) then **reverted** (`55bafc4e`) because it did not
match the mocks — see `PLAN.md` for the verified root cause (a palette + surface-model mismatch, not
just "hardcoded colours").

## Start here

| File | What it is |
|---|---|
| **[`PLAN.md`](./PLAN.md)** | **The plan — read first.** Corrected strategy, the palette decision, Phase 0/1/2, acceptance loop, definition of done. |
| [`PHASE-1-PLAN.md`](./PHASE-1-PLAN.md) | Phase 1 decomposition & roadmap — grounded in the real code: the 1A (visual) / 1B (settings+data) split, per-subsystem file structure + readiness, open product sub-specs, and sequencing. |
| [`PHASE-1A-PLAN.md`](./PHASE-1A-PLAN.md) | Ready-to-execute plan for the **visual** redesign (screen chrome + hero + per-tab passes). Depends on Phase 0. |
| [`PHASE-1B1-PLAN.md`](./PHASE-1B1-PLAN.md) | Ready-to-execute plan for **relocating** structural config into Settings (move + rewire; no new schema). |
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

## Review corrections

Three rounds of review found fifteen issues so far (tab style, settings-not-a-modal-route, new
settings needing a data model, a non-existent tab fade, palette over-collapse, under-specified dark
mode, currency, sub-AA text contrast, `primaryLight` role conflict, translucent spillover, stale SPEC
directives, `primaryBackground` formula drift, secondary AA on the page background, the tertiary
exception not being usage-limited, and Visibility being a 3-state enum). All are resolved or flagged
in **`PLAN.md` §"Review corrections"** — read that section; it **supersedes `SPEC.md`** wherever they
conflict, and `SPEC.md` is annotated inline (⚠️ CORRECTED).

## Open items still needing a decision/spec

- **Settings data model (blocker for part of Phase 1):** allow-guests, competition notification
  settings, and multiple organisers don't exist in the schema — need product + migration spec before
  building. See `PLAN.md` §Review corrections #3.
- **Visibility control (small spec decision):** `visibility` is a 3-state enum
  (private/unlisted/public), not a boolean — pick the control shape + semantics before building.
  Unblocks independently of the data-model work. See `PLAN.md` §Review corrections #15.
- **Dates/Scoring/Handicap relocation:** the mock moves these from the Details tab into settings —
  confirm before moving; do not duplicate. See `PLAN.md` Phase 1.
