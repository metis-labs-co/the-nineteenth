/**
 * useCompetitionFormSubmit
 *
 * Handles the final competition creation submission:
 * - Builds mutation input from wizard data
 * - Creates competition via mutation
 * - Creates prize pool if enabled
 * - Handles success (toast, navigation) and errors (upgrade prompt or alert)
 */

import { useState } from 'react';
import { useCreateCompetition } from '@/hooks/useCreateCompetition';
import { useCreatePrizePool } from '@/hooks/usePrizePool';
import { useAuth } from '@/hooks/useAuth';
import { useCheckAchievements } from '@/hooks/achievements/useCheckAchievements';
import { useAchievementToast } from '@/context/AchievementToastContext';
import { DEFAULT_POINT_SYSTEM } from '@/schemas/competition';
import { clearWizardDraft } from '@/store/competitionWizardStore';
import { parseAustralianDate } from '../types';
import type { UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';

import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
} from '@/schemas/competition';
import type { WizardPlayerData } from '@/store/competitionWizardStore';

interface UseCompetitionFormSubmitParams {
  showAlert: (title: string, message: string) => void;
  setShowUpgradePrompt: (show: boolean) => void;
  setUpgradePromptConfig: (config: UpgradePromptConfig | null) => void;
  tier: string;
  onSuccess: (competitionId: string, inviteCode: string) => void;
}

export function useCompetitionFormSubmit({
  showAlert,
  setShowUpgradePrompt,
  setUpgradePromptConfig,
  tier,
  onSuccess,
}: UseCompetitionFormSubmitParams) {
  const createCompetition = useCreateCompetition();
  const createPrizePool = useCreatePrizePool();
  const { user } = useAuth();
  const { checkAndAward, isReady: isAchievementReady } = useCheckAchievements(user?.id ?? '');
  const { showMultipleToasts } = useAchievementToast();

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastInviteCode, setToastInviteCode] = useState('');

  const handleSubmit = async (
    step1: CompetitionDetailsFormData | undefined,
    step2: SimplifiedRoundFormData[] | undefined,
    players: WizardPlayerData[] | undefined,
    prizePoolConfig: PrizePoolConfigFormData | undefined
  ) => {
    if (!step1 || !step2) {
      showAlert('Error', 'Please complete all steps');
      return;
    }

    // If prize pool enabled but not configured, show error
    if (step1.enablePrizePool && !prizePoolConfig) {
      showAlert('Error', 'Please configure the prize pool');
      return;
    }

    try {
      const parsedStartDate = parseAustralianDate(step1.startDate);
      const parsedEndDate = step1.endDate
        ? parseAustralianDate(step1.endDate)
        : undefined;

      const mutationInput = {
        name: step1.name,
        description: step1.description,
        competitionType: step1.competitionType,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        handicapSystem: step1.handicapSystem,
        handicapSource: step1.handicapSource || 'profile',
        inviteCode: step1.inviteCode,
        visibility: 'private' as const,

        teamMode: step1.enableTeams ? ('fixed' as const) : ('none' as const),
        teamSize: step1.enableTeams ? 2 : undefined,
        pointSystem: DEFAULT_POINT_SYSTEM,

        rounds: step2.map((round) => ({
          courseName: round.courseName || undefined,
          courseId: round.courseId || undefined,
          date: round.date
            ? parseAustralianDate(round.date)
            : parseAustralianDate(step1.startDate),
          teeTime: round.teeTime || undefined,
          matchType: round.matchType || 'stableford',
          scoringPairsRequired: round.scoringPairsRequired ?? false,
        })),

        players: (players || []).map((player) => ({
          id: player.id || undefined,
          name: player.name,
          email: player.email || '',
          handicap: player.handicap ?? undefined,
        })),
      };

      const result = await createCompetition.mutateAsync(mutationInput);

      // If prize pool is enabled, create it after competition creation
      if (step1.enablePrizePool && prizePoolConfig && user) {
        try {
          await createPrizePool.mutateAsync({
            competition_id: result.competition.id,
            target_type: 'individual',
            funding_type: prizePoolConfig.fundingType,
            funding_amount: prizePoolConfig.fundingAmount,
            placements: prizePoolConfig.placements,
            created_by: user.id,
            player_count: 0,
          });
        } catch {
          showAlert(
            'Warning',
            'Competition created, but prize pool setup failed. You can configure it later from competition settings.'
          );
        }
      }

      // Check for competition_created achievement
      if (user?.id && isAchievementReady) {
        try {
          const achievementResult = await checkAndAward('competition_created', {});
          if (achievementResult.hasNewRewards) {
            showMultipleToasts(achievementResult.newAchievements, achievementResult.newCosmetics);
          }
        } catch {
          // Achievement check is non-blocking
        }
      }

      // Show success toast
      setToastMessage('Competition Created!');
      setToastInviteCode(result.inviteCode);
      setToastVisible(true);

      // Clear the wizard draft after successful creation
      clearWizardDraft();

      // Navigate to competition detail after short delay
      setTimeout(() => {
        onSuccess(result.competition.id, result.inviteCode);
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('competition limit') || errorMessage.includes('cannot create more competitions')) {
        const targetTier = tier === 'free' ? 'social' : 'premium';
        const benefits = targetTier === 'social'
          ? [
              'Create up to 5 competitions',
              'Up to 12 players per competition',
              'Stroke Play game type',
            ]
          : [
              'Unlimited competitions',
              'Up to 40 players per competition',
              'All game types',
            ];
        setUpgradePromptConfig({
          feature: 'create_competition',
          title: 'Competition Limit Reached',
          message: errorMessage,
          targetTier,
          benefits,
        });
        setShowUpgradePrompt(true);
      } else {
        showAlert(
          'Error',
          `Failed to create competition. Please try again.\n\nDetails: ${errorMessage}`
        );
      }
    }
  };

  return {
    handleSubmit,
    isSubmitting: createCompetition.isPending || createPrizePool.isPending,
    toastVisible,
    setToastVisible,
    toastMessage,
    toastInviteCode,
  };
}
