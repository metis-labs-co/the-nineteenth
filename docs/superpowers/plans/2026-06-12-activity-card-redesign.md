# Activity Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `ActivityRoundCard` into a player-led layout: headline participant header with YOU pill and score top-right, course row, inset photo, and a footer with stacked participant avatars replacing the chevron.

**Architecture:** Layout-only change to one component (`src/components/activity/ActivityRoundCard.tsx`), shared by both `ActivityScreen` (feed) and `RoundActivityScreen` (detail), so both pick up the change. One new pure utility (`formatTimeAgo`) added to `src/utils/formatting.ts`. No data-layer changes — `ActivityFeedCard` already carries everything needed.

**Tech Stack:** React Native (Expo), TypeScript, react-native-paper `Text`/`Icon`, Jest + @testing-library/react-native, theming via `useThemeColors()` + static tokens from `@/constants/theme`.

**Spec:** `docs/superpowers/specs/2026-06-12-activity-card-redesign-design.md`

---

## Context for a zero-context engineer

- **The card today** (`src/components/activity/ActivityRoundCard.tsx`): photo banner full-bleed at top, course header row, a list of all participants with avatar+name+score, optional "View competition leaderboard" link, then a like/comment footer.
- **Target layout** (reference screenshot, top to bottom):
  1. Header: avatar (40px), bold player name + green outlined **YOU** pill (only when that player is the signed-in user), subtitle `played a round · 2d`, score top-right in green (`34 pts`).
  2. Course row: flag icon in a rounded-square container, bold club name, subtitle `Wed, 15 Jan 2025 · Hepburn Springs · VIC`.
  3. Round photo, inset with rounded corners (collapses when no photos).
  4. Footer: like + comment buttons left; stacked overlapping avatars of the *other* participants right (max 4, then a `+N` chip). No chevron.
- **Headline participant**: the viewer if they played in the round (matched via `useAuth().user.id === participant.player_id` — `mutations.ts` in `src/hooks/activity` already uses `user.id` as `player_id`), otherwise `participants[0]`.
- **Key types**: `ActivityFeedCard` / `FeedParticipant` in `src/hooks/activity/types.ts`. `photos` is on the card, so we can collapse the photo section without waiting for `RoundPhotoBanner`'s own query.
- **Existing pieces reused as-is**: `PlayerAvatar` (`@/components/common`), `RoundPhotoBanner` (default `rounded={true}` gives the inset rounded look), `participantScoreLabel` (already in the card file), `formatDateWithWeekday` (`@/utils/formatting`, outputs e.g. `Wed, 15 Jan 2025`).
- **Stacked avatar pattern to copy**: `src/components/rounds/RoundListCard/RoundListCard.tsx:191-208` (`avatarStack` / `avatarRing` / `avatarOverlap` styles at lines 297-307).
- **Test conventions**: see `src/components/activity/RoundPhotoBanner.test.tsx` for the mocking style (mock `@/context/ThemeContext`, hooks, `@/components/common`).
- **Commands**: `pnpm test <path>` runs Jest on a file; `pnpm type-check`; `pnpm lint`.

---

### Task 1: `formatTimeAgo` utility

