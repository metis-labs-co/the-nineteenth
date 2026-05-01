/**
 * GameTypeModal - Modal for selecting game type (scoring format)
 *
 * Displays a list of available game types with subscription tier awareness.
 * Use showTeamFormats prop (via getFilteredGameTypes) to filter out team formats
 * for individual competitions.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, IconButton, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { GameTypeModalProps } from '../types';
import { TEAM_GAME_TYPES } from '../types';

export const GameTypeModal = React.memo(function GameTypeModal({
  visible,
  selectedGameType,
  availableGameTypes,
  onSelect,
  onClose,
  showTeamFormats = true,
}: GameTypeModalProps) {
  const colors = useThemeColors();

  // Filter game types based on showTeamFormats prop
  const filteredGameTypes = useMemo(() => {
    if (showTeamFormats) {
      return availableGameTypes;
    }
    // Filter out team formats
    const teamFormatValues = TEAM_GAME_TYPES.map((t) => t.value);
    return availableGameTypes.filter((gt) => !teamFormatValues.includes(gt.value));
  }, [availableGameTypes, showTeamFormats]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Select Game Type
            </Text>
            <IconButton
              icon="close"
              onPress={onClose}
              iconColor={colors.textPrimary}
              size={20}
            />
          </View>
          <View style={styles.gameTypeList}>
            {filteredGameTypes.map((type) => {
              const isSelected = selectedGameType === type.value;
              const isDisabled = type.disabled;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => !isDisabled && onSelect(type.value)}
                  disabled={isDisabled}
                  style={[
                    styles.gameTypeItem,
                    { borderBottomColor: colors.gray200 },
                    isSelected && { backgroundColor: colors.primaryLighter },
                    isDisabled && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.gameTypeInfo}>
                    <View style={styles.gameTypeLabelRow}>
                      <Text
                        style={[
                          styles.gameTypeLabel,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.primary },
                          isDisabled && { color: colors.gray400 },
                        ]}
                      >
                        {type.label}
                      </Text>
                      {isDisabled && (
                        <View
                          style={[
                            styles.upgradeBadge,
                            { backgroundColor: colors.warningBackground },
                          ]}
                        >
                          <Icon source="lock" size={12} color={colors.warningDark} />
                          <Text style={[styles.upgradeBadgeText, { color: colors.warningDark }]}>
                            Upgrade
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.gameTypeDescription, { color: colors.textSecondary }]}>
                      {type.description}
                    </Text>
                  </View>
                  {isSelected && !isDisabled && (
                    <Icon source="check" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

/** @deprecated Use GameTypeModal instead */
export const MatchTypeModal = GameTypeModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h4,
  },
  gameTypeList: {},
  gameTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  gameTypeInfo: {
    flex: 1,
  },
  gameTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gameTypeLabel: {
    ...typography.bodyBold,
  },
  gameTypeDescription: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  upgradeBadgeText: {
    ...typography.small,
    fontWeight: '700',
  },
});
