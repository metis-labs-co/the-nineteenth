/**
 * ViewRoundScreen - View a round (standalone or competition)
 *
 * @description
 * Displays round details with tabs:
 * - Details: Course info, tee time, match type, progress
 * - Scorecard: Read-only scorecard grid showing all players' scores
 *
 * Commented out tabs (for future use):
 * - Players: Player list with scores (Stableford points, birdies, pars, bogeys)
 * - Leaderboard: Round leaderboard
 *
 * Works for both standalone rounds (practice rounds) and competition rounds.
 */

import React from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, TouchableOpacity } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { IconDog } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, borderRadius, shadows, typography, skinsColor, wolfColor } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Tabs } from '@/components/common/Tabs';
import {
  RoundDetailsTab,
  RoundGameSetupTab,
  RoundScorecardTab,
} from '@/components/rounds/ViewRound';
import { ScoringPairsConfigBottomSheet } from '@/components/rounds/ViewRound/RoundDetailsTab/components';
import { SkinsConfigBottomSheet } from '@/components/skins';
import { CourseSelectionModal } from '../../admin/AddRoundScreen/components';
import { TagToLeagueBottomSheet } from '@/components/leagues/TagToLeagueBottomSheet';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
import { Pill } from '@/components/common/Pill';
import { COMPETITION_TYPE_LABELS } from '@/components/rounds/ViewRound/RoundDetailsTab/constants';
import type { Player, Hole } from '@/types';

import { useViewRoundScreen, type TabKey } from './useViewRoundScreen';
import { SkinsTab } from './tabs/SkinsTab';
import { WolfTab } from './tabs/WolfTab';
import { MatchTab } from './tabs/MatchTab';
import { ScrambleTeamScoreTab } from './tabs/ScrambleTeamScoreTab';
import { ScrambleLeaderboardTab } from './tabs/ScrambleLeaderboardTab';
import { ScrambleContributionsTab } from './tabs/ScrambleContributionsTab';
import { ShambleTeamScoresTab } from './tabs/ShambleTeamScoresTab';
import { StrokePlayLeaderboardTab } from './tabs/StrokePlayLeaderboardTab';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

