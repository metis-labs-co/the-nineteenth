/**
 * ScoringPairsSection - Scoring pairs toggle and shuffle for EditRoundScreen
 *
 * @deprecated This is a wrapper around ScoringPairsToggle for backward compatibility.
 * Import ScoringPairsToggle directly from '@/components/scoring' for new code.
 */

import React from 'react';
import { ScoringPairsToggle } from '@/components/scoring';

interface ScoringPairsSectionProps {
  scoringPairsRequired: boolean;
  onToggle: (value: boolean) => void;
  onShuffle: () => void;
  onUpgradePress: () => void;
  isSubmitting?: boolean;
  isShuffling?: boolean;
}

export function ScoringPairsSection({
  scoringPairsRequired,
  onToggle,
  onShuffle,
  onUpgradePress,
  isSubmitting,
  isShuffling,
}: ScoringPairsSectionProps) {
  return (
    <ScoringPairsToggle
      scoringPairsRequired={scoringPairsRequired}
      onToggle={onToggle}
      onShuffle={onShuffle}
      onUpgradePress={onUpgradePress}
      disabled={isSubmitting}
      isShuffling={isShuffling}
      containerStyle="card"
    />
  );
}
