# Super Admin Hole Data Editing - Implementation Plan

**Goal:** Allow super admins to edit hole data (yardage, par, stroke index) from two locations: during scoring and from course detail view.
**Status:** Complete - 100% (8/8 tasks)

---

## Quick Execution Guide

Each task below has a **"Command (copy and run)"** block with full context included. Just copy the command and run it.

**Execution Order:**
1. **Task 1** → Manual (create `useUpdateCourseHoles.ts` - code provided)
2. **Task 2** → `/component EditHoleBottomSheet` (creates edit modal)
3. **Task 3** → `/refactor HoleHeader` (add super admin tap support)
4. **Task 4** → `/refactor HoleTable` (add row tap support)
5. **Task 5** → `/refactor scorecardStore` (add updateHoles method)
6. **Task 6** → `/refactor ScorecardEntryScreen` (integrate modal)
7. **Task 7** → `/refactor CourseDetailScreen` (integrate modal)
8. **Task 8** → `/test-component` + `/review` (testing and review)

**Tip:** Each command is self-contained with all context needed.

---

## Claude Commands Reference

| Command | Purpose | Tasks |
|---------|---------|-------|
| `/hook` | Create TanStack Query hooks | 1 |
| `/component` | Create new React Native components | 2 |
| `/refactor` | Update existing screens/components | 3-7 |
| `/test-component` | Create component tests | 8 |
| `/review` | Review completed work for quality | 8 |

**Key Context Files:**
- **HoleHeader:** `src/components/scorecard/HoleHeader.tsx`
- **HoleTable:** `src/screens/courses/CourseDetailScreen/components/HoleTable.tsx`
- **ScorecardEntryScreen:** `src/screens/scoring/ScorecardEntryScreen/index.tsx`
- **CourseDetailScreen:** `src/screens/courses/CourseDetailScreen/index.tsx`
- **Super Admin Check:** `useIsSuperAdmin()` from `@/store/subscriptionStore`

---

## Overview

This plan adds **super admin-only hole editing** capability. Super admins can:
1. **During scoring** - Tap hole info in HoleHeader to edit yardage, par, or stroke index
2. **From course view** - Tap a hole row in HoleTable to edit via modal

### Current State (Already Implemented)

- **Hole Type** (`src/types/database/base.ts`):
  ```typescript
  interface Hole {
    number: 1 | 2 | ... | 18;
    par: 3 | 4 | 5;
    strokeIndex: number;
    yardages?: Record<string, number>;  // { white: 400, blue: 425 }
  }
  ```
- **Data Storage:** Holes stored as JSONB array in `courses.holes` column
- **Super Admin Check:** `useIsSuperAdmin()` hook from `@/store/subscriptionStore`
- **Modal Pattern:** `BottomSheet` component at `src/components/common/BottomSheet/`

### What This Plan Adds

- **useUpdateCourseHoles Hook:** Mutation to update course holes in database
- **EditHoleBottomSheet:** Modal for editing hole data (par, SI, yardage per tee)
- **HoleHeader Enhancement:** Tappable for super admins during scoring
- **HoleTable Enhancement:** Tappable rows for super admins in course view
- **ScorecardStore Update:** Method to sync local holes after edit

### Validation Rules

| Field | Rule |
|-------|------|
| Par | Must be 3, 4, or 5 |
| Stroke Index | Must be 1-18, unique across all 18 holes |
| Yardage | Optional, positive number if provided |

---

## Sprint 1: Core Infrastructure

### Task 1: Create useUpdateCourseHoles Mutation Hook
**Status:** Not Started
**File:** `src/hooks/useUpdateCourseHoles.ts`

**Command (copy and run):**
```
/hook useUpdateCourseHoles - Create a TanStack Query mutation hook to update course holes. Input type: { courseId: string, holes: Hole[] }. Uses supabase.from('courses').update({ holes, updated_at: new Date().toISOString() }).eq('id', courseId).select().single(). On success, invalidate courseKeys.detail(courseId) and courseKeys.all. Follow pattern from src/hooks/useCourseDetails.ts. Import Hole type from @/types/database/base. Export from src/hooks/index.ts.
```

