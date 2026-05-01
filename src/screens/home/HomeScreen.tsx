/**
 * HomeScreen - the app's primary landing screen.
 *
 * Replaces the previous Rounds tab as the initial route. Surfaces the user's
 * most actionable, glanceable, and motivating content in a single
 * conditional, scrollable feed (see docs/superpowers/specs/2026-04-29-home-screen-design.md).
 *
 * Reuses existing app components for visual consistency:
 * - PageHeader (used on every other top-level screen)
 * - FeatureButton (the same "Score Social Round" CTA from RoundListScreen)
 * - InProgressRoundSection (the same in-progress carousel from CompetitionDetail)
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconPlus } from '@tabler/icons-react-native';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing, layout, typography, borderRadius } from '@/constants/theme';
import {
  ConfirmationDialog,
  PageHeader,
  FeatureButton,
} from '@/components/common';
import { InProgressRoundSection } from '@/components/competitions/detail/sections';
import CreateRoundBottomSheet from '@/screens/rounds/CreateRoundBottomSheet';
import { useStartNewRound } from '@/screens/rounds/RoundListScreen/hooks';
import { useHomeData } from '@/hooks/home';
import type { RootStackParamList } from '@/navigation/types';
import type { GameType } from '@/types/database.types';

import {
  PendingActionsSection,
  UpcomingRoundsSection,
  CompetitionsLeaguesSection,
  StatsHighlightsSection,
  AchievementStatsSection,
  AchievementProgressSection,
  LastRoundSection,
  FriendActivitySection,
  NewUserFallback,
  HomeSkeleton,
  SectionHeader,
} from './components';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  const home = useHomeData();

  const {
    handleStartNewRound,
    dialogConfig: startRoundDialogConfig,
    dismissDialog: dismissStartRoundDialog,
  } = useStartNewRound(() => setBottomSheetVisible(false));

  // Refresh data when returning to the screen.
  useFocusEffect(
    useCallback(() => {
      home.refetchAll();
      // refetchAll is reconstructed each render but the underlying refetches
      // are stable; intentionally omitting from deps to avoid loop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const openCreateRound = useCallback(() => setBottomSheetVisible(true), []);
  const closeCreateRound = useCallback(() => setBottomSheetVisible(false), []);

  // Build a 1-based display number for each in-progress round (matches the
  // contract InProgressRoundSection expects from CompetitionDetail).
  const roundDisplayNumbers = React.useMemo(() => {
    const map: Record<string, number> = {};
    home.inProgressRounds.forEach((r, idx) => {
      map[r.id] = idx + 1;
    });
    return map;
  }, [home.inProgressRounds]);

  const handleScoreRound = useCallback(
    (roundId: string, gameType: GameType, isTeamRound: boolean) => {
      // Match-play and team-match-play rounds have dedicated scoring screens;
      // everything else goes through the standard scorecard flow.
      if (gameType === 'match-play') {
        if (isTeamRound) {
          navigation.navigate('TeamMatchPlayScoring', { roundId });
        } else {
          navigation.navigate('MatchPlayScoring', { roundId });
        }
        return;
      }
      navigation.navigate('Scorecard', { roundId, competitionId: '' });
    },
    [navigation]
  );

  const handleViewRound = useCallback(
    (roundId: string) => {
      navigation.navigate('ViewRound', { roundId });
    },
    [navigation]
  );

  const handleNotificationsPress = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const handleViewAllRounds = useCallback(() => {
    navigation.navigate('AllRounds');
  }, [navigation]);

  // Whether to show the "View all rounds" link in Upcoming.
  const showViewAll = home.lastRound !== null || home.upcomingRounds.length > 3;

  // If active round exists and there are no other completed rounds, hide
  // the LastRound section to avoid redundancy.
  const showLastRound = home.lastRound !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={
          home.greeting.firstName
            ? `Welcome ${home.greeting.firstName}`
            : 'Welcome'
        }
        rightActions={[
          {
            icon: 'golf',
            onPress: handleViewAllRounds,
            accessibilityLabel: 'View all rounds',
          },
          {
            icon: 'bell-outline',
            onPress: handleNotificationsPress,
            accessibilityLabel:
              home.unreadCount > 0
                ? `Notifications, ${home.unreadCount} unread`
                : 'Notifications',
            showBadge: home.unreadCount > 0,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={home.isRefetching}
            onRefresh={home.refetchAll}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {home.isLoading ? (
          <HomeSkeleton />
        ) : (
          <View>
            <FeatureButton
              title="Score Social Round"
              subtitle="Start scoring a round at any course"
              icon={
                <IconPlus size={24} color={colors.white} strokeWidth={2.5} />
              }
              onPress={openCreateRound}
              accessibilityLabel="Score new round"
            />

            {home.isNewUser ? (
              <View style={styles.body}>
                <NewUserFallback onCreateRound={openCreateRound} />
              </View>
            ) : (
              <View style={styles.body}>
                {home.inProgressRounds.length > 0 ? (
                  <View style={styles.carouselWrapper}>
                    <SectionHeader title="Continue scoring" />
                    <InProgressRoundSection
                      rounds={home.inProgressRounds}
                      onScoreRound={handleScoreRound}
                      onViewRound={handleViewRound}
                      roundDisplayNumbers={roundDisplayNumbers}
                    />
                    <TouchableOpacity
                      onPress={handleViewAllRounds}
                      accessibilityRole="button"
                      accessibilityLabel="View all rounds"
                      style={[
                        styles.viewAllRoundsButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.borderLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.viewAllRoundsLabel,
                          { color: colors.textPrimary },
                        ]}
                      >
                        View all rounds
                      </Text>
                      <Icon
                        source="chevron-right"
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <PendingActionsSection actions={home.pendingActions} />
                <UpcomingRoundsSection
                  rounds={home.upcomingRounds}
                  showViewAll={showViewAll}
                />
                <CompetitionsLeaguesSection
                  competitions={home.competitions}
                  leagues={home.leagues}
                />
                <StatsHighlightsSection stats={home.stats} />
                <AchievementStatsSection summary={home.achievementSummary} />
                <AchievementProgressSection
                  achievements={home.achievementsInProgress}
                />
                {showLastRound ? (
                  <LastRoundSection round={home.lastRound} />
                ) : null}
                <FriendActivitySection items={[]} />
              </View>
            )}

            {__DEV__ && (
              <View
                style={[
                  styles.devSection,
                  { borderTopColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.devLabel,
                    { color: colors.textTertiary },
                  ]}
                >
                  DEV TOOLS
                </Text>
                <View style={styles.devButtons}>
                  <TouchableOpacity
                    style={[
                      styles.devButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => navigation.navigate('WelcomeCarousel')}
                    accessibilityRole="button"
                    accessibilityLabel="View welcome screens"
                  >
                    <Icon
                      source="presentation"
                      size={20}
                      color={colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.devButtonLabel,
                        { color: colors.textPrimary },
                      ]}
                    >
                      View welcome screens
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.devButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => navigation.navigate('Onboarding')}
                    accessibilityRole="button"
                    accessibilityLabel="View onboarding"
                  >
                    <Icon
                      source="account-plus-outline"
                      size={20}
                      color={colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.devButtonLabel,
                        { color: colors.textPrimary },
                      ]}
                    >
                      View onboarding
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <CreateRoundBottomSheet
        visible={bottomSheetVisible}
        onClose={closeCreateRound}
        onStartRound={handleStartNewRound}
      />

      <ConfirmationDialog
        {...startRoundDialogConfig}
        onCancel={dismissStartRoundDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
  },
  carouselWrapper: {
    // InProgressRoundSection sets its own container margins; just give it room
    marginBottom: 0,
  },
  viewAllRoundsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    minHeight: 48,
  },
  viewAllRoundsLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  devSection: {
    marginTop: spacing.xl,
    marginHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  devLabel: {
    ...typography.caption,
    letterSpacing: 1,
    fontWeight: '600',
  },
  devButtons: {
    gap: spacing.sm,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 48,
  },
  devButtonLabel: {
    ...typography.body,
    fontWeight: '500',
  },
});
