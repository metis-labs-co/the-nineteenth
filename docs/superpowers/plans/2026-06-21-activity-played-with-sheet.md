# Activity "Played With" Bottom Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tapping the footer avatar stack on an activity round card opens a bottom sheet listing everyone in the round (avatar, name, that round's score), with each row navigating to the player's profile.

**Architecture:** A new self-contained `RoundPlayersBottomSheet` (raw RN `Modal` + `SystemModalTheme`, following the existing `BagPickerSheet`/`RoundPhotoViewer` solid-surface pattern) is rendered from `ActivityRoundCard` behind local visibility state. The per-player score string is produced by `participantScoreLabel`, extracted from `ActivityRoundCard` into a shared module so both the card and the sheet format scores identically. Non-friend gating needs no new code — rows navigate to the existing `PlayerDetailScreen`, which already hides stats for non-friends.

**Tech Stack:** React Native, TypeScript, React Native Paper, React Navigation (native-stack), Jest + @testing-library/react-native.

## Global Constraints

- Theming: use `useThemeColors()` for colors; import `spacing`, `typography`, `borderRadius`, `shadows` directly from `@/constants/theme`. Never import colors directly.
- Solid surfaces: any RN `<Modal>` content MUST be wrapped in `<SystemModalTheme>` from `@/components/common`, and `useThemeColors()` MUST be called INSIDE that wrap (the component owning `<SystemModalTheme>` must not call `useThemeColors()` above it).
- Do NOT use Paper's `Button`; use `TouchableOpacity`.
- Minimum touch target 44×44px for interactive rows.
- No backend/RPC/migration changes — `card.participants` already carries the data.
- Score format must match what the card already shows (reuse `participantScoreLabel`, do not reimplement).

---

### Task 1: Extract `participantScoreLabel` into a shared module

Move the existing score-formatting helper out of `ActivityRoundCard.tsx` so the new sheet can reuse it without creating a circular import (the card imports the sheet; the sheet must not import back from the card).

**Files:**
- Create: `src/components/activity/participantScore.ts`
- Create: `src/components/activity/participantScore.test.ts`
- Modify: `src/components/activity/ActivityRoundCard.tsx` (remove the local `participantScoreLabel` definition at lines 32–42; import it instead)

**Interfaces:**
- Produces: `participantScoreLabel(p: FeedParticipant, gameType: string): string | null` — returns `"{points} pts"` for stableford, `"{gross} ({net} net)"` or `"{gross}"` for stroke-based games, or `null` when no usable score.

- [ ] **Step 1: Write the failing test**

Create `src/components/activity/participantScore.test.ts`:

```ts
import { participantScoreLabel } from './participantScore';
import type { FeedParticipant } from '@/hooks/activity';

function makeParticipant(overrides: Partial<FeedParticipant> = {}): FeedParticipant {
  return {
    player_id: 'p1',
    name: 'Alex',
    photo_url: null,
    total_gross: null,
    total_net: null,
    total_points: null,
    ...overrides,
  };
}

describe('participantScoreLabel', () => {
  it('returns points label for stableford', () => {
    expect(participantScoreLabel(makeParticipant({ total_points: 32 }), 'stableford')).toBe('32 pts');
  });

  it('returns null for stableford with no points', () => {
    expect(participantScoreLabel(makeParticipant({ total_points: null }), 'stableford')).toBeNull();
  });

  it('returns gross with net for stroke play when both present', () => {
    expect(
      participantScoreLabel(makeParticipant({ total_gross: 85, total_net: 72 }), 'stroke'),
    ).toBe('85 (72 net)');
  });

  it('returns gross only when net is missing', () => {
    expect(participantScoreLabel(makeParticipant({ total_gross: 85 }), 'stroke')).toBe('85');
  });

  it('returns null when gross is missing for stroke play', () => {
    expect(participantScoreLabel(makeParticipant({ total_gross: null }), 'stroke')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/components/activity/participantScore.test.ts`
