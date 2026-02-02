/**
 * ScoringPairsSection - Scoring pairs toggle for AddRoundScreen
 *
 * @deprecated This is a wrapper around ScoringPairsToggle for backward compatibility.
 * Import ScoringPairsToggle directly from '@/components/scoring' for new code.
 */

import React, { memo } from 'react';
import { ScoringPairsToggle } from '@/components/scoring';

interface ScoringPairsSectionProps {
  isPremium: boolean;
  scoringPairsRequired: boolean;
  isTeamMatchPlay: boolean;
  onToggle: (value: boolean) => void;
  onUpgradePress: () => void;
  disabled?: boolean;
}

export const ScoringPairsSection = memo(function ScoringPairsSection({
  isPremium,
  scoringPairsRequired,
  isTeamMatchPlay,
  onToggle,
  onUpgradePress,
  disabled,
}: ScoringPairsSectionProps) {
  return (
    <ScoringPairsToggle
      isPremium={isPremium}
      scoringPairsRequired={scoringPairsRequired}
      onToggle={onToggle}
      onUpgradePress={onUpgradePress}
      isTeamMatchPlay={isTeamMatchPlay}
      disabled={disabled}
      showDivider
      containerStyle="inline"
    />
  );
});