**Full Implementation:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Hole } from '@/types/database/base';
import { courseKeys } from './queryKeys';

interface UpdateCourseHolesInput {
  courseId: string;
  holes: Hole[];
}

export function useUpdateCourseHoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, holes }: UpdateCourseHolesInput) => {
      const { data, error } = await supabase
        .from('courses')
        .update({ holes, updated_at: new Date().toISOString() })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}
```

**Export:** Add to `src/hooks/index.ts`:
```typescript
export { useUpdateCourseHoles } from './useUpdateCourseHoles';
```

**Dependencies:** None

---

### Task 2: Create EditHoleBottomSheet Component
**Status:** Not Started
**Files:**
- `src/components/courses/EditHoleBottomSheet/index.tsx`
- `src/components/courses/EditHoleBottomSheet/types.ts`
- `src/components/courses/EditHoleBottomSheet/hooks/useEditHoleForm.ts`

**Command (copy and run):**
```
/component EditHoleBottomSheet - Create a bottom sheet modal at src/components/courses/EditHoleBottomSheet/ for editing hole data (super admin only). Props: visible (boolean), onClose (function), hole (Hole), allHoles (Hole[] for SI validation), courseTees (TeeBox[]), selectedTee (string|null), onSave (function taking Hole), loading (boolean). UI: Header "Edit Hole X" with close button. Par selector: SegmentedButtons with options 3, 4, 5 (like HoleDataStep pattern in AddCourseModal). Stroke Index: +/- stepper buttons (1-18 range), show error message if SI duplicate (check allHoles excluding current). Yardage section: TextInput per tee from courseTees (show tee.color indicator, keyboardType numeric). Save button disabled if validation fails. Follow BottomSheet pattern from src/components/common/BottomSheet. Use useThemeColors, spacing, typography from theme. Create useEditHoleForm hook for local state (editedHole, validationErrors, isDirty). Export from src/components/courses/index.ts.
```

**Props Interface:**
```typescript
interface EditHoleBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  hole: Hole;
  allHoles: Hole[];  // For SI uniqueness validation
  courseTees: TeeBox[];
  selectedTee?: string | null;
  onSave: (updatedHole: Hole) => void;
  loading?: boolean;
}
```

**UI Layout:**
```
┌─────────────────────────────────────┐
│       Edit Hole 5            [X]    │
├─────────────────────────────────────┤
│ Par                                 │
│ [  3  ] [ ●4  ] [  5  ]             │
├─────────────────────────────────────┤
│ Stroke Index                        │
│       [ - ]    7    [ + ]           │
│ ⚠ SI 7 already used by Hole 12     │
├─────────────────────────────────────┤
│ Yardage                             │
│ 🔵 Blue    [  425  ]                │
│ ⚪ White   [  400  ]                │
│ 🔴 Red     [  350  ]                │
├─────────────────────────────────────┤
│         [    Save    ]              │
└─────────────────────────────────────┘
```

**Validation Logic:**
```typescript
// In useEditHoleForm hook
const validateHole = useCallback((hole: Hole, allHoles: Hole[]) => {
  const errors: Record<string, string> = {};

  // Par validation
  if (![3, 4, 5].includes(hole.par)) {
    errors.par = 'Par must be 3, 4, or 5';
  }

  // Stroke index validation
  if (hole.strokeIndex < 1 || hole.strokeIndex > 18) {
    errors.strokeIndex = 'Stroke index must be 1-18';
  }

  // SI uniqueness (exclude current hole)
  const duplicate = allHoles.find(
    h => h.number !== hole.number && h.strokeIndex === hole.strokeIndex
  );
  if (duplicate) {
    errors.strokeIndex = `SI ${hole.strokeIndex} used by Hole ${duplicate.number}`;
  }

  // Yardage validation (if provided)
  if (hole.yardages) {
    Object.entries(hole.yardages).forEach(([tee, yards]) => {
      if (yards !== undefined && yards <= 0) {
        errors[`yardage_${tee}`] = 'Yardage must be positive';
      }
    });
  }

  return errors;
}, []);
```

**Dependencies:** Task 1 (mutation hook)

---

## Sprint 2: Component Modifications

### Task 3: Modify HoleHeader for Super Admin Editing
**Status:** Not Started
**File:** `src/components/scorecard/HoleHeader.tsx`

**Command (copy and run):**
```
/refactor src/components/scorecard/HoleHeader.tsx - Add super admin hole editing capability. Add new props: isSuperAdmin (boolean), onEditHole (function). When isSuperAdmin && onEditHole, wrap the details container (the View containing par, SI, yardage - around line 85-120) in TouchableOpacity with onPress={onEditHole}. Add a small pencil icon (Icon source="pencil" size={14}) next to the yardage text when super admin. If yardage is null/undefined and isSuperAdmin, show "+" icon instead of blank. Add subtle visual feedback (opacity change on press). Export updated props interface.
```

**Current Props:**
```typescript
interface HoleHeaderProps {
  hole: Hole;
  selectedTee?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onHolePress?: () => void;
}
```

**New Props:**
```typescript
interface HoleHeaderProps {
  // ... existing props
  isSuperAdmin?: boolean;
  onEditHole?: () => void;
}
```

**UI Changes:**
- Wrap details section in `TouchableOpacity` when `isSuperAdmin && onEditHole`
- Show pencil icon next to yardage: `<Icon source="pencil" size={14} color={colors.textSecondary} />`
- If no yardage and super admin: show `<Icon source="plus" size={14} />` (tappable to add)
- Add `activeOpacity={0.7}` for press feedback

**Dependencies:** None

---

### Task 4: Modify HoleTable for Super Admin Editing
**Status:** Not Started
**File:** `src/screens/courses/CourseDetailScreen/components/HoleTable.tsx`

**Command (copy and run):**
```
/refactor src/screens/courses/CourseDetailScreen/components/HoleTable.tsx - Add super admin row editing. Add new props: isSuperAdmin (boolean), onHolePress (function taking Hole). When isSuperAdmin && onHolePress, wrap each hole row (the View containing hole number, par, SI, yardage) in TouchableOpacity with onPress={() => onHolePress(hole)}. Add small pencil icon at end of row when super admin. Don't make the OUT/IN/TOTAL summary rows tappable. Add subtle press feedback with activeOpacity. Update HoleTableProps type in types.ts file.
```

**Current Props:**
```typescript
interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
}
```

**New Props:**
```typescript
interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
  isSuperAdmin?: boolean;
  onHolePress?: (hole: Hole) => void;
}
```

**UI Changes:**
- Each hole row wrapped in `TouchableOpacity` when super admin
- Small edit indicator at row end: `<Icon source="pencil-outline" size={16} />`
- Summary rows (OUT, IN, TOTAL) remain non-tappable
- Highlight row slightly on press

**Dependencies:** None

---

### Task 5: Add updateHoles Method to ScorecardStore
**Status:** Not Started
**File:** `src/store/scorecardStore.ts`

**Command (copy and run):**
```
/refactor src/store/scorecardStore.ts - Add updateHoles method for updating local holes after super admin edit. Add to ScorecardState interface: updateHoles: (holes: Hole[]) => void. Implementation: set({ holes: newHoles }), then save to SQLite for offline access using existing pattern (check if saveScorecard or similar exists for reference). If currentRoundId exists, persist the updated holes. This ensures the scoring screen reflects edits immediately.
```

**Add to State Interface:**
```typescript
interface ScorecardState {
  // ... existing properties
  updateHoles: (holes: Hole[]) => void;
}
```

**Implementation:**
```typescript
updateHoles: (newHoles) => {
  set({ holes: newHoles });

  // Persist to SQLite for offline access
  const { currentRoundId } = get();
  if (currentRoundId) {
    // Use existing SQLite save pattern
    saveHolesToLocal(currentRoundId, newHoles).catch(console.error);
  }
},
```

**Dependencies:** None

---

## Sprint 3: Screen Integration

### Task 6: Integrate into ScorecardEntryScreen
**Status:** Not Started
**File:** `src/screens/scoring/ScorecardEntryScreen/index.tsx`

**Command (copy and run):**
```
/refactor src/screens/scoring/ScorecardEntryScreen/index.tsx - Integrate EditHoleBottomSheet for super admin hole editing. Import useIsSuperAdmin from @/store/subscriptionStore, EditHoleBottomSheet from @/components/courses, useUpdateCourseHoles from @/hooks. Add state: editingHole (Hole|null, default null). Get courseId from round data. Add handleEditHole callback that sets editingHole to currentHoleData. Add handleSaveHole callback that: (1) builds updated holes array replacing edited hole, (2) calls updateHoles mutation with courseId and new holes, (3) calls scorecardStore.updateHoles(newHoles) to sync local state, (4) sets editingHole to null. Pass isSuperAdmin and onEditHole to HoleHeader. Render EditHoleBottomSheet at end with visible={!!editingHole}, hole={editingHole}, allHoles from store, courseTees from round/course data.
```

**Add Imports:**
```typescript
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { EditHoleBottomSheet } from '@/components/courses';
import { useUpdateCourseHoles } from '@/hooks';
```

**Add State and Handlers:**
```typescript
const isSuperAdmin = useIsSuperAdmin();
const [editingHole, setEditingHole] = useState<Hole | null>(null);
const updateHolesMutation = useUpdateCourseHoles();
const { holes, updateHoles: updateLocalHoles } = useScorecardStore();

