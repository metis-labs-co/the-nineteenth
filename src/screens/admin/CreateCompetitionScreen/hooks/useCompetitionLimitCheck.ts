/**
 * useCompetitionLimitCheck
 *
 * Checks if the user has reached their competition creation limit
 * based on their subscription tier. Manages upgrade prompt state.
 */

import { useState, useEffect } from 'react';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useCompetitionCount } from '@/hooks/useSubscription';
import type { UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';

export function useCompetitionLimitCheck() {
  const {
    tier,
    limits,
    checkCanCreateCompetition,
    isLoading: isSubscriptionLoading,
  } = useSubscriptionContext();

  const { data: competitionCount = 0, isLoading: isCountLoading } = useCompetitionCount();

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptConfig, setUpgradePromptConfig] = useState<UpgradePromptConfig | null>(null);
  const [isAtCompetitionLimit, setIsAtCompetitionLimit] = useState(false);

  // Check if user is at competition limit on mount
  useEffect(() => {
    if (!isSubscriptionLoading && !isCountLoading && limits) {
      const access = checkCanCreateCompetition(competitionCount);
      if (!access.allowed) {
        setIsAtCompetitionLimit(true);
        const targetTier = tier === 'free' ? 'social' : 'premium';
        const benefits = targetTier === 'social'
          ? [
              'Create up to 5 competitions',
              'Up to 12 players per competition',
              'Stroke Play game type',
              'Score distribution analytics',
            ]
          : [
              'Unlimited competitions',
              'Up to 40 players per competition',
              'All game types including Match Play',
              'Advanced analytics & trends',
            ];
        setUpgradePromptConfig({
          feature: 'create_competition',
          title: 'Competition Limit Reached',
          message: `You've reached your limit of ${limits.maxCompetitionsOwned} competition${limits.maxCompetitionsOwned === 1 ? '' : 's'} on the ${limits.displayName} plan.`,
          targetTier,
          benefits,
        });
      }
    }
  }, [isSubscriptionLoading, isCountLoading, limits, competitionCount, checkCanCreateCompetition, tier]);

  return {
    tier,
    limits,
    competitionCount,
    isSubscriptionLoading,
    isCountLoading,
    showUpgradePrompt,
    setShowUpgradePrompt,
    upgradePromptConfig,
    setUpgradePromptConfig,
    isAtCompetitionLimit,
  };
}
