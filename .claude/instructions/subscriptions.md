# Subscription Tier System - The Nineteenth

This app uses a tiered subscription model to control feature access. When building features that may be tier-restricted, follow these patterns.

## Tier Overview

| Tier | Description | Key Limits |
|------|-------------|------------|
| **Free** | Default for all users | 3 competitions, 2 rounds, 10 friends, Stableford only |
| **Social** | Casual golfers | 8 competitions, 5 rounds, 16 players, +Stroke Play, Match Play, Team formats, +detailed stats, handicap history, achievement leaderboard, AI competition, guest management, GPS distance |
| **Premium** | Serious organizers | Unlimited competitions, 10 rounds, 40 players, all game types, +skins, wolf, prize pools |
| **Super Admin** | Internal team only | No limits, admin tools, never expires |

**Complete reference**: See `docs/guides/SUBSCRIPTION_TIERS.md` for all limits and feature details.

## Available Hooks

```tsx
import {
  useSubscription,         // Main hook - subscription, limits, tier, checkFeature
  useTierLimits,           // Just the limits
  useIsPremium,            // Boolean check
  useIsSocial,             // Boolean check (Social+)
  useIsSuperAdmin,         // Boolean check
  useCheckFeature,         // checkFeature function
  useCompetitionCount,     // Count for limit checks
  useCanCreateCompetition, // Convenience hook
  useCanAddRound,          // Convenience hook
  useCanAddPlayer,         // Convenience hook
  useCanAddFriend,         // Convenience hook
} from '@/hooks';
```

## Available Components

```tsx
import {
  TierBadge,         // Display user's tier
  FeatureLock,       // Wrap tier-restricted content
  FeatureLockToggle, // Wrap tier-restricted toggles/settings
  LimitIndicator,    // Show usage vs limit
  UpgradePrompt,     // Modal for upgrade CTA
} from '@/components/subscription';
```

## Screen-Level Tier Gates

**Preferred pattern** — wrap tier-restricted sections with `FeatureLock`:

```tsx
import { FeatureLock } from '@/components/subscription';

// Wrap tier-restricted sections
<FeatureLock feature="detailed_stats" onUpgradePress={() => navigation.navigate('Subscription')}>
  <ParTypeStatsSection data={parTypeStats} />
</FeatureLock>
```

**Full-screen gate** — for entirely premium-only screens (still supported):

```tsx
import { useIsPremium } from '@/hooks';
import { UpgradePrompt } from '@/components/subscription';

export default function ScoringPairsScreen({ navigation }: Props) {
  const isPremium = useIsPremium();

  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <UpgradePrompt
          config={{
            feature: 'scoring_pairs',
            title: 'Unlock Scoring Pairs',
            message: 'Designate official markers for competitive rounds',
            targetTier: 'premium',
            benefits: [
              'Designated scoring pairs',
              'Tournament-style verification',
              'Official marker assignments',
            ],
          }}
          onUpgrade={() => navigation.navigate('Subscription')}
        />
      </View>
    );
  }

  return <>{/* Screen content */}</>;
}
```

## Creation Screens with Limit Checks

```tsx
import { useSubscription, useCompetitionCount } from '@/hooks';
import { TierBadge, LimitIndicator, UpgradePrompt } from '@/components/subscription';

export default function CreateCompetitionScreen({ navigation }: Props) {
  const { tier, limits, checkFeature } = useSubscription();
  const { data: competitionsCount = 0 } = useCompetitionCount();

  const createAccess = checkFeature('create_competition', {
    currentCount: competitionsCount,
  });

  if (!createAccess.allowed) {
    return (
      <View style={styles.container}>
        <TierBadge size="medium" />
        <UpgradePrompt
          config={{
            feature: 'create_competition',
            title: 'Competition Limit Reached',
            message: `You've reached your limit of ${limits?.maxCompetitionsOwned} competitions`,
            targetTier: createAccess.requiredTier,
            benefits: ['More competitions', 'More players', 'More game types'],
          }}
          onUpgrade={() => navigation.navigate('Subscription')}
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <Text>Create Competition</Text>
        <TierBadge size="small" />
      </View>
      <LimitIndicator
        current={competitionsCount}
        max={limits?.maxCompetitionsOwned ?? 1}
        label="competitions"
      />
      {/* Form content */}
    </>
  );
}
```

## Feature Sections with FeatureLock

```tsx
import { FeatureLock } from '@/components/subscription';

