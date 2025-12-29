/**
 * IncompleteScoresModal - Modal showing which holes have missing scores
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { IncompleteHole } from '../hooks';

interface IncompleteScoresModalProps {
  visible: boolean;
  incompleteHoles: IncompleteHole[];
  onClose: () => void;
  onHolePress: (holeNumber: number) => void;
}

export function IncompleteScoresModal({
  visible,
  incompleteHoles,
  onClose,
  onHolePress,
}: IncompleteScoresModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const renderHoleItem = ({ item }: { item: IncompleteHole }) => (
    <TouchableOpacity
      style={[styles.incompleteHoleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onHolePress(item.holeNumber)}
      activeOpacity={0.7}
      accessibilityLabel={`Go to hole ${item.holeNumber}`}
      accessibilityRole="button"
    >
      <View style={styles.incompleteHoleLeft}>
        <View style={[styles.holeNumberBadge, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.holeNumberText, { color: colors.error }]}>{item.holeNumber}</Text>
        </View>
        <View style={styles.missingPlayersContainer}>
          <Text style={[styles.missingPlayersLabel, { color: colors.textSecondary }]}>
            Missing scores:
          </Text>
          <Text style={[styles.missingPlayersNames, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.missingPlayers.map((p) => p.name.split(' ')[0]).join(', ')}
          </Text>
        </View>
      </View>
      <Icon source="chevron-right" size={24} color={colors.gray400} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalTitleContainer}>
              <View style={[styles.warningIconContainer, { backgroundColor: colors.warning + '20' }]}>
                <Icon source="alert-circle" size={24} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Incomplete Scores
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {incompleteHoles.length} {incompleteHoles.length === 1 ? 'hole' : 'holes'} missing scores
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.gray200 }]}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon source="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.modalDescription}>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              All players must have scores entered for every hole before submitting. Tap a hole to enter the missing scores.
            </Text>
          </View>

          {/* Incomplete Holes List */}
          <FlatList
            data={incompleteHoles}
            keyExtractor={(item) => `hole-${item.holeNumber}`}
            renderItem={renderHoleItem}
            contentContainerStyle={styles.incompleteHolesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Go Back Button */}
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={[styles.modalButton, { borderColor: colors.gray400 }]}
              labelStyle={{ color: colors.textPrimary }}
            >
              Go Back
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  warningIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h4,
  },
  modalSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  descriptionText: {
    ...typography.body,
  },
  incompleteHolesList: {
    paddingHorizontal: spacing.lg,
  },
  incompleteHoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  incompleteHoleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  holeNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeNumberText: {
    ...typography.h4,
    fontWeight: '700',
  },
  missingPlayersContainer: {
    flex: 1,
  },
  missingPlayersLabel: {
    ...typography.caption,
  },
  missingPlayersNames: {
    ...typography.body,
    marginTop: 2,
  },
  modalActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalButton: {
    marginBottom: spacing.sm,
  },
});
