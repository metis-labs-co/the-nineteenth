/**
 * WolfSummaryModal - Popover modal showing Wolf game summary and standings
 *
 * Displays scoring type, blind wolf status, pot info, progress,
 * current Wolf decision, last result, and full standings table.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Text, Icon, ActivityIndicator, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows, wolfColor } from '@/constants/theme';
import { getRankMedal } from '@/utils/formatting';
import type { WolfHoleDecision } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

interface WolfParticipant {
  id: string;
  name: string;
}

interface WolfGameData {
  id: string;
  scoring_type: string;
  blind_wolf_enabled: boolean;
  pot_enabled: boolean;
  pot_value_per_point?: number | null;
  wolf_order: string[];
  participants: WolfParticipant[];
}

interface StandingEntry {
  player_id: string;
  name: string;
  total_points: number;
  net_result?: number;
}

interface WolfSummaryModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Wolf game data */
  wolfGame: WolfGameData | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Number of holes completed */
  holesCompleted: number;
  /** Current hole number */
  currentHole?: number;
  /** Current Wolf player info */
  currentWolf: WolfParticipant | null;
  /** Whether current hole has a decision */
  hasDecision: boolean;
  /** Decision description text */
  decisionDescription: string | null;
  /** Partner name (if partner selected) */
  partnerName: string | null;
  /** Current hole decision data */
  currentDecision: WolfHoleDecision | null;
  /** Result description text */
  resultDescription: string | null;
  /** Standings data */
  standings: StandingEntry[] | null;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const PopoverRow = React.memo(function PopoverRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.popoverRow}>
      <Text style={[styles.popoverLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.popoverValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
});

const StandingRowItem = React.memo(function StandingRowItem({
  entry,
  index,
  showPot,
}: {
  entry: StandingEntry;
  index: number;
  showPot: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.standingRow}>
      <View style={styles.standingLeft}>
        <Text style={[styles.standingRank, { color: colors.textSecondary }]}>
          {getRankMedal(index + 1)}
        </Text>
        <Text
          style={[styles.standingName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {entry.name}
        </Text>
      </View>
      <View style={styles.standingRight}>
        <Text
          style={[
            styles.standingPoints,
            {
              color: entry.total_points > 0 ? colors.textPrimary : colors.textSecondary,
            },
          ]}
        >
          {entry.total_points} pts
        </Text>
        {showPot && entry.net_result !== undefined && (
          <Text
            style={[
              styles.standingNet,
              {
                color:
                  entry.net_result > 0
                    ? colors.success
                    : entry.net_result < 0
                      ? colors.error
                      : colors.textSecondary,
              },
            ]}
          >
            {entry.net_result >= 0 ? '+' : ''}${entry.net_result.toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );
});

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfSummaryModal = React.memo(function WolfSummaryModal({
  visible,
  onClose,
  wolfGame,
  isLoading,
  holesCompleted,
  currentHole,
  currentWolf,
  hasDecision,
  decisionDescription,
  partnerName,
  currentDecision,
  resultDescription,
  standings,
}: WolfSummaryModalProps) {
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
            <Icon source="dog-side" size={24} color={wolfColor} />
            <Text style={[styles.popoverTitle, { color: colors.textPrimary }]}>
              Wolf Game
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.popoverLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : wolfGame ? (
            <View style={styles.popoverContent}>
              {/* Scoring Type */}
              <PopoverRow
                label="Scoring"
                value={wolfGame.scoring_type === 'gross' ? 'Gross' : 'Net'}
              />

              {/* Blind Wolf */}
              <PopoverRow
                label="Blind Wolf"
                value={wolfGame.blind_wolf_enabled ? 'Enabled' : 'Disabled'}
              />

              {/* Pot Info (if enabled) */}
              {wolfGame.pot_enabled && wolfGame.pot_value_per_point && (
                <PopoverRow
                  label="Pot"
                  value={`$${wolfGame.pot_value_per_point.toFixed(2)}/point`}
                />
              )}

              {/* Progress */}
              <PopoverRow
                label="Progress"
                value={`${holesCompleted}/18 holes`}
              />

              {/* Current Wolf (if on a hole) */}
              {currentWolf && currentHole && (
                <View
                  style={[
                    styles.currentWolfRow,
                    { backgroundColor: `${wolfColor}15` },
                  ]}
                >
                  <Icon source="dog-side" size={16} color={wolfColor} />
                  <Text style={[styles.currentWolfText, { color: wolfColor }]}>
                    Hole {currentHole}: {currentWolf.name} is Wolf
                    {hasDecision && (
                      <>
                        {' - '}
                        {decisionDescription ?? `+ ${partnerName}`}
                      </>
                    )}
                  </Text>
                </View>
              )}

              {/* Last Result (if available) */}
              {resultDescription && currentDecision && (
                <View
                  style={[
                    styles.resultRow,
                    {
                      backgroundColor:
                        currentDecision.is_tie
                          ? `${colors.gray500}10`
                          : currentDecision.wolf_team_won
                            ? `${colors.success}10`
                            : `${colors.error}10`,
                    },
                  ]}
                >
                  <Icon
                    source={currentDecision.is_tie ? 'equal' : 'trophy'}
                    size={16}
                    color={
                      currentDecision.is_tie
                        ? colors.gray500
                        : currentDecision.wolf_team_won
                          ? colors.success
                          : colors.error
                    }
                  />
                  <Text
                    style={[
                      styles.resultText,
                      {
                        color: currentDecision.is_tie
                          ? colors.gray500
                          : currentDecision.wolf_team_won
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {resultDescription}
                  </Text>
                </View>
              )}

              {/* Standings */}
              {standings && standings.length > 0 && (
                <>
                  <Divider style={styles.divider} />
                  <View style={styles.standingsSection}>
                    <Text style={[styles.standingsTitle, { color: colors.textPrimary }]}>
                      Standings
                    </Text>
                    <ScrollView style={styles.standingsList} nestedScrollEnabled>
                      {standings.map((entry, index) => (
                        <StandingRowItem
                          key={entry.player_id}
                          entry={entry}
                          index={index}
                          showPot={!!wolfGame.pot_enabled}
                        />
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
  popoverLoading: {
    padding: spacing.xl,
    alignItems: 'center',
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
  currentWolfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  currentWolfText: {
    ...typography.smallBold,
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  resultText: {
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
  standingsSection: {
    marginTop: spacing.sm,
  },
  standingsTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  standingsList: {
    maxHeight: 150,
  },
  standingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  standingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  standingRank: {
    ...typography.small,
    minWidth: 24,
  },
  standingName: {
    ...typography.small,
    flex: 1,
  },
  standingRight: {
    alignItems: 'flex-end',
  },
  standingPoints: {
    ...typography.smallBold,
  },
  standingNet: {
    ...typography.caption,
  },
});
