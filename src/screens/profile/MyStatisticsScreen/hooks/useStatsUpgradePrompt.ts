/**
 * useStatsUpgradePrompt - Hook for managing upgrade prompts on statistics screen
 *
 * Handles:
 * - Score distribution upgrade prompt (Social+ tier)
 * - Advanced stats upgrade prompt (Premium tier)
 * - Navigation to subscription screen
 */

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { UpgradePromptConfig } from '@/components/subscription';

// =====================================================
// TYPES
// =====================================================

export interface UseStatsUpgradePromptReturn {
  /** Current upgrade prompt config (null if hidden) */
  upgradePromptConfig: UpgradePromptConfig | null;
  /** Show upgrade prompt for score distribution feature */
  handleScoreDistributionUpgrade: () => void;
  /** Show upgrade prompt for advanced stats feature */
  handleAdvancedStatsUpgrade: () => void;
  /** Show upgrade prompt for game stats feature */
  handleGameStatsUpgrade: () => void;
  /** Navigate to subscription screen and close prompt */
  handleNavigateToSubscription: () => void;
  /** Dismiss the upgrade prompt */
  handleDismissPrompt: () => void;
}

// =====================================================
// HOOK
// =====================================================

export function useStatsUpgradePrompt(): UseStatsUpgradePromptReturn {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [upgradePromptConfig, setUpgradePromptConfig] = useState<UpgradePromptConfig | null>(null);

  // Navigate to subscription screen
  const handleNavigateToSubscription = useCallback(() => {
    setUpgradePromptConfig(null);
    navigation.navigate('Subscription');
  }, [navigation]);

  // Dismiss prompt
  const handleDismissPrompt = useCallback(() => {
    setUpgradePromptConfig(null);
  }, []);

  // Show upgrade prompt for score distribution
  const handleScoreDistributionUpgrade = useCallback(() => {
    setUpgradePromptConfig({
      feature: 'score_distribution',
      title: 'Unlock Score Distribution',
      message: 'See how your scores break down across eagles, birdies, pars, and more.',
      targetTier: 'social',
      benefits: [
        'Score breakdown by type',
        'Visual distribution charts',
        'Track your improvement over time',
      ],
    });
  }, []);

  // Show upgrade prompt for advanced stats
  const handleAdvancedStatsUpgrade = useCallback(() => {
    setUpgradePromptConfig({
      feature: 'advanced_stats',
      title: 'Unlock Advanced Analytics',
      message: 'Get deeper insights into your game with premium statistics.',
      targetTier: 'premium',
      benefits: [
        'Performance trends and charts',
        'Best/worst round analysis',
        'Course-by-course breakdown',
        'Detailed scoring metrics',
      ],
    });
  }, []);

  // Show upgrade prompt for game stats feature
  const handleGameStatsUpgrade = useCallback(() => {
    setUpgradePromptConfig({
      feature: 'advanced_stats',
      title: 'Unlock Game Stats',
      message: 'Get detailed insights into every part of your game.',
      targetTier: 'premium',
      benefits: [
        'Driving accuracy & miss tendencies',
        'Approach shot analysis',
        'Bunker shot tracking',
        'Hazard frequency breakdown',
      ],
    });
  }, []);

  return {
    upgradePromptConfig,
    handleScoreDistributionUpgrade,
    handleAdvancedStatsUpgrade,
    handleGameStatsUpgrade,
    handleNavigateToSubscription,
    handleDismissPrompt,
  };
}

export default useStatsUpgradePrompt;
