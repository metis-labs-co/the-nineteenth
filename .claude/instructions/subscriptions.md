# Subscription Tier System - The Nineteenth

This app uses a tiered subscription model to control feature access. When building features that may be tier-restricted, follow these patterns.

## Tier Overview

| Tier | Description | Key Limits |
|------|-------------|------------|
| **Free** | Default for all users | 3 competitions, 2 rounds, 10 friends, Stableford only |
| **Social** | Casual golfers | 8 competitions, 5 rounds, 16 players, +Stroke Play, Match Play, Team formats |
| **Premium** | Serious organizers | Unlimited competitions, 10 rounds, 40 players, all game types |
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
  LimitIndicator,    // Show usage vs limit
  UpgradePrompt,     // Modal for upgrade CTA
} from '@/components/subscription';
```

## Screen-Level Tier Gates

For premium-only screens:

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
  </ScrollView>
);
```

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
