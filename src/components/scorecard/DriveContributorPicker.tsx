/**
 * DriveContributorPicker Component
 *
 * Allows selection of which team member hit the best drive.
 * Used in Shamble format where the team plays from the best drive,
 * then each player plays their own ball.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamWithMembers } from '@/types/database.types';

export interface DriveContributorPickerProps {
  /** Team with members to select from */
  team: TeamWithMembers;
  /** Currently selected player ID */
  selectedPlayerId?: string;
  /** Callback when a player is selected */
  onSelect: (playerId: string) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Optional label override */
  label?: string;
}

export function DriveContributorPicker({
  team,
  selectedPlayerId,
  onSelect,
  disabled = false,
  label = 'Best Drive',
}: DriveContributorPickerProps) {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedPlayer = useMemo(
    () => team.members?.find((m) => m.player_id === selectedPlayerId)?.player,
    [team.members, selectedPlayerId]
  );

  const handlePlayerSelect = useCallback(
    (playerId: string) => {
      onSelect(playerId);
      setModalVisible(false);
    },
    [onSelect]
  );

  const handleClearSelection = useCallback(() => {
    // We don't have a way to clear in the current interface,
    // but if needed, could call onSelect with empty string
    setModalVisible(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header with icon and label */}
      <View style={styles.header}>
        <Icon source="golf-tee" size={20} color={colors.primary} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      </View>

      {/* Selector Button */}
      <TouchableOpacity
        style={[
          styles.selector,
          { borderColor: colors.border, backgroundColor: colors.background },
          selectedPlayer && { borderColor: colors.primary },
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={`Select ${label.toLowerCase()}`}
        accessibilityRole="button"
      >
        <View style={styles.selectorContent}>
          {selectedPlayer ? (
            <>
              <View
                style={[styles.selectedAvatar, { backgroundColor: colors.primary + '20' }]}
              >
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {(selectedPlayer.name ?? 'U')[0].toUpperCase()}
                </Text>
              </View>
              <Text
                style={[styles.selectorText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {selectedPlayer.name ?? 'Unknown'}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.selectorText, { color: colors.textSecondary }]}
            >
              Select who hit the best drive
            </Text>
          )}
        </View>
        <Icon
          source={selectedPlayer ? 'check-circle' : 'chevron-down'}
          size={20}
          color={selectedPlayer ? colors.primary : colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Player Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={styles.modalHandle}>
              <View style={[styles.modalHandleBar, { backgroundColor: colors.gray300 }]} />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Who hit the best drive?
            </Text>

            {/* Player List */}
            <ScrollView style={styles.modalPlayerList} showsVerticalScrollIndicator={false}>
              {team.members?.map((member) => {
                const isSelected = member.player_id === selectedPlayerId;

                return (
                  <TouchableOpacity
                    key={member.player_id}
                    style={[
                      styles.modalPlayerItem,
                      { backgroundColor: colors.surfaceVariant },
                      isSelected && {
                        backgroundColor: colors.primary + '20',
                        borderColor: colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handlePlayerSelect(member.player_id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.modalPlayerAvatar,
                        { backgroundColor: colors.primary + '30' },
                      ]}
                    >
                      <Text style={[styles.modalPlayerInitial, { color: colors.primary }]}>
                        {(member.player?.name ?? 'U')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalPlayerInfo}>
                      <Text style={[styles.modalPlayerName, { color: colors.textPrimary }]}>
                        {member.player?.name ?? 'Unknown'}
                      </Text>
                      {member.player?.handicap !== undefined && (
                        <Text style={[styles.modalPlayerHandicap, { color: colors.textSecondary }]}>
                          HC: {member.player.handicap}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Icon source="check-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Done Button */}
            <TouchableOpacity
              style={[styles.modalDoneButton, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalDoneText, { color: colors.white }]}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodyBold,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    minHeight: 52,
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  selectedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  selectorText: {
    ...typography.body,
    flex: 1,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  modalHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalPlayerList: {
    maxHeight: 300,
  },
  modalPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modalPlayerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlayerInitial: {
    ...typography.h3,
    fontWeight: '600',
  },
  modalPlayerInfo: {
    flex: 1,
  },
  modalPlayerName: {
    ...typography.body,
  },
  modalPlayerHandicap: {
    ...typography.small,
    marginTop: 2,
  },
  modalDoneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  modalDoneText: {
    ...typography.bodyBold,
  },
});

export default DriveContributorPicker;
