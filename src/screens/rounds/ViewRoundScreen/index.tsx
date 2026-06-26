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
import { useIsDark, useThemeColors } from '@/context/ThemeContext';
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
import { StablefordLeaderboardFull } from '@/components/scorecard/StablefordLeaderboardFull';
import { ParLeaderboardFull } from '@/components/scorecard/ParLeaderboardFull';
import { SubMatchesTab } from './tabs/SubMatchesTab';
import { IndividualTeamLeaderboardTab } from './tabs/IndividualTeamLeaderboardTab';
import { RoundSubMatchLeaderboard } from '@/components/leaderboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShotLogList } from '@/components/features/shots/ShotLogList';
import { BagClubPickerSheet } from '@/components/features/bag/BagClubPickerSheet';
import { ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useDeleteShot, useSetShotClub } from '@/hooks/shots';
import { useBag } from '@/hooks/queries/useBag';
import { clubLabel, type ClubKey } from '@/constants/clubs';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewRound'>;

export default function ViewRoundScreen(props: Props) {
  const vm = useViewRoundScreen(props);
  const colors = useThemeColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const competitionIconBackground = isDark ? `${colors.primary}33` : colors.primaryLighter;
  const userScorecard = vm.scorecards?.find((sc) => sc.id === vm.userScorecardId);

  // Shots tab edit/delete plumbing — only active while the round is
  // in-progress (RLS rejects shot_log writes on completed rounds).
  const isInProgress = vm.round?.status === 'in-progress';
  const { data: bag = [] } = useBag(isInProgress ? vm.user?.id : undefined);
  const deleteShot = useDeleteShot();
  const setShotClub = useSetShotClub();

  // Strokes per hole for the *current user* — used by ShotLogList to gate
  // the "+ Add shot" affordance and render placeholder sections for holes
  // with strokes scored but no shots logged yet.
  const userHoleStrokeCounts = React.useMemo(() => {
    if (!vm.user?.id || !vm.round?.course?.holes) return undefined;
    const map: Record<number, number> = {};
    for (const h of vm.round.course.holes) {
      const strokes = vm.getPlayerScore(vm.user.id, h.number);
      if (typeof strokes === 'number' && strokes > 0) {
        map[h.number] = strokes;
      }
    }
    return map;
  }, [vm.user?.id, vm.getPlayerScore, vm.round?.course?.holes]);
  const [clubEditingShot, setClubEditingShot] = React.useState<ShotLogEntry | null>(null);
  const {
    dialogConfig: shotDialogConfig,
    showDialog: showShotDialog,
    dismissDialog: dismissShotDialog,
  } = useConfirmationDialog();

  const handleDeleteShot = React.useCallback(
    (shot: ShotLogEntry) => {
      const club = clubLabel(shot.club_used);
      showShotDialog({
        title: 'Delete shot?',
        message: `Remove shot ${shot.sequence}${shot.club_used ? ` (${club})` : ''} on hole ${shot.hole_number}? Subsequent shots on this hole will be renumbered.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        confirmVariant: 'destructive',
        onConfirm: () => {
          dismissShotDialog();
          deleteShot.mutate({
            shotId: shot.id,
            roundId: shot.round_id,
            holeNumber: shot.hole_number,
          });
        },
      });
    },
    [showShotDialog, dismissShotDialog, deleteShot]
  );

  const handleChangeClub = React.useCallback((shot: ShotLogEntry) => {
    setClubEditingShot(shot);
  }, []);

  const handleClubPicked = React.useCallback(
    (clubKey: ClubKey) => {
      if (!clubEditingShot) return;
      const target = clubEditingShot;
      setClubEditingShot(null);
      setShotClub.mutate({
        shotId: target.id,
        roundId: target.round_id,
        holeNumber: target.hole_number,
        clubKey,
      });
    },
    [clubEditingShot, setShotClub]
  );

  // Get header title with icons for skins/wolf standalone rounds.
  // A user-defined round name always wins over the icon-decorated title.
  const getHeaderTitleNode = (): string | React.ReactNode => {
    const customName = vm.round?.name?.trim();
    if (customName) return customName;
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

  // Holes the round is actually being played over. For 'front9' / 'back9'
  // standalone rounds this strips the unplayed nine so the scorecard,
  // stats, and shot picker all surface only the holes that count. The
  // course holes themselves stay intact in the round payload — this is a
  // display-time filter only.
  const playableHoles = filterHolesByNineType(
    Array.isArray(round.course?.holes) ? round.course.holes : [],
    round.nine_type
  );
  const playableHoleNumbers = playableHoles.map((h) => h.number);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title={getHeaderTitleNode()}
        subtitle={vm.competitionInfo?.name || undefined}
        variant="centered"
        showBack
        onBack={vm.handleBack}
        rightActions={[
          ...(round.status === 'completed'
            ? [
                {
                  icon: 'comment-outline',
                  onPress: () =>
                    props.navigation.navigate('RoundActivity', { roundId: round.id }),
                  accessibilityLabel: 'Likes and comments',
                },
              ]
            : []),
          ...(vm.isOrganizer
            ? [
                {
                  icon: 'cog-outline',
                  onPress: vm.handleSettingsPress,
                  accessibilityLabel: 'Round settings',
                },
              ]
            : []),
        ]}
      />

      {/* Score Round Button */}
      {vm.isUserPlaying && vm.roundReadyToScore && !vm.userScorecardSubmitted && round.status !== 'completed' && (
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
          <View style={[styles.competitionIconContainer, { backgroundColor: competitionIconBackground }]}>
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
            canAddPhotos={vm.isUserPlaying}
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
            nineType={round.nine_type}
            startHole={round.course?.start_hole ?? 1}
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
            nineType={round.nine_type}
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
            startHole={round.course?.start_hole ?? 1}
          />
        )}
        {vm.activeTab === 'subMatches' && (
          <SubMatchesTab
            roundId={round.id}
            competitionId={vm.competitionId ?? null}
            isOrganizer={vm.isOrganizer}
            isSplitRound={vm.isSplitRound}
            isTeamRound={round.is_team_round ?? false}
            isIndividualCompetition={vm.competitionInfo?.team_mode === 'none'}
            isCompetitionInfoLoading={vm.isLoadingCompetitionInfo}
            scoringPairsEnabled={round.scoring_pairs_required ?? false}
            roundStatus={round.status}
            gameType={round.game_type}
            teamFormat={round.team_format}
            holes={(round.course?.holes as Hole[]) || []}
            roundTeeTime={round.tee_time}
            roundNumber={round.round_number}
            roundFormat={round.round_format}
            subMatchSize={round.sub_match_size}
            pairingSource={round.pairing_source}
            pairingStyle={round.pairing_style}
            pairingMetric={round.pairing_metric}
          />
        )}
        {vm.activeTab === 'skins' && vm.hasSkinsGame && vm.activeSkinsGame && (
          <SkinsTab
            roundId={round.id}
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
        {vm.activeTab === 'leaderboard' && (vm.isStrokePlayRound || vm.isStablefordRound || vm.isParRound) && (() => {
          const individualView = vm.isStrokePlayRound ? (
            <StrokePlayLeaderboardTab
              players={vm.strokePlayPlayers}
              holes={round.course?.holes as Hole[] || []}
              getPlayerScore={vm.getStrokePlayPlayerScore}
              currentUserId={vm.user?.id}
            />
          ) : vm.isStablefordRound ? (
            <StablefordLeaderboardFull
              players={vm.leaderboardPlayers}
              holes={(round.course?.holes as Hole[]) || []}
              getPlayerScore={vm.getStrokePlayPlayerScore}
              currentUserId={vm.user?.id}
            />
          ) : (
            <ParLeaderboardFull
              players={vm.leaderboardPlayers}
              holes={(round.course?.holes as Hole[]) || []}
              getPlayerScore={vm.getStrokePlayPlayerScore}
              currentUserId={vm.user?.id}
            />
          );

          // Team-stroke rounds (best-ball / aggregate) get the toggle wrapper.
          // Individual stroke rounds render the format-specific leaderboard alone.
          if (vm.isTeamStrokeRound && round.id) {
            return (
              <IndividualTeamLeaderboardTab
                teams={vm.teams}
                holes={(round.course?.holes as Hole[]) || []}
                gameType={round.game_type}
                teamFormat={round.team_format}
                getPlayerScore={vm.getStrokePlayPlayerScore}
                subMatches={vm.subMatches}
                currentUserId={vm.user?.id}
                individualView={individualView}
              />
            );
          }
          return individualView;
        })()}
        {vm.activeTab === 'leaderboard' && vm.isAltShotSplitRound && vm.round && (
          <RoundSubMatchLeaderboard
            roundId={vm.round.id}
            competitionId={vm.competitionId ?? null}
            currentUserId={vm.user?.id}
            isRefreshing={vm.isRefreshing}
            onRefresh={vm.handleRefresh}
            bottomInset={insets.bottom}
          />
        )}
        {vm.activeTab === 'teamScores' && vm.isShambleRound && (
          <ShambleTeamScoresTab
            shamblePlayers={vm.shamblePlayers}
            getShambleTeamScore={vm.getShambleTeamScore}
            getShamblePlayerScore={vm.getShamblePlayerScore}
            holes={playableHoles}
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
            holes={playableHoles}
          />
        )}
        {vm.activeTab === 'shots' && vm.roundId && (
          <ShotLogList
            roundId={vm.roundId}
            courseId={round?.course_id ?? null}
            playerNameMap={vm.playerNameMap}
            noScroll
            currentPlayerId={vm.user?.id}
            onDeleteShot={isInProgress ? handleDeleteShot : undefined}
            onChangeClubForShot={isInProgress ? handleChangeClub : undefined}
            roundStatus={round?.status}
            holeStrokeCounts={userHoleStrokeCounts}
            totalHoles={playableHoles.length || round?.course?.holes?.length || 18}
            holeNumbers={playableHoleNumbers}
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

      {/* Shot delete confirmation (Shots tab — in-progress rounds only). */}
      <ConfirmationDialog {...shotDialogConfig} onCancel={dismissShotDialog} />

      {/* Club picker for editing a logged shot's club. */}
      <BagClubPickerSheet
        visible={clubEditingShot !== null}
        bag={bag}
        title="Change club"
        onPick={handleClubPicked}
        onCancel={() => setClubEditingShot(null)}
      />

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
