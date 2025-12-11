# CreateCompetitionScreen

**File:** `src/screens/admin/CreateCompetitionScreen.tsx`

## Overview

A 4-step wizard for creating new golf competitions. Guides admins through competition setup including details, round configuration, player management, and final review before creation.

## Features

- **4-Step Wizard Flow**: Progressive form with clear step indicators
- **Progress Tracking**: Visual progress bar and numbered step circles
- **Data Persistence**: Form data preserved when navigating between steps
- **Review Before Submit**: Final review step before creation
- **Success Feedback**: Snackbar with invite code on creation

## Navigation

| Destination | Trigger |
|-------------|---------|
| Previous screen | Back button on step 1 |
| `CompetitionDetail` | Successful creation (with replace) |

## Wizard Steps

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | `CompetitionDetailsStep` | Name, dates, handicap system |
| 2 | `RoundDetailsStep` | Course and date |
| 3 | `AddPlayersStep` | Add players to compete |
| 4 | `ReviewStep` | Review and generate invite code |

## Data Dependencies

### Hooks Used
- `useCreateCompetition()` - Mutation hook for competition creation
- `useSafeAreaInsets()` - Safe area handling

### Wizard Data Types
```typescript
interface WizardState {
  step1?: CompetitionDetailsFormData; // name, description, startDate, handicapSystem
  step2?: RoundDetailsFormData;       // courseName, date, teeTime
  step3?: PlayerFormData[];           // array of players
}
```

## Component Structure

```
CreateCompetitionScreen
├── Header
│   ├── Title ("Create Competition")
│   ├── ProgressBar
│   └── StepIndicator
│       ├── StepCircle (1) + Title (conditional)
│       ├── StepCircle (2) + Title (conditional)
│       ├── StepCircle (3) + Title (conditional)
│       └── StepCircle (4) + Title (conditional)
├── ScrollView
│   └── CurrentStepComponent
│       ├── CompetitionDetailsStep (step 1)
│       ├── RoundDetailsStep (step 2)
│       ├── AddPlayersStep (step 3)
│       └── ReviewStep (step 4)
└── Snackbar (success toast)
```

## State Management

| State | Type | Purpose |
|-------|------|---------|
| `currentStep` | `number` | Current wizard step (1-4) |
| `wizardData` | `WizardState` | Accumulated form data |
| `toastVisible` | `boolean` | Success snackbar visibility |
| `toastMessage` | `string` | Snackbar message |
| `toastInviteCode` | `string` | Generated invite code |

## Step Completion Handlers

Each step calls its handler with form data:

```typescript
const handleStep1Complete = (data: CompetitionDetailsFormData) => {
  setWizardData((prev) => ({ ...prev, step1: data }));
  setCurrentStep(2);
};
```

## Final Submission

The `handleSubmit` function:
1. Validates all wizard data is present
2. Calls `createCompetition.mutateAsync()` with:
   - Competition details (name, description, startDate, handicapSystem, visibility)
   - Round details (courseName, date, teeTime)
   - Players array (name, email, phone, handicap)
3. Shows success toast with invite code
4. Navigates to CompetitionDetail after 2 second delay

## Navigation Flow

### Back Navigation
- Step 1: `navigation.goBack()` to previous screen
- Steps 2-4: `setCurrentStep(prev => prev - 1)` to previous step

### Forward Navigation
- Steps 1-3: Handled by step components via `onComplete` callback
- Step 4: `handleSubmit()` creates competition

## Step Components

Each step component receives:
| Prop | Type | Description |
|------|------|-------------|
| `initialData` | Step data type | Pre-populated data if returning |
| `onComplete` | `(data) => void` | Handler for step completion |
| `onBack` | `() => void` | Handler for back navigation |

ReviewStep additionally receives:
| Prop | Type | Description |
|------|------|-------------|
| `competitionData` | Step 1 data | Competition details |
| `roundData` | Step 2 data | Round details |
| `playersData` | Step 3 data | Players array |
| `onSubmit` | `() => void` | Final submission handler |
| `isSubmitting` | `boolean` | Loading state |

## UI Components Used

- `View`, `ScrollView` - React Native core
- `Text`, `ProgressBar`, `Snackbar`, `Surface` - React Native Paper
- `useSafeAreaInsets` - Safe area handling
- Step components from `@/components/competition/create/`

## Styling Highlights

- White header with shadow
- Progress bar with primary color
- Step circles: gray200 inactive, primary active, border highlight on current
- Only current step shows title (space optimization)
- Step numbers turn white when active
- Gray50 background for content area

## Progress Calculation

```typescript
const progress = (currentStep / STEPS.length) * 100;
```

Progress bar shows percentage completion (25%, 50%, 75%, 100%).

## Error Handling

- Alert shown if submission fails
- Alert shown if submit attempted with incomplete data
- Mutation error logged to console
