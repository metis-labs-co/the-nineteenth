// src/screens/competitions/components/CompetitionListContent.tsx
import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { LoadingSpinner, EmptyState, Badge } from '@/components/common';
import { CompetitionListCard } from '@/components/competitions';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import type { CompetitionItem, TabValue } from '../hooks/useCompetitionsList';

interface CompetitionListContentProps {
  competitions: CompetitionItem[] | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onCompetitionPress: (competition: CompetitionItem) => void;
  onDeleteCompetition: (competition: CompetitionItem) => void;
  activeTab: TabValue;
  emptyState: {
    title: string;
    message: string;
    actionLabel: string;
    onAction: () => void;
  };
}

/**
 * Competition list content with loading, empty, and list states
 */
export const CompetitionListContent = React.memo(
  function CompetitionListContent({
    competitions,
    isLoading,
    isRefetching,
    onRefresh,
    onCompetitionPress,
    onDeleteCompetition,
    activeTab,
    emptyState,
  }: CompetitionListContentProps) {
    const colors = useThemeColors();

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[colors.textPrimary]}
            tintColor={colors.textPrimary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" message="Loading competitions..." />
          </View>
        ) : !competitions || competitions.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={emptyState.title}
            message={emptyState.message}
            actionLabel={emptyState.actionLabel}
            onAction={emptyState.onAction}
          />
        ) : (
          <View style={styles.list}>
            {competitions.map((competition) => (
              <View key={competition.id} style={styles.competitionCardWrapper}>
                {/* Legacy badge for grandfathered competitions */}
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
                  onPress={onCompetitionPress}
                  onDelete={onDeleteCompetition}
                  swipeEnabled={activeTab === 'my'}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  list: {
    gap: spacing.md,
  },
  competitionCardWrapper: {
    position: 'relative',
  },
  legacyBadge: {
    marginBottom: spacing.xs,
  },
});
