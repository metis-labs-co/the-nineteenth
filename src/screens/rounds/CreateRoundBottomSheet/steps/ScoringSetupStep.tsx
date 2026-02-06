/**
 * ScoringSetupStep - Fifth step in the create round wizard
 *
 * Features:
 * - Display summary of selections
 * - Configure scoring pairs (Premium feature)
 * - Configure skins game (Premium feature)
 * - Start the round
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  IconGolf,
  IconCheck,
  IconLock,
  IconArrowsExchange,
  IconDice,
  IconUsers,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ScoringPairFormationInline, TeamFormationInline } from '@/components/scoring';
import {
  SkinsConfigBottomSheet,
  SkinsDisclaimerModal,
  hasAcceptedSkinsDisclaimer,
} from '@/components/skins';
import {
  WolfConfigBottomSheet,
  WolfDisclaimerModal,
  hasAcceptedWolfDisclaimer,
} from '@/components/wolf';
import { IconDog, IconAlertCircle } from '@tabler/icons-react-native';
import { Switch, Divider } from 'react-native-paper';
import type { TeeBox, GameType } from '@/types/database.types';
import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { WolfConfig, WolfParticipant } from '@/types/database/wolf.types';
import type { SelectedCourse, PlayingPartner, ScrambleTeam } from '../types';
import { MATCH_TYPES } from '../types';
import { useAuth } from '@/hooks/useAuth';

/** Amber/gold color for skins feature */
const SKINS_AMBER = '#f59e0b';

/** Gray color for wolf feature */
const WOLF_COLOR = '#6B7280';

/** Team game types that require splitIntoTeams for skins */
const TEAM_GAME_TYPES: GameType[] = ['best-ball', 'scramble', 'shamble'];

/**
 * Check if skins can be enabled for the given game configuration
 * Team formats require splitIntoTeams=true with at least 2 teams to use skins
 */
function canEnableSkinsForGameType(
  gameType: GameType,
  splitIntoTeams: boolean,
  teamCount: number
): { canEnable: boolean; reason: string | null } {
  if (TEAM_GAME_TYPES.includes(gameType) && !splitIntoTeams) {
    return {
      canEnable: false,
      reason: 'Skins requires team mode for team formats. Enable "Split into Teams" above to use skins.',
    };
  }
  if (TEAM_GAME_TYPES.includes(gameType) && splitIntoTeams && teamCount < 2) {
    return {
      canEnable: false,
      reason: 'Skins requires at least 2 teams.',
    };
  }
  return { canEnable: true, reason: null };
}

interface ScoringSetupStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  isPremium: boolean;
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
  // Actions
  onStartScoring: () => void;
}

