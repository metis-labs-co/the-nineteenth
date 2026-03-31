# Full-Screen Wizard Component Design

## Context

The app has 5 independent wizard implementations (Create Round, Competition Creation, League Quick Add Round, Create League, Add Course), each building step management, navigation, and progress UI from scratch. This creates duplicated logic and inconsistent UX. The Create Round and Add Course wizards currently use bottom sheets, which constrain complex multi-step flows.

This design consolidates all wizards into a shared `FullScreenWizard` component with a `useWizard()` hook, providing consistent full-screen presentation with a segmented progress bar.

## Design Decisions

- **All wizards become full-screen** — bottom sheet wizards (Create Round, Add Course) migrate to full-screen for consistency and more content space
- **Segmented progress bar** — colored segments per step (completed = green/primary, current = blue/primary, upcoming = gray), with step title + "X of Y" label below
- **Standard footer** — Back/Next/Submit buttons provided by the wizard. Each step can customize the Next label and disable it via `canProceed`
- **Dynamic step arrays** — steps are computed from state, so conditional steps (e.g. Create Round skipping partner step) just filter the array
- **Navigation hook only** — `useWizard()` manages which step you're on. Domain state (scores, courses, players) stays in each wizard's existing hooks

## Component API

### `FullScreenWizard`

Full-screen container rendering header, segmented progress bar, scrollable content area, and footer.

```tsx
<FullScreenWizard
  title="Create Round"
  wizard={wizard}          // return value from useWizard()
>
  {wizard.currentStep.render()}
</FullScreenWizard>
```

### `WizardStepConfig`

Each wizard defines its steps as an array of configs:

```tsx
interface WizardStepConfig {
  key: string;              // unique step identifier
  title: string;            // shown in progress bar label
  canProceed: boolean;      // controls Next button enabled state
  render: () => ReactNode;  // step content
  nextLabel?: string;       // override "Next" button text
  isSubmit?: boolean;       // true = calls onSubmit instead of onNext
}
```

### `useWizard()` Hook

Manages step navigation state:

```tsx
const wizard = useWizard({
  steps: stepConfigs,       // WizardStepConfig[]
  onSubmit: handleSubmit,   // called when final step's Next/Submit is pressed
  onClose: handleClose,     // called on X button or back from first step
});

// Returns:
wizard.currentStepIndex     // number
wizard.currentStep          // WizardStepConfig
wizard.goNext()             // advance (no-op if canProceed is false)
wizard.goBack()             // go back, or call onClose at step 0
wizard.goToStep(index)      // jump to specific step
wizard.isFirstStep          // boolean
wizard.isLastStep           // boolean
wizard.totalSteps           // number
wizard.steps                // WizardStepConfig[] (pass-through for FullScreenWizard)
```

## Progress Bar Design

Segmented bar beneath the header:

```
[  ██████  |  ██████  |  ░░░░░░  |  ░░░░░░  ]
  Course Selection                    2 of 4
```

- One segment per step, equal width, separated by 4px gaps
- Completed steps: `colors.primary` (green/teal)
- Current step: `colors.primary`
- Upcoming steps: `colors.surfaceVariant` (gray)
- Below the bar: step title (left-aligned) + "X of Y" (right-aligned)
- 4px segment height, 2px border radius

## File Structure

```
src/components/common/FullScreenWizard/
├── index.tsx              // FullScreenWizard component (header + content + footer)
├── WizardProgressBar.tsx  // Segmented bar + step title + count label
├── WizardFooter.tsx       // Back / Next / Submit buttons
├── useWizard.ts           // Step navigation hook
└── types.ts               // WizardStepConfig, UseWizardOptions, UseWizardReturn
```

## Migration Plan

All 5 wizards migrated in a single effort:

