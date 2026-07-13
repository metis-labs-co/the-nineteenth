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
    reminder = (
        "SCORING GUARDRAIL: this edit touches high-blast-radius scoring code. "
        "Confirm you have (1) read docs/guides/SCORING_ARCHITECTURE.md, "
        "(2) run the scoring-impact-analyst agent for the blast radius, and "
        "(3) a characterization test covering this change. "
        "See the 'Scoring changes' rule in CLAUDE.md."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": reminder,
        }
    }))
sys.exit(0)  # always 0 — non-blocking; additionalContext surfaces the reminder
