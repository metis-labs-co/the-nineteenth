---
description: Complete a step from the Testing Plan with review and status update
---

[TEST-STEP] Implement testing phase from the Testing Plan

**Phase to implement:** $ARGUMENTS

## Workflow

### 1. Read the Testing Plan
- Load `docs/progress/TESTING_PLAN.md`
- Find the specified phase number (or next PENDING phase if not specified)
- Update the status to `IN_PROGRESS` in the Phase Status Tracking table

### 2. Implement the Phase
Based on the phase number, create or modify the test files as specified:

- **Phase 1**: Create `src/__tests__/store/scorecardStore.test.ts` - Scorecard Store Tests
- **Phase 2**: Extend `src/__tests__/utils/scoring.test.ts` - Scoring Utilities Enhancement
- **Phase 3**: Create `src/__tests__/utils/scorecardCalculations.test.ts` - Scorecard Calculations Tests
- **Phase 4**: Create `src/__tests__/utils/teamScoring.test.ts` - Team Scoring Tests
- **Phase 5**: Create `src/__tests__/utils/scoringPairs.test.ts` - Scoring Pairs Tests
- **Phase 6**: Create `src/__tests__/services/offline/database.test.ts` and `sync.test.ts` - Offline Sync Tests
- **Phase 7**: Create `src/__tests__/services/rounds/roundResultsService.test.ts` - Round Results Service Tests
- **Phase 8**: Create hook tests in `src/__tests__/hooks/` - Hook Integration Tests
- **Phase 9**: Create `src/__tests__/integration/scoringFlow.test.ts` and `teamScoring.test.ts` - Integration Tests

**Implementation Guidelines:**
- Follow existing test patterns from `src/__tests__/utils/testFixtures.ts`
- Use the test fixtures for creating mock data (players, holes, scorecards)
- Target 90%+ coverage for critical files
- Write descriptive test names that explain the scenario being tested

### 3. Run Tests
Execute the tests to verify they pass:
```bash
pnpm test --coverage
```

Show the test results and coverage metrics for the relevant files.

### 4. Request Review
After implementation, present to the user:
- Summary of files created/modified
- Number of tests added
- Test results (pass/fail)
- Coverage metrics for the phase's target files

Then ask: **"Please review the changes. Type 'approve' to mark this phase complete, or provide feedback for adjustments."**

### 5. Update Plan Status
Based on user response:

**If approved:**
- Update `docs/progress/TESTING_PLAN.md`
- Change the phase status from `IN_PROGRESS` to `COMPLETED`
- Add the completion date in the "Completed" column
- Show the updated Phase Status Tracking table

**If feedback provided:**
- Keep status as `IN_PROGRESS`
- Make the requested adjustments
- Re-run tests
- Ask for review again

## Example Usage

```bash
# Run the next pending phase
/test-step

# Run a specific phase
/test-step 1
/test-step 3
```

## Notes
- Only implement ONE phase at a time
- Always run existing tests after changes to ensure no regressions
- If a phase depends on infrastructure from another phase, note the dependency
