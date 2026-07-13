/**
 * ScoringSetupStep - Fifth step in the create round wizard
 *
 * Orchestrator component that manages the overall state and renders
 * each configuration section:
 * - RoundSummary: Course, tee, game type, player count banner
 * - ScoringPairsSection: Toggle and configure scoring pairs (Premium)
 * - TeamFormationSection: Team formation for team game types
 * - SkinsSection: Skins game toggle and configuration (Premium)
 * - WolfSection: Wolf game toggle and configuration (Premium)
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { IconGolf } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useCheckFeature } from '@/context/SubscriptionContext';
import type { TeeBox, GameType } from '@/types/database.types';
import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { SelectedCourse, PlayingPartner, ScrambleTeam } from '../../types';

import { RoundSummary } from './RoundSummary';
import { HandicapSourceSection } from './HandicapSourceSection';
import { ScoringPairsSection } from './ScoringPairsSection';
import { TeamFormationSection } from './TeamFormationSection';
import { SkinsSection } from './SkinsSection';
import { WolfSection } from './WolfSection';

interface ScoringSetupStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  /** Which holes are being played — drives 9-hole daily handicap calculation */
  nineType: NineType;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  // Scoring pairs
  scoringPairsEnabled: boolean;
  scoringPairs: ScoringPairCreateInput[];
  onScoringPairsEnabledChange: (enabled: boolean) => void;
  onScoringPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;
  // Teams (scramble format)
  teams: ScrambleTeam[];
  teamsLocked: boolean;
  splitIntoTeams: boolean;
  onShuffleTeams: () => void;
  onSplitIntoTeamsChange: (enabled: boolean) => void;
  // Skins game
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  onSkinsEnabledChange: (enabled: boolean) => void;
  onSkinsConfigChange: (config: SkinsConfig) => void;
  // Wolf game
  wolfEnabled: boolean;
  wolfConfig: WolfConfig | null;
  onWolfEnabledChange: (enabled: boolean) => void;
  onWolfConfigChange: (config: WolfConfig) => void;
  // Handicap source
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  // Actions
  onStartScoring: () => void;
  /** Callback to refresh course/tee data */
  onRefreshCourseData?: () => void;
  /** Whether course data is currently refreshing */
  isRefreshingCourseData?: boolean;
}

export const ScoringSetupStep = memo(function ScoringSetupStep({
  selectedCourse,
  selectedTee,
  nineType,
  selectedMatchType,
  selectedPartners,
  scoringPairsEnabled,
  scoringPairs,
  onScoringPairsEnabledChange,
  onScoringPairsChange,
  teams,
  teamsLocked,
  splitIntoTeams,
  onShuffleTeams,
  onSplitIntoTeamsChange,
  skinsEnabled,
  skinsConfig,
  onSkinsEnabledChange,
  onSkinsConfigChange,
  wolfEnabled,
  wolfConfig,
  onWolfEnabledChange,
  onWolfConfigChange,
  handicapSource,
  onHandicapSourceChange,
  onStartScoring,
  onRefreshCourseData,
  isRefreshingCourseData,
}: ScoringSetupStepProps) {
  const colors = useThemeColors();
  const { player, user } = useAuth();
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('scoring_pairs').allowed;
  const isPremiumSkins = checkFeature('skins_game').allowed;
  const isPremiumWolf = checkFeature('wolf_game').allowed;

  // Track whether skins config sheet is open (disables start button)
  const [skinsConfigSheetOpen, setSkinsConfigSheetOpen] = useState(false);

  const handleSkinsConfigSheetVisibleChange = useCallback((visible: boolean) => {
    setSkinsConfigSheetOpen(visible);
  }, []);

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Course & Partners Banner */}
        <RoundSummary
          selectedCourse={selectedCourse}
          selectedTee={selectedTee}
          selectedMatchType={selectedMatchType}
          selectedPartners={selectedPartners}
        />

        {/* Scoring Configuration Section */}
        <View style={styles.scoringSetupContainer}>
          <Text style={[styles.scoringSetupTitle, { color: colors.textSecondary }]}>
            Scoring Configuration
          </Text>

          {/* Handicap Mode - Premium Feature */}
          <HandicapSourceSection
            handicapSource={handicapSource}
            onHandicapSourceChange={onHandicapSourceChange}
            selectedTee={selectedTee}
            holes={selectedCourse?.holes}
            nineType={nineType}
            selectedPartners={selectedPartners}
            onRefreshCourseData={onRefreshCourseData}
            isRefreshing={isRefreshingCourseData}
          />

          {/* Scoring Pairs Toggle - Premium Feature */}
          <ScoringPairsSection
            isPremium={isPremium}
            scoringPairsEnabled={scoringPairsEnabled}
            scoringPairs={scoringPairs}
            selectedPartners={selectedPartners}
            onScoringPairsEnabledChange={onScoringPairsEnabledChange}
            onScoringPairsChange={onScoringPairsChange}
          />

          {/* Team Formation */}
          <TeamFormationSection
            selectedMatchType={selectedMatchType}
            selectedPartners={selectedPartners}
            teams={teams}
            teamsLocked={teamsLocked}
            splitIntoTeams={splitIntoTeams}
            onShuffleTeams={onShuffleTeams}
            onSplitIntoTeamsChange={onSplitIntoTeamsChange}
          />

          {/* Skins Game */}
          <SkinsSection
            isPremiumSkins={isPremiumSkins}
            skinsEnabled={skinsEnabled}
            skinsConfig={skinsConfig}
            selectedPartners={selectedPartners}
            selectedMatchType={selectedMatchType}
            splitIntoTeams={splitIntoTeams}
            teams={teams}
            onSkinsEnabledChange={onSkinsEnabledChange}
            onSkinsConfigChange={onSkinsConfigChange}
            onConfigSheetVisibleChange={handleSkinsConfigSheetVisibleChange}
          />

          {/* Wolf Game */}
          <WolfSection
            isPremiumWolf={isPremiumWolf}
            wolfEnabled={wolfEnabled}
            wolfConfig={wolfConfig}
            selectedPartners={selectedPartners}
            currentUserId={player?.id ?? user?.id ?? 'current-user'}
            currentUserName={player?.name ?? user?.email?.split('@')[0] ?? 'You'}
            currentUserHandicap={player?.handicap ?? null}
            onWolfEnabledChange={onWolfEnabledChange}
            onWolfConfigChange={onWolfConfigChange}
          />
        </View>
      </ScrollView>

      {/* Start Scoring Button */}
      {/* Disabled while skins config sheet is open to require confirmation first */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: skinsConfigSheetOpen ? colors.surfaceVariant : colors.primary,
              opacity: skinsConfigSheetOpen ? 0.6 : 1,
            },
          ]}
          onPress={onStartScoring}
          disabled={skinsConfigSheetOpen}
          activeOpacity={0.8}
        >
          <IconGolf size={20} color={skinsConfigSheetOpen ? colors.textDisabled : colors.white} />
          <Text style={[styles.startButtonText, { color: skinsConfigSheetOpen ? colors.textDisabled : colors.white }]}>
            {selectedPartners.length > 0
              ? `Start Scoring (${selectedPartners.length + 1} players)`
              : 'Start Solo Round'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  scoringSetupContainer: {
    paddingHorizontal: spacing.lg,
  },
  scoringSetupTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  startButtonText: {
    ...typography.bodyBold,
  },
});