export default function ViewRoundScreen(props: Props) {
  const vm = useViewRoundScreen(props);
  const colors = useThemeColors();

  // Get header title with icons for skins/wolf standalone rounds
  const getHeaderTitleNode = (): string | React.ReactNode => {
    if (vm.isStandalone) {
      if (vm.hasSkinsGame && vm.hasWolfGame) {
        return (
          <View style={styles.skinsHeaderTitle}>
            <Icon source="dice-multiple" size={20} color={skinsColor} />
            <IconDog size={20} color={wolfColor} />
            <Text style={[styles.skinsHeaderText, { color: colors.textPrimary }]}>
              Skins & Wolf
            </Text>
          </View>
        );
      }
      if (vm.hasSkinsGame) {
        return (
          <View style={styles.skinsHeaderTitle}>
            <Icon source="dice-multiple" size={20} color={skinsColor} />
            <Text style={[styles.skinsHeaderText, { color: colors.textPrimary }]}>
              Skins Match
            </Text>
          </View>
        );
      }
      if (vm.hasWolfGame) {
        return (
          <View style={styles.skinsHeaderTitle}>
            <IconDog size={20} color={wolfColor} />
            <Text style={[styles.skinsHeaderText, { color: colors.textPrimary }]}>
              Wolf Game
            </Text>
          </View>
        );
      }
    }
    return vm.getHeaderTitle();
  };

  // Loading state
  if (vm.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Round"
          variant="centered"
          showBack
          onBack={vm.handleBack}
        />
        <LoadingSpinner size="lg" message="Loading round..." />
      </View>
    );
  }

  // Error state
  if (vm.roundError || !vm.round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Round"
          variant="centered"
          showBack
          onBack={vm.handleBack}
        />
        <ErrorState
          title="Unable to load round"
          error={vm.roundError?.message || 'Round not found'}
          onRetry={vm.refetchRound}
        />
      </View>
    );
  }

  const { round } = vm;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title={getHeaderTitleNode()}
        subtitle={vm.competitionInfo?.name || undefined}
        variant="centered"
        showBack
        onBack={vm.handleBack}
        rightActions={
          vm.canDelete
            ? [
                {
                  icon: 'delete-outline',
                  onPress: vm.handleDeletePress,
                  accessibilityLabel: 'Delete round',
                  color: colors.error,
                },
              ]
            : undefined
        }
      />

      {/* Score Round Button */}
      {vm.isUserPlaying && round.status !== 'completed' && (
        <View style={[styles.scoreButtonContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.scoreButton, { backgroundColor: colors.primary }]}
            onPress={vm.handleScoreRound}
            activeOpacity={0.8}
            accessibilityLabel="Score this round"
            accessibilityRole="button"
          >
            <Icon source="golf" size={20} color={colors.textInverse} />
            <Text style={[styles.scoreButtonText, { color: colors.textInverse }]}>
              {round.status === 'in-progress' ? 'Continue Scoring' : 'Score Round'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tag to League Button */}
      {vm.canTagToLeague && round.status === 'completed' && (
        <View style={[styles.scoreButtonContainer, { backgroundColor: colors.surface }]}>
          <FeatureLockCompact
            feature="join_league"
            onUpgradePress={vm.handleNavigateToSubscription}
          >
            <TouchableOpacity
              style={[styles.tagLeagueButton, { borderColor: colors.primary }]}
              onPress={vm.handleTagLeagueSheetOpen}
              activeOpacity={0.8}
              accessibilityLabel="Tag to league"
              accessibilityRole="button"
            >
              <Icon source="trophy-outline" size={20} color={colors.primary} />
              <Text style={[styles.scoreButtonText, { color: colors.primary }]}>
                Tag to League
              </Text>
            </TouchableOpacity>
          </FeatureLockCompact>
        </View>
      )}

      {/* Competition Card - Show above tabs for competition rounds */}
      {round.competition && (
        <TouchableOpacity
          style={[styles.competitionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={vm.handleCompetitionPress}
          activeOpacity={0.7}
        >
          <View style={[styles.competitionIconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="trophy" size={24} color={colors.primary} />
          </View>
          <View style={styles.competitionInfo}>
            <Text style={[styles.competitionLabel, { color: colors.textSecondary }]}>
              Competition
            </Text>
            <Text style={[styles.competitionName, { color: colors.textPrimary }]} numberOfLines={1}>
              {round.competition.name}
            </Text>
          </View>
          <View style={styles.competitionRight}>
            <Pill
              label={COMPETITION_TYPE_LABELS[round.competition.competition_type]}
              variant="primary"
              size="sm"
            />
            <Icon source="chevron-right" size={24} color={colors.gray400} />
          </View>
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      <Tabs<TabKey>
        tabs={vm.tabs}
        selectedTab={vm.activeTab}
        onTabChange={vm.setActiveTab}
        style={styles.tabs}
      />

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.handleRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {vm.activeTab === 'details' && (
          <RoundDetailsTab
            round={round}
            isOrganizer={vm.isOrganizer}
            onEditPress={vm.handleEditRound}
            onCourseSelectPress={vm.handleCourseSelectPress}
          />
        )}
        {vm.activeTab === 'gameSetup' && (
          <RoundGameSetupTab
            round={round}
            isOrganizer={vm.isOrganizer}
            players={(vm.roundPlayers || []) as Player[]}
            onScoringPairsEditPress={vm.handleScoringPairsEditPress}
            onSkinsEditPress={vm.handleSkinsEditPress}
          />
        )}
        {vm.activeTab === 'scorecard' && (
          <RoundScorecardTab
            scorecards={vm.scorecards || []}
            roundPlayers={vm.roundPlayers || []}
            holes={round.course?.holes || null}
            onPlayerPress={vm.handlePlayerPress}
            selectedTeeData={round.selected_tee}
          />
        )}
        {vm.activeTab === 'match' && (vm.isMatchPlayRound || vm.isTeamMatchPlayRound) && (
          <MatchTab
            isMatchPlayRound={vm.isMatchPlayRound}
            isTeamMatchPlayRound={vm.isTeamMatchPlayRound}
            matchPlayPlayers={vm.matchPlayPlayers}
            holes={round.course?.holes || null}
            getPlayerScore={vm.getPlayerScore}
            matchPlayData={vm.matchPlayData}
            currentUserId={vm.user?.id}
            roundStatus={round.status}
            isTeamRound={round.is_team_round || false}
          />
        )}
        {vm.activeTab === 'skins' && vm.hasSkinsGame && vm.activeSkinsGame && (
          <SkinsTab
            results={vm.skinsResults || []}
            potType={vm.activeSkinsGame.pot_type}
            potValue={vm.activeSkinsGame.pot_value}
            scoringType={vm.activeSkinsGame.scoring_type}
            participants={vm.activeSkinsGame.participants}
            isTeamSkins={vm.isTeamSkins}
            teams={vm.skinsTeams}
            parValues={
              Array.isArray(round.course?.holes)
                ? round.course.holes.reduce(
                    (acc, hole) => ({ ...acc, [hole.number]: hole.par }),
                    {} as Record<number, number>
                  )
                : {}
            }
          />
        )}
        {vm.activeTab === 'wolf' && vm.hasWolfGame && (
          <WolfTab
            wolfSummary={vm.wolfSummary}
            hasWolfGame={vm.hasWolfGame}
          />
        )}
        {vm.activeTab === 'leaderboard' && vm.isStrokePlayRound && (
          <StrokePlayLeaderboardTab
            players={vm.strokePlayPlayers}
            holes={round.course?.holes as Hole[] || []}
            getPlayerScore={vm.getStrokePlayPlayerScore}
            currentUserId={vm.user?.id}
          />
        )}
        {vm.activeTab === 'teamScores' && vm.isShambleRound && (
          <ShambleTeamScoresTab
            shamblePlayers={vm.shamblePlayers}
            getShambleTeamScore={vm.getShambleTeamScore}
            totalHoles={round.course?.holes?.length || 18}
            getShamblePlayerScore={vm.getShamblePlayerScore}
            holes={round.course?.holes || undefined}
          />
        )}
        {vm.activeTab === 'scrambleTeamScore' && vm.isScrambleRound && (
          <ScrambleTeamScoreTab
            holes={round.course?.holes || null}
            scrambleTeams={vm.scrambleTeams}
            selectedTeamIndex={vm.selectedTeamIndex}
            onSelectTeam={vm.setSelectedTeamIndex}
            getTeamPlayersByIndex={vm.getScrambleTeamPlayersByIndex}
            getTeamHandicapByIndex={vm.getScrambleTeamHandicapByIndex}
            getTeamScoreByIndex={vm.getScrambleTeamScoreByIndex}
          />
        )}
        {vm.activeTab === 'scrambleLeaderboard' && vm.isScrambleRound && (
          <ScrambleLeaderboardTab
            holes={round.course?.holes || null}
            scrambleTeams={vm.scrambleTeams}
            allScramblePlayers={vm.allScramblePlayers}
            getTeamScoreByIndex={vm.getScrambleTeamScoreByIndex}
            currentUserId={vm.user?.id}
          />
        )}
        {vm.activeTab === 'scrambleContributions' && vm.isScrambleRound && (
          <ScrambleContributionsTab
            scrambleTeams={vm.scrambleTeams}
            selectedTeamIndex={vm.selectedTeamIndex}
            onSelectTeam={vm.setSelectedTeamIndex}
            getTeamPlayersByIndex={vm.getScrambleTeamPlayersByIndex}
            getTeamScoreByIndex={vm.getScrambleTeamScoreByIndex}
            totalHoles={round.course?.holes?.length || 18}
          />
        )}
      </ScrollView>

      {/* Modals and Bottom Sheets - rendered last to appear on top */}
      <ConfirmationDialog
        visible={vm.showDeleteDialog}
        title="Delete Round"
        message={vm.getDeleteMessage()}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={vm.handleDeleteConfirm}
        onCancel={vm.handleDeleteCancel}
        loading={vm.isDeleting}
        icon="delete-outline"
      />

      <CourseSelectionModal
        visible={vm.showCourseModal}
        onClose={vm.handleCourseModalClose}
        onSelect={vm.handleCourseSelect}
        searchQuery={vm.courseSearchQuery}
        onSearchQueryChange={vm.setCourseSearchQuery}
      />

      <ScoringPairsConfigBottomSheet
        visible={vm.showScoringPairsSheet}
        onDismiss={vm.handleScoringPairsSheetClose}
        roundId={vm.roundId}
        competitionId={vm.competitionId}
        scoringPairsRequired={round?.scoring_pairs_required ?? false}
      />

      <SkinsConfigBottomSheet
        visible={vm.showSkinsConfigSheet}
        onDismiss={vm.handleSkinsConfigClose}
        initialConfig={
          vm.skinsGames?.[0]
            ? {
                pot_type: vm.skinsGames[0].pot_type,
                pot_value: vm.skinsGames[0].pot_value,
                scoring_type: vm.skinsGames[0].scoring_type,
                currency: vm.skinsGames[0].currency,
              }
            : null
        }
        onSave={vm.handleSkinsConfigSave}
      />

      {/* Tag to League Bottom Sheet */}
      {vm.userScorecardId && (
        <TagToLeagueBottomSheet
          visible={vm.showTagLeagueSheet}
          onClose={vm.handleTagLeagueSheetClose}
          scorecardId={vm.userScorecardId}
        />
      )}

      {/* Alert Dialog */}
      <ConfirmationDialog {...vm.dialogConfig} onCancel={vm.dismissDialog} />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Score Button
  scoreButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    gap: spacing.sm,
    ...shadows.sm,
  },
  tagLeagueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    gap: spacing.sm,
    borderWidth: 1.5,
  },
  scoreButtonText: {
    ...typography.bodyBold,
  },

  // Competition Card (above tabs)
  competitionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  competitionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  competitionLabel: {
    ...typography.caption,
  },
  competitionName: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  competitionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Tabs
  tabs: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Skins Header Title
  skinsHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skinsHeaderText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
});
