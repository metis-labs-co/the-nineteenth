/**
 * QuickScoreEntryScreen - Admin/organizer score backfill
 *
 * Scrollable hole list with +/- steppers for entering all scores in one view.
 * No offline support, no side-game processing.
 */

import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmationDialog } from '@/components/common';

import { useQuickScoreEntry } from './useQuickScoreEntry';
import QuickScoreHoleRow from './QuickScoreHoleRow';
import QuickScoreTotalsBar from './QuickScoreTotalsBar';
import QuickScoreReviewModal from './QuickScoreReviewModal';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickScoreEntry'>;

export default function QuickScoreEntryScreen({ route, navigation }: Props) {
  const { roundId, playerId } = route.params;
  const colors = useThemeColors();
  const vm = useQuickScoreEntry({ roundId, playerId });

  if (vm.isLoading || !vm.round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Quick Score Entry" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={vm.round?.course?.club?.name || vm.course?.name || 'Quick Score Entry'}
        subtitle={`${vm.player?.name ?? 'Player'} · ${vm.course?.name ?? 'Course'}`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Running totals */}
      <QuickScoreTotalsBar
        totalGross={vm.totals.totalGross}
        totalNet={vm.totals.totalNet}
        totalPoints={vm.totals.totalPoints}
        holesEntered={vm.totals.holesEntered}
        totalHoles={vm.totalHoles}
      />

      {/* Hole list */}
      <FlatList
        data={vm.holes}
        keyExtractor={(hole) => String(hole.number)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: hole }) => (
          <QuickScoreHoleRow
            holeNumber={hole.number}
            par={hole.par}
            strokeIndex={hole.strokeIndex}
            score={vm.scores[String(hole.number)]}
            stablefordPoints={vm.holePoints[String(hole.number)] ?? 0}
            onIncrement={() => vm.incrementScore(hole.number)}
            onDecrement={() => vm.decrementScore(hole.number)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Footer: holes complete + save */}
      <View
        style={[
          styles.saveButtonContainer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.footerInfo}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            Holes complete
          </Text>
          <Text style={[styles.footerValue, { color: colors.textPrimary }]}>
            {vm.totals.holesEntered} / {vm.totalHoles}
          </Text>
        </View>
        <TouchableOpacity onPress={vm.handleSave} activeOpacity={0.8}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButton}
          >
            <Text style={[styles.saveButtonText, { color: colors.white }]}>
              Save Scores
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Review modal */}
      <QuickScoreReviewModal
        visible={vm.showReview}
        playerName={vm.player?.name ?? 'Player'}
        courseName={vm.course?.name ?? 'Course'}
        totalGross={vm.totals.totalGross}
        totalNet={vm.totals.totalNet}
        totalPoints={vm.totals.totalPoints}
        holesEntered={vm.totals.holesEntered}
        totalHoles={vm.totalHoles}
        handicapDifferential={vm.handicapDifferential}
        isSaving={vm.isSaving}
        onConfirm={vm.handleConfirmSave}
        onCancel={() => vm.setShowReview(false)}
      />

      {/* Confirmation dialog (replaces Alert.alert) */}
      <ConfirmationDialog {...vm.dialogConfig} onCancel={vm.dismissDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  separator: {
    height: spacing.xs,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    ...shadows.md,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '700',
  },
  footerValue: {
    ...typography.bodyBold,
    fontSize: 15,
    fontWeight: '800',
  },
  saveButton: {
    height: 50,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.bodyBold,
    fontSize: 15,
  },
});
