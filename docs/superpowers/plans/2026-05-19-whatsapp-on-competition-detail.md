# WhatsApp Group Join on Competition Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a one-tap "Join WhatsApp Group" action on the Competition Detail screen for accepted players, when the organiser has set a group invite link.

**Architecture:** A new presentational section component (`WhatsAppGroupSection`) is rendered inside `DetailsTab`. It receives the existing `competition.whatsapp_group_invite_url` and the existing `isPlayer` flag — no new data plumbing, hooks, or migrations. It validates the URL with the existing `isValidWhatsAppInvite` helper and opens WhatsApp via the existing `openWhatsAppGroup` helper from `src/utils/whatsapp.ts`. The section hides itself when the URL is missing/invalid or the viewer isn't a player.

**Tech Stack:** React Native, TypeScript, `@/utils/whatsapp` helpers, `react-native-paper` `Icon`, `@/context/ThemeContext`, `@/constants/theme`. Tests use `@testing-library/react-native` with Jest, matching the existing `MiniLeaderboardSection.test.tsx` pattern.

**Spec:** `docs/superpowers/specs/2026-05-19-whatsapp-on-competition-detail-design.md`

---

## File Structure

### New
- `src/components/competitions/detail/sections/WhatsAppGroupSection.tsx` — presentational section, rules-of-visibility live here.
- `src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx` — unit tests.

### Modified
- `src/components/competitions/detail/sections/index.ts` — re-export the new section.
- `src/components/competitions/detail/DetailsTab.tsx` — render `<WhatsAppGroupSection />` between `MiniLeaderboardSection` and `SettingsSection`.

No changes to types, schemas, hooks, mocks, or fixtures — `whatsapp_group_invite_url` is already on the `Competition` row type (`src/types/database/competition.types.ts:91`) and on the test fixture (`src/__tests__/utils/testFixtures.ts:173`).

---

## Task 1: Add `WhatsAppGroupSection` component (TDD)

**Files:**
- Create: `src/components/competitions/detail/sections/WhatsAppGroupSection.tsx`
- Create: `src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WhatsAppGroupSection } from './WhatsAppGroupSection';
import { openWhatsAppGroup } from '@/utils/whatsapp';

jest.mock('@/utils/whatsapp', () => {
  const actual = jest.requireActual('@/utils/whatsapp');
  return {
    ...actual,
    openWhatsAppGroup: jest.fn(),
  };
});

const validUrl = 'https://chat.whatsapp.com/AbCdEfGhIjKl';

describe('WhatsAppGroupSection', () => {
  beforeEach(() => {
    (openWhatsAppGroup as jest.Mock).mockReset();
  });

  it('renders nothing when viewer is not a player', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection whatsappUrl={validUrl} isPlayer={false} />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders nothing when whatsappUrl is null', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection whatsappUrl={null} isPlayer={true} />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders nothing when whatsappUrl is an empty string', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection whatsappUrl="" isPlayer={true} />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders nothing when whatsappUrl is not a valid WhatsApp invite', () => {
    const { queryByTestId } = render(
      <WhatsAppGroupSection
        whatsappUrl="https://example.com/group"
        isPlayer={true}
      />,
    );
    expect(queryByTestId('whatsapp-group-join')).toBeNull();
  });

  it('renders the join row when player + valid url', () => {
    const { getByTestId, getByText } = render(
      <WhatsAppGroupSection whatsappUrl={validUrl} isPlayer={true} />,
    );
    expect(getByTestId('whatsapp-group-join')).toBeTruthy();
    expect(getByText('Join WhatsApp Group')).toBeTruthy();
  });

  it('opens WhatsApp when the row is pressed', () => {
    const { getByTestId } = render(
      <WhatsAppGroupSection whatsappUrl={validUrl} isPlayer={true} />,
    );
    fireEvent.press(getByTestId('whatsapp-group-join'));
    expect(openWhatsAppGroup).toHaveBeenCalledTimes(1);
    expect(openWhatsAppGroup).toHaveBeenCalledWith(validUrl);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx`
Expected: FAIL with `Cannot find module './WhatsAppGroupSection'`.

- [ ] **Step 3: Implement `WhatsAppGroupSection`**

Create `src/components/competitions/detail/sections/WhatsAppGroupSection.tsx`:

```tsx
/**
 * WhatsAppGroupSection - One-tap entry to the competition's WhatsApp group.
 *
 * Renders only when the viewer is a player in the competition AND the
 * organiser has set a valid WhatsApp group invite link. Otherwise renders
 * null. Editing / sharing the link lives on the Competition Settings screen.
 */

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { isValidWhatsAppInvite, openWhatsAppGroup } from '@/utils/whatsapp';

export interface WhatsAppGroupSectionProps {
  whatsappUrl: string | null | undefined;
  isPlayer: boolean;
}

export function WhatsAppGroupSection({
  whatsappUrl,
  isPlayer,
}: WhatsAppGroupSectionProps) {
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    if (whatsappUrl) {
      void openWhatsAppGroup(whatsappUrl);
    }
  }, [whatsappUrl]);

  if (!isPlayer) return null;
  if (!isValidWhatsAppInvite(whatsappUrl)) return null;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        testID="whatsapp-group-join"
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Join WhatsApp group"
        style={[
          styles.row,
          shadows.sm,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Icon source="whatsapp" size={22} color={colors.primary} />
        <View style={styles.rowText}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Join WhatsApp Group
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Tap to open the group in WhatsApp
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
  },
  subtitle: {
    ...typography.small,
    marginTop: 2,
  },
});

export default WhatsAppGroupSection;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/detail/sections/WhatsAppGroupSection.tsx \
        src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx
git commit -m "feat(competition-detail): add WhatsApp group join section"
```

