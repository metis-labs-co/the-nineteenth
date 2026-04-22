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
import { Tabs } from '@/components/common/Tabs';
import {
  RoundDetailsTab,
  RoundScorecardTab,
} from '@/components/rounds/ViewRound';
import { CourseSelectionModal } from '../../admin/AddRoundScreen/components';
import { TagToLeagueBottomSheet } from '@/components/leagues/TagToLeagueBottomSheet';
import { FeatureLockCompact } from '@/components/subscription/FeatureLockCompact';
import { Pill } from '@/components/common/Pill';
import { COMPETITION_TYPE_LABELS } from '@/components/rounds/ViewRound/RoundDetailsTab/constants';
import type { Hole } from '@/types';
import type { SkinsResultWithWinner } from '@/types/database/skins.types';

import { useViewRoundScreen, type TabKey } from './useViewRoundScreen';
import { EditStatsModal } from './EditStatsModal';
import { SkinsTab } from './tabs/SkinsTab';
import { WolfTab } from './tabs/WolfTab';
import { PayoutsTab } from './tabs/PayoutsTab';
import { MatchTab } from './tabs/MatchTab';
import { ScrambleTeamScoreTab } from './tabs/ScrambleTeamScoreTab';
import { ScrambleLeaderboardTab } from './tabs/ScrambleLeaderboardTab';
import { ScrambleContributionsTab } from './tabs/ScrambleContributionsTab';
import { ShambleTeamScoresTab } from './tabs/ShambleTeamScoresTab';
import { StatsTab } from './tabs/StatsTab';
import { StrokePlayLeaderboardTab } from './tabs/StrokePlayLeaderboardTab';
import { SubMatchesTab } from './tabs/SubMatchesTab';
import { TeamsTab } from './tabs/TeamsTab';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

export default function ViewRoundScreen(props: Props) {
  const vm = useViewRoundScreen(props);
  const colors = useThemeColors();
  const userScorecard = vm.scorecards?.find((sc) => sc.id === vm.userScorecardId);

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
          vm.isOrganizer
            ? [
                {
                  icon: 'cog-outline',
                  onPress: vm.handleSettingsPress,
                  accessibilityLabel: 'Round settings',
                },
              ]
            : undefined
        }
      />

      {/* Score Round Button */}
      {vm.isUserPlaying && !vm.userScorecardSubmitted && round.status !== 'completed' && (
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
            onCourseSelectPress={vm.handleCourseSelectPress}
            onUpgradePress={vm.handleNavigateToSubscription}
          />
        )}
        {vm.activeTab === 'scorecard' && (
          <RoundScorecardTab
            scorecards={vm.scorecards || []}
            roundPlayers={vm.roundPlayers || []}
            holes={round.course?.holes || null}
            onPlayerPress={vm.handlePlayerPress}
            selectedTeeData={round.selected_tee}
            gameType={round.game_type}
            handicapSource={round.handicap_source ?? undefined}
          />
        )}
        {vm.activeTab === 'stats' && (
          <StatsTab
            scorecards={vm.scorecards || []}
            roundPlayers={vm.roundPlayers || []}
            holes={round.course?.holes || null}
            statsVisibility={vm.statsVisibility}
            canEditStats={vm.userScorecardSubmitted}
            onEditStats={vm.handleEditStatsOpen}
            onUpgradePress={vm.handleNavigateToSubscription}
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
            isSplitRound={vm.isSplitRound}
            roundId={round.id}
          />
        )}
        {vm.activeTab === 'subMatches' && (
          <SubMatchesTab
            roundId={round.id}
            competitionId={vm.competitionId ?? null}
            isOrganizer={vm.isOrganizer}
            isSplitRound={vm.isSplitRound}
            isTeamRound={round.is_team_round ?? false}
            scoringPairsEnabled={round.scoring_pairs_required ?? false}
            gameType={round.game_type}
            roundTeeTime={round.tee_time}
          />
        )}
        {vm.activeTab === 'teams' && vm.isTeamRound && (
          <TeamsTab
            roundId={round.id}
            competitionId={vm.competitionId ?? null}
            isTeamStrokeRound={vm.isTeamStrokeRound}
            isTeamMatchPlayRound={vm.isTeamMatchPlayRound}
            teamFormat={round.team_format}
            currentUserId={vm.user?.id}
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
        {vm.activeTab === 'payouts' && vm.hasPayoutsTab && vm.payoutsMode && (
          <PayoutsTab
            mode={vm.payoutsMode}
            activeSkinsGame={vm.activeSkinsGame || null}
            skinsResults={(vm.skinsResults || []) as SkinsResultWithWinner[]}
            wolfSummary={vm.wolfSummary || null}
            playerNameMap={vm.playerNameMap}
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
      <CourseSelectionModal
        visible={vm.showCourseModal}
        onClose={vm.handleCourseModalClose}
        onSelect={vm.handleCourseSelect}
        searchQuery={vm.courseSearchQuery}
        onSearchQueryChange={vm.setCourseSearchQuery}
      />

      {/* Tag to League Bottom Sheet */}
      {vm.userScorecardId && (
        <TagToLeagueBottomSheet
          visible={vm.showTagLeagueSheet}
          onClose={vm.handleTagLeagueSheetClose}
          scorecardId={vm.userScorecardId}
        />
      )}

      {/* Edit Stats Modal */}
      {userScorecard && (
        <EditStatsModal
          visible={vm.showEditStatsModal}
          onClose={vm.handleEditStatsClose}
          scorecard={userScorecard}
          holes={round.course?.holes || []}
          courseName={round.course?.name || 'Course'}
          initialHole={vm.editStatsInitialHole}
        />
      )}

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