Expected: FAIL — cannot find module `./participantScore`.

- [ ] **Step 3: Create the module**

Create `src/components/activity/participantScore.ts`:

```ts
import type { FeedParticipant } from '@/hooks/activity';

/**
 * The score label shown for a participant on a round card / players sheet.
 * Stableford shows points; stroke-based games show gross (with net when set).
 * Returns null when the participant has no usable score.
 */
export function participantScoreLabel(p: FeedParticipant, gameType: string): string | null {
  if (gameType === 'stableford') {
    return p.total_points != null ? `${p.total_points} pts` : null;
  }
  if (p.total_gross != null && p.total_gross > 0) {
    return p.total_net != null && p.total_net > 0
      ? `${p.total_gross} (${p.total_net} net)`
      : `${p.total_gross}`;
  }
  return null;
}
```

- [ ] **Step 4: Update `ActivityRoundCard.tsx` to import the helper**

Delete the local function (current lines 32–42):

```ts
function participantScoreLabel(p: FeedParticipant, gameType: string): string | null {
  if (gameType === 'stableford') {
    return p.total_points != null ? `${p.total_points} pts` : null;
  }
  if (p.total_gross != null && p.total_gross > 0) {
    return p.total_net != null && p.total_net > 0
      ? `${p.total_gross} (${p.total_net} net)`
      : `${p.total_gross}`;
  }
  return null;
}
```

Then add this import alongside the existing `./RoundPhotoBanner` import (after line 25):

```ts
import { participantScoreLabel } from './participantScore';
```

`FeedParticipant` is still imported and used elsewhere in the file (the `headlineParticipant` helper), so leave that import as-is.

- [ ] **Step 5: Run tests and type-check to verify pass**

Run: `pnpm jest src/components/activity/participantScore.test.ts`
Expected: PASS (5 tests).

