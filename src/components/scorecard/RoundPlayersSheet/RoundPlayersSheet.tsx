/**
 * RoundPlayersSheet — add or remove players on a social round mid-round.
 * Server first via roundRoster; the store updates inside those calls.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { AddPlaceholderModal } from '@/components/common/AddPlaceholderModal';
import { SystemModalTheme } from '@/components/common/SystemModalTheme';
import type { SelectedPlayer } from '@/components/common/FriendSelector';
import { FriendSelectorBottomSheet } from '@/screens/rounds/CreateRoundBottomSheet/steps/FriendSelectorBottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { addPlayerToRound, removePlayerFromRound } from '@/services/rounds/roundRoster';
import { getStandaloneMaxPlayers } from '@/utils/roundRoster';
import type { GameType } from '@/types/database/enums';
import type { Player } from '@/types';
import { useAddablePlayers } from './useAddablePlayers';

export interface RoundPlayersSheetProps {
  visible: boolean;
  onClose: () => void;
  roundId: string;
  ownerId: string;
  gameType: GameType;
  players: Player[];
  playerTeeNames: Map<string, string>;
  onRosterChanged: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again.';
}

function RoundPlayersContent({
  visible,
  onClose,
  roundId,
  ownerId,
  gameType,
  players,
  playerTeeNames,
  onRosterChanged,
}: RoundPlayersSheetProps) {
  // Must run inside SystemModalTheme so surfaces resolve to solid colours.
  const colors = useThemeColors();
  const { showToast } = useToast();
  const [confirmRemove, setConfirmRemove] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [pending, setPending] = useState<SelectedPlayer[]>([]);

  const maxPlayers = getStandaloneMaxPlayers(gameType);
  const slots = Math.max(0, maxPlayers - players.length);
  const addable = useAddablePlayers(players.map((p) => p.id));

  const runRemove = useCallback(async () => {
    const target = confirmRemove;
    setConfirmRemove(null);
    if (!target) return;
    setBusy(true);
    try {
      await removePlayerFromRound(roundId, target.id);
      onRosterChanged();
    } catch (error) {
      showToast({
        variant: 'error',
        title: `Couldn't remove ${target.name}`,
        message: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  }, [confirmRemove, roundId, onRosterChanged, showToast]);

  const addPending = useCallback(async () => {
    const toAdd = pending;
    setPending([]);
    setPickerVisible(false);
    if (!toAdd.length) return;
    setBusy(true);
    let added = 0;
    for (const player of toAdd) {
      try {
        await addPlayerToRound(roundId, player.id);
        added += 1;
      } catch (error) {
        showToast({
          variant: 'error',
          title: `Couldn't add ${player.name}`,
          message: errorMessage(error),
        });
      }
    }
    setBusy(false);
    if (added) onRosterChanged();
  }, [pending, roundId, onRosterChanged, showToast]);

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        height={0.6}
        title="Players"
        showCloseButton
        testID="round-players-sheet"
      >
        <View style={styles.container}>
          {players.map((player) => (
            <View key={player.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.text}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{player.name}</Text>
                {playerTeeNames.get(player.id) ? (
                  <Text style={[styles.tee, { color: colors.textSecondary }]}>
                    {playerTeeNames.get(player.id)}
                  </Text>
                ) : null}
              </View>
              {player.id !== ownerId ? (
                <TouchableOpacity
                  style={styles.remove}
                  onPress={() => setConfirmRemove(player)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${player.name}`}
                >
                  <Icon source="account-remove-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {busy ? <ActivityIndicator style={styles.busy} /> : null}

          {slots > 0 ? (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setPickerVisible(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Add player"
            >
              <Icon source="account-plus-outline" size={20} color={colors.white} />
              <Text style={{ ...typography.bodyBold, color: colors.white }}>Add player</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </BottomSheet>

      <FriendSelectorBottomSheet
        visible={pickerVisible}
        onClose={() => void addPending()}
        selectedPlayers={pending}
        onSelectionChange={setPending}
        friends={addable.friends}
        friendsLoading={addable.friendsLoading}
        searchQuery={addable.searchQuery}
        onSearchQueryChange={addable.setSearchQuery}
        maxPartners={slots}
        placeholderPlayers={addable.placeholders}
        onAddPlaceholderPress={() => {
          setPickerVisible(false);
          setTimeout(() => setGuestModalVisible(true), 300);
        }}
      />

      <AddPlaceholderModal
        visible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        onPlayerCreated={(created) => {
          setGuestModalVisible(false);
          setPending((prev) => [
            ...prev,
            { id: created.id, name: created.name, handicap: created.handicap },
          ]);
          setTimeout(() => setPickerVisible(true), 300);
        }}
      />

      <ConfirmationDialog
        visible={confirmRemove !== null}
        title="Remove Player"
        message={
          confirmRemove
            ? `Remove ${confirmRemove.name}? Their scores for this round will be deleted.`
            : ''
        }
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={() => void runRemove()}
        onCancel={() => setConfirmRemove(null)}
        icon="account-remove-outline"
      />
    </>
  );
}

export function RoundPlayersSheet(props: RoundPlayersSheetProps) {
  return (
    <SystemModalTheme>
      <RoundPlayersContent {...props} />
    </SystemModalTheme>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
  name: { ...typography.body },
  tee: { ...typography.caption },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  busy: { marginVertical: spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
});