const handleEditHole = useCallback(() => {
  if (currentHoleData) {
    setEditingHole(currentHoleData);
  }
}, [currentHoleData]);

const handleSaveHole = useCallback(async (updatedHole: Hole) => {
  if (!courseId) return;

  const newHoles = holes.map(h =>
    h.number === updatedHole.number ? updatedHole : h
  );

  await updateHolesMutation.mutateAsync({ courseId, holes: newHoles });
  updateLocalHoles(newHoles);
  setEditingHole(null);
}, [holes, courseId, updateHolesMutation, updateLocalHoles]);
```

**Pass to HoleHeader:**
```tsx
<HoleHeader
  hole={currentHoleData}
  selectedTee={selectedTee}
  // ... existing props
  isSuperAdmin={isSuperAdmin}
  onEditHole={handleEditHole}
/>
```

**Add Modal:**
```tsx
{editingHole && (
  <EditHoleBottomSheet
    visible={!!editingHole}
    onClose={() => setEditingHole(null)}
    hole={editingHole}
    allHoles={holes}
    courseTees={courseTees}
    selectedTee={selectedTee}
    onSave={handleSaveHole}
    loading={updateHolesMutation.isPending}
  />
)}
```

**Dependencies:** Tasks 1, 2, 3, 5

---

### Task 7: Integrate into CourseDetailScreen
**Status:** Not Started
**File:** `src/screens/courses/CourseDetailScreen/index.tsx`

**Command (copy and run):**
```
/refactor src/screens/courses/CourseDetailScreen/index.tsx - Integrate EditHoleBottomSheet for super admin hole editing. Import useIsSuperAdmin from @/store/subscriptionStore, EditHoleBottomSheet from @/components/courses, useUpdateCourseHoles from @/hooks. Add state: editingHole (Hole|null, default null). Add handleHolePress callback that sets editingHole. Add handleSaveHole callback that: (1) builds updated holes array, (2) calls updateHoles mutation, (3) refetches course data, (4) closes modal. Pass isSuperAdmin and onHolePress to HoleTable. Render EditHoleBottomSheet at end with visible={!!editingHole}, using course.holes and course.tees.
```

**Add Imports:**
```typescript
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { EditHoleBottomSheet } from '@/components/courses';
import { useUpdateCourseHoles } from '@/hooks';
```

**Add State and Handlers:**
```typescript
const isSuperAdmin = useIsSuperAdmin();
const [editingHole, setEditingHole] = useState<Hole | null>(null);
const updateHolesMutation = useUpdateCourseHoles();

