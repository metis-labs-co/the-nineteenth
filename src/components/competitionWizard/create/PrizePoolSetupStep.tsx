/**
 * PrizePoolSetupStep - Prize pool configuration step for the create-competition wizard
 *
 * Always-shown step that lets the organizer configure either, both, or
 * neither prize pool (Individual / Team). Uses `PrizePoolDualConfig`
 * for the editor surface so the UX matches the post-creation editor.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { PrizePoolConfigFormData } from '@/schemas/competition';
import { PrizePoolDualConfig, type PrizePoolConfig } from '@/components/prizePool';
import type { WizardPrizePoolConfig } from '@/screens/admin/CreateCompetitionScreen/types';

// Local form shape — mirrors EditPrizePoolBottomSheet's PrizePoolFormConfig
interface SideDraft {
  enabled: boolean;
  fundingType: PrizePoolConfigFormData['fundingType'];
  fundingAmount: PrizePoolConfigFormData['fundingAmount'];
  placements: PrizePoolConfigFormData['placements'];
}

const DEFAULT_DRAFT: SideDraft = {
  enabled: false,
  fundingType: 'per_player',
  fundingAmount: 50,
  placements: [
    { position: 1, percent: 60 },
    { position: 2, percent: 30 },
    { position: 3, percent: 10 },
  ],
};

export interface PrizePoolSetupStepProps {
  /** Existing wizard draft (both sides). Either side may be null. */
  initialData?: WizardPrizePoolConfig;
  /** Number of players (per-player funding math + individual placement cap) */
  playerCount?: number;
  /** Number of rounds (passed through) */
  roundCount: number;
  /** Whether step 1 enabled teams — controls team tab availability */
  enableTeams: boolean;
  /** Handler when the step is completed */
  onComplete: (data: WizardPrizePoolConfig) => void;
  /** Handler for back navigation */
  onBack: () => void;
}

function configFromDraft(draft: SideDraft): PrizePoolConfigFormData {
  return {
    fundingType: draft.fundingType,
    fundingAmount: draft.fundingAmount,
    placements: draft.placements,
  };
}

function draftFromConfig(config: PrizePoolConfigFormData | null): SideDraft {
  if (!config) return DEFAULT_DRAFT;
  return {
    enabled: true,
    fundingType: config.fundingType,
    fundingAmount: config.fundingAmount,
    placements: config.placements,
  };
}

function isValidDraft(draft: SideDraft): boolean {
  if (!draft.enabled) return true; // disabled side is always valid
  const sum = draft.placements.reduce((acc, p) => acc + p.percent, 0);
  return Math.abs(sum - 100) < 0.01 && draft.fundingAmount > 0;
}

export function PrizePoolSetupStep({
  initialData,
  playerCount = 0,
  roundCount,
  enableTeams,
  onComplete,
  onBack,
}: PrizePoolSetupStepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const teamCount = enableTeams ? Math.floor(playerCount / 2) : 0;

  const [individualDraft, setIndividualDraft] = useState<SideDraft>(() =>
    draftFromConfig(initialData?.individual ?? null)
  );
  const [teamDraft, setTeamDraft] = useState<SideDraft>(() =>
    draftFromConfig(initialData?.team ?? null)
  );

  const handleIndividualChange = useCallback((next: PrizePoolConfig | null) => {
    if (next === null) {
      setIndividualDraft((prev) => ({ ...prev, enabled: false }));
    } else {
      setIndividualDraft({
        enabled: true,
        fundingType: next.fundingType,
        fundingAmount: next.fundingAmount,
        placements: next.placements,
      });
    }
  }, []);

  const handleTeamChange = useCallback((next: PrizePoolConfig | null) => {
    if (next === null) {
      setTeamDraft((prev) => ({ ...prev, enabled: false }));
    } else {
      setTeamDraft({
        enabled: true,
        fundingType: next.fundingType,
        fundingAmount: next.fundingAmount,
        placements: next.placements,
      });
    }
  }, []);

  const isValid = isValidDraft(individualDraft) && isValidDraft(teamDraft);

  const handleComplete = useCallback(() => {
    if (!isValid) return;
    onComplete({
      individual: individualDraft.enabled ? configFromDraft(individualDraft) : null,
      team: enableTeams && teamDraft.enabled ? configFromDraft(teamDraft) : null,
    });
  }, [isValid, onComplete, individualDraft, teamDraft, enableTeams]);

  // PrizePoolDualConfig expects CompetitionPrizePool | null, but we don't have
  // a real pool here (pre-creation). Pass null so the section renders its
  // default initial config; PrizePoolSection's local state takes over.
  const individualPool = useMemo(() => null, []);
  const teamPool = useMemo(() => null, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Optionally configure prize pools for top finishers. You can configure
          either pool, both, or neither.
        </Text>

        <PrizePoolDualConfig
          playerCount={playerCount}
          teamCount={teamCount}
          roundCount={roundCount}
          teamModeAllowed={enableTeams}
          individualPool={individualPool}
          teamPool={teamPool}
          onIndividualChange={handleIndividualChange}
          onTeamChange={handleTeamChange}
          onUpgradePress={() => {}}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            backgroundColor: colors.surface,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { borderColor: colors.gray300, borderWidth: 1 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleComplete}
          style={[
            styles.nextButton,
            { backgroundColor: colors.primary },
            !isValid && { opacity: 0.5 },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={!isValid}
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>Next: Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  description: {
    ...typography.body,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default PrizePoolSetupStep;
