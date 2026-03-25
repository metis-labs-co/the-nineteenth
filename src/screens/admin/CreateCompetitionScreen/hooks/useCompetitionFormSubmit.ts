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
    console.log('[CreateCompetition] handleSubmit called');
    console.log('[CreateCompetition] wizardData.step1:', JSON.stringify(step1, null, 2));
    console.log('[CreateCompetition] wizardData.step2:', JSON.stringify(step2, null, 2));
    console.log('[CreateCompetition] wizardData.players:', JSON.stringify(players, null, 2));
    console.log('[CreateCompetition] wizardData.prizePoolConfig:', JSON.stringify(prizePoolConfig, null, 2));

    if (!step1 || !step2) {
      console.warn('[CreateCompetition] Missing step data - step1:', !!step1, 'step2:', !!step2);
      showAlert('Error', 'Please complete all steps');
      return;
    }

    // If prize pool enabled but not configured, show error
    if (step1.enablePrizePool && !prizePoolConfig) {
      console.warn('[CreateCompetition] Prize pool enabled but not configured');
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

      console.log('[CreateCompetition] Parsed dates - start:', parsedStartDate, 'end:', parsedEndDate);
      console.log('[CreateCompetition] Rounds input:', JSON.stringify(mutationInput.rounds, null, 2));
      console.log('[CreateCompetition] Players input:', JSON.stringify(mutationInput.players, null, 2));
      console.log('[CreateCompetition] Calling createCompetition.mutateAsync...');

      const result = await createCompetition.mutateAsync(mutationInput);
      console.log('[CreateCompetition] Competition created successfully:', result.competition.id);
      console.log('[CreateCompetition] Invite code:', result.inviteCode);
      console.log('[CreateCompetition] Rounds created:', result.rounds.length);

      // If prize pool is enabled, create it after competition creation
      if (step1.enablePrizePool && prizePoolConfig && user) {
        try {
          await createPrizePool.mutateAsync({
            competition_id: result.competition.id,
            funding_type: prizePoolConfig.fundingType,
            funding_amount: prizePoolConfig.fundingAmount,
            skins_allocation_percent: prizePoolConfig.skinsAllocationPercent,
            winner_allocation_percent: prizePoolConfig.winnerAllocationPercent,
            other_allocation_percent: prizePoolConfig.otherAllocationPercent,
            auto_split_skins: prizePoolConfig.autoSplitSkins,
            created_by: user.id,
            player_count: 0,
          });
        } catch (poolError) {
          console.warn('Failed to create prize pool:', poolError);
          showAlert(
            'Warning',
            'Competition created, but prize pool setup failed. You can configure it later from competition settings.'
          );
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
      console.error('[CreateCompetition] Failed to create competition:', error);
      console.error('[CreateCompetition] Error type:', typeof error);
      console.error('[CreateCompetition] Error name:', error instanceof Error ? error.name : 'N/A');
      console.error('[CreateCompetition] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[CreateCompetition] Error stack:', error instanceof Error ? error.stack : 'N/A');
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('[CreateCompetition] Error code:', (error as { code: unknown }).code);
      }
      if (error && typeof error === 'object' && 'details' in error) {
        console.error('[CreateCompetition] Error details:', (error as { details: unknown }).details);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('competition limit') || errorMessage.includes('cannot create more competitions')) {
        const targetTier = tier === 'free' ? 'social' : 'premium';
        const benefits = targetTier === 'social'
          ? [
              'Create up to 5 competitions',
              'Up to 16 players per competition',
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