const handleHolePress = useCallback((hole: Hole) => {
  if (isSuperAdmin) {
    setEditingHole(hole);
  }
}, [isSuperAdmin]);

const handleSaveHole = useCallback(async (updatedHole: Hole) => {
  if (!course) return;

  const newHoles = course.holes.map(h =>
    h.number === updatedHole.number ? updatedHole : h
  );

  await updateHolesMutation.mutateAsync({
    courseId: course.id,
    holes: newHoles
  });

  refetch(); // Refetch course data
  setEditingHole(null);
}, [course, updateHolesMutation, refetch]);
```

**Pass to HoleTable:**
```tsx
<HoleTable
  holes={course?.holes ?? []}
  selectedTee={selectedTee}
  isSuperAdmin={isSuperAdmin}
  onHolePress={handleHolePress}
/>
```

**Add Modal:**
```tsx
{editingHole && (
  <EditHoleBottomSheet
    visible={!!editingHole}
    onClose={() => setEditingHole(null)}
    hole={editingHole}
    allHoles={course?.holes ?? []}
    courseTees={course?.tees ?? []}
    selectedTee={selectedTee}
    onSave={handleSaveHole}
    loading={updateHolesMutation.isPending}
  />
)}
```

**Dependencies:** Tasks 1, 2, 4

---

## Sprint 4: Testing & Review

### Task 8: Testing and Code Review
**Status:** Not Started
**Files:** Test files and code review

**Command (copy and run - run each separately):**

**8a. EditHoleBottomSheet tests:**
```
/test-component src/components/courses/EditHoleBottomSheet/index.tsx - Test cases: (1) renders with hole data pre-filled, (2) par selector updates correctly, (3) stroke index +/- buttons work within 1-18 range, (4) shows SI duplicate error when another hole has same SI, (5) yardage inputs accept numeric values, (6) save button disabled when validation fails, (7) calls onSave with updated hole data, (8) calls onClose when dismissed.
```

**8b. Integration tests:**
```
/test-component src/components/scorecard/HoleHeader.tsx - Add test cases: (1) shows edit indicator when isSuperAdmin, (2) does not show edit when not super admin, (3) calls onEditHole when tapped as super admin.
```

**8c. Code review:**
```
/review src/components/courses/EditHoleBottomSheet src/hooks/useUpdateCourseHoles.ts src/components/scorecard/HoleHeader.tsx src/screens/courses/CourseDetailScreen/components/HoleTable.tsx - Review super admin hole editing implementation. Check: (1) super admin check applied correctly, (2) validation logic handles edge cases, (3) theme colours via useThemeColors, (4) accessibility labels and roles, (5) loading states during save, (6) error handling for mutation failures, (7) local state sync after save.
```

**Test Cases Summary:**

**EditHoleBottomSheet.test.tsx:**
- [ ] Renders with hole data pre-filled (par, SI, yardages)
- [ ] Par selector updates correctly (3 ↔ 4 ↔ 5)
- [ ] SI +/- buttons work within 1-18 range
- [ ] Shows duplicate SI error when conflicting
- [ ] Yardage inputs accept numeric values
- [ ] Save button disabled when validation fails
- [ ] Calls onSave with correctly updated hole
- [ ] Calls onClose when modal dismissed

**HoleHeader.test.tsx (additions):**
- [ ] Shows edit indicator when isSuperAdmin=true
- [ ] Hides edit indicator when isSuperAdmin=false
- [ ] Calls onEditHole when tapped as super admin
- [ ] Not tappable when not super admin

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 8
- **Completed:** 8 (100%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

### Sprint Progress

**Sprint 1: Core Infrastructure** (2/2 tasks)
- [x] Task 1: Create useUpdateCourseHoles Hook
- [x] Task 2: Create EditHoleBottomSheet Component

**Sprint 2: Component Modifications** (3/3 tasks)
- [x] Task 3: Modify HoleHeader for Super Admin
- [x] Task 4: Modify HoleTable for Super Admin
- [x] Task 5: Add updateHoles to ScorecardStore

**Sprint 3: Screen Integration** (2/2 tasks)
- [x] Task 6: Integrate into ScorecardEntryScreen
- [x] Task 7: Integrate into CourseDetailScreen

**Sprint 4: Testing & Review** (1/1 tasks)
- [x] Task 8: Testing and Code Review

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useUpdateCourseHoles.ts` | Mutation to update course holes |
| `src/components/courses/EditHoleBottomSheet/index.tsx` | Modal for editing hole data |
| `src/components/courses/EditHoleBottomSheet/types.ts` | TypeScript types |
| `src/components/courses/EditHoleBottomSheet/hooks/useEditHoleForm.ts` | Form state management |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/scorecard/HoleHeader.tsx` | Add super admin tap support |
| `src/screens/courses/CourseDetailScreen/components/HoleTable.tsx` | Add row tap support |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Integrate edit modal |
| `src/screens/courses/CourseDetailScreen/index.tsx` | Integrate edit modal |
| `src/store/scorecardStore.ts` | Add updateHoles method |
| `src/hooks/index.ts` | Export mutation hook |
| `src/components/courses/index.ts` | Export modal component |
| `src/screens/courses/CourseDetailScreen/types.ts` | Update HoleTableProps |

---

## Technical Considerations

### Super Admin Check
- Use `useIsSuperAdmin()` from `@/store/subscriptionStore`
- Check is performed at render time, not database level
- Non-super-admins never see edit UI

### Data Integrity
- Wait for server response before updating UI (no optimistic updates)
- Show loading spinner on Save button during mutation
- Keep modal open on error, show error message

### Stroke Index Uniqueness
- Validate against all 18 holes, excluding current hole being edited
- Show which hole has the conflicting SI in error message
- Prevent save until SI conflict resolved

### Yardage Per Tee
- Only show yardage inputs for tees that exist in `courseTees`
- Yardages are optional (can be left blank)
- Convert to number before saving (from string input)

### Local State Sync
- ScorecardEntryScreen: Update `useScorecardStore().holes` after save
- CourseDetailScreen: `refetch()` course data after save
- Ensures UI reflects changes immediately

### Offline Considerations
- Edit requires network connection (mutation to Supabase)
- If offline during scoring, edit option could be disabled
- After edit during scoring, updated holes persist to SQLite

---

## Testing Checklist

### Super Admin Access
- [ ] Non-super-admin cannot see edit UI in HoleHeader
- [ ] Non-super-admin cannot see edit UI in HoleTable
- [ ] Super admin sees edit indicator in HoleHeader
- [ ] Super admin sees edit indicator in HoleTable rows

### Edit Modal
- [ ] Modal opens with correct hole data pre-filled
- [ ] Par can be changed (3, 4, 5)
- [ ] Stroke Index can be changed (1-18)
- [ ] SI duplicate shows clear error message
- [ ] Yardage can be edited for each tee
- [ ] Save button disabled when validation fails
- [ ] Save button shows loading state during mutation

### Data Persistence
- [ ] Changes persist to database after save
- [ ] CourseDetailScreen shows updated data after save
- [ ] ScorecardEntryScreen shows updated data after save
- [ ] Changes persist after app restart

### Edge Cases
- [ ] Course with no tees shows appropriate message
- [ ] Hole with no yardages can have yardage added
- [ ] Network error shows error message, keeps modal open
- [ ] Rapid edits don't cause race conditions

---

**Last Updated:** 2025-12-28
**Status:** Implementation Complete - All Tests Passing
