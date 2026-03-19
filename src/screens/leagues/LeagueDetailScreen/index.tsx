/**
 * LeagueDetailScreen - League detail with type-conditional tabs
 *
 * Ongoing/Season/Round Limit: Leaderboard | My Rounds | Players
 * Ladder: Ladder | Challenges | Players
 * Eclectic: Leaderboard | My Card | Players
 * Partnership: Leaderboard | Course Bests | My Rounds | Players
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IconGolf } from '@tabler/icons-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, ConfirmationDialog } from '@/components/common';
import { FeatureButton } from '@/components/common/FeatureButton';
import { Tabs } from '@/components/common/Tabs';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import CreateRoundBottomSheet from '@/screens/rounds/CreateRoundBottomSheet';
import { useStartNewRound } from '@/screens/rounds/RoundListScreen/hooks/useStartNewRound';

import { LeaguePlayerRoundsModal, PartnershipRoundsModal, AddLeaguePlayersBottomSheet } from '@/components/leagues';

import { useLeagueDetail } from './hooks/useLeagueDetail';
import LeagueHeader from './components/LeagueHeader';
import LeaderboardTab from './components/LeaderboardTab';
import MyRoundsTab from './components/MyRoundsTab';
import PlayersTab from './components/PlayersTab';
import LadderTab from './components/LadderTab';
import ChallengesTab from './components/ChallengesTab';
import EclecticLeaderboardTab from './components/EclecticLeaderboardTab';
import MyCardTab from './components/MyCardTab';
import StatsTab from './components/StatsTab';
import PartnershipLeaderboardTab from './components/PartnershipLeaderboardTab';
import PartnershipCourseBestsTab from './components/PartnershipCourseBestsTab';
import PartnershipRoundsTab from './components/PartnershipRoundsTab';

export default function LeagueDetailScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();

  const {
    league,
    leagueType,
    leaderboardWithTied,
    players,
    myRounds,
    playerRounds,
    selectedPlayer,
    isLoading,
    isLoadingPlayerRounds,
    isCreator,
    isArchived,
    leagueId,
    userId,

    // Type-specific data
    seasonInfo,
    roundLimitInfo,
    ladderStandings,
    challenges,
    currentUserPosition,
    hasActiveChallenge,
    eclecticLeaderboard,
    eclecticBestScores,
    eclecticCourse,
    eclecticCourseHoles,
    eclecticCourseName,
    myPartnership,
    partnershipLeaderboard,
    partnershipCourseBests,
    partnershipRounds: partnershipRoundsData,
    selectedPartnershipEntry,
    selectedPartnershipRounds,
    isLoadingSelectedPartnershipRounds,

    // Tabs
    tabs,
    activeTab,
    setActiveTab,

    // Handlers
    handleRefresh,
    handleShare,
    handleTagRound,
    handleSettings,
    handleLeave,
    handleLeaderboardRowPress,
    handleClosePlayerRounds,
    handleRoundPress,

    // Ladder handlers
    handleChallenge,
    handleChallengePress,
    handleAcceptChallenge,
    handleDeclineChallenge,

    // Partnership handlers
    handlePartnershipSetup,
    handlePartnershipLeaderboardPress,
    handleClosePartnershipRoundsModal,
    handleUntagPartnershipRound,
    handleRenamePartnership,

    // Add players
    showAddPlayers,
    handleOpenAddPlayers,
    handleCloseAddPlayers,

    // Start round now
    showStartRound,
    handleStartRoundNow,
    handleCloseStartRound,
  } = useLeagueDetail();

  // Start new round with pending league tag
  const {
    handleStartNewRound,
    dialogConfig: startRoundDialogConfig,
    dismissDialog: dismissStartRoundDialog,
  } = useStartNewRound(() => {
    handleCloseStartRound();
  }, leagueId);

  // For partnership leagues, auto-add the partner to the round
  const initialPartners = useMemo(() => {
    if (leagueType !== 'partnership' || !myPartnership || !userId) return undefined;
    const partnership = myPartnership as typeof myPartnership & {
      player_1?: { id: string; name: string };
      player_2?: { id: string; name: string };
    };
    // Determine which player is the partner (not the current user)
    const partner =
      partnership.player_1_id === userId ? partnership.player_2 : partnership.player_1;
    if (!partner) return undefined;
    return [{ id: partner.id, name: partner.name }];
  }, [leagueType, myPartnership, userId]);

  const isPartnership = leagueType === 'partnership';

  // For eclectic leagues, pre-select the league's required course
  const eclecticInitialCourse = useMemo(() => {
    if (leagueType !== 'eclectic' || !eclecticCourse) return undefined;
    return {
      courseId: eclecticCourse.id,
      courseName: eclecticCourse.name,
      club: eclecticCourse.club,
      tees: eclecticCourse.tees,
    };
  }, [leagueType, eclecticCourse]);

  const { isModalVisible, dismissModal, showModal, isFirstVisit, content: welcomeContent } =
    useScreenWelcome('leagueDetail');

  if (isLoading || !league) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="League" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  const rightActions = [];
  if (!isFirstVisit) {
    rightActions.push({
      icon: 'information-outline',
      onPress: showModal,
      accessibilityLabel: 'League info',
    });
  }
  if (isCreator) {
    rightActions.push({
      icon: 'cog-outline',
      onPress: handleSettings,
      accessibilityLabel: 'League settings',
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={league.name}
        showBack
        onBack={() => navigation.goBack()}
        rightActions={rightActions}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.textPrimary} colors={[colors.textPrimary]} />}
      >
        <LeagueHeader
          league={league}
          playerCount={players?.length ?? 0}
          isArchived={!!isArchived}
          onShare={handleShare}
          seasonInfo={seasonInfo}
          roundLimitInfo={roundLimitInfo}
        />

        <Tabs
          tabs={tabs}
          selectedTab={activeTab}
          onTabChange={setActiveTab}
          style={styles.tabBar}
        />

        {/* Standard Leaderboard (ongoing, season, round_limit) */}
        {activeTab === 'leaderboard' && leagueType !== 'eclectic' && leagueType !== 'partnership' && (
          <LeaderboardTab
            leaderboard={leaderboardWithTied}
            currentUserId={userId}
            onRowPress={handleLeaderboardRowPress}
          />
        )}

        {/* Eclectic Leaderboard */}
        {activeTab === 'leaderboard' && leagueType === 'eclectic' && (
          <EclecticLeaderboardTab
            leaderboard={eclecticLeaderboard}
            currentUserId={userId}
            scoring={league.eclectic_scoring ?? 'gross'}
          />
        )}

        {/* My Rounds tab (ongoing, season, round_limit) */}
        {activeTab === 'rounds' && leagueType !== 'partnership' && (
          <MyRoundsTab
            rounds={myRounds}
            leagueId={leagueId}
            isArchived={!!isArchived}
            onTagRound={handleTagRound}
          />
        )}

        {/* Stats tab (ongoing, season, round_limit) */}
        {activeTab === 'stats' && <StatsTab leagueId={leagueId} />}

        {/* Ladder tab */}
        {activeTab === 'ladder' && (
          <LadderTab
            standings={ladderStandings}
            currentUserId={userId}
            currentUserPosition={currentUserPosition}
            challengeRange={league.challenge_range ?? 3}
            hasActiveChallenge={hasActiveChallenge}
            onChallenge={handleChallenge}
          />
        )}

        {/* Challenges tab */}
        {activeTab === 'challenges' && (
          <ChallengesTab
            challenges={challenges}
            currentUserId={userId}
            onChallengePress={handleChallengePress}
            onAccept={handleAcceptChallenge}
            onDecline={handleDeclineChallenge}
          />
        )}

        {/* Partnership Leaderboard */}
        {activeTab === 'leaderboard' && leagueType === 'partnership' && (
          <PartnershipLeaderboardTab
            leaderboard={partnershipLeaderboard}
            currentUserId={userId}
            onRowPress={handlePartnershipLeaderboardPress}
          />
        )}

        {/* Partnership Course Bests */}
        {activeTab === 'courseBests' && leagueType === 'partnership' && (
          <PartnershipCourseBestsTab
            courseBests={partnershipCourseBests}
          />
        )}

        {/* Partnership Rounds */}
        {activeTab === 'rounds' && leagueType === 'partnership' && (
          <PartnershipRoundsTab
            rounds={partnershipRoundsData}
            partnership={myPartnership}
            isArchived={!!isArchived}
            onTagRound={myPartnership ? handleTagRound : handlePartnershipSetup}
            onUntagRound={handleUntagPartnershipRound}
            onRenamePartnership={handleRenamePartnership}
          />
        )}

        {/* My Card tab (eclectic) */}
        {activeTab === 'myCard' && (
          <MyCardTab
            bestScores={eclecticBestScores}
            courseHoles={eclecticCourseHoles}
            courseName={eclecticCourseName}
            scoring={league.eclectic_scoring ?? 'gross'}
            isArchived={!!isArchived}
            onTagRound={handleTagRound}
          />
        )}

        {/* Players tab (all types) */}
        {activeTab === 'players' && (
          <PlayersTab
            players={players}
            league={league}
            isCreator={!!isCreator}
            isArchived={!!isArchived}
            currentUserId={userId}
            leaderboard={leaderboardWithTied}
            onLeave={handleLeave}
            onAddPlayers={handleOpenAddPlayers}
          />
        )}
      </ScrollView>

      {/* Start Round Now - sticky bottom button */}
      {!isArchived && (
        <View style={styles.featureButtonContainer}>
          <FeatureButton
            title="Start Round Now"
            subtitle={`Play a round for ${league.name}`}
            icon={<IconGolf size={24} color={colors.white} strokeWidth={2} />}
            onPress={handleStartRoundNow}
            accessibilityLabel="Start a round for this league"
          />
        </View>
      )}

      <ScreenWelcomeModal
        visible={isModalVisible}
        content={welcomeContent}
        onDismiss={dismissModal}
      />

      {/* Partnership rounds modal */}
      <PartnershipRoundsModal
        visible={!!selectedPartnershipEntry}
        onClose={handleClosePartnershipRoundsModal}
        entry={selectedPartnershipEntry}
        rounds={selectedPartnershipRounds}
        isLoading={isLoadingSelectedPartnershipRounds}
      />

      {/* Add players bottom sheet */}
      <AddLeaguePlayersBottomSheet
        visible={showAddPlayers}
        onClose={handleCloseAddPlayers}
        leagueId={leagueId}
        existingPlayerIds={players?.map((p) => p.player_id) ?? []}
      />

      {/* Start Round Bottom Sheet */}
      <CreateRoundBottomSheet
        visible={showStartRound}
        onClose={handleCloseStartRound}
        onStartRound={handleStartNewRound}
        initialPartners={isPartnership ? initialPartners : undefined}
        initialMatchType={isPartnership ? 'stableford' : undefined}
        skipPartnerStep={isPartnership}
        initialCourse={eclecticInitialCourse}
      />

      {/* Start Round Error Dialog */}
      <ConfirmationDialog {...startRoundDialogConfig} onCancel={dismissStartRoundDialog} />

      {/* Player rounds modal (for standard leaderboard taps) */}
      <LeaguePlayerRoundsModal
        visible={!!selectedPlayer}
        onClose={handleClosePlayerRounds}
        playerName={selectedPlayer?.name ?? ''}
        playerId={selectedPlayer?.player_id ?? ''}
        rank={selectedPlayer?.rank ?? 0}
        avgDifferential={selectedPlayer?.avg_differential ?? null}
        bestDifferential={selectedPlayer?.best_differential ?? null}
        roundsPlayed={selectedPlayer?.rounds_played ?? 0}
        roundsCounting={selectedPlayer?.rounds_counting ?? 0}
        rounds={playerRounds}
        isLoading={isLoadingPlayerRounds}
        onRoundPress={handleRoundPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  featureButtonContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  tabBar: {
    marginHorizontal: spacing.lg,
  },
});
