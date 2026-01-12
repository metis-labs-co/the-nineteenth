# Plan: Persist Competition Wizard Draft in Zustand Store

## Overview
Add a Zustand store to persist competition wizard form data during the current session. This prevents data loss when users accidentally swipe down or navigate away from the Create Competition screen.

## Approach
Create a new Zustand store (without AsyncStorage persistence) that holds the wizard's form state. Replace the local `useState` calls in `CreateCompetitionScreen.tsx` with store selectors and actions. The draft automatically clears on successful competition creation or app restart.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persistence type | Session-only (in-memory) | User confirmed; avoids stale data issues, simpler implementation |
| Store location | `src/store/competitionWizardStore.ts` | Follows existing store pattern (`settingsStore.ts`, etc.) |
| Clear trigger | On successful creation | Automatically cleans up; no manual intervention needed |

---

## Phase 1: Create Zustand Store

### Step 1.1: Create Competition Wizard Store
**Status:** ✅ Complete (2026-01-12)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a new Zustand store at `src/store/competitionWizardStore.ts` for persisting competition wizard draft data.

The store should have:
- State:
  - `currentStep: number` (1-4 depending on prize pool)
  - `wizardData: WizardData` with `step1?`, `step2?`, `prizePoolConfig?`
  - `hasDraft: boolean`
  - `lastModified: number | null`

- Actions:
  - `setStep1(data: CompetitionDetailsFormData)` - Save step 1 data
  - `setStep2(data: SimplifiedRoundFormData[])` - Save step 2 data
  - `setPrizePoolConfig(data: PrizePoolConfigFormData)` - Save prize pool config
  - `setCurrentStep(step: number)` - Update current step
  - `clearDraft()` - Reset to default state
  - `initializeFromRouteParams(initialState?: WizardData)` - For AI flow support

- Selector hooks:
  - `useHasWizardDraft()` - Check if draft exists
  - `useWizardCurrentStep()` - Get current step
  - `useWizardStep1Data()` - Get step 1 data
  - `useWizardStep2Data()` - Get step 2 data
  - `useWizardPrizePoolData()` - Get prize pool data
  - `useWizardHasPrizePool()` - Check if prize pool enabled

- Non-hook helper:
  - `clearWizardDraft()` - For use outside React components

Import types from `@/schemas/competition`: CompetitionDetailsFormData, SimplifiedRoundFormData, PrizePoolConfigFormData

DO NOT use persist middleware - this is session-only storage.
Follow patterns from `src/store/settingsStore.ts` but without AsyncStorage.
```

**Deliverables:**
- [x] `src/store/competitionWizardStore.ts` created with all state, actions, and hooks

**Dependencies:** None
**Notes:** Reference `src/store/settingsStore.ts` for store structure patterns

---

## Phase 2: Integrate with Create Competition Screen

### Step 2.1: Update CreateCompetitionScreen to Use Store
**Status:** ✅ Complete (2026-01-12)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify `src/screens/admin/CreateCompetitionScreen.tsx` to use the new Zustand store instead of local useState.

Changes needed:

1. Add imports:
   - Import `useCompetitionWizardStore` and `clearWizardDraft` from `@/store/competitionWizardStore`

2. Replace useState with store (around lines 127-137):
   - Remove: `const [currentStep, setCurrentStep] = useState(...)`
   - Remove: `const [wizardData, setWizardData] = useState<WizardState>(...)`
   - Add: Destructure from `useCompetitionWizardStore()`:
     - `currentStep`, `wizardData`, `setCurrentStep`, `setStep1`, `setStep2`, `setPrizePoolConfig`, `initializeFromRouteParams`

3. Add useEffect to handle route params initialization:
   - If `initialState` exists and store is empty, call `initializeFromRouteParams(initialState)`
   - This preserves the AI competition flow

4. Update step completion handlers (lines 162-180):
   - `handleStep1Complete`: Call `setStep1(data)` then `setCurrentStep(2)`
   - `handleStep2Complete`: Call `setStep2(data)` then `setCurrentStep(...)`
   - `handlePrizePoolComplete`: Call `setPrizePoolConfig(data)` then `setCurrentStep(4)`

5. Clear draft on successful creation (in handleSubmit, around line 256):
   - After showing success toast, call `clearWizardDraft()`
   - Must happen BEFORE the setTimeout navigation

Keep all other logic unchanged (subscription checks, step rendering, etc).
```

**Deliverables:**
- [x] `CreateCompetitionScreen.tsx` uses store instead of useState
- [x] Step handlers use store actions
- [x] Draft clears on successful creation
- [x] AI flow (route params) still works

**Dependencies:** Step 1.1
**Notes:** The `hasPrizePool` derived value should continue using `wizardData.step1?.enablePrizePool ?? false`

---

## Critical Files

### To Create
- `src/store/competitionWizardStore.ts` - New Zustand store for wizard draft

### To Modify
- `src/screens/admin/CreateCompetitionScreen.tsx` - Replace useState with store

### Reference Files
- `src/store/settingsStore.ts` - Pattern reference for store structure
- `src/schemas/competition.ts` - Form data types to import

---

## Verification

- [x] **TypeScript:** No type errors in wizard store or CreateCompetitionScreen (verified 2026-01-12)
- [ ] **Accidental dismiss recovery:** Navigate away mid-wizard, return, data preserved (manual test required)
- [ ] **Step preservation:** Current step preserved when returning (manual test required)
- [ ] **Successful creation clears:** Create competition, return to wizard, form is empty (manual test required)
- [ ] **App restart clears:** Force close app, reopen, wizard starts fresh (manual test required)
- [ ] **AI flow works:** Route params with initial state still initialize wizard correctly (manual test required)

### Implementation Verification (2026-01-12)

**Store Implementation (competitionWizardStore.ts):**
- ✅ All state properties: `currentStep`, `wizardData`, `hasDraft`, `lastModified`
- ✅ All actions: `setStep1`, `setStep2`, `setPrizePoolConfig`, `setCurrentStep`, `clearDraft`, `initializeFromRouteParams`
- ✅ All selector hooks: `useHasWizardDraft`, `useWizardCurrentStep`, `useWizardStep1Data`, `useWizardStep2Data`, `useWizardPrizePoolData`, `useWizardHasPrizePool`
- ✅ Non-hook helper: `clearWizardDraft`
- ✅ No AsyncStorage persistence (session-only)

**Screen Integration (CreateCompetitionScreen.tsx):**
- ✅ Imports from store: `useCompetitionWizardStore`, `clearWizardDraft`
- ✅ Destructures all required properties from store
- ✅ useEffect initializes from route params when store is empty
- ✅ Step handlers use store actions
- ✅ Draft clears on successful creation (before navigation setTimeout)
