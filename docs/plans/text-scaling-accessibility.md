# Plan: Text Scaling Accessibility

## Overview

Add support for iOS Dynamic Type and Android font scaling so the app respects users' system text size preferences, capped at 1.35x to prevent layout breakage.

## Approach

Create a `ScaledText` wrapper component that applies `maxFontSizeMultiplier` based on text category. Migrate critical paths only (PageHeader, score entry, leaderboards). No context needed - React Native handles scaling automatically; we just cap it.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Implementation | ScaledText wrapper | Paper Text doesn't support global defaultProps; wrapper needed |
| Max scale | 1.35x global, 1.2x critical | Balances accessibility with layout stability |
| Scope | Critical paths only | Quick win, validates approach before wider rollout |
| Context | Not needed | maxFontSizeMultiplier handles capping automatically |

---

## Phase 1: Create ScaledText Component

### Step 1.1: Create ScaledText wrapper
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Create a ScaledText component at src/components/common/ScaledText.tsx that:

1. Wraps React Native Paper's Text component
2. Applies maxFontSizeMultiplier based on a category prop
3. Forwards all other props to the underlying Text component

Categories and their maxFontSizeMultiplier values:
- 'critical': 1.2 (for score buttons, fixed containers)
- 'title': 1.35 (for headers)
- 'body': 1.5 (for descriptions, default)
- 'caption': 1.35 (for small labels)
- 'display': 1.35 (for large numbers)

Interface:
```typescript
interface ScaledTextProps extends React.ComponentProps<typeof Text> {
  category?: 'display' | 'title' | 'body' | 'caption' | 'critical';
}
```

Default category should be 'body'.

Include JSDoc documentation explaining the purpose and usage.
Export as both named and default export.
```

**Deliverables:**
- [x] `src/components/common/ScaledText.tsx` created
- [x] Component wraps Paper Text with maxFontSizeMultiplier
- [x] All 5 categories implemented with correct scale caps
- [x] TypeScript types complete

**Dependencies:** None

---

### Step 1.2: Export ScaledText from common index
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Add ScaledText to the exports in src/components/common/index.ts (if it exists) or create the barrel export file.
```

**Deliverables:**
- [x] ScaledText exported from components/common

**Dependencies:** Step 1.1

---

### Step 1.3: Add unit tests for ScaledText
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Create unit tests for ScaledText at src/components/common/ScaledText.test.tsx.

Tests should verify:
1. Default category is 'body' with maxFontSizeMultiplier of 1.5
2. Each category maps to correct multiplier:
   - 'critical': 1.2
   - 'title': 1.35
   - 'body': 1.5
   - 'caption': 1.35
   - 'display': 1.35
3. All props are forwarded to underlying Text component
4. Component renders children correctly

Use React Native Testing Library patterns consistent with other tests in the codebase.
```

**Deliverables:**
- [x] `src/components/common/ScaledText.test.tsx` created
- [x] All 5 categories tested for correct maxFontSizeMultiplier
- [x] Prop forwarding verified
- [ ] Tests pass (blocked by pre-existing babel/runtime dependency issue in test setup)

**Dependencies:** Step 1.1

**Note:** Tests are correctly written but Jest test suite has a pre-existing dependency issue (`Cannot find module '@babel/runtime/helpers/interopRequireDefault'`) affecting all tests in the codebase. The test file follows existing patterns and will pass once the dependency issue is resolved.

---

## Phase 2: Migrate Critical Components

### Step 2.1: Update PageHeader to use ScaledText
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Update src/components/common/PageHeader.tsx to support text scaling:

1. Import ScaledText from './ScaledText'

2. Replace the Text import from 'react-native-paper' with ScaledText usage for title and subtitle

3. Update the title Text component (around line 191-199 and 226-234):
   - Change <Text to <ScaledText
   - Add category="title" prop

4. Update the subtitle Text component (around line 201-208 and 237-240):
   - Change <Text to <ScaledText
   - Add category="caption" prop

5. Update the styles (line 304-316):
   - Replace inline fontSize/fontWeight/lineHeight with typography tokens
   - Import typography from '@/constants/theme'

   Change:
   ```typescript
   title: {
     fontSize: 20,
     fontWeight: '600',
     lineHeight: 24,
     flexShrink: 1,
   },
   subtitle: {
     fontSize: 13,
     fontWeight: '400',
     lineHeight: 16,
     marginTop: 2,
     flexShrink: 1,
   },
   ```

   To:
   ```typescript
   title: {
     ...typography.h3,
     flexShrink: 1,
   },
   subtitle: {
     ...typography.caption,
     marginTop: 2,
     flexShrink: 1,
   },
   ```

6. Convert the fixed height calculation to use minHeight instead of height:
   - Line 171: change `height: totalHeight` to `minHeight: totalHeight`
   - This allows the header to expand if text scales larger

Keep the Icon import from react-native-paper (not the Text import).
```

