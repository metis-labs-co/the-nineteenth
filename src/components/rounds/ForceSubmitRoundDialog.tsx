/**
 * ForceSubmitRoundDialog
 *
 * Organiser confirmation for force-submitting a round while some players are
 * incomplete. Lists the players who will be marked DNF (no position/points),
 * then confirms. Fetches the roster itself so callers only manage visibility
 * and the mutation.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { useThemeColors } from '@/context/ThemeContext';
import { useRoundPlayers, useRoundScorecards } from '@/hooks/useRoundDetails';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

const TERMINAL = new Set(['completed', 'confirmed']);

interface RosterPlayer { id: string; name: string }
interface ScorecardRow { player_id: string; status: string; scores?: Record<string, unknown> | null }
export interface IncompletePlayer { playerId: string; playerName: string; holesPlayed: number }

/** Roster players with a missing or non-terminal scorecard. Exported for testing. */
export function getIncompletePlayers(
  roundPlayers: RosterPlayer[],
  scorecards: ScorecardRow[]
): IncompletePlayer[] {
  const byPlayer = new Map(scorecards.map((sc) => [sc.player_id, sc]));
  const out: IncompletePlayer[] = [];
  for (const p of roundPlayers) {
    const sc = byPlayer.get(p.id);
    const terminal = sc ? TERMINAL.has(sc.status) : false;
    if (terminal) continue;
    out.push({
      playerId: p.id,
      playerName: p.name,
      holesPlayed: sc?.scores ? Object.keys(sc.scores).length : 0,
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
  const { data: roundPlayers } = useRoundPlayers(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);

  const incomplete = useMemo(
    () => getIncompletePlayers(
      (roundPlayers ?? []) as unknown as RosterPlayer[],
      (scorecards ?? []) as unknown as ScorecardRow[]
    ),
    [roundPlayers, scorecards]
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
                      <View key={p.playerId} style={styles.row}>
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
