// src/screens/compete/components/CompsContent.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IconPlus, IconSparkles } from '@tabler/icons-react-native';
import {
  FeatureButton,
  ConfirmationDialog,
  SectionHeader,
  EmptyState,
  Badge,
  LoadingSpinner,
} from '@/components/common';
import { FeatureLockCompact, LimitIndicator } from '@/components/subscription';
import { CompetitionListCard } from '@/components/competitions';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useCompetitionGroups } from '../hooks';
import type { CompetitionItem } from '../hooks';

function CompetitionSection({
  title,
  competitions,
  onPress,
  onDelete,
}: {
  title: string;
  competitions: CompetitionItem[];
  onPress: (competition: CompetitionItem) => void;
  onDelete: (competition: CompetitionItem) => void;
}) {
  if (competitions.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <View style={styles.sectionList}>
        {competitions.map((competition) => (
          <View key={competition.id} style={styles.cardWrapper}>
            {competition.isLegacy && (
              <Badge
                label="Legacy"
                variant="warning"
                icon="history"
                size="sm"
                accessibilityLabel="Legacy competition - grandfathered from previous subscription"
                style={styles.legacyBadge}
              />
            )}
            <CompetitionListCard
              competition={competition}
              onPress={onPress}
              onDelete={onDelete}
              swipeEnabled={competition.isOrganizer}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CompsContent() {
  const colors = useThemeColors();
  const navigation = useNavigation();

  const {
    activeComps,
    upcomingComps,
    completedComps,
    hasAnyCompetitions,
    isLoading,
    myCompetitionCount,
    maxCompetitions,
    hasUnlimitedCompetitions,
    canCreateCompetition,
    handleDeleteCompetition,
    handleConfirmDelete,
    handleCancelDelete,
    deleteDialogVisible,
    competitionToDelete,
    isDeleting,
  } = useCompetitionGroups();

  const handleCreateCompetition = useCallback(() => {
    navigation.navigate('CreateCompetition');
  }, [navigation]);

  const handleCreateWithAI = useCallback(() => {
    navigation.navigate('AICompetition');
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

  return (
    <View>
      {/* Create buttons */}
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
              icon={<IconSparkles size={20} color={colors.white} strokeWidth={2.5} />}
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

      {/* Limit indicator */}
      {!hasUnlimitedCompetitions && (
        <View style={styles.limitRow}>
          <LimitIndicator
            current={myCompetitionCount}
            max={maxCompetitions}
            label="Comps"
            showBar={false}
            testID="comps-limit-indicator"
          />
        </View>
      )}

      {/* Sections */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" message="Loading competitions..." />
        </View>
      ) : !hasAnyCompetitions ? (
        <EmptyState
          icon="trophy-outline"
          title="No Competitions Yet"
          message="Create your first competition to get started, or join one with an invite link."
          actionLabel="Create Competition"
          onAction={handleCreateCompetition}
        />
      ) : (
        <View style={styles.sections}>
          <CompetitionSection
            title="Active"
            competitions={activeComps}
            onPress={handleViewCompetition}
            onDelete={handleDeleteCompetition}
          />
          <CompetitionSection
            title="Upcoming"
            competitions={upcomingComps}
            onPress={handleViewCompetition}
            onDelete={handleDeleteCompetition}
          />
          <CompetitionSection
            title="Completed"
            competitions={completedComps}
            onPress={handleViewCompetition}
            onDelete={handleDeleteCompetition}
          />
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  createButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  featureButtonWrapper: {
    flex: 1,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  sections: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionList: {
    gap: spacing.md,
  },
  cardWrapper: {
    position: 'relative',
  },
  legacyBadge: {
    marginBottom: spacing.xs,
  },
});