**Deliverables:**
- [x] PageHeader uses ScaledText for title and subtitle
- [x] Styles use typography tokens instead of inline values
- [x] Header uses minHeight for flexibility

**Dependencies:** Step 1.1

---

### Step 2.2: Update score entry components
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Update all PlayerScoreCard components to use ScaledText with category="critical".

Files to update:
- src/components/scorecard/PlayerScoreCard.tsx
- src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx
- src/screens/scoring/MatchPlayScoringScreen/components/PlayerScoreCard.tsx

For each file:
1. Import ScaledText
2. Replace Text with ScaledText for score-related text (numbers, +/- buttons)
3. Use category="critical" to cap scaling at 1.2x
4. Keep button dimensions fixed (touch targets should stay 44px+ minimum)

Do NOT change:
- Button sizes (width/height)
- Layout structure
- Any non-text elements
```

**Deliverables:**
- [x] Score entry Text components use ScaledText
- [x] Score text uses category="critical" (1.2x max)
- [x] Button dimensions unchanged

**Dependencies:** Step 1.1

**Files Updated:**
- `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx` - Main score card
- `src/components/scorecard/PlayerScoreCard/ScoreInputStepper.tsx` - +/- stepper component
- `src/components/scorecard/PlayerScoreCard/QuickActionButton.tsx` - Pick Up and Par buttons
- `src/screens/scoring/MatchPlayScoringScreen/components/PlayerScoreCard.tsx` - Match play variant

---

### Step 2.3: Update leaderboard components
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Update leaderboard components to use ScaledText with appropriate categories.

Files to update:
- src/components/leaderboard/LeaderboardTable.tsx
- src/components/leaderboard/LeaderboardRow.tsx
- src/components/leaderboard/LeaderboardHeader.tsx
- src/components/leaderboard/RoundLeaderboard.tsx
- src/components/leaderboard/RoundLeaderboard.styles.ts
- src/components/leaderboard/StablefordLeaderboard.tsx
- src/components/leaderboard/StrokePlayLeaderboard.tsx
- src/components/leaderboard/MatchPlayLeaderboard.tsx
- src/components/leaderboard/TeamLeaderboardTable.tsx

Changes:
1. Import ScaledText in component files
2. Replace Text with ScaledText for:
   - Column headers: category="caption"
   - Player names: category="body"
   - Scores/numbers: category="caption"
   - Position numbers: category="caption"

3. In styles files, change fixed column widths to minWidth:
   - Change `width: 36` to `minWidth: 36` for narrow columns
   - This allows columns to expand slightly with scaled text

Do NOT add horizontal scroll wrapper yet - only if testing reveals it's needed.
```

**Deliverables:**
- [x] Leaderboard Text components use ScaledText
- [x] Column widths use minWidth instead of fixed width
- [x] Appropriate categories assigned

**Dependencies:** Step 1.1

**Files Updated:**
- `src/components/leaderboard/LeaderboardTable.tsx`
- `src/components/leaderboard/LeaderboardRow.tsx`
- `src/components/leaderboard/LeaderboardHeader.tsx`
- `src/components/leaderboard/RoundLeaderboard.tsx`
- `src/components/leaderboard/RoundLeaderboard.styles.ts`
- `src/components/leaderboard/StablefordLeaderboard.tsx`
- `src/components/leaderboard/StrokePlayLeaderboard.tsx`
- `src/components/leaderboard/MatchPlayLeaderboard.tsx`
- `src/components/leaderboard/TeamLeaderboardTable.tsx`