export const ScoringSetupStep = memo(function ScoringSetupStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  selectedPartners,
  isPremium,
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
  onStartScoring,
}: ScoringSetupStepProps) {
  const colors = useThemeColors();
  const { player, user } = useAuth();

  // Local state for skins modals
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showSkinsDisclaimer, setShowSkinsDisclaimer] = useState(false);

  // Local state for wolf modals
  const [showWolfConfigSheet, setShowWolfConfigSheet] = useState(false);
  const [showWolfDisclaimer, setShowWolfDisclaimer] = useState(false);

  // Skins is only available for 2+ players (current user + at least 1 partner)
  const hasEnoughPlayers = selectedPartners.length >= 1;

  // Check if skins is allowed for this game type and team count
  const skinsGameTypeValidation = canEnableSkinsForGameType(selectedMatchType, splitIntoTeams, teams.length);
  const canUseSkins = hasEnoughPlayers && skinsGameTypeValidation.canEnable;
  const skinsDisabledReason = !hasEnoughPlayers
    ? 'Skins requires at least 2 players'
    : skinsGameTypeValidation.reason;

  // Wolf requires exactly 3-4 players (including current user)
  // Total players = current user + selectedPartners
  const totalPlayers = selectedPartners.length + 1;

  // Build Wolf participants list for the config sheet
  const wolfParticipants: WolfParticipant[] = React.useMemo(() => {
    const currentUserParticipant: WolfParticipant = {
      id: player?.id ?? user?.id ?? 'current-user',
      name: player?.name ?? user?.email?.split('@')[0] ?? 'You',
      handicap: player?.handicap ?? null,
    };

    return [
      currentUserParticipant,
      ...selectedPartners.map((p) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap ?? null,
      })),
    ];
  }, [player, user, selectedPartners]);

  // Wolf validation - requires 3-4 players
  const hasValidWolfPlayerCount = totalPlayers >= 3 && totalPlayers <= 4;
  const wolfPlayerError = totalPlayers < 3
    ? 'Wolf requires at least 3 players'
    : totalPlayers > 4
      ? 'Wolf is limited to 4 players maximum'
      : null;

  /**
   * Handle wolf toggle press
   * Shows disclaimer on first use, then opens config sheet
   */
  const handleWolfToggle = useCallback(async () => {
    if (wolfEnabled) {
      // Disable wolf
      onWolfEnabledChange(false);
    } else {
      // Check if disclaimer has been accepted
      const accepted = await hasAcceptedWolfDisclaimer();
      if (accepted) {
        // Show config sheet directly
        setShowWolfConfigSheet(true);
      } else {
        // Show disclaimer first
        setShowWolfDisclaimer(true);
      }
    }
  }, [wolfEnabled, onWolfEnabledChange]);

  /**
   * Handle wolf disclaimer acceptance
   */
  const handleWolfDisclaimerAccept = useCallback(() => {
    setShowWolfDisclaimer(false);
    setShowWolfConfigSheet(true);
  }, []);

  /**
   * Handle wolf disclaimer cancel
   */
  const handleWolfDisclaimerCancel = useCallback(() => {
    setShowWolfDisclaimer(false);
  }, []);

  /**
   * Handle wolf config save
   */
  const handleWolfConfigSave = useCallback(
    (config: WolfConfig) => {
      onWolfConfigChange(config);
      onWolfEnabledChange(true);
      setShowWolfConfigSheet(false);
    },
    [onWolfConfigChange, onWolfEnabledChange]
  );

  /**
   * Handle wolf config sheet dismiss
   */
  const handleWolfConfigDismiss = useCallback(() => {
    setShowWolfConfigSheet(false);
  }, []);

  /**
   * Open wolf config sheet for editing
   */
  const handleEditWolfConfig = useCallback(() => {
    setShowWolfConfigSheet(true);
  }, []);

  /**
   * Handle skins toggle press
   * Shows disclaimer on first use, then opens config sheet
   */
  const handleSkinsToggle = useCallback(async () => {
    if (skinsEnabled) {
      // Disable skins
      onSkinsEnabledChange(false);
    } else {
      // Check if disclaimer has been accepted
      const accepted = await hasAcceptedSkinsDisclaimer();
      if (accepted) {
        // Show config sheet directly
        setShowSkinsConfigSheet(true);
      } else {
        // Show disclaimer first
        setShowSkinsDisclaimer(true);
      }
    }
  }, [skinsEnabled, onSkinsEnabledChange]);

  /**
   * Handle disclaimer acceptance
   * Opens config sheet after acceptance
   */
  const handleDisclaimerAccept = useCallback(() => {
    setShowSkinsDisclaimer(false);
    // Show config sheet after disclaimer accepted
    setShowSkinsConfigSheet(true);
  }, []);

  /**
   * Handle disclaimer cancel
   */
  const handleDisclaimerCancel = useCallback(() => {
    setShowSkinsDisclaimer(false);
  }, []);

  /**
   * Handle skins config save
   * Enables skins and stores the config
   */
  const handleSkinsConfigSave = useCallback(
    (config: SkinsConfig) => {
      // DEBUG: Log skins config being saved
      console.log('[ScoringSetupStep] handleSkinsConfigSave:', {
        config,
        partnersCount: selectedPartners.length,
      });
      onSkinsConfigChange(config);
      onSkinsEnabledChange(true);
      setShowSkinsConfigSheet(false);
    },
    [onSkinsConfigChange, onSkinsEnabledChange, selectedPartners.length]
  );

  /**
   * Handle skins config sheet dismiss (without save)
   */
  const handleSkinsConfigDismiss = useCallback(() => {
    setShowSkinsConfigSheet(false);
  }, []);

  /**
   * Open config sheet for editing existing config
   */
  const handleEditSkinsConfig = useCallback(() => {
    setShowSkinsConfigSheet(true);
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
        <View style={[styles.selectedBanner, { backgroundColor: colors.primaryLighter }]}>
          <IconGolf size={20} color={colors.primary} />
          <View style={styles.selectedBannerText}>
            <Text style={[styles.selectedBannerName, { color: colors.primaryDark }]}>
              {selectedCourse?.courseName}
              {selectedTee && (
                <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
              )}
            </Text>
            <Text style={[styles.selectedBannerLocation, { color: colors.primary }]}>
              {MATCH_TYPES.find((m) => m.value === selectedMatchType)?.label}
              {' · '}
              {selectedPartners.length + 1} players
            </Text>
          </View>
        </View>

        {/* Scoring Pairs Toggle - Premium Feature */}
        <View style={styles.scoringSetupContainer}>
        <Text style={[styles.scoringSetupTitle, { color: colors.textSecondary }]}>
          Scoring Configuration
        </Text>

        {/* Premium Toggle */}
        {isPremium ? (
          <TouchableOpacity
            style={[
              styles.scoringPairsToggle,
              {
                backgroundColor: colors.surface,
                borderColor: scoringPairsEnabled ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onScoringPairsEnabledChange(!scoringPairsEnabled)}
            activeOpacity={0.7}
          >
            <View style={styles.scoringPairsToggleContent}>
              <View
                style={[
                  styles.scoringPairsIconContainer,
                  { backgroundColor: scoringPairsEnabled ? colors.primaryLighter : colors.gray100 },
                ]}
              >
                <IconArrowsExchange
                  size={20}
                  color={scoringPairsEnabled ? colors.primary : colors.gray400}
                />
              </View>
              <View style={styles.scoringPairsToggleText}>
                <Text style={[styles.scoringPairsToggleLabel, { color: colors.textPrimary }]}>
                  Require Scoring Pairs
                </Text>
                <Text style={[styles.scoringPairsToggleDescription, { color: colors.textSecondary }]}>
                  Specify which players score each other
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: scoringPairsEnabled ? colors.primary : colors.surface,
                  borderColor: scoringPairsEnabled ? colors.primary : colors.gray300,
                },
              ]}
            >
              {scoringPairsEnabled && <IconCheck size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.scoringPairsToggle,
              styles.scoringPairsToggleLocked,
              { backgroundColor: colors.gray100, borderColor: colors.gray200 },
            ]}
          >
            <View style={styles.scoringPairsToggleContent}>
              <View style={[styles.scoringPairsIconContainer, { backgroundColor: colors.gray200 }]}>
                <IconLock size={20} color={colors.gray500} />
              </View>
              <View style={styles.scoringPairsToggleText}>
                <View style={styles.scoringPairsLabelRow}>
                  <Text style={[styles.scoringPairsToggleLabel, { color: colors.textSecondary }]}>
                    Require Scoring Pairs
                  </Text>
                  <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                    <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>Premium</Text>
                  </View>
                </View>
                <Text style={[styles.scoringPairsToggleDescription, { color: colors.textTertiary }]}>
                  Upgrade to Premium to assign designated markers
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Inline Scoring Pair Formation (when enabled) */}
        {scoringPairsEnabled && selectedPartners.length > 0 && (
          <View style={styles.scoringPairsFormation}>
            <ScoringPairFormationInline
              players={[
                // Current user (placeholder - RoundListScreen will add actual user)
                { id: 'current-user', name: 'You' },
                ...selectedPartners.map((p) => ({
                  id: p.id,
                  name: p.name,
                  handicap: p.handicap,
                })),
              ]}
              pairs={scoringPairs}
              onPairsChange={onScoringPairsChange}
            />
          </View>
        )}

        {/* Info for solo rounds with scoring pairs enabled */}
        {scoringPairsEnabled && selectedPartners.length === 0 && (
          <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
            <Text style={[styles.infoText, { color: colors.infoDark }]}>
              Scoring pairs require at least one playing partner
            </Text>
          </View>
        )}

        {/* Teams Section - Best Ball: auto-show teams with 2+ players, Scramble/Shamble: show toggle for 4+ players */}
        {/* Best Ball: Always show teams (no toggle) when there are partners */}
        {selectedMatchType === 'best-ball' && selectedPartners.length >= 1 && teams.length > 0 && (
          <>
            {/* Divider */}
            <View style={[styles.teamsDivider, { backgroundColor: colors.border }]} />

            {/* Team Formation Display (auto-enabled for Best Ball) */}
            <View style={styles.teamsFormation}>
              <TeamFormationInline
                teams={teams}
                onShuffle={onShuffleTeams}
                locked={teamsLocked}
              />
            </View>
          </>
        )}

        {/* Scramble/Shamble/Match Play: Show toggle for 3+ total players (2+ partners) */}
        {(selectedMatchType === 'scramble' || selectedMatchType === 'shamble' || selectedMatchType === 'match-play') && selectedPartners.length >= 2 && (
          <>
            {/* Divider */}
            <View style={[styles.teamsDivider, { backgroundColor: colors.border }]} />

            {/* Split into Teams Toggle */}
            <TouchableOpacity
              style={[
                styles.teamsToggle,
                {
                  backgroundColor: colors.surface,
                  borderColor: splitIntoTeams ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSplitIntoTeamsChange(!splitIntoTeams)}
              activeOpacity={0.7}
            >
              <View style={styles.teamsToggleContent}>
                <View
                  style={[
                    styles.teamsIconContainer,
                    { backgroundColor: splitIntoTeams ? colors.primaryLighter : colors.gray100 },
                  ]}
                >
                  <IconUsers
                    size={20}
                    color={splitIntoTeams ? colors.primary : colors.gray400}
                  />
                </View>
                <View style={styles.teamsToggleText}>
                  <Text style={[styles.teamsToggleLabel, { color: colors.textPrimary }]}>
                    Split into Teams
                  </Text>
                  <Text style={[styles.teamsToggleDescription, { color: colors.textSecondary }]}>
                    {splitIntoTeams
                      ? teams.length > 0
                        ? `${teams.map((t) => t.members.length).join(' vs ')} split`
                        : 'Players divided into teams'
                      : selectedMatchType === 'match-play'
                        ? 'Individual match play (no teams)'
                        : 'All players as one team (default)'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: splitIntoTeams ? colors.primary : colors.surface,
                    borderColor: splitIntoTeams ? colors.primary : colors.gray300,
                  },
                ]}
              >
                {splitIntoTeams && <IconCheck size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>

            {/* Team Formation Display (when split is enabled) */}
            {splitIntoTeams && teams.length > 0 && (
              <View style={styles.teamsFormation}>
                <TeamFormationInline
                  teams={teams}
                  onShuffle={onShuffleTeams}
                  locked={teamsLocked}
                />
              </View>
            )}
          </>
        )}

        {/* Skins Game Section - Show for 2+ players or show disabled state for team formats */}
        {(hasEnoughPlayers) && (
          <>
            {/* Divider */}
            <View style={[styles.skinsDivider, { backgroundColor: colors.border }]} />

            {/* Skins Toggle - Disabled for team formats without team mode */}
            {!canUseSkins && skinsDisabledReason && isPremium ? (
              <View
                style={[
                  styles.skinsToggle,
                  styles.skinsToggleLocked,
                  { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                ]}
              >
                <View style={styles.skinsToggleContent}>
                  <View style={[styles.skinsIconContainer, { backgroundColor: colors.gray200 }]}>
                    <IconDice size={20} color={colors.gray400} />
                  </View>
                  <View style={styles.skinsToggleText}>
                    <Text style={[styles.skinsToggleLabel, { color: colors.textSecondary }]}>
                      Add Skins Game
                    </Text>
                    <Text style={[styles.skinsToggleDescription, { color: colors.textTertiary }]}>
                      {skinsDisabledReason}
                    </Text>
                  </View>
                </View>
              </View>
            ) : isPremium ? (
              <TouchableOpacity
                style={[
                  styles.skinsToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: skinsEnabled ? SKINS_AMBER : colors.border,
                  },
                ]}
                onPress={handleSkinsToggle}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityState={{ checked: skinsEnabled }}
                accessibilityLabel={skinsEnabled ? 'Skins game enabled' : 'Enable skins game'}
                accessibilityHint="Hole-by-hole betting between players"
              >
                <View style={styles.skinsToggleContent}>
                  <View
                    style={[
                      styles.skinsIconContainer,
                      { backgroundColor: skinsEnabled ? `${SKINS_AMBER}20` : colors.gray100 },
                    ]}
                  >
                    <IconDice
                      size={20}
                      color={skinsEnabled ? SKINS_AMBER : colors.gray400}
                    />
                  </View>
                  <View style={styles.skinsToggleText}>
                    <Text style={[styles.skinsToggleLabel, { color: colors.textPrimary }]}>
                      Add Skins Game
                    </Text>
                    <Text style={[styles.skinsToggleDescription, { color: colors.textSecondary }]}>
                      Hole-by-hole betting between players
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: skinsEnabled ? SKINS_AMBER : colors.surface,
                      borderColor: skinsEnabled ? SKINS_AMBER : colors.gray300,
                    },
                  ]}
                >
                  {skinsEnabled && <IconCheck size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            ) : (
              /* Locked state for non-premium users */
              <View
                style={[
                  styles.skinsToggle,
                  styles.skinsToggleLocked,
                  { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                ]}
              >
                <View style={styles.skinsToggleContent}>
                  <View style={[styles.skinsIconContainer, { backgroundColor: colors.gray200 }]}>
                    <IconLock size={20} color={colors.gray500} />
                  </View>
                  <View style={styles.skinsToggleText}>
                    <View style={styles.skinsLabelRow}>
                      <Text style={[styles.skinsToggleLabel, { color: colors.textSecondary }]}>
                        Add Skins Game
                      </Text>
                      <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                        <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>
                          Premium
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.skinsToggleDescription, { color: colors.textTertiary }]}>
                      Upgrade to Premium for skins betting
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Skins Config Summary (when enabled) */}
            {skinsEnabled && skinsConfig && (
              <TouchableOpacity
                style={[styles.skinsConfigSummary, { backgroundColor: `${SKINS_AMBER}10`, borderColor: `${SKINS_AMBER}40` }]}
                onPress={handleEditSkinsConfig}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit skins configuration"
                accessibilityHint={`Current config: $${skinsConfig.pot_value} ${skinsConfig.pot_type === 'per_hole' ? 'per hole' : 'total pot'}, ${skinsConfig.scoring_type} scoring`}
              >
                <View style={styles.skinsConfigSummaryContent}>
                  <View style={styles.skinsConfigRow}>
                    <Text style={[styles.skinsConfigLabel, { color: colors.textSecondary }]}>
                      Pot:
                    </Text>
                    <Text style={[styles.skinsConfigValue, { color: colors.textPrimary }]}>
                      ${skinsConfig.pot_value}{skinsConfig.pot_type === 'per_hole' ? '/hole' : ' total'}
                    </Text>
                  </View>
                  <View style={styles.skinsConfigRow}>
                    <Text style={[styles.skinsConfigLabel, { color: colors.textSecondary }]}>
                      Scoring:
                    </Text>
                    <Text style={[styles.skinsConfigValue, { color: colors.textPrimary }]}>
                      {skinsConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.skinsConfigTapHint, { color: SKINS_AMBER }]}>
                  Tap to edit
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Wolf Game Section - Premium feature, requires 3-4 players */}
        <Divider style={[styles.wolfDivider, { backgroundColor: colors.gray200 }]} />

        {isPremium ? (
          <>
            {/* Wolf Toggle - Disabled if wrong player count */}
            {!hasValidWolfPlayerCount ? (
              <View
                style={[
                  styles.wolfToggle,
                  styles.wolfToggleLocked,
                  { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                ]}
              >
                <View style={styles.wolfToggleContent}>
                  <View style={[styles.wolfIconContainer, { backgroundColor: colors.gray200 }]}>
                    <IconDog size={20} color={colors.gray400} />
                  </View>
                  <View style={styles.wolfToggleText}>
                    <Text style={[styles.wolfToggleLabel, { color: colors.textSecondary }]}>
                      Add Wolf Game
                    </Text>
                    <Text style={[styles.wolfToggleDescription, { color: colors.textTertiary }]}>
                      {wolfPlayerError}. Current: {totalPlayers} players
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.wolfToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: wolfEnabled ? WOLF_COLOR : colors.border,
                  },
                ]}
                onPress={handleWolfToggle}
                activeOpacity={0.7}
                accessibilityRole="switch"
                accessibilityState={{ checked: wolfEnabled }}
                accessibilityLabel={wolfEnabled ? 'Wolf game enabled' : 'Enable wolf game'}
                accessibilityHint="Strategic partner selection side-game"
              >
                <View style={styles.wolfToggleContent}>
                  <View
                    style={[
                      styles.wolfIconContainer,
                      { backgroundColor: wolfEnabled ? `${WOLF_COLOR}20` : colors.gray100 },
                    ]}
                  >
                    <IconDog
                      size={20}
                      color={wolfEnabled ? WOLF_COLOR : colors.gray400}
                    />
                  </View>
                  <View style={styles.wolfToggleText}>
                    <Text style={[styles.wolfToggleLabel, { color: colors.textPrimary }]}>
                      Add Wolf Game
                    </Text>
                    <Text style={[styles.wolfToggleDescription, { color: colors.textSecondary }]}>
                      Strategic partner selection side-game
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: wolfEnabled ? WOLF_COLOR : colors.surface,
                      borderColor: wolfEnabled ? WOLF_COLOR : colors.gray300,
                    },
                  ]}
                >
                  {wolfEnabled && <IconCheck size={14} color={colors.white} />}
                </View>
              </TouchableOpacity>
            )}

            {/* Wolf Config Summary (when enabled) */}
            {wolfEnabled && wolfConfig && (
              <TouchableOpacity
                style={[styles.wolfConfigSummary, { backgroundColor: `${WOLF_COLOR}10`, borderColor: `${WOLF_COLOR}40` }]}
                onPress={handleEditWolfConfig}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit wolf configuration"
              >
                <View style={styles.wolfConfigSummaryContent}>
                  <View style={styles.wolfConfigRow}>
                    <Text style={[styles.wolfConfigLabel, { color: colors.textSecondary }]}>
                      Scoring:
                    </Text>
                    <Text style={[styles.wolfConfigValue, { color: colors.textPrimary }]}>
                      {wolfConfig.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                    </Text>
                  </View>
                  <View style={styles.wolfConfigRow}>
                    <Text style={[styles.wolfConfigLabel, { color: colors.textSecondary }]}>
                      Blind Wolf:
                    </Text>
                    <Text style={[styles.wolfConfigValue, { color: colors.textPrimary }]}>
                      {wolfConfig.blind_wolf_enabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                  {wolfConfig.pot_enabled && (
                    <View style={styles.wolfConfigRow}>
                      <Text style={[styles.wolfConfigLabel, { color: colors.textSecondary }]}>
                        Pot:
                      </Text>
                      <Text style={[styles.wolfConfigValue, { color: colors.textPrimary }]}>
                        ${wolfConfig.pot_value_per_point}/point
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.wolfConfigTapHint, { color: WOLF_COLOR }]}>
                  Tap to edit
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* Locked state for non-premium users */
          <View
            style={[
              styles.wolfToggle,
              styles.wolfToggleLocked,
              { backgroundColor: colors.gray100, borderColor: colors.gray200 },
            ]}
          >
            <View style={styles.wolfToggleContent}>
              <View style={[styles.wolfIconContainer, { backgroundColor: colors.gray200 }]}>
                <IconLock size={20} color={colors.gray500} />
              </View>
              <View style={styles.wolfToggleText}>
                <View style={styles.wolfLabelRow}>
                  <Text style={[styles.wolfToggleLabel, { color: colors.textSecondary }]}>
                    Add Wolf Game
                  </Text>
                  <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                    <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>
                      Premium
                    </Text>
                  </View>
                </View>
                <Text style={[styles.wolfToggleDescription, { color: colors.textTertiary }]}>
                  Upgrade to Premium for Wolf side-game
                </Text>
              </View>
            </View>
          </View>
        )}
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
              backgroundColor: showSkinsConfigSheet ? colors.surfaceVariant : colors.primary,
              opacity: showSkinsConfigSheet ? 0.6 : 1,
            },
          ]}
          onPress={onStartScoring}
          disabled={showSkinsConfigSheet}
          activeOpacity={0.8}
        >
          <IconGolf size={20} color={showSkinsConfigSheet ? colors.textDisabled : colors.white} />
          <Text style={[styles.startButtonText, { color: showSkinsConfigSheet ? colors.textDisabled : colors.white }]}>
            {selectedPartners.length > 0
              ? `Start Scoring (${selectedPartners.length + 1} players)`
              : 'Start Solo Round'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Skins Config Bottom Sheet - rendered last to stack above everything */}
      <SkinsConfigBottomSheet
        visible={showSkinsConfigSheet}
        onDismiss={handleSkinsConfigDismiss}
        initialConfig={skinsConfig}
        onSave={handleSkinsConfigSave}
        showBackdrop={false}
      />

      {/* Skins Disclaimer Modal */}
      <SkinsDisclaimerModal
        visible={showSkinsDisclaimer}
        onAccept={handleDisclaimerAccept}
        onCancel={handleDisclaimerCancel}
      />

      {/* Wolf Config Bottom Sheet - rendered at root to stack above everything */}
      <WolfConfigBottomSheet
        visible={showWolfConfigSheet}
        onDismiss={handleWolfConfigDismiss}
        initialConfig={wolfConfig}
        onSave={handleWolfConfigSave}
        participants={wolfParticipants}
        showBackdrop={false}
      />

      {/* Wolf Disclaimer Modal */}
      <WolfDisclaimerModal
        visible={showWolfDisclaimer}
        onAccept={handleWolfDisclaimerAccept}
        onCancel={handleWolfDisclaimerCancel}
      />
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
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
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
  scoringPairsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  scoringPairsToggleLocked: {
    opacity: 0.8,
  },
  scoringPairsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  scoringPairsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringPairsToggleText: {
    flex: 1,
  },
  scoringPairsToggleLabel: {
    ...typography.bodyBold,
  },
  scoringPairsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoringPairsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  scoringPairsFormation: {
    marginTop: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  // Teams styles
  teamsDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  teamsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  teamsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  teamsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamsToggleText: {
    flex: 1,
  },
  teamsToggleLabel: {
    ...typography.bodyBold,
  },
  teamsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  teamsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  teamsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamsHeaderTitle: {
    ...typography.bodyBold,
  },
  teamsHeaderSubtitle: {
    ...typography.caption,
  },
  teamsFormation: {
    marginTop: spacing.md,
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
  // Skins styles
  skinsDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  skinsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  skinsToggleLocked: {
    opacity: 0.8,
  },
  skinsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  skinsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skinsToggleText: {
    flex: 1,
  },
  skinsToggleLabel: {
    ...typography.bodyBold,
  },
  skinsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skinsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  skinsConfigSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skinsConfigSummaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  skinsConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skinsConfigLabel: {
    ...typography.small,
  },
  skinsConfigValue: {
    ...typography.smallBold,
  },
  skinsConfigTapHint: {
    ...typography.caption,
    fontWeight: '600',
  },
  // Wolf styles
  wolfDivider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  wolfToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  wolfToggleLocked: {
    opacity: 0.8,
  },
  wolfToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  wolfIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wolfToggleText: {
    flex: 1,
  },
  wolfToggleLabel: {
    ...typography.bodyBold,
  },
  wolfLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wolfToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  wolfConfigSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wolfConfigSummaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  wolfConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wolfConfigLabel: {
    ...typography.small,
  },
  wolfConfigValue: {
    ...typography.smallBold,
  },
  wolfConfigTapHint: {
    ...typography.caption,
    fontWeight: '600',
  },
});