| Wizard | Current State | Migration |
|--------|--------------|-----------|
| **Create Round** (`CreateRoundBottomSheet`) | BottomSheet, 7 conditional steps, orchestrator + 6 sub-hooks | Convert to full-screen. Keep sub-hooks for domain logic. Replace `useWizardNavigation` with `useWizard()`. Dynamic step array handles conditional steps. |
| **Competition Creation** (`CreateCompetitionScreen`) | Full-screen, 4-5 steps, Zustand store | Replace Zustand `currentStep` tracking with `useWizard()`. Keep Zustand for wizard data only. Replace `StepIndicator` with `FullScreenWizard`. |
| **League Quick Add Round** (`LeagueQuickAddRoundScreen`) | Full-screen, 5 steps, single hook | Replace manual `{vm.step === 'x' && ...}` conditionals with step config array. Hook keeps domain state. |
| **Create League** (`CreateLeagueScreen`) | Full-screen, 2 steps, inline useState | Replace inline step dots and manual step management with `FullScreenWizard`. |
| **Add Course** (`AddCourseModal`) | BottomSheet, 3 steps, custom hook | Convert to full-screen. Replace `StepIndicator` usage with `FullScreenWizard`. Keep `useAddCourseWizard` for domain state. |

### Navigation Changes

The Create Round and Add Course wizards currently open as bottom sheets/modals from various screens. Moving to full-screen means:
- **Create Round**: Becomes a stack screen (e.g., `CreateRound`) pushed via `navigation.navigate()`. All callers that currently show the bottom sheet will instead navigate to this screen, passing the same props (`initialCourse`, `initialPartners`, etc.) as route params.
- **Add Course**: Becomes a stack screen (e.g., `AddCourse`) pushed via `navigation.navigate()`. Callers currently opening the modal will navigate instead.
- Both need entries in `RootStackParamList` and the root navigator.

### Post-Migration Cleanup

- Remove `src/components/common/StepIndicator.tsx` (replaced by `WizardProgressBar`)
- Remove inline step indicator JSX from `CreateLeagueScreen`
- Remove `CreateRoundBottomSheet/hooks/useWizardNavigation.ts` (replaced by `useWizard()`)
- Remove step-related state from `competitionWizardStore.ts` (keep data state)

## Key Files to Modify

### New Files
- `src/components/common/FullScreenWizard/index.tsx`
- `src/components/common/FullScreenWizard/WizardProgressBar.tsx`
- `src/components/common/FullScreenWizard/WizardFooter.tsx`
- `src/components/common/FullScreenWizard/useWizard.ts`
- `src/components/common/FullScreenWizard/types.ts`

### Modified Files
- `src/screens/rounds/CreateRoundBottomSheet/index.tsx` — convert to full-screen wizard
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` — use `useWizard()` for navigation
- `src/screens/admin/CreateCompetitionScreen/index.tsx` — use `FullScreenWizard`
- `src/screens/admin/CreateCompetitionScreen/hooks/useCompetitionWizardState.ts` — use `useWizard()`
- `src/screens/leagues/LeagueQuickAddRoundScreen/index.tsx` — use `FullScreenWizard`
- `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts` — use `useWizard()`
- `src/screens/leagues/CreateLeagueScreen.tsx` — use `FullScreenWizard`
- `src/components/courses/AddCourseModal/index.tsx` — convert to full-screen wizard
- `src/components/courses/AddCourseModal/hooks/useAddCourseWizard.ts` — use `useWizard()`
- `src/store/competitionWizardStore.ts` — remove step tracking, keep data state
- Navigation files — update routes for wizards that change from modal/bottom sheet to screen

### Removed Files
- `src/components/common/StepIndicator.tsx`
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardNavigation.ts`

## Verification

1. **Visual**: Segmented bar renders correctly for 2-step (league), 3-step (course), 4-5 step (competition), 5-step (quick add round), and 7-step (create round) wizards
2. **Dynamic steps**: Create Round conditional step skipping works (partner step, match type step)
3. **Navigation**: Back from first step calls onClose. Next disabled when `canProceed` is false. Submit fires on last step.
4. **Dark mode**: Progress bar segments, footer buttons, and header use theme colors correctly
5. **Keyboard**: Content area scrolls properly when keyboard is open (KeyboardAvoidingView)
6. **Regression**: All existing wizard flows complete successfully end-to-end
7. **Type safety**: No TypeScript errors across all modified files (`pnpm type-check`)