return (
  <ScrollView>
    {/* Basic Stats - Always visible */}
    <BasicStatsSection data={basicStats} />

    {/* Score Distribution - Social+ only */}
    <FeatureLock
      feature="score_distribution"
      onUpgradePress={() => setShowUpgrade(true)}
    >
      <ScoreDistributionSection data={scoreDistribution} />
    </FeatureLock>

    {/* Advanced Analytics - Premium only */}
    <FeatureLock
      feature="advanced_stats"
      onUpgradePress={() => setShowUpgrade(true)}
    >
      <AdvancedAnalyticsSection data={analytics} />
    </FeatureLock>

    {/* Detailed Stats - Social+ only */}
    <FeatureLock
      feature="detailed_stats"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <ParTypeStatsSection data={parTypeStats} />
    </FeatureLock>

    {/* Handicap History - Social+ only */}
    <FeatureLock
      feature="handicap_history"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <HandicapHistoryContent data={handicapData} />
    </FeatureLock>

    {/* Achievement Leaderboard - Social+ only */}
    <FeatureLock
      feature="achievement_leaderboard"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <AchievementLeaderboardContent data={achievements} />
    </FeatureLock>

    {/* AI Competition - Social+ only */}
    <FeatureLock
      feature="ai_competition"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <AICompetitionContent data={aiCompetition} />
    </FeatureLock>

    {/* Guest Management - Social+ only */}
    <FeatureLock
      feature="manage_guests"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <GuestManagementContent data={guests} />
    </FeatureLock>

    {/* Skins Game - Premium only */}
    <FeatureLock
      feature="skins_game"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <SkinsGameContent data={skinsData} />
    </FeatureLock>

    {/* Wolf Game - Premium only */}
    <FeatureLock
      feature="wolf_game"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <WolfGameContent data={wolfData} />
    </FeatureLock>

    {/* Prize Pool - Premium only */}
    <FeatureLock
      feature="prize_pool"
      onUpgradePress={() => navigation.navigate('Subscription')}
    >
      <PrizePoolContent data={prizePoolData} />
    </FeatureLock>
  </ScrollView>
);
```

## Inline Toggle Gating

For tier-restricted toggle settings (e.g., GPS distance toggle in SettingsScreen), use `FeatureLockToggle`:

```tsx
import { FeatureLockToggle } from '@/components/subscription';

<FeatureLockToggle feature="gps_distance" onUpgradePress={() => navigation.navigate('Subscription')}>
  <SettingRow icon="crosshairs-gps" label="GPS Distance to Pin" ... />
</FeatureLockToggle>
```

`FeatureLockToggle` works like `FeatureLock` but is purpose-built for inline settings rows and toggles. It shows the setting in a locked/disabled state with an upgrade prompt rather than replacing the content with a full lock overlay.

## Internal Feature Checks (replacing isPremium prop)

Side-game components (`SkinsSection`, `WolfSection`, `PrizePoolSection`, `ScoringPairsToggle`) no longer accept an `isPremium` prop. They check feature access internally using `useCheckFeature()`:

```tsx
// OLD PATTERN (removed):
// <SkinsSection isPremium={isPremium} ... />

// NEW PATTERN: Components check internally
import { useCheckFeature } from '@/context/SubscriptionContext';

export function SkinsSection({ ... }: SkinsSectionProps) {
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('skins_game').allowed;
  // ... existing UI logic using isPremium unchanged
}
```

This removes the need for parent screens to query and pass down tier status. Each component is self-contained with respect to feature gating.

## Game Type Selection with Tier Locks

```tsx
import { useTierLimits } from '@/hooks';

export default function AddRoundScreen() {
  const limits = useTierLimits();
  const allowedGameTypes = limits?.allowedGameTypes ?? ['stableford'];

  return (
    <GameTypeSelector
      allowedGameTypes={allowedGameTypes}
      onLockedTypePress={(gameType) => {
        setUpgradeConfig({
          feature: 'game_type',
          title: `Unlock ${gameType}`,
          message: 'Upgrade to access this game type',
          targetTier: gameType === 'stroke' ? 'social' : 'premium',
          benefits: getGameTypeBenefits(gameType),
        });
        setShowUpgrade(true);
      }}
    />
  );
}
```

## Grandfathering for Existing Data

```tsx
import { getCompetitionsOverLimit } from '@/services/subscription';

export default function CompetitionsListScreen() {
  const { limits } = useSubscription();
  const overLimitComps = getCompetitionsOverLimit(userId, limits.maxCompetitionsOwned);

  return (
    <FlatList
      data={competitions}
      renderItem={({ item }) => (
        <CompetitionCard
          competition={item}
          isGrandfathered={overLimitComps.includes(item.id)}
        />
      )}
    />
  );
}
```

## API Mutation Permission Checks

```tsx
async createCompetition(data: CreateCompetitionInput) {
  const permission = await this.checkCompetitionCreationPermission();
  if (!permission.allowed) {
    throw new Error(permission.error || 'You have reached your competition limit. Upgrade to create more.');
  }

  const { data: competition } = await supabase
    .from('competitions')
    .insert(data)
    .single();
  return competition;
}
```

## Checklist for Tier-Aware Features

When implementing a feature that may need tier restrictions:

- [ ] Check if feature requires tier gating (see `docs/guides/SUBSCRIPTION_TIERS.md`)
- [ ] Add TierBadge to header if relevant
- [ ] Check feature access before rendering (`checkFeature`)
- [ ] Show full-screen UpgradePrompt for Premium-only screens
- [ ] Use FeatureLock for tier-gated sections within screens
- [ ] Show LimitIndicator for countable features (competitions, friends, players)
- [ ] Pass allowedGameTypes to game type selectors
- [ ] Handle grandfathered content (show but don't allow new creation if over limit)
- [ ] Add permission checks to API mutations
- [ ] Navigate to SubscriptionScreen from upgrade prompts
- [ ] Handle permission errors gracefully in mutations
- [ ] Use FeatureLockToggle for tier-gated settings/toggles
- [ ] For side-game components (skins, wolf, prize pool), use internal useCheckFeature instead of isPremium prop
