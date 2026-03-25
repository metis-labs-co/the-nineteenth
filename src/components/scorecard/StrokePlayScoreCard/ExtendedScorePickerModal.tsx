/**
 * ExtendedScorePickerModal Component
 *
 * Modal for selecting scores beyond the standard relative-to-par buttons.
 * Displays a grid of score options (1-10) with their relative-to-par values
 * and color coding.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import {
  spacing,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatRelativeToPar } from './scoreCardHelpers';

interface ExtendedScorePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectScore: (strokes: number) => void;
  currentHolePar: number;
  selectedScore: number | undefined;
  getScoreColor: (relativeToPar: number | null) => string;
  disabled?: boolean;
}

export const ExtendedScorePickerModal = React.memo(function ExtendedScorePickerModal({
  visible,
  onClose,
  onSelectScore,
  currentHolePar,
  selectedScore,
  getScoreColor,
  disabled = false,
}: ExtendedScorePickerModalProps) {
  const colors = useThemeColors();

  const handleExtendedScore = useCallback(
    (strokes: number) => {
      if (!disabled) {
        onSelectScore(strokes);
        onClose();
      }
    },
    [disabled, onSelectScore, onClose]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            Select Score
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            Par {currentHolePar} - Extended scores
          </Text>
          <View style={styles.extendedScoreGrid}>
            {[...Array(10)].map((_, i) => {
              const strokes = i + 1;
              const relativeToPar = strokes - currentHolePar;
              const isSelected = selectedScore === strokes;

              return (
                <TouchableOpacity
                  key={strokes}
                  style={[
                    styles.extendedScoreButton,
                    { borderColor: colors.border },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => handleExtendedScore(strokes)}
                >
                  <Text
                    style={[
                      styles.extendedScoreNumber,
                      { color: isSelected ? colors.textOnColored : colors.textPrimary },
                    ]}
                  >
                    {strokes}
                  </Text>
                  <Text
                    style={[
                      styles.extendedScoreRelative,
                      { color: isSelected ? colors.textOnColored : getScoreColor(relativeToPar) },
                    ]}
                  >
                    {formatRelativeToPar(relativeToPar)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  extendedScoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  extendedScoreButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendedScoreNumber: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  extendedScoreRelative: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
