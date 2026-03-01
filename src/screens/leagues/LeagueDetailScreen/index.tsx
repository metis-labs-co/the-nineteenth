/**
 * LeagueDetailScreen - League detail with type-conditional tabs
 *
 * Ongoing/Season/Round Limit: Leaderboard | My Rounds | Players
 * Ladder: Ladder | Challenges | Players
 * Eclectic: Leaderboard | My Card | Players
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common';
import { Tabs } from '@/components/common/Tabs';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

import { LeaguePlayerRoundsModal } from '@/components/leagues';

import { useLeagueDetail } from './hooks/useLeagueDetail';
import LeagueHeader from './components/LeagueHeader';
import LeaderboardTab from './components/LeaderboardTab';
import MyRoundsTab from './components/MyRoundsTab';
import PlayersTab from './components/PlayersTab';
import LadderTab from './components/LadderTab';
import ChallengesTab from './components/ChallengesTab';
import EclecticLeaderboardTab from './components/EclecticLeaderboardTab';
import MyCardTab from './components/MyCardTab';

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
    eclecticCourseHoles,
    eclecticCourseName,

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
  } = useLeagueDetail();

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
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
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
        {activeTab === 'leaderboard' && leagueType !== 'eclectic' && (
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
        {activeTab === 'rounds' && (
          <MyRoundsTab
            rounds={myRounds}
            leagueId={leagueId}
            isArchived={!!isArchived}
            onTagRound={handleTagRound}
          />
        )}

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
            onLeave={handleLeave}
          />
        )}
      </ScrollView>

      <ScreenWelcomeModal
        visible={isModalVisible}
        content={welcomeContent}
        onDismiss={dismissModal}
      />

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
  tabBar: {
    marginHorizontal: spacing.lg,
  },
});
