// src/screens/player/ReviewScorecardScreen.tsx
/**
 * ReviewScorecardScreen - Full scorecard table showing all 18 holes for all players
 *
 * Features:
 * - Scorecard table with columns: Hole | Par | Player 1 | Player 2 | Player 3
 * - Front 9 (OUT) subtotal and Back 9 (IN) subtotal rows
 * - Totals row with gross total, net total, Stableford points per player
 * - Edit Scores and Submit All Scores buttons
 * - Handles online/offline submission with sync status
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  useWindowDimensions,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { Text, Button, ActivityIndicator, Surface, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useScorecardStore } from '@/store/scorecardStore';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { supabase } from '@/services/supabase/client';
import { ScorecardTable, type ScorecardTablePlayer } from '@/components/scorecard';
import { generateDefaultHoles } from '@/utils/scorecardCalculations';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole } from '@/types/index';
import { PageHeader } from '@/components/common';
import { submitLogger } from '@/utils/debugLogger';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewScorecard'>;

// =====================================================
// INCOMPLETE SCORES TYPES
// =====================================================

interface IncompleteHole {
  holeNumber: number;
  missingPlayers: { id: string; name: string }[];
}

interface IncompleteScoresModalProps {
  visible: boolean;
  incompleteHoles: IncompleteHole[];
  onClose: () => void;
  onHolePress: (holeNumber: number) => void;
}

// =====================================================
// INCOMPLETE SCORES MODAL COMPONENT
// =====================================================

function IncompleteScoresModal({
  visible,
  incompleteHoles,
  onClose,
  onHolePress,
}: IncompleteScoresModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const renderHoleItem = ({ item }: { item: IncompleteHole }) => (
    <Pressable
      style={[styles.incompleteHoleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onHolePress(item.holeNumber)}
      accessibilityLabel={`Go to hole ${item.holeNumber}`}
      accessibilityRole="button"
    >
      <View style={styles.incompleteHoleLeft}>
        <View style={[styles.holeNumberBadge, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.holeNumberText, { color: colors.error }]}>{item.holeNumber}</Text>
        </View>
        <View style={styles.missingPlayersContainer}>
          <Text style={[styles.missingPlayersLabel, { color: colors.textSecondary }]}>
            Missing scores:
          </Text>
          <Text style={[styles.missingPlayersNames, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.missingPlayers.map((p) => p.name.split(' ')[0]).join(', ')}
          </Text>
        </View>
      </View>
      <Icon source="chevron-right" size={24} color={colors.gray400} />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleContainer}>
              <View style={[styles.warningIconContainer, { backgroundColor: colors.warning + '20' }]}>
                <Icon source="alert-circle" size={24} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Incomplete Scores
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {incompleteHoles.length} {incompleteHoles.length === 1 ? 'hole' : 'holes'} missing scores
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.gray200 }]}
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon source="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Description */}
          <View style={styles.modalDescription}>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              All players must have scores entered for every hole before submitting. Tap a hole to enter the missing scores.
            </Text>
          </View>

          {/* Incomplete Holes List */}
          <FlatList
            data={incompleteHoles}
            keyExtractor={(item) => `hole-${item.holeNumber}`}
            renderItem={renderHoleItem}
            contentContainerStyle={styles.incompleteHolesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Continue Anyway Button */}
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={[styles.modalButton, { borderColor: colors.gray400 }]}
              labelStyle={{ color: colors.textPrimary }}
            >
              Go Back
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ReviewScorecardScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected ?? true;

  const {
    currentRoundId,
    currentPlayers,
    groupScorecards,
    holes: storeHoles,
    submitScorecards,
    resetRound,
    setCurrentHole,
  } = useScorecardStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteHoles, setIncompleteHoles] = useState<IncompleteHole[]>([]);

  // Get course holes from store, route params, or use defaults
  const holes: Hole[] = useMemo(() => {
    if (storeHoles && storeHoles.length > 0) {
      return storeHoles;
    }
    if (route.params?.holes) {
      return route.params.holes;
    }
    return generateDefaultHoles();
  }, [storeHoles, route.params?.holes]);

  // Convert store data to ScorecardTablePlayer format
  const tablePlayerData: ScorecardTablePlayer[] = useMemo(() => {
    return currentPlayers.map((player) => {
      const scorecard = groupScorecards.get(player.id);
      return {
        id: player.id,
        playerId: player.id,
        player: player,
        scores: scorecard?.scores || null,
        hasScorecard: !!scorecard,
      };
    });
  }, [currentPlayers, groupScorecards]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleEditScores = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Validate that all scores are entered for all players on all holes
  const validateScores = useCallback((): IncompleteHole[] => {
    const incomplete: IncompleteHole[] = [];

    for (const hole of holes) {
      const missingPlayers: { id: string; name: string }[] = [];

      for (const player of currentPlayers) {
        const scorecard = groupScorecards.get(player.id);
        const score = scorecard?.scores[hole.number];

        if (!score?.strokes || score.strokes === 0) {
          missingPlayers.push({ id: player.id, name: player.name });
        }
      }

      if (missingPlayers.length > 0) {
        incomplete.push({
          holeNumber: hole.number,
          missingPlayers,
        });
      }
    }

    return incomplete;
  }, [holes, currentPlayers, groupScorecards]);

  // Handle navigating to a specific hole from the incomplete modal
  const handleIncompleteHolePress = useCallback((holeNumber: number) => {
    setShowIncompleteModal(false);
    setCurrentHole(holeNumber);
    navigation.goBack();
  }, [navigation, setCurrentHole]);

  // Update round status to completed in database
  const updateRoundStatus = useCallback(async (roundId: string): Promise<void> => {
    try {
      submitLogger.info('Updating round status to completed', { roundId: roundId.substring(0, 8) + '...' });

      const { error } = await (supabase as any)
        .from('rounds')
        .update({ status: 'completed' })
        .eq('id', roundId);

      if (error) {
        submitLogger.error('Failed to update round status', error, { roundId: roundId.substring(0, 8) + '...' });
        throw error;
      }

      submitLogger.info('Round status updated successfully', { roundId: roundId.substring(0, 8) + '...' });
    } catch (error) {
      submitLogger.error('Error updating round status', error);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    submitLogger.info('Submit button pressed', {
      isOnline,
      competitionId: route.params?.competitionId?.substring(0, 8) + '...',
      roundId: currentRoundId?.substring(0, 8) + '...',
      playerCount: currentPlayers.length,
      scorecardCount: groupScorecards.size,
    });

    const incomplete = validateScores();
    if (incomplete.length > 0) {
      submitLogger.warn('Incomplete scores detected', {
        incompleteHoles: incomplete.length,
        holes: incomplete.map((h) => h.holeNumber),
      });
      setIncompleteHoles(incomplete);
      setShowIncompleteModal(true);
      return;
    }

    const roundId = currentRoundId || route.params?.roundId;

    Alert.alert(
      'Submit Scorecard',
      isOnline
        ? 'Are you sure you want to submit all scores? This action cannot be undone.'
        : 'You are offline. Scores will be saved locally and submitted when you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            submitLogger.info('Submit confirmed by user', { isOnline });
            setIsSubmitting(true);
            setSyncError(null);

            try {
              submitLogger.info('Calling submitScorecards');
              await submitScorecards();
              submitLogger.info('submitScorecards completed successfully');

              if (roundId && isOnline) {
                await updateRoundStatus(roundId);
              }

              if (!isOnline) {
                submitLogger.info('Offline submission - scores queued for later sync');
                setPendingSyncs((prev) => prev + 1);
                Alert.alert(
                  'Saved Offline',
                  'Your scores have been saved locally and will be submitted when you reconnect.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        resetRound();
                        if (roundId) {
                          submitLogger.info('Navigating to ViewRound', { roundId: roundId.substring(0, 8) + '...' });
                          navigation.navigate('ViewRound', {
                            roundId,
                            competitionId: route.params?.competitionId !== 'standalone' ? route.params?.competitionId : undefined,
                          });
                        } else {
                          submitLogger.info('Navigating to dashboard (no round ID)');
                          navigation.popToTop();
                        }
                      },
                    },
                  ]
                );
              } else {
                submitLogger.info('Online submission successful');
                Alert.alert(
                  'Success',
                  'All scores have been submitted successfully!',
                  [
                    {
                      text: 'View Round',
                      onPress: () => {
                        resetRound();
                        if (roundId) {
                          submitLogger.info('Navigating to ViewRound', { roundId: roundId.substring(0, 8) + '...' });
                          navigation.navigate('ViewRound', {
                            roundId,
                            competitionId: route.params?.competitionId !== 'standalone' ? route.params?.competitionId : undefined,
                          });
                        } else {
                          submitLogger.info('Navigating to dashboard (no round ID)');
                          navigation.popToTop();
                        }
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              submitLogger.error('Submission failed', error, {
                errorMessage,
                competitionId: route.params?.competitionId?.substring(0, 8) + '...',
              });
              setSyncError(errorMessage);
              Alert.alert(
                'Submission Failed',
                `Failed to submit scores: ${errorMessage}. Please try again.`,
                [{ text: 'OK' }]
              );
            } finally {
              setIsSubmitting(false);
              submitLogger.debug('Submission process ended');
            }
          },
        },
      ]
    );
  }, [isOnline, navigation, resetRound, route.params?.competitionId, route.params?.roundId, currentRoundId, submitScorecards, currentPlayers.length, groupScorecards.size, validateScores, updateRoundStatus]);

  const handleSyncPress = useCallback(async () => {
    submitLogger.info('Manual sync button pressed', { isOnline, pendingSyncs });

    if (!isOnline) {
      submitLogger.warn('Sync attempted while offline');
      Alert.alert('No Connection', 'Please connect to the internet to sync your scores.');
      return;
    }

    setIsSubmitting(true);
    try {
      submitLogger.info('Attempting manual sync');
      await submitScorecards();
      setPendingSyncs(0);
      setSyncError(null);
      submitLogger.info('Manual sync completed successfully');
      Alert.alert('Sync Complete', 'All pending scores have been submitted.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      submitLogger.error('Manual sync failed', error, { errorMessage });
      setSyncError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, submitScorecards, pendingSyncs]);

  const getOfflineStatus = (): 'online' | 'offline' | 'syncing' | 'error' => {
    if (syncError) return 'error';
    if (isSubmitting) return 'syncing';
    if (!isOnline) return 'offline';
    return 'online';
  };

  // Loading state
  if (currentPlayers.length === 0) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading scorecard...</Text>
      </View>
    );
  }

  // Empty state
  if (groupScorecards.size === 0) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Scores Recorded</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Go back to enter scores for each hole before reviewing.
        </Text>
        <Button mode="contained" onPress={handleEditScores} style={styles.emptyButton}>
          Enter Scores
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Scorecard"
        showBack
        onBack={handleGoBack}
      />

      {/* Offline Indicator */}
      <OfflineIndicator
        status={getOfflineStatus()}
        pendingSyncs={pendingSyncs}
        errorMessage={syncError || undefined}
        onSyncPress={handleSyncPress}
        isSyncing={isSubmitting}
      />

      {/* Scorecard Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        <ScorecardTable
          players={tablePlayerData}
          holes={holes}
          screenWidth={screenWidth}
        />
      </ScrollView>

      {/* Action Buttons */}
      <Surface style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.surface, borderTopColor: colors.border }]} elevation={2}>
        <Button
          mode="outlined"
          onPress={handleEditScores}
          style={[styles.editButton, { borderColor: colors.gray400 }]}
          contentStyle={styles.buttonContent}
          labelStyle={[styles.editButtonLabel, { color: colors.textPrimary }]}
          accessibilityLabel="Edit scores"
          accessibilityHint="Go back to edit hole-by-hole scores"
        >
          Edit Scores
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={[styles.submitButton, { backgroundColor: colors.success }]}
          contentStyle={styles.buttonContent}
          labelStyle={[styles.submitButtonLabel, { color: colors.textInverse }]}
          accessibilityLabel="Submit all scores"
          accessibilityHint={
            isOnline
              ? 'Submit all scores to the server'
              : 'Save scores offline for later submission'
          }
        >
          {isOnline ? 'Submit All Scores' : 'Save Offline'}
        </Button>
      </Surface>

      {/* Incomplete Scores Modal */}
      <IncompleteScoresModal
        visible={showIncompleteModal}
        incompleteHoles={incompleteHoles}
        onClose={() => setShowIncompleteModal(false)}
        onHolePress={handleIncompleteHolePress}
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 160,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },

  // Action Bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
    borderWidth: 2,
  },
  editButtonLabel: {
    ...typography.bodyBold,
  },
  submitButton: {
    flex: 2,
  },
  submitButtonLabel: {
    ...typography.bodyBold,
  },
  buttonContent: {
    minHeight: 48,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h4,
  },
  modalSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  descriptionText: {
    ...typography.body,
  },
  incompleteHolesList: {
    paddingHorizontal: spacing.lg,
  },
  incompleteHoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  incompleteHoleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  holeNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeNumberText: {
    ...typography.h4,
    fontWeight: '700',
  },
  missingPlayersContainer: {
    flex: 1,
  },
  missingPlayersLabel: {
    ...typography.caption,
  },
  missingPlayersNames: {
    ...typography.body,
    marginTop: 2,
  },
  modalActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalButton: {
    marginBottom: spacing.sm,
  },
});
