# Scoring Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a layered guardrail system — architecture map, characterization tests, a pre-edit impact agent, CLAUDE.md rules, and non-blocking hooks — that makes scoring changes safe against sibling-component breakage, shared-math regressions, and scope creep.

**Architecture:** Five committed artifacts, piloted on the scoring domain. A reference doc (`SCORING_ARCHITECTURE.md`) is the source of truth; characterization tests lock today's behaviour and fail loudly on drift; a read-only subagent produces a blast-radius report before edits; CLAUDE.md rules force that analysis; hooks nudge on scoring-path edits and run the scoring test subset at session end. The five artifacts form a reusable template documented at the end.

**Tech Stack:** TypeScript (strict), React Native / Expo, Jest, pnpm, Zustand, Claude Code agents + hooks (`.claude/`).

## Global Constraints

- Package manager is **pnpm**. Never use `npm`/`yarn`.
- Path alias: `@/` → `src/`. Use it in test imports.
- Test runner is **jest**; run subsets with `pnpm test --testPathPattern='<regex>'`.
- Typecheck command is **`pnpm typecheck`** (already wired into the `Stop` hook).
- This work happens in the worktree at `.claude/worktrees/scoring-guardrails`. Per project memory, **do NOT symlink `node_modules`** into the worktree — run `pnpm install` in-worktree once before running any test/typecheck (see Task 0).
- **Do NOT change scoring source logic.** These tasks only add docs, tests, agent, rules, and config. Characterization tests assert *current* behaviour; if a value surprises you, investigate — do not "fix" the source under this plan.
- All commits end with the `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer.

---

### Task 0: Worktree prerequisites (enable tests)

**Files:**
- None created; installs local `node_modules`.

- [ ] **Step 1: Install dependencies in the worktree**

Run: `pnpm install`
Expected: completes without error; `node_modules/` present (NOT a symlink — verify with `ls -ld node_modules` showing a real directory).

- [ ] **Step 2: Sanity-check the toolchain**

Run: `pnpm test --testPathPattern='utils/scoring\.test' && pnpm typecheck`
Expected: the existing `src/utils/scoring.test.ts` passes and typecheck succeeds. This confirms the harness before we add anything.

No commit (no file changes).

---

### Task 1: Architecture map — `SCORING_ARCHITECTURE.md`

**Files:**
- Create: `docs/guides/SCORING_ARCHITECTURE.md`
- Modify: `CLAUDE.md` (add a one-line pointer in the Documentation Structure list)

**Interfaces:**
- Produces: the canonical reference every later task links to. Later tasks reference the section anchors `## Layer diagram`, `## Component inventory`, `## Blast-radius table`, `## Per-format invariants`.

- [ ] **Step 1: Generate the real consumer lists for the blast-radius table**

Run these and keep the output to paste into the table (do NOT hand-wave the lists):

```bash
cd .claude/worktrees/scoring-guardrails
for mod in scorecardCalculations dailyHandicap competitionPoints matchMargin subMatches teamHandicap leaderboardHandicaps multiBallScorecard; do
  echo "### $mod"; grep -rln "utils/$mod" src --include="*.ts" --include="*.tsx" | grep -v test | sort;
done
echo "### scoring.ts (getMatchPlayStrokes/getFourBallStrokes/calculateNetScore/...)"; grep -rln "from '@/utils/scoring'\|from '../scoring'\|utils/scoring'" src --include="*.ts" --include="*.tsx" | grep -v test | sort
echo "### engines"; grep -rln "services/scoring" src --include="*.ts" --include="*.tsx" | grep -v test | sort
```

- [ ] **Step 2: Write the document**

Create `docs/guides/SCORING_ARCHITECTURE.md` with these sections (use the Step-1 output for the table; use the seed invariants below, verified against code):

````markdown
# Scoring Architecture & Change-Safety Map

> Read this before editing anything under `src/services/scoring`, the scoring
> Zustand store slices, shared handicap/points/margin utils, or
> `src/components/scorecard`. See also `.claude/agents/scoring-impact-analyst.md`
> and the "Scoring changes" rule in `CLAUDE.md`.

## Layer diagram

