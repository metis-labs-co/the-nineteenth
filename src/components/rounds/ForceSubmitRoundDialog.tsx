/**
 * ForceSubmitRoundDialog
 *
 * Organiser confirmation for force-submitting a round while some players are
 * incomplete. Lists the players who will be marked DNF (no position/points),
 * then confirms. Fetches scorecards itself so callers only manage visibility
 * and the mutation.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { useThemeColors } from '@/context/ThemeContext';
import { useRoundScorecards, useRoundDetails } from '@/hooks/useRoundDetails';
import { getHoleCount } from '@/constants/scoring';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface ScorecardRow {
  player_id: string | null;
  status: string;
  scores?: Record<string, unknown> | null;
  player?: { name?: string | null } | null;
}
export interface IncompletePlayer { playerId: string; playerName: string; holesPlayed: number }

/**
 * Players who will be DNF: their card has fewer than `holeCount` holes scored.
 * A full card counts (it will be promoted to completed on submit). Deduped by
 * player_id, in scorecard order. Exported for testing.
 */
export function getIncompletePlayers(
  scorecards: ScorecardRow[],
  holeCount: number
): IncompletePlayer[] {
  const seen = new Set<string>();
  const out: IncompletePlayer[] = [];
  for (const sc of scorecards) {
    const holesPlayed = Object.keys(sc.scores ?? {}).length;
    if (holesPlayed >= holeCount) continue; // full card → counts, not DNF
    if (sc.player_id) {
      if (seen.has(sc.player_id)) continue;
      seen.add(sc.player_id);
    }
    out.push({
      playerId: sc.player_id ?? '',
      playerName: sc.player?.name ?? 'Unknown player',
      holesPlayed,
    });
  }
  return out;
}

export interface ForceSubmitRoundDialogProps {
  visible: boolean;
  roundId: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ForceSubmitRoundDialog({
  visible,
  roundId,
  loading = false,
  onConfirm,
  onCancel,
}: ForceSubmitRoundDialogProps) {
  const colors = useThemeColors();
  const { data: scorecards } = useRoundScorecards(roundId);
  const { data: round } = useRoundDetails(roundId);
  const holeCount = getHoleCount(round?.nine_type ?? 'full');

  const incomplete = useMemo(
    () => getIncompletePlayers((scorecards ?? []) as unknown as ScorecardRow[], holeCount),
    [scorecards, holeCount]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surfaceElevated }, shadows.lg]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Submit round now?</Text>

              {incomplete.length === 0 ? (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  All players have finished. This will finalize the round.
                </Text>
              ) : (
                <>
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {`These players haven't finished. They'll be marked Did Not Finish — no position or points for this round:`}
                  </Text>
                  <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {incomplete.map((p) => (
                      <View key={p.playerId || p.playerName} style={styles.row}>
                        <Icon source="account-alert-outline" size={18} color={colors.warning} />
                        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                          {p.playerName}
                        </Text>
                        <Text style={[styles.holes, { color: colors.textSecondary }]}>
                          {p.holesPlayed} {p.holesPlayed === 1 ? 'hole' : 'holes'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.borderStrong }]}
                  onPress={onCancel}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                  onPress={onConfirm}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Submit Round"
                >
                  {loading ? (
                    <GolfBallLoader size="sm" />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.textOnColored }]}>Submit Round</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  container: { width: '100%', maxWidth: 360, borderRadius: borderRadius.xl, padding: spacing.xl },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.body, textAlign: 'center', marginBottom: spacing.md, lineHeight: 22 },
  list: { maxHeight: 200, alignSelf: 'stretch', marginBottom: spacing.md },
  listContent: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  name: { ...typography.body, flex: 1 },
  holes: { ...typography.caption },
  actions: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  button: { flex: 1, height: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { ...typography.bodyBold },
});