**Files:**
- Modify: `src/utils/formatting.ts` (append new export at end of file)
- Test: `src/utils/__tests__/formatting.test.ts` (append new describe block)

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/__tests__/formatting.test.ts` (add `formatTimeAgo` to the existing import from `../formatting`):

```typescript
describe('formatTimeAgo', () => {
  const now = new Date('2026-06-12T12:00:00Z');

  it('returns "now" for under a minute ago', () => {
    expect(formatTimeAgo('2026-06-12T11:59:30Z', now)).toBe('now');
  });

  it('returns minutes under an hour', () => {
    expect(formatTimeAgo('2026-06-12T11:55:00Z', now)).toBe('5m');
  });

  it('returns hours under a day', () => {
    expect(formatTimeAgo('2026-06-12T09:00:00Z', now)).toBe('3h');
  });

  it('returns days under a week', () => {
    expect(formatTimeAgo('2026-06-10T12:00:00Z', now)).toBe('2d');
  });

  it('returns weeks under a year', () => {
    expect(formatTimeAgo('2026-05-29T12:00:00Z', now)).toBe('2w');
  });

  it('returns years beyond that', () => {
    expect(formatTimeAgo('2024-06-12T12:00:00Z', now)).toBe('2y');
  });

  it('returns empty string for null or invalid input', () => {
    expect(formatTimeAgo(null, now)).toBe('');
    expect(formatTimeAgo('not-a-date', now)).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/utils/__tests__/formatting.test.ts`
Expected: FAIL — `formatTimeAgo` is not exported (TS/compile error or `undefined is not a function`).

- [ ] **Step 3: Implement `formatTimeAgo`**

Append to `src/utils/formatting.ts`:

```typescript
/**
 * Format a timestamp as a compact relative age, e.g. "now", "5m", "3h",
 * "2d", "2w", "2y". Used by the activity feed ("played a round · 2d").
 *
 * @param isoString - ISO timestamp (e.g. row's activity_at)
 * @param now - Reference time, injectable for tests (defaults to now)
 * @returns Compact age string, or '' for null/invalid input
 */
export function formatTimeAgo(isoString: string | null, now: Date = new Date()): string {
  if (!isoString) return '';
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return '';

  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 365)}y`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/utils/__tests__/formatting.test.ts`
Expected: PASS (all pre-existing formatting tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/formatting.ts src/utils/__tests__/formatting.test.ts
git commit -m "feat(utils): add formatTimeAgo compact relative-time formatter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Restructure `ActivityRoundCard`

**Files:**
- Modify: `src/components/activity/ActivityRoundCard.tsx` (full rewrite of layout; like/comment/navigation behavior unchanged)
- Test: `src/components/activity/ActivityRoundCard.test.tsx` (new file)

- [ ] **Step 1: Write the failing tests**

Create `src/components/activity/ActivityRoundCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { ActivityRoundCard } from './ActivityRoundCard';
import type { ActivityFeedCard, FeedParticipant } from '@/hooks/activity';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => new Proxy({}, { get: () => '#008000' }),
  useIsDark: () => false,
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'viewer-1' } }),
}));
jest.mock('@/hooks/activity', () => ({
  useLikeRound: () => ({ mutate: jest.fn() }),
  useUnlikeRound: () => ({ mutate: jest.fn() }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('./RoundPhotoBanner', () => ({ RoundPhotoBanner: () => null }));
jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return {
    PlayerAvatar: ({ name }: { name?: string }) => <Text>{`avatar:${name}`}</Text>,
  };
});

function participant(id: string, name: string, points = 30): FeedParticipant {
  return {
    player_id: id,
    name,
    photo_url: null,
    total_gross: null,
    total_net: null,
    total_points: points,
  };
}

function makeCard(overrides: Partial<ActivityFeedCard> = {}): ActivityFeedCard {
  return {
    round_id: 'r1',
    competition_id: null,
    course_name: 'Hepburn Springs',
    club_name: 'Hepburn Springs Golf Club',
    club_location: 'Hepburn Springs · VIC',
    round_date: '2026-06-08',
    game_type: 'stableford',
    is_team_round: false,
    activity_at: '2026-06-10T01:00:00Z',
    participants: [participant('viewer-1', 'Sam Kay', 34)],
    photos: [],
    like_count: 0,
    comment_count: 0,
    viewer_has_liked: false,
    ...overrides,
  };
}

describe('ActivityRoundCard', () => {
  it('headlines the viewer with YOU pill, score, and subtitle', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.getByText('Sam Kay')).toBeTruthy();
    expect(screen.getByText('YOU')).toBeTruthy();
    expect(screen.getByText('34 pts')).toBeTruthy();
    expect(screen.getByText(/played a round/)).toBeTruthy();
  });

  it('headlines the first participant without YOU pill when viewer is not in the round', () => {
    const card = makeCard({ participants: [participant('p2', 'Alex Smith', 28)] });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByText('Alex Smith')).toBeTruthy();
    expect(screen.queryByText('YOU')).toBeNull();
    expect(screen.getByText('28 pts')).toBeTruthy();
  });

  it('hides the header score when the headline participant has no score', () => {
    const card = makeCard({
      participants: [{ ...participant('viewer-1', 'Sam Kay'), total_points: null }],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.queryByText('–')).toBeNull();
  });

  it('shows the course row with club name', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.getByText('Hepburn Springs Golf Club')).toBeTruthy();
  });

  it('stacks remaining participants in the footer, capped at 4 with a +N chip', () => {
    const card = makeCard({
      participants: [
        participant('viewer-1', 'Sam Kay', 34),
        participant('p2', 'A'),
        participant('p3', 'B'),
        participant('p4', 'C'),
        participant('p5', 'D'),
        participant('p6', 'E'),
      ],
    });
    render(<ActivityRoundCard card={card} onOpen={jest.fn()} />);
    expect(screen.getByTestId('footer-avatar-stack')).toBeTruthy();
    // 1 header avatar + 4 stacked footer avatars (5th other is overflow)
    expect(screen.getAllByText(/^avatar:/)).toHaveLength(5);
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('renders no footer avatar stack for a solo round', () => {
    render(<ActivityRoundCard card={makeCard()} onOpen={jest.fn()} />);
    expect(screen.queryByTestId('footer-avatar-stack')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/activity/ActivityRoundCard.test.tsx`
Expected: FAIL — current layout has no `YOU` pill, no `footer-avatar-stack` testID, no `played a round` subtitle.

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `src/components/activity/ActivityRoundCard.tsx` with:

```tsx
/**
 * ActivityRoundCard - one grouped-per-round card in the activity feed.
 *
 * Player-led layout: headline participant (the viewer if they played,
 * otherwise the friend whose activity it is) with their score top-right,
 * then the course row, the round photos inset below, and a like + comment
 * footer with the remaining participants as stacked avatars. Tapping the
 * card (or the comment button) opens the round's activity detail.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common';
import { formatDateWithWeekday, formatTimeAgo } from '@/utils/formatting';
import { useAuth } from '@/hooks/useAuth';
import { useLikeRound, useUnlikeRound } from '@/hooks/activity';
import type { ActivityFeedCard, FeedParticipant } from '@/hooks/activity';
import type { RootStackParamList } from '@/navigation/types';
// Import directly (not via the index) to avoid a circular dependency.
import { RoundPhotoBanner } from './RoundPhotoBanner';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Cap the stacked avatars in the footer; overflow shows a "+N" chip. */
const MAX_FOOTER_AVATARS = 4;

function participantScoreLabel(p: FeedParticipant, gameType: string): string {
  if (gameType === 'stableford') {
    return p.total_points != null ? `${p.total_points} pts` : '–';
  }
  if (p.total_gross != null && p.total_gross > 0) {
    return p.total_net != null && p.total_net > 0
      ? `${p.total_gross} (${p.total_net})`
      : `${p.total_gross}`;
  }
  return '–';
}

/** The viewer if they played in the round, otherwise the first participant. */
function headlineParticipant(
  participants: FeedParticipant[],
  viewerId: string | undefined,
): FeedParticipant | null {
  if (participants.length === 0) return null;
  return participants.find((p) => p.player_id === viewerId) ?? participants[0];
}

export interface ActivityRoundCardProps {
  card: ActivityFeedCard;
  onOpen: (roundId: string) => void;
}

export const ActivityRoundCard = React.memo(function ActivityRoundCard({
  card,
  onOpen,
}: ActivityRoundCardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  // Darker, less glaring "Comp" pill background in dark mode.
  const compPillBackground = isDark ? `${colors.primary}33` : colors.primaryLighter;
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const likeRound = useLikeRound();
  const unlikeRound = useUnlikeRound();

  const toggleLike = useCallback(() => {
    if (card.viewer_has_liked) unlikeRound.mutate(card.round_id);
    else likeRound.mutate(card.round_id);
  }, [card.viewer_has_liked, card.round_id, likeRound, unlikeRound]);

  const handleOpen = useCallback(() => onOpen(card.round_id), [onOpen, card.round_id]);

  const competitionId = card.competition_id;
  const isCompetition = !!competitionId;

  const headline = headlineParticipant(card.participants, user?.id);
  const isViewer = !!headline && headline.player_id === user?.id;
  const scoreLabel = headline ? participantScoreLabel(headline, card.game_type) : '–';
  const others = headline
    ? card.participants.filter((p) => p.player_id !== headline.player_id)
    : card.participants;
  const stackedAvatars = others.slice(0, MAX_FOOTER_AVATARS);
  const overflowCount = others.length - stackedAvatars.length;

  const handleViewCompetition = useCallback(() => {
    if (competitionId) navigation.navigate('Leaderboard', { competitionId });
  }, [navigation, competitionId]);

  const courseTitle = card.club_name || card.course_name;
  const courseSubtitle = [formatDateWithWeekday(card.round_date), card.club_location]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpen}
        style={styles.content}
        accessibilityRole="button"
        accessibilityLabel={`Round at ${courseTitle}`}
      >
        {headline ? (
          <View style={styles.playerRow}>
            <PlayerAvatar photoUrl={headline.photo_url} name={headline.name} size={40} />
            <View style={styles.playerText}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.playerName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {headline.name}
                </Text>
                {isViewer ? (
                  <View style={[styles.youPill, { borderColor: colors.primary }]}>
                    <Text style={[styles.youPillText, { color: colors.primary }]}>YOU</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                played a round · {formatTimeAgo(card.activity_at)}
              </Text>
            </View>
            {scoreLabel !== '–' ? (
              <Text style={[styles.score, { color: colors.primary }]}>{scoreLabel}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.courseRow}>
          <View style={[styles.courseIcon, { backgroundColor: colors.surfaceVariant }]}>
            <Icon source="flag" size={18} color={colors.primary} />
          </View>
          <View style={styles.courseText}>
            <Text style={[styles.courseTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {courseTitle}
            </Text>
            {!!courseSubtitle && (
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {courseSubtitle}
              </Text>
            )}
          </View>
          {isCompetition ? (
            <View style={[styles.tag, { backgroundColor: compPillBackground }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>Comp</Text>
            </View>
          ) : null}
        </View>

        {/* Inset rounded photo; section collapses when the round has none */}
        {card.photos.length > 0 ? (
          <View style={styles.photo}>
            <RoundPhotoBanner roundId={card.round_id} />
          </View>
        ) : null}
      </TouchableOpacity>

      {isCompetition ? (
        <TouchableOpacity
          style={styles.compLink}
          onPress={handleViewCompetition}
          accessibilityRole="button"
          accessibilityLabel="View competition leaderboard"
        >
          <Icon source="trophy-outline" size={16} color={colors.primary} />
          <Text style={[styles.compLinkText, { color: colors.primary }]}>
            View competition leaderboard
          </Text>
          <Icon source="chevron-right" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={toggleLike}
          accessibilityRole="button"
          accessibilityLabel={card.viewer_has_liked ? 'Unlike round' : 'Like round'}
        >
          <Icon
            source={card.viewer_has_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={card.viewer_has_liked ? colors.error : colors.textSecondary}
          />
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            {card.like_count > 0 ? String(card.like_count) : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel="View comments"
        >
          <Icon source="comment-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            {card.comment_count > 0 ? String(card.comment_count) : 'Comment'}
          </Text>
        </TouchableOpacity>

        {stackedAvatars.length > 0 ? (
          <View
            style={styles.avatarStack}
            testID="footer-avatar-stack"
            accessibilityLabel={`Played with ${others.map((p) => p.name).join(', ')}`}
          >
            {stackedAvatars.map((p, index) => (
              <View
                key={p.player_id}
                style={[
                  styles.avatarRing,
                  { borderColor: colors.surface },
                  index > 0 && styles.avatarOverlap,
                ]}
              >
                <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={24} />
              </View>
            ))}
            {overflowCount > 0 ? (
              <View
                style={[
                  styles.avatarRing,
                  styles.avatarOverlap,
                  styles.overflowChip,
                  { borderColor: colors.surface, backgroundColor: colors.surfaceVariant },
                ]}
              >
                <Text style={[styles.overflowText, { color: colors.textSecondary }]}>
                  +{overflowCount}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  youPill: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  youPillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  score: {
    ...typography.h4,
    fontWeight: '700',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  courseIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseText: {
    flex: 1,
  },
  courseTitle: {
    ...typography.bodyBold,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '600',
  },
  photo: {
    marginTop: spacing.md,
  },
  compLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  compLinkText: {
    ...typography.small,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingVertical: spacing.xs,
  },
  footerLabel: {
    ...typography.small,
    fontWeight: '600',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -spacing.sm,
  },
  overflowChip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
```

Notes on intentional behavior changes (all per the approved spec):
- The full participants list and `MAX_COMPETITION_PARTICIPANTS` cap are removed — replaced by the headline header + footer avatar stack.
- The comp link text no longer prefixes `+N more` (the stack's `+N` chip covers overflow).
- `RoundPhotoBanner` moves below the course row and uses its default `rounded={true}` (the old call passed `rounded={false}` for the full-bleed top banner).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/components/activity/ActivityRoundCard.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/activity/ActivityRoundCard.tsx src/components/activity/ActivityRoundCard.test.tsx
git commit -m "feat(activity): player-led activity card with YOU pill and stacked avatars

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the activity component and formatting test suites together**

Run: `pnpm test src/components/activity src/utils/__tests__/formatting.test.ts`
Expected: all PASS (including pre-existing `RoundPhotoBanner`, `RoundPhotoAlbum`, `RoundPhotoViewer` tests).

- [ ] **Step 2: Manual smoke check in the app (if a simulator is available)**

Run: `npx expo start --ios`, sign in, open the Activity tab and a round detail screen. Verify against the reference screenshot in light **and** dark theme:
- Viewer's own round shows YOU pill and score top-right; a friend's round shows their name without the pill.
- Course row shows flag icon, club name, date · location.
- Photo is inset with rounded corners; rounds without photos show no gap.
- Footer shows like/comment left and stacked avatars right (no chevron); solo rounds show no stack.
- Tapping the card opens the round detail; competition rounds still show the Comp pill and leaderboard link.

If no simulator is available, note this as outstanding manual QA rather than skipping silently.
