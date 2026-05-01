/**
 * SkinsSummaryModal - Modal popover showing skins game summary
 *
 * Displays pot info, scoring type, progress, carryover, last winner,
 * and running participant totals (individual or team).
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon, ActivityIndicator, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, skinsColor } from '@/constants/theme';
import type { ParticipantTotal, LastWinnerInfo } from './utils';

// ============================================================================
// TYPES
// ============================================================================

interface SkinsSummaryData {
  per_hole_value: number;
  holes_completed: number;
  current_carryover: number;
  game: {
    scoring_type: string;
  };
}

export interface SkinsSummaryModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Whether summary data is loading */
  isLoading: boolean;
  /** Summary data to display */
  summary: SkinsSummaryData | null | undefined;
  /** Number of consecutive carryover holes */
  carryoverHoles: number;
  /** Last winner information */
  lastWinner: LastWinnerInfo | null;
  /** Participant totals (players or teams) */
  participantTotals: ParticipantTotal[];
  /** Whether this is a team skins game */
  isTeamSkins: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SkinsSummaryModal = React.memo(function SkinsSummaryModal({
  visible,
  onClose,
  isLoading,
  summary,
  carryoverHoles,
  lastWinner,
  participantTotals,
  isTeamSkins,
}: SkinsSummaryModalProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.popoverBackdrop}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.popoverContainer,
            { backgroundColor: colors.surfaceElevated },
            shadows.lg,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.popoverHeader}>
            <Icon source="dice-multiple" size={24} color={skinsColor} />
            <Text style={[styles.popoverTitle, { color: colors.textPrimary }]}>
              Skins Game
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : summary ? (
            <View style={styles.popoverContent}>
              {/* Pot Info */}
              <View style={styles.popoverRow}>
                <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                  Pot
                </Text>
                <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                  ${summary.per_hole_value.toFixed(2)}/hole
                </Text>
              </View>

              {/* Scoring Type */}
              <View style={styles.popoverRow}>
                <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                  Scoring
                </Text>
                <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                  {summary.game.scoring_type === 'gross' ? 'Gross' : 'Net'}
                </Text>
              </View>

              {/* Progress */}
              <View style={styles.popoverRow}>
                <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
                  Progress
                </Text>
                <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
                  {summary.holes_completed}/18 holes
                </Text>
              </View>

              {/* Carryover */}
              {summary.current_carryover > 0 && (
                <View
                  style={[
                    styles.carryoverRow,
                    { backgroundColor: `${skinsColor}15` },
                  ]}
                >
                  <Icon source="arrow-right-circle" size={16} color={skinsColor} />
                  <Text style={[styles.carryoverText, { color: skinsColor }]}>
                    ${summary.current_carryover.toFixed(2)} carryover ({carryoverHoles} hole{carryoverHoles !== 1 ? 's' : ''})
                  </Text>
                </View>
              )}

              {/* Last Winner */}
              {lastWinner && (
                <View
                  style={[
                    styles.lastWinnerRow,
                    { backgroundColor: `${colors.success}10` },
                  ]}
                >
                  <Icon source="trophy" size={16} color={colors.success} />
                  <Text style={[styles.lastWinnerText, { color: colors.success }]}>
                    {lastWinner.name} won ${lastWinner.amount.toFixed(2)} (Hole {lastWinner.hole})
                  </Text>
                </View>
              )}

              {/* Participant Totals (Players or Teams) */}
              {participantTotals.length > 0 && (
                <>
                  <Divider style={styles.divider} />
                  <View style={styles.playerTotalsSection}>
                    <Text style={[styles.playerTotalsTitle, { color: colors.textPrimary }]}>
                      {isTeamSkins ? 'Team Totals' : 'Running Totals'}
                    </Text>
                    <ScrollView style={styles.playerTotalsList} nestedScrollEnabled>
                      {participantTotals.map((participant) => (
                        <View key={participant.id} style={styles.playerTotalRow}>
                          <View style={styles.playerTotalLeft}>
                            <Text
                              style={[styles.playerTotalName, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {participant.name}
                            </Text>
                            <View style={styles.participantMeta}>
                              {participant.holesWon > 0 && (
                                <Text style={[styles.playerTotalHoles, { color: colors.textSecondary }]}>
                                  {participant.holesWon} skin{participant.holesWon !== 1 ? 's' : ''}
                                </Text>
                              )}
                              {isTeamSkins && participant.memberCount && participant.totalWinnings > 0 && (
                                <Text style={[styles.perMemberAmount, { color: colors.textSecondary }]}>
                                  (${(participant.totalWinnings / participant.memberCount).toFixed(2)}/ea)
                                </Text>
                              )}
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.playerTotalAmount,
                              {
                                color: participant.totalWinnings > 0 ? colors.success : colors.textSecondary,
                              },
                            ]}
                          >
                            ${participant.totalWinnings.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}
            </View>
          ) : (
            <Text style={[styles.popoverEmpty, { color: colors.textSecondary }]}>
              No data available
            </Text>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { borderTopColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: colors.primary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  popoverBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popoverContainer: {
    width: '80%',
    maxWidth: 300,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  popoverTitle: {
    ...typography.h4,
  },
  popoverContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  popoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popoverLabel: {
    ...typography.small,
  },
  popoverValue: {
    ...typography.smallBold,
  },
  carryoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  carryoverText: {
    ...typography.smallBold,
  },
  lastWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  lastWinnerText: {
    ...typography.small,
    flex: 1,
  },
  popoverEmpty: {
    ...typography.body,
    textAlign: 'center',
    padding: spacing.lg,
  },
  closeButton: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  closeButtonText: {
    ...typography.bodyBold,
  },
  divider: {
    marginTop: spacing.sm,
  },
  playerTotalsSection: {
    marginTop: spacing.sm,
  },
  playerTotalsTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  playerTotalsList: {
    maxHeight: 150,
  },
  playerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  playerTotalLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  playerTotalName: {
    ...typography.small,
  },
  playerTotalHoles: {
    ...typography.caption,
  },
  playerTotalAmount: {
    ...typography.smallBold,
    minWidth: 60,
    textAlign: 'right',
  },
  participantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  perMemberAmount: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});