Run: `pnpm tsc --noEmit`
Expected: no new errors in `ActivityRoundCard.tsx` or `participantScore.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/components/activity/participantScore.ts src/components/activity/participantScore.test.ts src/components/activity/ActivityRoundCard.tsx
git commit -m "refactor(activity): extract participantScoreLabel to shared module

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create `RoundPlayersBottomSheet`

A bottom-anchored modal sheet listing every participant in a round. Built as an outer wrapper (RN `Modal` + `SystemModalTheme`, no `useThemeColors`) plus an inner content component that reads colors inside the wrap — matching `BagPickerSheet`.

**Files:**
- Create: `src/components/activity/RoundPlayersBottomSheet.tsx`
- Create: `src/components/activity/RoundPlayersBottomSheet.test.tsx`
- Modify: `src/components/activity/index.ts` (export the new component + props type)

**Interfaces:**
- Consumes: `participantScoreLabel` from `./participantScore`; `FeedParticipant` from `@/hooks/activity`; `PlayerAvatar`, `SystemModalTheme` from `@/components/common`.
- Produces:
  ```ts
  export interface RoundPlayersBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    participants: FeedParticipant[];
    gameType: string;
    onSelectPlayer: (playerId: string) => void;
  }
  export function RoundPlayersBottomSheet(props: RoundPlayersBottomSheetProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

Create `src/components/activity/RoundPlayersBottomSheet.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPlayersBottomSheet } from './RoundPlayersBottomSheet';
import type { FeedParticipant } from '@/hooks/activity';

jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return {
    SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
    PlayerAvatar: ({ name }: { name: string }) => <Text>{`avatar:${name}`}</Text>,
  };
});

const participants: FeedParticipant[] = [
  { player_id: 'p1', name: 'Alex', photo_url: null, total_gross: 85, total_net: 72, total_points: null },
  { player_id: 'p2', name: 'Sam', photo_url: null, total_gross: null, total_net: null, total_points: null },
];

function setup(overrides: Partial<React.ComponentProps<typeof RoundPlayersBottomSheet>> = {}) {
  const onClose = jest.fn();
  const onSelectPlayer = jest.fn();
  render(
    <RoundPlayersBottomSheet
      visible
      onClose={onClose}
      participants={participants}
      gameType="stroke"
      onSelectPlayer={onSelectPlayer}
      {...overrides}
    />,
  );
  return { onClose, onSelectPlayer };
}

describe('RoundPlayersBottomSheet', () => {
  it('renders a row for each participant', () => {
    setup();
    expect(screen.getByText('Alex')).toBeTruthy();
    expect(screen.getByText('Sam')).toBeTruthy();
  });

  it('shows the formatted score for a participant who has one', () => {
    setup();
    expect(screen.getByText('85 (72 net)')).toBeTruthy();
  });

  it('shows a dash for a participant with no score', () => {
    setup();
    expect(screen.getByText('–')).toBeTruthy();
  });

  it('calls onClose then onSelectPlayer with the player id when a row is pressed', () => {
    const { onClose, onSelectPlayer } = setup();
    fireEvent.press(screen.getByLabelText("View Alex's profile"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectPlayer).toHaveBeenCalledWith('p1');
  });

  it('renders nothing visible when visible is false', () => {
    setup({ visible: false });
    expect(screen.queryByText('Alex')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/components/activity/RoundPlayersBottomSheet.test.tsx`
Expected: FAIL — cannot find module `./RoundPlayersBottomSheet`.

- [ ] **Step 3: Create the component**

Create `src/components/activity/RoundPlayersBottomSheet.tsx`:

```tsx
/**
 * RoundPlayersBottomSheet - lists everyone who played in a round.
 *
 * Opened from a round card's footer avatar stack. Each row shows the
 * player's avatar, name, and that round's score (formatted exactly like the
 * card via participantScoreLabel). Tapping a row closes the sheet and asks
 * the parent to open that player's profile. Non-friend gating is handled by
 * the profile screen, so rows are uniform for friends and non-friends.
 *
 * Built as a raw <Modal> + <SystemModalTheme> (not the shared BottomSheet)
 * so it escapes the round card's `overflow: hidden` and keeps solid
 * surfaces inside iOS's separate modal window. useThemeColors() is called
 * INSIDE the SystemModalTheme wrap (in the content component) per the
 * solid-surface rule.
 */

import React from 'react';
import { Modal, View, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar, SystemModalTheme } from '@/components/common';
import type { FeedParticipant } from '@/hooks/activity';
import { participantScoreLabel } from './participantScore';

export interface RoundPlayersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  participants: FeedParticipant[];
  gameType: string;
  onSelectPlayer: (playerId: string) => void;
}

export function RoundPlayersBottomSheet({
  visible,
  onClose,
  participants,
  gameType,
  onSelectPlayer,
}: RoundPlayersBottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SystemModalTheme>
        <RoundPlayersSheetContent
          onClose={onClose}
          participants={participants}
          gameType={gameType}
          onSelectPlayer={onSelectPlayer}
        />
      </SystemModalTheme>
    </Modal>
  );
}

interface RoundPlayersSheetContentProps {
  onClose: () => void;
  participants: FeedParticipant[];
  gameType: string;
  onSelectPlayer: (playerId: string) => void;
}

function RoundPlayersSheetContent({
  onClose,
  participants,
  gameType,
  onSelectPlayer,
}: RoundPlayersSheetContentProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const handleSelect = (playerId: string) => {
    onClose();
    onSelectPlayer(playerId);
  };

  return (
    <View style={styles.root}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.5)' }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close players list"
      />
      <View
        style={[
          styles.sheet,
          shadows.lg,
          { backgroundColor: colors.surfaceElevated, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Players</Text>
        <ScrollView style={styles.list} bounces={false}>
          {participants.map((p) => {
            const score = participantScoreLabel(p, gameType);
            return (
              <TouchableOpacity
                key={p.player_id}
                style={styles.row}
                onPress={() => handleSelect(p.player_id)}
                accessibilityRole="button"
                accessibilityLabel={`View ${p.name}'s profile`}
              >
                <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={40} />
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.score, { color: colors.textSecondary }]}>
                  {score ?? '–'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  name: {
    ...typography.bodyBold,
    flex: 1,
  },
  score: {
    ...typography.small,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Export from the activity barrel**

In `src/components/activity/index.ts`, add at the end:

```ts
export { RoundPlayersBottomSheet } from './RoundPlayersBottomSheet';
export type { RoundPlayersBottomSheetProps } from './RoundPlayersBottomSheet';
```

- [ ] **Step 5: Run tests and type-check to verify pass**

Run: `pnpm jest src/components/activity/RoundPlayersBottomSheet.test.tsx`
Expected: PASS (5 tests).

Run: `pnpm tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/activity/RoundPlayersBottomSheet.tsx src/components/activity/RoundPlayersBottomSheet.test.tsx src/components/activity/index.ts
git commit -m "feat(activity): add round players bottom sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire the sheet into `ActivityRoundCard`

Make the footer avatar stack tappable to open the sheet (listing all participants), and navigate to each player's profile on row select. The stack only renders when there is at least one "other" player, so solo rounds stay non-interactive automatically. The headline name shortcut is unchanged.

**Files:**
- Modify: `src/components/activity/ActivityRoundCard.tsx`
- Modify: `src/components/activity/ActivityRoundCard.test.tsx` (create if it does not exist)

**Interfaces:**
- Consumes: `RoundPlayersBottomSheet` from `./RoundPlayersBottomSheet`; `participantScoreLabel` (already imported from Task 1).

- [ ] **Step 1: Write the failing test**

Create or extend `src/components/activity/ActivityRoundCard.test.tsx`. If the file already exists, add the `describe('players sheet', ...)` block and the `makeCard` helper rather than duplicating existing setup.

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActivityRoundCard } from './ActivityRoundCard';
import type { ActivityFeedCard } from '@/hooks/activity';

jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return {
    PlayerAvatar: ({ name }: { name: string }) => <Text>{`avatar:${name}`}</Text>,
    SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
  };
});
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/hooks/activity', () => ({
  useLikeRound: () => ({ mutate: jest.fn() }),
  useUnlikeRound: () => ({ mutate: jest.fn() }),
}));
jest.mock('./RoundPhotoBanner', () => ({ RoundPhotoBanner: () => null }));

function makeCard(participants: ActivityFeedCard['participants']): ActivityFeedCard {
  return {
    round_id: 'r1',
    competition_id: null,
    course_id: null,
    club_id: null,
    course_name: 'Test Course',
    club_name: 'Test Club',
    club_location: 'Melbourne',
    round_date: '2026-06-20',
    activity_at: '2026-06-20T03:00:00Z',
    game_type: 'stroke',
    is_team_round: false,
    photos: [],
    like_count: 0,
    comment_count: 0,
    viewer_has_liked: false,
    participants,
  } as ActivityFeedCard;
}

const groupParticipants: ActivityFeedCard['participants'] = [
  { player_id: 'me', name: 'Me', photo_url: null, total_gross: 80, total_net: 70, total_points: null },
  { player_id: 'p2', name: 'Sam', photo_url: null, total_gross: 90, total_net: 78, total_points: null },
];

describe('ActivityRoundCard players sheet', () => {
  it('opens the players sheet when the footer avatar stack is pressed', () => {
    render(<ActivityRoundCard card={makeCard(groupParticipants)} onOpen={jest.fn()} />);
    expect(screen.queryByText('Players')).toBeNull();
    fireEvent.press(screen.getByLabelText('View players in this round'));
    expect(screen.getByText('Players')).toBeTruthy();
    // Sheet lists everyone, including the headline player.
    expect(screen.getByLabelText("View Me's profile")).toBeTruthy();
    expect(screen.getByLabelText("View Sam's profile")).toBeTruthy();
  });

  it('does not render a pressable stack for a solo round', () => {
    const solo: ActivityFeedCard['participants'] = [
      { player_id: 'me', name: 'Me', photo_url: null, total_gross: 80, total_net: 70, total_points: null },
    ];
    render(<ActivityRoundCard card={makeCard(solo)} onOpen={jest.fn()} />);
    expect(screen.queryByLabelText('View players in this round')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/components/activity/ActivityRoundCard.test.tsx -t "players sheet"`
Expected: FAIL — no element with label "View players in this round" (the stack is not yet pressable / sheet not wired).

- [ ] **Step 3: Add visibility state and import the sheet**

In `src/components/activity/ActivityRoundCard.tsx`:

Change the React import (line 11) to include `useState`:

```ts
import React, { useCallback, useState } from 'react';
```

Add the sheet import next to the other relative imports (after the `participantScore` import added in Task 1):

```ts
import { RoundPlayersBottomSheet } from './RoundPlayersBottomSheet';
```

Inside the component, add state near the other hooks (after line 69, the `unlikeRound` declaration):

```ts
const [playersSheetVisible, setPlayersSheetVisible] = useState(false);
```

Add a handler near the other `handleOpen*` callbacks (after `handleOpenProfile`, line 114):

```ts
const handleSelectPlayer = useCallback(
  (playerId: string) => {
    navigation.navigate('PlayerDetail', { id: playerId });
  },
  [navigation],
);
```

- [ ] **Step 4: Make the avatar stack pressable**

Replace the avatar stack `<View>` (lines 269–273) — the element opening with `<View style={styles.avatarStack} testID="footer-avatar-stack" ...>` — with a `TouchableOpacity` that opens the sheet. The closing `</View>` for this element (line 300) becomes `</TouchableOpacity>`. The inner avatar mapping and overflow chip are unchanged.

Opening tag becomes:

```tsx
<TouchableOpacity
  style={styles.avatarStack}
  testID="footer-avatar-stack"
  onPress={() => setPlayersSheetVisible(true)}
  accessibilityRole="button"
  accessibilityLabel="View players in this round"
>
```

And its matching close tag (was the `</View>` at line 300) becomes:

```tsx
</TouchableOpacity>
```

- [ ] **Step 5: Render the sheet**

Immediately before the final closing `</View>` of the card root (line 303, the one closing the outermost card `View`), add:

```tsx
<RoundPlayersBottomSheet
  visible={playersSheetVisible}
  onClose={() => setPlayersSheetVisible(false)}
  participants={card.participants}
  gameType={card.game_type}
  onSelectPlayer={handleSelectPlayer}
/>
```

- [ ] **Step 6: Run tests and type-check to verify pass**

Run: `pnpm jest src/components/activity/ActivityRoundCard.test.tsx`
Expected: PASS (both new tests, plus any pre-existing tests in the file).

Run: `pnpm tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/activity/ActivityRoundCard.tsx src/components/activity/ActivityRoundCard.test.tsx
git commit -m "feat(activity): tap round card avatars to open players sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final Verification

- [ ] Run the full activity component test folder:
  Run: `pnpm jest src/components/activity`
  Expected: all pass.
- [ ] Type-check the project:
  Run: `pnpm tsc --noEmit`
  Expected: no new errors versus baseline.
- [ ] Lint the touched files:
  Run: `pnpm lint`
  Expected: no new errors in `src/components/activity/*`.

## Manual QA (on-device / simulator, post-merge)

Not part of automated steps — record outcomes when run:

1. Feed: tap the footer avatar stack on a multi-player round → sheet opens listing everyone with correct scores.
2. Tap a **friend** row → their full profile (stats visible).
3. Tap a **non-friend** row → profile shows name/handicap + "Add Friend", stats hidden.
4. Round post detail screen (`RoundActivity`): same avatar-stack tap behaviour works.
5. Stableford round: scores show as "{n} pts"; players with no score show "–".
6. Solo round: avatar stack absent / not tappable.
7. Translucent + image backdrop appearance: sheet surface is solid (not washed white) in both light and dark.
```