```
Cards / screens (PRESENTATIONAL — must NOT re-implement math)
  src/components/scorecard/**, src/screens/scoring/**
        ▼ reads state / calls selectors
Zustand store slices
  src/store/{scorecardStore, scoreUpdateSlice, initializeRoundSlice,
             scorecardPersistence, scorecardSyncDebounce}.ts
        ▼ uses
Shared scoring utils
  src/utils/{scoring, scorecardCalculations, dailyHandicap, competitionPoints,
             matchMargin, subMatches, teamHandicap, leaderboardHandicaps,
             multiBallScorecard, handicapDifferential}.ts
  src/services/scoring/utils/{handicapUtils, leaderboardUtils, netScoreUtils}.ts
  src/hooks/player/playingHandicap.ts
        ▼ composed by
Scoring engines / orchestrator (CANONICAL MATH)
  src/services/scoring/ScoringOrchestrator.ts
  src/services/scoring/engines/{MatchPlay, Par, Stableford, StrokePlay, TeamScoring}Engine.ts
```

**Core rule:** scoring math lives in engines + shared utils. Cards are
presentational. If a card needs a number, it comes from a util/selector — never
a formula re-implemented inline.

## Component inventory

| Card / view | Format(s) served | Screen(s) | Key shared deps |
|---|---|---|---|
| PlayerScoreCard | stroke/stableford solo | PlayerScorecardScreen | scoring.ts, dailyHandicap |
| TeamScoreCard | best-ball/aggregate team | ViewRound, Review | scoring.ts, teamHandicap |
| AltShotScoreCard | foursomes (combined/split) | ViewRound, Review | scoring.ts, subMatches |
| StrokePlayScoreCard | stroke play | ViewRound | scoring.ts |
| MatchPlayScorecardTable | singles match play | MatchPlayScoringScreen | scoring.ts (getMatchPlayStrokes) |
| TeamMatchPlayScorecardTable | four-ball match play | TeamMatchPlayScoringScreen | scoring.ts (getFourBallStrokes) |
| ScrambleScorecardTable | scramble/ambrose | ScoringEntry | scoring.ts (calculateScrambleTeamHandicap) |
| RingerScorecard | ringer/eclectic | Competition Breakdown | competitionPoints |
| QuickScorecardView | quick entry | QuickScoreEntryScreen | scoring.ts |
| EclecticScorecardView | league eclectic | Leagues | leaderboardHandicaps |

> Fill any missing rows by inspecting `src/components/scorecard/**` — the table
> must list every `*ScoreCard*` / `*ScorecardTable*` / `*ScoreView*` variant.

## Blast-radius table

For each shared module, "if you change this, re-run the tests for and re-check
these consumers." (Consumer lists produced by the Step-1 greps — paste them here.)

