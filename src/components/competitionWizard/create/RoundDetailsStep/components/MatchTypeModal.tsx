/**
 * MatchTypeModal - Modal for selecting match type (game format)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, IconButton, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { MatchTypeModalProps } from '../types';

export const MatchTypeModal = React.memo(function MatchTypeModal({
  visible,
  selectedMatchType,
  availableGameTypes,
  onSelect,
  onClose,
}: MatchTypeModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={onClose} activeOpacity={1}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Match Type</Text>
            <IconButton icon="close" onPress={onClose} iconColor={colors.textPrimary} size={20} />
          </View>
          <View style={styles.matchTypeList}>
            {availableGameTypes.map((type) => {
              const isSelected = selectedMatchType === type.value;
              const isDisabled = type.disabled;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => !isDisabled && onSelect(type.value)}
                  disabled={isDisabled}
                  style={[
                    styles.matchTypeItem,
                    { borderBottomColor: colors.gray200 },
                    isSelected && { backgroundColor: colors.primaryLighter },
                    isDisabled && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.matchTypeInfo}>
                    <View style={styles.matchTypeLabelRow}>
                      <Text
                        style={[
                          styles.matchTypeLabel,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.primary },
                          isDisabled && { color: colors.gray400 },
                        ]}
                      >
                        {type.label}
                      </Text>
                      {isDisabled && (
                        <View
                          style={[styles.upgradeBadge, { backgroundColor: colors.warningBackground }]}
                        >
                          <Icon source="lock" size={12} color={colors.warningDark} />
                          <Text style={[styles.upgradeBadgeText, { color: colors.warningDark }]}>
                            Upgrade
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.matchTypeDescription, { color: colors.textSecondary }]}>
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
  matchTypeList: {},
  matchTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  matchTypeInfo: {
    flex: 1,
  },
  matchTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  matchTypeLabel: {
    ...typography.bodyBold,
  },
  matchTypeDescription: {
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