---

## Task 2: Export from sections barrel

**Files:**
- Modify: `src/components/competitions/detail/sections/index.ts`

- [ ] **Step 1: Add re-export**

In `src/components/competitions/detail/sections/index.ts`, add the new export so it sits with the other section exports:

```ts
/**
 * DetailsTab Sections
 *
 * Extracted sub-components for the DetailsTab component
 */

export { CompetitionInfoSection } from './CompetitionInfoSection';
export { MiniLeaderboardSection } from './MiniLeaderboardSection';
export { InProgressRoundSection } from './InProgressRoundSection';
export { SettingsSection } from './SettingsSection';
export { PrizePoolSection } from './PrizePoolSection';
export { WhatsAppGroupSection } from './WhatsAppGroupSection';

// Re-export types
export * from './types';
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/competitions/detail/sections/index.ts
git commit -m "feat(competition-detail): export WhatsAppGroupSection"
```

---

## Task 3: Wire `WhatsAppGroupSection` into `DetailsTab`

**Files:**
- Modify: `src/components/competitions/detail/DetailsTab.tsx`

- [ ] **Step 1: Import the new section**

In `src/components/competitions/detail/DetailsTab.tsx`, update the named imports from `./sections` (currently around lines 17-23):

```tsx
import {
  CompetitionInfoSection,
  InProgressRoundSection,
  MiniLeaderboardSection,
  SettingsSection,
  PrizePoolSection,
  WhatsAppGroupSection,
} from './sections';
```

- [ ] **Step 2: Render the section above `SettingsSection`**

In the returned JSX of `DetailsTab`, insert the new section directly above `<SettingsSection ... />` (currently around line 129):

```tsx
      <WhatsAppGroupSection
        whatsappUrl={competition.whatsapp_group_invite_url}
        isPlayer={isPlayer}
      />

      <SettingsSection
        competition={competition}
        isOrganizer={isOrganizer}
        hasStartedRound={hasStartedRound}
        onViewTeams={onViewTeams}
      />
```

- [ ] **Step 3: Verify existing `DetailsTab` tests still pass**

The fixture used by `DetailsTab.test.tsx` already has `whatsapp_group_invite_url: null`, so the section renders `null` for every existing case — no test changes required.

Run: `pnpm test src/components/competitions/detail/DetailsTab.test.tsx`
Expected: PASS — all existing assertions hold.

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/detail/DetailsTab.tsx
git commit -m "feat(competition-detail): show WhatsApp join action on Details tab"
```

---

## Task 4: Manual E2E verification

This task is checklist-only — no commit at the end unless an issue is found.

- [ ] **Step 1: Start Expo dev server**

Run: `npx expo start`
Pick an iOS simulator or device.

- [ ] **Step 2: Pick a competition with a WhatsApp link**

Either (a) use an existing competition where you, as organiser, have already set a link via Settings → "WhatsApp Group" → Add, or (b) set one now using a real WhatsApp group invite URL. The validation regex requires the form `https://chat.whatsapp.com/<5–60 url-safe chars>` (see `src/utils/whatsapp.ts` `WHATSAPP_INVITE_PATTERN`).

- [ ] **Step 3: Verify member view**

Open the competition's Detail screen (the default tab). With a valid link set and the current user accepted into the competition:

- The new section appears above the Settings card.
- Label reads "Join WhatsApp Group", subtitle "Tap to open the group in WhatsApp", chevron on the right, WhatsApp glyph on the left.
- Tap → WhatsApp launches into the group join screen. (On a device without WhatsApp installed, the universal link should fall back to a browser tab; if both fail, the `openWhatsAppGroup` helper shows the "Unable to open link" alert.)

- [ ] **Step 4: Verify organiser view**

As an organiser of the same competition:

- The new section still appears (organisers are players for this purpose).
- Tap → opens WhatsApp identically.
- The Settings screen still shows the existing edit + open-in-WhatsApp + share-with-members rows. No regressions there.

- [ ] **Step 5: Verify hidden cases**

Reproduce each and confirm the section is absent (no empty space, no placeholder):

- Same competition, clear the link via Settings → save. Detail tab → section gone.
- A competition where the current user isn't an accepted player (deep-link preview, or a competition you haven't joined). Detail tab → section gone.

- [ ] **Step 6: Sign-off**

If all the above pass, the feature is done. No additional commit needed.

---

## Verification Summary

- `pnpm test src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx` — passes after Task 1.
- `pnpm test src/components/competitions/detail/DetailsTab.test.tsx` — still passes after Task 3.
- `pnpm type-check` — clean after Tasks 2 and 3.
- Manual E2E — Task 4 checklist all green.