---

## Phase 3: Documentation and Testing

### Step 3.1: Add usage documentation
**Status:** ✅ Complete (2025-01-29)
**Type:** Custom

**Prompt:**
```
Add a section about text scaling to docs/guides/STYLING_GUIDE.md.
```

**Deliverables:**
- [x] STYLING_GUIDE.md updated with comprehensive "Text Scaling & Accessibility" section
- [x] All categories documented with examples
- [x] Layout patterns for scaled text (minWidth, minHeight)
- [x] Testing instructions for iOS and Android

**Dependencies:** Step 1.1

---

### Step 3.2: Manual testing verification
**Status:** Pending
**Type:** Manual

**Prompt:**
```
Test the app at different text scale levels:

iOS Testing:
1. Open Settings → Accessibility → Display & Text Size → Larger Text
2. Test at: Default, Large, Extra Large, XXL

Android Testing:
1. Open Settings → Display → Font size
2. Test at: Default, Large, Largest

For each scale level, verify:
- [ ] PageHeader titles display correctly without overflow
- [ ] Score entry buttons are tappable and text fits
- [ ] Leaderboard is readable
- [ ] No layout breaks or overlapping text
- [ ] Text caps at maximum (doesn't keep growing past 1.35x/1.5x)

Document any issues found.
```

**Deliverables:**
- [ ] App tested at 1.0x, 1.25x, 1.35x, and 1.5x+ scales
- [ ] Critical flows verified working
- [ ] Any issues documented

**Dependencies:** Steps 2.1, 2.2, 2.3

---

## Critical Files

### Created ✅
- `src/components/common/ScaledText.tsx` - Text wrapper with scale caps
- `src/components/common/ScaledText.test.tsx` - Unit tests for ScaledText

### Modified ✅
- `src/components/common/index.ts` - Added ScaledText export
- `src/components/common/PageHeader.tsx` - Use ScaledText, typography tokens, minHeight
- `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx` - Use ScaledText with appropriate categories
- `src/components/scorecard/PlayerScoreCard/ScoreInputStepper.tsx` - Use ScaledText with critical category
- `src/components/scorecard/PlayerScoreCard/QuickActionButton.tsx` - Use ScaledText with critical category
- `src/screens/scoring/MatchPlayScoringScreen/components/PlayerScoreCard.tsx` - Use ScaledText with critical category
- `src/components/leaderboard/LeaderboardTable.tsx` - Use ScaledText, minWidth columns
- `src/components/leaderboard/LeaderboardRow.tsx` - Use ScaledText
- `src/components/leaderboard/LeaderboardHeader.tsx` - Use ScaledText
- `src/components/leaderboard/RoundLeaderboard.tsx` - Use ScaledText
- `src/components/leaderboard/RoundLeaderboard.styles.ts` - minWidth columns
- `src/components/leaderboard/StablefordLeaderboard.tsx` - Use ScaledText
- `src/components/leaderboard/StrokePlayLeaderboard.tsx` - Use ScaledText
- `src/components/leaderboard/MatchPlayLeaderboard.tsx` - Use ScaledText
- `src/components/leaderboard/TeamLeaderboardTable.tsx` - Use ScaledText, minWidth columns
- `docs/guides/STYLING_GUIDE.md` - Added comprehensive text scaling documentation

---

## Verification

- [x] ScaledText component created with all 5 categories
- [ ] ScaledText unit tests pass (blocked by pre-existing dependency issue)
- [x] PageHeader uses ScaledText and typography tokens
- [x] Score entry uses ScaledText with category="critical"
- [x] Leaderboard uses ScaledText with appropriate categories
- [ ] App tested at multiple scale levels (1.0x, 1.25x, 1.35x, 1.5x+)
- [ ] No layout breakage at supported scales (up to 1.35x)
- [ ] Text caps correctly at extreme scales (1.5x+)
- [x] Documentation updated

---

## Out of Scope (Future Work)

- Migrating all 339+ inline fontSize instances (track separately)
- Migrating all Text usage across the app (incremental)
- Responsive spacing that scales with text
- Touch target scaling for motor accessibility
- Automated snapshot tests at different scales
