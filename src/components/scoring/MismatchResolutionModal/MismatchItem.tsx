/**
 * MismatchItem - A single mismatch row showing hole info and resolution buttons
 *
 * Displays the mismatch details for a specific hole, including:
 * - Hole number badge and player name
 * - "Your Score" and partner's score buttons for unresolved mismatches
 * - Resolved status for already-resolved mismatches
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { ScoreMismatch } from '@/services/scoreMismatch';

// ============================================================================
// TYPES
// ============================================================================

export interface MismatchItemProps {
  /** The mismatch data */
  item: ScoreMismatch;
  /** Whether this item is currently being resolved */
  isCurrentlyResolving: boolean;
  /** Whether any item is being resolved (disables all buttons) */
  isAnyResolving: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Partner's display name (used for legacy 2-way pairs mismatches) */
  partnerName: string;
  /** Current user's ID */
  currentUserId: string;
  /** Local resolution data if available */
  localResolution?: { score: number; resolvedBy: string } | undefined;
  /** Player name for the mismatch */
  playerName: string;
  /** Map of scorer_id → display name. Used to label N-way entries. */
  playerNamesById?: Record<string, string>;
  /** Called when user selects a score */
  onResolve: (mismatch: ScoreMismatch, score: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MismatchItem = React.memo(function MismatchItem({
  item,
  isCurrentlyResolving,
  isAnyResolving,
  isOnline,
  partnerName,
  currentUserId,
  localResolution,
  playerName,
  playerNamesById,
  onResolve,
}: MismatchItemProps) {
  const colors = useThemeColors();

  const isResolved = item.status === 'resolved' || !!localResolution;
  const resolvedScore = item.resolved_score ?? localResolution?.score;
  const resolvedBy = item.resolved_by ?? localResolution?.resolvedBy;
  const resolvedBySelf = resolvedBy === currentUserId;
  const resolvedByPartner = resolvedBy && !resolvedBySelf;

  // N-way mode kicks in for multi-scorer rounds where the entries list is
  // populated. Group by stroke value so scorers who agree share a button.
  const nWayOptions = useMemo(() => {
    if (!item.entries || item.entries.length === 0) return null;
    const byStrokes = new Map<number, string[]>();
    for (const entry of item.entries) {
      const name = playerNamesById?.[entry.scorer_id] ?? `Scorer ${entry.scorer_id.slice(0, 4)}`;
      const list = byStrokes.get(entry.strokes) ?? [];
      list.push(name);
      byStrokes.set(entry.strokes, list);
    }
    return [...byStrokes.entries()]
      .map(([strokes, names]) => ({ strokes, names }))
      .sort((a, b) => a.strokes - b.strokes);
  }, [item.entries, playerNamesById]);

  const useNWayLayout = !!nWayOptions && nWayOptions.length > 0;

  return (
    <View
      style={[styles.mismatchRow, { borderColor: colors.border }]}
      accessibilityRole="none"
      accessibilityLabel={`Hole ${item.hole_number} score mismatch${playerName ? ` for ${playerName}` : ''}`}
    >
      {/* Hole info */}
      <View style={styles.mismatchHeader}>
        <View style={[styles.holeBadge, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.holeBadgeText, { color: colors.warning }]}>
            {item.hole_number}
          </Text>
        </View>
        <View style={styles.holeInfo}>
          <Text style={[styles.holeLabel, { color: colors.textPrimary }]}>
            Hole {item.hole_number}
          </Text>
          {playerName ? (
            <Text style={[styles.playerName, { color: colors.textSecondary }]}>
              {playerName}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Resolution buttons or status */}
      {isResolved ? (
        <View
          style={[styles.resolvedContainer, { backgroundColor: colors.success + '15' }]}
        >
          <Icon source="check-circle" size={20} color={colors.success} />
          <Text style={[styles.resolvedText, { color: colors.success }]}>
            Resolved: {resolvedScore}
            {resolvedByPartner ? ` by ${partnerName}` : ''}
          </Text>
        </View>
      ) : useNWayLayout && nWayOptions ? (
        <View style={styles.nWayList}>
          {nWayOptions.map(({ strokes, names }) => (
            <TouchableOpacity
              key={strokes}
              style={[
                styles.nWayOption,
                { borderColor: colors.primary, backgroundColor: colors.surface },
              ]}
              onPress={() => onResolve(item, strokes)}
              disabled={!isOnline || isCurrentlyResolving || isAnyResolving}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Accept score of ${strokes} from ${names.join(', ')}`}
              accessibilityState={{ disabled: !isOnline || isCurrentlyResolving }}
            >
              <View style={styles.nWayOptionLabelGroup}>
                <Text style={[styles.scoreButtonLabel, { color: colors.textSecondary }]}>
                  {names.join(', ')}
                </Text>
              </View>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>{strokes}</Text>
            </TouchableOpacity>
          ))}
          {isCurrentlyResolving && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {/* Your score button (legacy 2-way pairs flow) */}
          <TouchableOpacity
            style={[
              styles.scoreButton,
              styles.scoreButtonPrimary,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => item.self_score != null && onResolve(item, item.self_score)}
            disabled={!isOnline || isCurrentlyResolving || isAnyResolving || item.self_score == null}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Accept your score of ${item.self_score ?? ''}`}
            accessibilityState={{ disabled: !isOnline || isCurrentlyResolving }}
          >
            {isCurrentlyResolving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={[styles.scoreButtonLabel, { color: colors.white }]}>
                  Your Score
                </Text>
                <Text style={[styles.scoreValue, { color: colors.white }]}>
                  {item.self_score ?? '—'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Partner's score button */}
          <TouchableOpacity
            style={[
              styles.scoreButton,
              styles.scoreButtonOutline,
              { borderColor: colors.primary },
            ]}
            onPress={() => item.partner_score != null && onResolve(item, item.partner_score)}
            disabled={!isOnline || isCurrentlyResolving || isAnyResolving || item.partner_score == null}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Accept ${partnerName}'s score of ${item.partner_score ?? ''}`}
            accessibilityState={{ disabled: !isOnline || isCurrentlyResolving }}
          >
            <Text style={[styles.scoreButtonLabel, { color: colors.primary }]}>
              {partnerName}
            </Text>
            <Text style={[styles.scoreValue, { color: colors.primary }]}>
              {item.partner_score ?? '—'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  mismatchRow: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  mismatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  holeBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeBadgeText: {
    ...typography.h4,
    fontWeight: '700',
  },
  holeInfo: {
    flex: 1,
  },
  holeLabel: {
    ...typography.bodyBold,
  },
  playerName: {
    ...typography.small,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 64,
  },
  scoreButtonPrimary: {
    // Background set dynamically
  },
  scoreButtonOutline: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  scoreButtonLabel: {
    ...typography.small,
    marginBottom: 2,
  },
  scoreValue: {
    ...typography.h3,
    fontWeight: '700',
  },
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  resolvedText: {
    ...typography.body,
  },
  nWayList: {
    gap: spacing.sm,
  },
  nWayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    minHeight: 56,
  },
  nWayOptionLabelGroup: {
    flex: 1,
    paddingRight: spacing.md,
  },
});
