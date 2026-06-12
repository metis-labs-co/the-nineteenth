/**
 * KeepOrDropSheet
 *
 * Shown to the ORGANISER when there are pending invitees at start time.
 * The organiser can keep or remove each pending player before starting.
 * Non-organiser accepted starters are forced to keep all pending players
 * (RLS only allows the owner to delete others' round_players rows).
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { startBlockReason } from '@/utils';
import type { ScheduledRoundPlayer } from '@/hooks/rounds/scheduledRounds';
import type { RoundPresetId } from '@/constants/roundPresets';
import { resolveKeepDrop } from '../hooks/resolveKeepDrop';

interface KeepOrDropSheetProps {
  visible: boolean;
  onClose: () => void;
  /** All round_players rows (to recheck block reason). */
  allPlayers: ScheduledRoundPlayer[];
  /** Only the pending ones are shown here. */
  pendingPlayers: ScheduledRoundPlayer[];
  presetId: RoundPresetId;
  isOwner: boolean;
  /** Called with the final set of drop IDs (empty set = keep all). */
  onConfirm: (droppedIds: Set<string>) => void;
}

export function KeepOrDropSheet({
  visible,
  onClose,
  allPlayers,
  pendingPlayers,
  presetId,
  isOwner,
  onConfirm,
}: KeepOrDropSheetProps) {
  const colors = useThemeColors();

  // droppedIds: pending players the owner wants to remove
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set());

  // Reset selection whenever the sheet (re)opens so stale state from a
  // previous open doesn't carry into the next start attempt.
  useEffect(() => {
    if (visible) {
      setDroppedIds(new Set());
    }
  }, [visible]);

  const toggleDrop = (playerId: string) => {
    setDroppedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  };

  // Re-check block reason with the hypothetical resolved rows
  const { activeRows } = resolveKeepDrop(allPlayers, droppedIds, isOwner);
  const blockReason = startBlockReason(presetId, activeRows);

  const handleConfirm = () => {
    onConfirm(droppedIds);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} height={0.7} title="Who's Playing?" useModal>
      <ScrollView contentContainerStyle={styles.content}>
        {isOwner ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            These players have not responded yet. Keep them to include their scorecards, or remove them before starting.
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            These players have not responded yet and will be included. Only the organiser can remove pending players.
          </Text>
        )}

        {pendingPlayers.map((p) => {
          const name = p.player?.name ?? 'Unknown Player';
          const isDropped = droppedIds.has(p.player_id);

          return (
            <View key={p.player_id} style={[styles.playerRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.nameBlock}>
                <Text style={[styles.playerName, { color: isDropped ? colors.textDisabled : colors.textPrimary }, isDropped && styles.strikethrough]}>
                  {name}
                </Text>
                {p.player?.handicap != null && (
                  <Text style={[styles.handicap, { color: colors.textSecondary }]}>HCP {p.player.handicap}</Text>
                )}
              </View>
              {isOwner ? (
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: isDropped ? colors.errorLight : colors.successLight,
                    },
                  ]}
                  onPress={() => toggleDrop(p.player_id)}
                  accessibilityLabel={isDropped ? `Include ${name}` : `Remove ${name}`}
                  accessibilityRole="switch"
                  accessibilityState={{ selected: isDropped }}
                >
                  <Text style={[styles.toggleText, { color: isDropped ? colors.error : colors.success }]}>
                    {isDropped ? 'Removed' : 'Keep'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.toggleButton, { backgroundColor: colors.warningLight }]}>
                  <Text style={[styles.toggleText, { color: colors.warningDark }]}>Pending</Text>
                </View>
              )}
            </View>
          );
        })}

        {blockReason ? (
          <View style={[styles.blockBanner, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.blockText, { color: colors.warningDark }]}>{blockReason}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: blockReason ? colors.surfaceVariant : colors.primary,
              opacity: blockReason ? 0.6 : 1,
            },
          ]}
          onPress={handleConfirm}
          disabled={!!blockReason}
          activeOpacity={0.8}
          accessibilityState={{ disabled: !!blockReason }}
        >
          <Text style={[styles.startButtonText, { color: blockReason ? colors.textDisabled : colors.white }]}>
            Start Round
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  hint: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    ...typography.bodyBold,
  },
  nameBlock: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  handicap: {
    ...typography.caption,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 68,
    alignItems: 'center',
  },
  toggleText: {
    ...typography.captionBold,
  },
  blockBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  blockText: {
    ...typography.body,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  startButtonText: {
    ...typography.bodyBold,
  },
});
