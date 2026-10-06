# Domain Guardrails Pattern

A reusable template for making a high-blast-radius domain safe to edit. The
scoring domain is the worked example (see
[SCORING_ARCHITECTURE.md](SCORING_ARCHITECTURE.md)).

To apply this to a new domain (e.g. leaderboards, sync, prize pools):

1. **Map** — write `docs/guides/<DOMAIN>_ARCHITECTURE.md`: layer diagram,
   component inventory, blast-radius table (grep the consumers), per-format/
   behaviour invariants each naming the owning file + locking test.
2. **Characterization tests** — lock today's behaviour with golden-value
   tests (observe-then-lock for complex paths). Keep a
   `<domain>-invariant-coverage.md` checklist (see
   [scoring-invariant-coverage.md](scoring-invariant-coverage.md) for the
   scoring version); an invariant with no test is UNPROTECTED.
3. **Impact agent** — copy
   [`.claude/agents/scoring-impact-analyst.md`](../../.claude/agents/scoring-impact-analyst.md)
   to `<domain>-impact-analyst.md`; swap the module list and invariant
   references. It's read-only — it reports blast radius, it doesn't edit.
4. **Rule** — add a "`<Domain>` changes (guardrails)" section to `CLAUDE.md`
   that forces read-map → run-agent → name-covering-test → run-subset, mirroring
   the "Scoring changes (guardrails)" section already there.
5. **Hooks** — extend
   [`.claude/hooks/scoring-edit-nudge.py`](../../.claude/hooks/scoring-edit-nudge.py)'s
   path regex (or add a sibling hook script) to cover the new domain's paths,
   and add the domain's test subset to the `Stop` hook in `.claude/settings.json`.
   Note: `.claude/` is gitignored in this repo, so tracking any new/changed
   files under it requires `git add -f`.

## Keep it non-blocking

Both enforcement points are advisory, not gates:

- The `PreToolUse` hook only injects `additionalContext` (a reminder) and
  always exits `0` — it never blocks the edit.
- The `Stop` hook runs `pnpm type-check` (not `pnpm typecheck`) plus a scoped
  `pnpm test --testPathPattern=...` subset covering the golden characterization
  tests, the scoring engines, the invariant-bearing utils, and the
  `components/scorecard` render tests (~1.4k tests, ~15s wall). **Rule: only add
  a path once its suites pass cleanly** — a Stop hook that is red on a clean tree
  becomes noise and trains you to ignore it. `components/scorecard` was excluded
  at first (pre-existing stale-test failures) and folded in only after those
  tests were repaired.

Keep enforcement as *nudge + fail-loud tests*, not hard blocks.
