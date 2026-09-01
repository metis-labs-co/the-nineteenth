/**
 * HandicapHomeSection — picks the right Home-screen treatment for the Social
 * Handicap Index based on subscription tier.
 *
 * Unlocked: the full HandicapHomeCard (index, copy, trend chart).
 * Locked: a compact upsell row the user can dismiss for good — the tier gate
 * is checked first, so upgrading always brings the full card back.
 */

import React, { useCallback } from 'react';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { useHomeUiStore } from '@/store/homeUiStore';
import { HandicapHomeCard } from './HandicapHomeCard';
import { HandicapUpsellRow } from './HandicapUpsellRow';
import type { HandicapSummary } from '@/types/handicap.types';

interface HandicapHomeSectionProps {
  summary: HandicapSummary | null;
  /** Open the full handicap history screen (unlocked users). */
  onPress: () => void;
  /** Open the subscription screen (locked users). */
  onUpgradePress: () => void;
}

export const HandicapHomeSection = React.memo(function HandicapHomeSection({
  summary,
  onPress,
  onUpgradePress,
}: HandicapHomeSectionProps) {
  const checkFeature = useCheckFeature();
  const dismissed = useHomeUiStore((s) => s.handicapUpsellDismissed);
  const dismissHandicapUpsell = useHomeUiStore((s) => s.dismissHandicapUpsell);

  const handleDismiss = useCallback(() => {
    dismissHandicapUpsell();
  }, [dismissHandicapUpsell]);

  const access = checkFeature('handicap_history');

  if (access.allowed) {
    return (
      <HandicapHomeCard
        summary={summary}
        onPress={onPress}
        testID="home-handicap-card"
      />
    );
  }

  if (dismissed) return null;

  return (
    <HandicapUpsellRow
      requiredTier={access.requiredTier}
      onUpgradePress={onUpgradePress}
      onDismiss={handleDismiss}
      testID="home-handicap-upsell"
    />
  );
});
