/**
 * CompetitionsListScreen - List of user's competitions
 *
 * Shows all competitions the user has created or joined.
 * Features:
 * - Toggle between "My Comps" (organized) and "Joined Comps" (participating)
 * - Create new competition button with tier limit enforcement
 * - Join competition button (navigate to JoinCompetitionScreen)
 * - Pull-to-refresh
 * - Tier badge in header
 * - LimitIndicator showing competition count
 * - Legacy indicator for grandfathered competitions
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ConfirmationDialog, FeatureButton } from '@/components/common';
import { ScreenWelcomeModal } from '@/components/common/ScreenWelcomeModal';
import { FeatureLockCompact } from '@/components/subscription';
import { Text, Icon } from 'react-native-paper';
import { IconPlus, IconSparkles } from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { useScreenWelcome } from '@/hooks/useScreenWelcome';
import { useCompetitionsList } from './hooks';
import {
  CompetitionTabBar,
  CompetitionFilterBar,
  CompetitionListContent,
} from './components';
import type { CompetitionItem } from './hooks';

export default function CompetitionsListScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();

  // Welcome modal
  const { isModalVisible, dismissModal, showModal, isFirstVisit, content: welcomeContent } = useScreenWelcome('competitions');

  const {
    // Tab state
    activeTab,
    setActiveTab,
    // Filter state
    statusFilter,
    setStatusFilter,
    // Data
    myCompetitions,
    joinedCompetitions,
    currentCompetitions,
    // Loading states
    isLoading,
    isRefetching,
    // Subscription info
    myCompetitionCount,
    maxCompetitions,
    hasUnlimitedCompetitions,
    canCreateCompetition,
    // Handlers
    handleRefresh,
    handleDeleteCompetition,
    handleConfirmDelete,
    handleCancelDelete,
    getEmptyStateContent,
    // Delete dialog state
    deleteDialogVisible,
    competitionToDelete,
    isDeleting,
  } = useCompetitionsList();

  // Navigation handlers
  const handleCreateCompetition = useCallback(() => {
    navigation.navigate('CreateCompetition');
  }, [navigation]);

  const handleCreateWithAI = useCallback(() => {
    navigation.navigate('AICompetition');
  }, [navigation]);

  const handleJoinCompetition = useCallback(() => {
    navigation.navigate('JoinCompetition');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleViewCompetition = useCallback(
    (competition: CompetitionItem) => {
      navigation.navigate('CompetitionDetail', { id: competition.id });
    },
    [navigation]
  );

  // Get empty state content
  const emptyState = getEmptyStateContent(
    handleCreateCompetition,
    handleJoinCompetition
  );

  // Header right content - info icon + Join button
  const headerRightContent = (
    <View style={styles.headerActions}>
      {!isFirstVisit && (
        <TouchableOpacity
          style={[styles.infoButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={showModal}
          accessibilityRole="button"
          accessibilityLabel="Competitions info"
        >
          <Icon source="information-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.joinButton,
          { backgroundColor: colors.surface, borderColor: colors.primary },
        ]}
        onPress={handleJoinCompetition}
        accessibilityRole="button"
        accessibilityLabel="Join competition"
      >
        <Text style={[styles.joinButtonText, { color: colors.primary }]}>
          Join
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Create competition buttons section
  const createButtonsSection = (
    <View style={styles.createButtonsContainer}>
      <View style={styles.featureButtonWrapper}>
        <FeatureButton
          title="Create"
          subtitle="Step-by-step wizard"
          icon={<IconPlus size={20} color={colors.white} strokeWidth={2.5} />}
          onPress={canCreateCompetition ? handleCreateCompetition : handleUpgrade}
          backgroundColor={colors.primary}
          disabled={false}
          accessibilityLabel="Create new competition"
          variant="compact"
          showChevron={false}
        />
      </View>

      <View style={styles.featureButtonWrapper}>
        <FeatureLockCompact
          feature="ai_competition"
          onUpgradePress={handleUpgrade}
        >
          <FeatureButton
            title="AI Create"
            subtitle="Describe in English"
            icon={
              <IconSparkles size={20} color={colors.white} strokeWidth={2.5} />
            }
            onPress={canCreateCompetition ? handleCreateWithAI : handleUpgrade}
            backgroundColor={colors.accent}
            disabled={false}
            accessibilityLabel="Create competition with AI"
            variant="compact"
            showChevron={false}
          />
        </FeatureLockCompact>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title="Competitions" rightContent={headerRightContent} />

      {/* Create Competition Buttons */}
      {createButtonsSection}

      {/* Toggle Tabs */}
      <CompetitionTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        myCount={myCompetitions?.length || 0}
        joinedCount={joinedCompetitions?.length || 0}
      />

      {/* Status Filter + Limit Indicator */}
      <CompetitionFilterBar
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        activeTab={activeTab}
        myCompetitionCount={myCompetitionCount}
        maxCompetitions={maxCompetitions}
        hasUnlimitedCompetitions={hasUnlimitedCompetitions}
      />

      {/* Content */}
      <CompetitionListContent
        competitions={currentCompetitions}
        isLoading={isLoading}
        isRefetching={isRefetching}
        onRefresh={handleRefresh}
        onCompetitionPress={handleViewCompetition}
        onDeleteCompetition={handleDeleteCompetition}
        activeTab={activeTab}
        emptyState={emptyState}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Competition"
        message={`Are you sure you want to delete "${competitionToDelete?.name ?? 'this competition'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        loading={isDeleting}
        icon="delete"
      />

      {/* Welcome Info Modal */}
      <ScreenWelcomeModal
        visible={isModalVisible}
        content={welcomeContent}
        onDismiss={dismissModal}
        testID="competitions-welcome-modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xxxl,
  },
  joinButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  joinButtonText: {
    ...typography.smallBold,
  },
  createButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  featureButtonWrapper: {
    flex: 1,
  },
});