| Shared module | Owns invariant(s) | Consumers (non-test) | Locking test |
|---|---|---|---|
| `utils/scoring.ts` | match-play strokes, four-ball strokes, pickup=NDB, net score, stableford net | _paste_ | `utils/scoring.test.ts`, `utils/scoring.golden.test.ts` |
| `utils/dailyHandicap.ts` | nine-aware daily handicap | _paste_ | `utils/dailyHandicap.golden.test.ts` |
| `utils/subMatches.ts` | alt-shot split differential | _paste_ | `utils/subMatches.golden.test.ts` |
| `utils/teamHandicap.ts` | team stroke allocation | _paste_ | _characterization_ |
| `utils/competitionPoints.ts` | per-round points | _paste_ | _characterization_ |
| engines/* | per-format leaderboard | _paste_ | `services/scoring/*Engine.test.ts` |

## Per-format invariants

Each row is a behavioural contract. **File** owns it; **Test** locks it.

| # | Invariant | File | Test |
|---|---|---|---|
| I1 | Singles match play uses the **difference method** (`getMatchPlayStrokes`): only the higher-handicap player gets strokes, equal to `getStrokesReceived(|hcpA−hcpB|, SI)`. | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I2 | Four-ball match play allocates strokes **relative to the lowest handicap in the match** (`getFourBallStrokes`); tied-lowest get 0. | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I3 | Pickups (`isPickupScore`, strokes ≥ PICKUP_SCORE) count as **net double bogey** everywhere (`getEffectiveGrossStrokes` = par + 2 + strokesReceived). | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I4 | 9-hole daily handicap is **nine-aware** (`calculateNineAwareDailyHandicap`) — must not inflate toward an 18-hole value. | `utils/dailyHandicap.ts` | `utils/dailyHandicap.golden.test.ts` |
| I5 | Alt-shot **split** = differential total-net across the pair. | `utils/subMatches.ts` | `utils/subMatches.golden.test.ts` |
| I6 | Alt-shot **combined** = own 50% handicap, net-lowest scoring. | (finalize service) | characterization (Task 3) |
| I7 | Stableford/Par leaderboards + best-ball header score off the **round daily handicap**. | engines + `leaderboardHandicaps.ts` | `services/scoring/StablefordEngine.test.ts` |

> This is the seed set. During Task 2/3, verify each against code and add any
> missing invariant you encounter. An invariant with no locking test is
> unprotected — flag it.

## Extending this pattern to another domain

See `docs/guides/DOMAIN_GUARDRAILS_PATTERN.md`.
````

- [ ] **Step 3: Add the doc to the CLAUDE.md documentation map**

In `CLAUDE.md`, under "### Developer Guides", add this line after the SCORING_PAIRS entry:

```markdown
- **[SCORING_ARCHITECTURE.md](docs/guides/SCORING_ARCHITECTURE.md)** - Scoring domain map, blast-radius table, per-format invariants (read before editing scoring)
```

- [ ] **Step 4: Verify the doc is complete**

Run: `grep -c "_paste_\|_characterization_" docs/guides/SCORING_ARCHITECTURE.md`
Expected: `0` for `_paste_` (all consumer lists filled). `_characterization_` placeholders are acceptable only where Task 3 will add the test.

- [ ] **Step 5: Commit**

```bash
git add docs/guides/SCORING_ARCHITECTURE.md CLAUDE.md
git commit -m "docs(scoring): architecture map, blast-radius table, invariants

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Characterization tests — shared scoring math (golden values)

**Files:**
- Create: `src/utils/scoring.golden.test.ts`
- Create: `src/utils/dailyHandicap.golden.test.ts`
- Create: `docs/guides/scoring-invariant-coverage.md` (checklist)

**Interfaces:**
- Consumes: `@/utils/scoring` exports (`getStrokesReceived`, `getMatchPlayStrokes`, `getFourBallStrokes`, `getEffectiveGrossStrokes`, `calculateNetScoreFromStrokes`, `calculateStablefordPointsNet`), `@/utils/dailyHandicap` (`calculateNineAwareDailyHandicap`, `calculateGADailyHandicap`).
- Produces: the loud regression net for invariants I1–I4; the coverage checklist referenced by the arch map.

- [ ] **Step 1: Write the golden test for `scoring.ts` (I1–I3)**

Create `src/utils/scoring.golden.test.ts`. These values are computed from the
documented formulas; they lock current behaviour:

```typescript
import {
  getMatchPlayStrokes,
  getFourBallStrokes,
  getEffectiveGrossStrokes,
} from './scoring';

// I1 — singles match play, difference method
describe('INVARIANT I1: singles match-play difference method', () => {
  it('only the higher handicap gets strokes, equal to the difference', () => {
    // diff 6, SI 1 -> higher player gets 1 stroke
    expect(getMatchPlayStrokes(18, 12, 1)).toEqual({ a: 1, b: 0 });
    // reversed
    expect(getMatchPlayStrokes(12, 18, 1)).toEqual({ a: 0, b: 1 });
    // equal handicaps -> no strokes
    expect(getMatchPlayStrokes(12, 12, 1)).toEqual({ a: 0, b: 0 });
    // diff 20, SI 3 -> 20 gives 1 stroke to SI<=18 plus extra to SI<=2; SI 3 -> 1
    expect(getMatchPlayStrokes(20, 0, 3)).toEqual({ a: 1, b: 0 });
  });
});

// I2 — four-ball, relative to lowest in match
describe('INVARIANT I2: four-ball relative-to-lowest', () => {
  it('lowest plays off scratch; others get the difference by SI', () => {
    const players = [
      { playerId: 'p1', handicap: 5 },
      { playerId: 'p2', handicap: 12 },
      { playerId: 'p3', handicap: 5 },
      { playerId: 'p4', handicap: 24 },
    ];
    const si1 = getFourBallStrokes(players, 1);
    expect(si1.get('p1')).toBe(0); // tied lowest
    expect(si1.get('p3')).toBe(0); // tied lowest
    expect(si1.get('p2')).toBe(1); // diff 7 -> floor(7/18)=0 + (SI1<=7) = 1
    expect(si1.get('p4')).toBe(2); // diff 19 -> floor(19/18)=1 + (SI1<=19%18=1) = 2
    expect(getFourBallStrokes([], 1).size).toBe(0);
  });
});

// I3 — pickup = net double bogey
describe('INVARIANT I3: pickup counts as net double bogey', () => {
  it('caps a pickup at par + 2 + strokesReceived', () => {
    expect(getEffectiveGrossStrokes(10, 5, 1)).toBe(8); // 5+2+1
    expect(getEffectiveGrossStrokes(10, 4, 0)).toBe(6); // 4+2+0
    expect(getEffectiveGrossStrokes(10, 3, 1)).toBe(6); // 3+2+1
  });
  it('leaves a real score untouched', () => {
    expect(getEffectiveGrossStrokes(5, 4, 1)).toBe(5);
  });
});
```

- [ ] **Step 2: Run it and confirm it PASSES against current code**

Run: `pnpm test --testPathPattern='scoring\.golden'`
Expected: PASS. (Characterization tests pass immediately; they exist to fail on
*future* drift.) If any assertion FAILS, the formula assumption is wrong —
inspect `src/utils/scoring.ts`, correct the expected value to match current
behaviour, and note the corrected invariant in the arch map. Do not change source.

- [ ] **Step 3: Prove the net actually catches regressions (mutation check)**

Temporarily edit `src/utils/scoring.ts` `getMatchPlayStrokes` to `return { a: 0, b: 0 }`, run the test, confirm I1 FAILS, then revert the edit.

Run: `pnpm test --testPathPattern='scoring\.golden'`
Expected after revert: PASS again. (This confirms the tripwire works.)

- [ ] **Step 4: Write the nine-aware daily-handicap golden test (I4)**

Create `src/utils/dailyHandicap.golden.test.ts`. First inspect
`calculateNineAwareDailyHandicap`'s signature and a `calculateGADailyHandicap`
call in code, then write an **observe-then-lock** test:

```typescript
import {
  calculateNineAwareDailyHandicap,
  calculateGADailyHandicap,
} from './dailyHandicap';

// I4 — a 9-hole daily handicap must be materially lower than the 18-hole value,
// and must NOT inflate toward ~full-18. Lock the observed values.
describe('INVARIANT I4: nine-aware daily handicap', () => {
  it('produces a nine-scaled value, not an inflated 18-hole one', () => {
    // TODO(capture): call with a representative param object taken from a real
    // call site, log both the 18-hole and nine-aware results ONCE, then paste
    // the exact observed numbers below as the frozen expectation.
    // e.g.:
    // const nine = calculateNineAwareDailyHandicap({ ...params, holes: 9 });
    // expect(nine).toBe(<OBSERVED>);
  });
});
```

Replace the `TODO(capture)` block by running the function once with real params,
observing output, and freezing it. The test must contain concrete `expect`
assertions with numeric literals before you commit — no `TODO` may remain.

- [ ] **Step 5: Run the daily-handicap golden test**

Run: `pnpm test --testPathPattern='dailyHandicap\.golden'`
Expected: PASS with concrete frozen values.

- [ ] **Step 6: Write the coverage checklist**

Create `docs/guides/scoring-invariant-coverage.md`:

```markdown
# Scoring Invariant Coverage

| Invariant | Locked by | Status |
|---|---|---|
| I1 singles match-play difference method | `utils/scoring.golden.test.ts` | ✅ |
| I2 four-ball relative-to-lowest | `utils/scoring.golden.test.ts` | ✅ |
| I3 pickup = net double bogey | `utils/scoring.golden.test.ts` | ✅ |
| I4 nine-aware daily handicap | `utils/dailyHandicap.golden.test.ts` | ✅ |
| I5 alt-shot split differential | (Task 3) | ⬜ |
| I6 alt-shot combined 50% net-lowest | (Task 3) | ⬜ |
| I7 stableford/par off round daily handicap | `services/scoring/StablefordEngine.test.ts` | ⬜ verify |
```

- [ ] **Step 7: Commit**

```bash
git add src/utils/scoring.golden.test.ts src/utils/dailyHandicap.golden.test.ts docs/guides/scoring-invariant-coverage.md
git commit -m "test(scoring): characterization golden tests for invariants I1-I4

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Characterization tests — format finalizers (observe-then-lock)

**Files:**
- Create: `src/utils/subMatches.golden.test.ts` (I5)
- Create: `src/__tests__/services/scoring/altShotCombined.golden.test.ts` (I6)
- Modify: `docs/guides/scoring-invariant-coverage.md` (flip I5/I6 to ✅)

**Interfaces:**
- Consumes: the alt-shot split entry point in `@/utils/subMatches` and the alt-shot combined finalize path (locate via `grep -rn "combined" src/services/rounds src/utils/subMatches.ts`).
- Produces: locks I5/I6; completes the coverage checklist.

- [ ] **Step 1: Locate the exact entry functions**

```bash
grep -rnE "export (function|const)" src/utils/subMatches.ts
grep -rln "alt.?shot\|altShot\|foursome" src/services --include="*.ts" | grep -v test
```
Identify (a) the function that computes the split differential total-net, and
(b) the finalize function for combined alt-shot. Note their exact signatures.

- [ ] **Step 2: Write the split golden test (I5) with observe-then-lock**

Create `src/utils/subMatches.golden.test.ts`. Build a representative fixture (a
pair with known per-hole nets), call the split function, observe the output
once, and freeze it as concrete literal assertions. The committed file must have
numeric `expect(...).toBe(...)` assertions — no `console.log`, no TODO.

- [ ] **Step 3: Run and confirm PASS**

Run: `pnpm test --testPathPattern='subMatches\.golden'`
Expected: PASS with frozen values.

- [ ] **Step 4: Write the combined alt-shot golden test (I6)**

Create `src/__tests__/services/scoring/altShotCombined.golden.test.ts`. Use the
existing `StablefordEngine.test.ts` fixture helpers as a style reference
(`createCourseData`, `createScorecard`). Feed a two-player pair, run the combined
finalize path, observe, and freeze net-lowest + 50%-handicap outputs as literals.

- [ ] **Step 5: Run and confirm PASS**

Run: `pnpm test --testPathPattern='altShotCombined\.golden'`
Expected: PASS.

- [ ] **Step 6: Update coverage checklist and commit**

Flip I5 and I6 to ✅ in `docs/guides/scoring-invariant-coverage.md`, then:

```bash
git add src/utils/subMatches.golden.test.ts src/__tests__/services/scoring/altShotCombined.golden.test.ts docs/guides/scoring-invariant-coverage.md
git commit -m "test(scoring): characterization tests for alt-shot split/combined (I5-I6)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Scoring-impact analyst agent

**Files:**
- Create: `.claude/agents/scoring-impact-analyst.md`

**Interfaces:**
- Consumes: `docs/guides/SCORING_ARCHITECTURE.md`, `docs/guides/scoring-invariant-coverage.md`.
- Produces: a read-only subagent invoked before scoring edits; returns a blast-radius report.

- [ ] **Step 1: Write the agent definition**

Create `.claude/agents/scoring-impact-analyst.md`:

```markdown
---
name: scoring-impact-analyst
description: Use BEFORE editing any scoring file (src/services/scoring, scoring store slices, shared handicap/points/margin utils, or src/components/scorecard). Given a target file, returns a blast-radius report — consumers, shared-math vs presentational classification, covering invariants/tests, and a test-first plan. Read-only; never edits.
tools: Read, Grep, Glob, Bash
---

You are the scoring-impact analyst for The Nineteenth. You are read-only. You
NEVER edit files. Your job: given one or more target scoring files, produce a
blast-radius report so the editor knows what they might break.

Steps:
1. Read `docs/guides/SCORING_ARCHITECTURE.md` and
   `docs/guides/scoring-invariant-coverage.md`.
2. For each target file, run `grep -rln "<module path/name>" src --include="*.ts"
   --include="*.tsx" | grep -v test` to list every consumer. Also list test files
   separately.
3. Classify the target: **shared math** (engines / utils / store slices) or
   **leaf presentational** (a single card/screen). Shared math = wide blast radius.
4. Map the target to the invariants (I1…) it participates in and the
   characterization tests that lock them. Flag any touched behaviour with NO
   covering test as "UNPROTECTED".
5. Output EXACTLY this structure (no edits, no code changes):

   ## Blast-radius report: <file>
   - Classification: shared-math | leaf-presentational
   - Consumers (non-test): <list, or "none">
   - Covering tests: <list>
   - Invariants involved: <I#, …, or "none mapped">
   - UNPROTECTED behaviour: <list, or "none">
   - Test-first plan: <ordered steps — which characterization test to add/assert
     BEFORE editing, then the edit, then which subset to run>

Keep it concise. If the target is not a scoring file, say so and stop.
```

- [ ] **Step 2: Verify the agent is well-formed and runs**

Run: `head -6 .claude/agents/scoring-impact-analyst.md`
Expected: valid YAML frontmatter with `name`, `description`, `tools`.

Then (manual smoke, executed by the implementer): dispatch the agent against
`src/utils/scoring.ts` and confirm it returns the structured report naming real
consumers and invariants I1–I3. Record the result in the commit message.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/scoring-impact-analyst.md
git commit -m "feat(claude): scoring-impact-analyst pre-edit review agent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: CLAUDE.md rule — "Scoring changes"

**Files:**
- Modify: `CLAUDE.md` (new section)

**Interfaces:**
- Consumes: the arch map, the agent, the coverage checklist.

- [ ] **Step 1: Add the rule section**

In `CLAUDE.md`, immediately after the "## Styling Architecture" section's end
(before "## API Integration Strategy"), insert:

```markdown
---

## Scoring changes (guardrails)

Scoring is a high-blast-radius domain: 10+ score-card variants share one
calculation layer. Before editing anything under `src/services/scoring`, the
scoring Zustand store slices (`src/store/{scorecardStore,scoreUpdateSlice,
initializeRoundSlice}.ts`), shared handicap/points/margin utils
(`src/utils/{scoring,scorecardCalculations,dailyHandicap,competitionPoints,
matchMargin,subMatches,teamHandicap,leaderboardHandicaps}.ts`), or
`src/components/scorecard/**`:

1. **Read** `docs/guides/SCORING_ARCHITECTURE.md` (map, blast-radius table, invariants).
2. **Run** the `scoring-impact-analyst` agent on the target file(s) and state the
   reported blast radius before editing.
3. **State** which characterization test(s) cover the change (see
   `docs/guides/scoring-invariant-coverage.md`). If the behaviour you are about
   to change is UNPROTECTED, add a characterization test that locks current
   behaviour FIRST, then make the change.
4. **Cards are presentational** — do NOT re-implement scoring math inside a card.
   Numbers come from a util/selector.
5. After the change, run the scoring subset:
   `pnpm test --testPathPattern='(services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard)'`.
```

- [ ] **Step 2: Verify placement**

Run: `grep -n "## Scoring changes (guardrails)" CLAUDE.md`
Expected: one match, located before "## API Integration Strategy".

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add scoring-changes guardrail rule

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Enforcement hooks

**Files:**
- Modify: `.claude/settings.json`

**Interfaces:**
- Consumes: the rule, the scoring test subset command.

- [ ] **Step 1: Read the current settings**

Run: `cat .claude/settings.json`
Expected: the existing `Stop` hook running `pnpm typecheck`.

- [ ] **Step 2: Add a PreToolUse nudge and extend the Stop hook**

Replace `.claude/settings.json` with (preserving the existing typecheck hook and
adding the scoring test subset + a PreToolUse reminder scoped to scoring paths):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/scoring-edit-nudge.py"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "pnpm typecheck" },
          {
            "type": "command",
            "command": "pnpm test --testPathPattern='(services/scoring|utils/(scoring|dailyHandicap|subMatches)\\.golden|components/scorecard)' --silent"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Write the nudge hook script**

Create `.claude/hooks/scoring-edit-nudge.py`. It reads the tool input on stdin,
and if the edited path is in a scoring area, emits a reminder to stderr with a
non-blocking exit code (the message is surfaced to the model; it does not block):

```python
#!/usr/bin/env python3
import json, sys, re

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

path = (data.get("tool_input", {}) or {}).get("file_path", "") or ""
SCORING = re.compile(
    r"(src/services/scoring/|src/store/(scorecard|scoreUpdate|initializeRound)"
    r"|src/utils/(scoring|scorecardCalculations|dailyHandicap|competitionPoints"
    r"|matchMargin|subMatches|teamHandicap|leaderboardHandicaps)"
    r"|src/components/scorecard/)"
)
if path and SCORING.search(path):
    sys.stderr.write(
        "SCORING GUARDRAIL: you are editing high-blast-radius scoring code. "
        "Before continuing, confirm you have (1) read docs/guides/SCORING_ARCHITECTURE.md, "
        "(2) run the scoring-impact-analyst agent, (3) a characterization test covering this change. "
        "See the 'Scoring changes' rule in CLAUDE.md.\n"
    )
    sys.exit(2)  # exit 2 = surface stderr to the model, non-fatal reminder
sys.exit(0)
```

> Note: exit code 2 on PreToolUse feeds stderr back to the model as a reminder.
> If the project prefers a fully silent/non-interrupting nudge, change to
> `sys.exit(0)` and print to stdout instead — but exit 2 is what makes the
> reminder visible. Confirm the desired behaviour with the maintainer during review.

- [ ] **Step 4: Make the hook executable and test it**

```bash
chmod +x .claude/hooks/scoring-edit-nudge.py
echo '{"tool_input":{"file_path":"src/utils/scoring.ts"}}' | python3 .claude/hooks/scoring-edit-nudge.py; echo "exit=$?"
echo '{"tool_input":{"file_path":"src/components/Button.tsx"}}' | python3 .claude/hooks/scoring-edit-nudge.py; echo "exit=$?"
```
Expected: first prints the guardrail reminder with `exit=2`; second prints
nothing with `exit=0`.

- [ ] **Step 5: Verify the Stop hook command runs**

Run: `pnpm test --testPathPattern='(utils/(scoring|dailyHandicap|subMatches)\.golden)' --silent`
Expected: the golden tests pass (this is the subset the Stop hook will run).

- [ ] **Step 6: Commit**

```bash
git add .claude/settings.json .claude/hooks/scoring-edit-nudge.py
git commit -m "chore(claude): scoring-path PreToolUse nudge + Stop-hook scoring tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Reusable-pattern doc

**Files:**
- Create: `docs/guides/DOMAIN_GUARDRAILS_PATTERN.md`

**Interfaces:**
- Consumes: everything above as the worked example.

- [ ] **Step 1: Write the pattern doc**

Create `docs/guides/DOMAIN_GUARDRAILS_PATTERN.md`:

```markdown
# Domain Guardrails Pattern

A reusable template for making a high-blast-radius domain safe to edit. The
scoring domain is the worked example (see `SCORING_ARCHITECTURE.md`).

To apply this to a new domain (e.g. leaderboards, sync, prize pools):

1. **Map** — write `docs/guides/<DOMAIN>_ARCHITECTURE.md`: layer diagram,
   component inventory, blast-radius table (grep the consumers), per-format/behaviour
   invariants each naming the owning file + locking test.
2. **Characterization tests** — lock today's behaviour with golden-value tests
   (observe-then-lock for complex paths). Keep a `<domain>-invariant-coverage.md`
   checklist; an invariant with no test is UNPROTECTED.
3. **Impact agent** — copy `.claude/agents/scoring-impact-analyst.md` to
   `<domain>-impact-analyst.md`; swap the module list and invariant references.
4. **Rule** — add a "<Domain> changes (guardrails)" section to `CLAUDE.md` that
   forces read-map → run-agent → name-covering-test → run-subset.
5. **Hooks** — extend `.claude/hooks/scoring-edit-nudge.py`'s regex (or add a
   sibling) to cover the new domain's paths; add the domain's test subset to the
   `Stop` hook.

Keep enforcement as *nudge + fail-loud tests*, not hard blocks.
```

- [ ] **Step 2: Link it from the arch map and commit**

Confirm `SCORING_ARCHITECTURE.md`'s final section already links to this file
(added in Task 1 Step 2). Then:

```bash
git add docs/guides/DOMAIN_GUARDRAILS_PATTERN.md
git commit -m "docs(guardrails): reusable domain-guardrails pattern

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Full-suite sanity + finish

**Files:** none.

- [ ] **Step 1: Run the scoring subset + typecheck end to end**

Run:
```bash
pnpm typecheck
pnpm test --testPathPattern='(services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard)'
```
Expected: typecheck clean; scoring subset green. Diff any failures against the
Jest baseline noted in project memory (~243 pre-existing failures on main) — only
NEW failures matter.

- [ ] **Step 2: Confirm no source logic changed**

Run: `git diff main --stat -- src/services src/store src/utils | grep -vE "\.golden\.test\.|\.test\."`
Expected: no non-test source files under `src/services`, `src/store`, `src/utils`
appear (this plan only adds tests + docs + config).

- [ ] **Step 3: Summarize**

Report the coverage checklist status and any UNPROTECTED invariants discovered,
so the maintainer knows exactly what is and isn't locked.
```
