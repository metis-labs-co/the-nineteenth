/**
 * TeeSelectionModal - Modal for selecting which tees to play from
 */

import React from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Text, Surface, IconButton, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { TEE_COLORS, type TeeSelectionModalProps } from '../types';

export const TeeSelectionModal = React.memo(function TeeSelectionModal({
  visible,
  availableTees,
  selectedTeeName,
  onSelect,
  onClose,
}: TeeSelectionModalProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Surface
          style={[
            styles.modalContent,
            { backgroundColor: isDark ? colors.gray100 : colors.surface },
          ]}
          elevation={4}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Tees</Text>
            <IconButton icon="close" onPress={onClose} iconColor={colors.textPrimary} size={20} />
          </View>
          <ScrollView
            style={styles.teeListScroll}
            contentContainerStyle={styles.teeListContent}
            showsVerticalScrollIndicator={true}
          >
            {availableTees.map((tee, teeIndex) => {
              const isSelected = selectedTeeName === tee.name;
              const teeColor = TEE_COLORS[tee.color.toLowerCase()] || colors.gray400;
              const isWhiteTee = tee.color.toLowerCase() === 'white';

              return (
                <Pressable
                  key={`${tee.name}-${teeIndex}`}
                  onPress={() => onSelect(tee)}
                  style={[
                    styles.teeItem,
                    { borderBottomColor: colors.gray200 },
                    isSelected && { backgroundColor: colors.primaryLighter },
                  ]}
                >
                  <View style={styles.teeItemContent}>
                    {/* Tee Color Dot */}
                    <View
                      style={[
                        styles.teeItemColorDot,
                        {
                          backgroundColor: teeColor,
                          borderColor: isWhiteTee ? colors.gray300 : 'transparent',
                          borderWidth: isWhiteTee ? 1 : 0,
                        },
                      ]}
                    />
                    {/* Tee Info */}
                    <View style={styles.teeItemInfo}>
                      <Text
                        style={[
                          styles.teeItemName,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.primary },
                        ]}
                      >
                        {tee.name}
                      </Text>
                      <View style={styles.teeItemDetails}>
                        {tee.totalYardage && (
                          <Text style={[styles.teeItemDetail, { color: colors.textSecondary }]}>
                            {tee.totalYardage.toLocaleString()} yds
                          </Text>
                        )}
                        {tee.courseRating && (
                          <Text style={[styles.teeItemDetail, { color: colors.textSecondary }]}>
                            CR: {tee.courseRating.toFixed(1)}
                          </Text>
                        )}
                        {tee.slopeRating && (
                          <Text style={[styles.teeItemDetail, { color: colors.textSecondary }]}>
                            Slope: {tee.slopeRating}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  {isSelected && <Icon source="check" size={24} color={colors.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Surface>
      </View>
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
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 400,
    minWidth: 300,
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
  teeListScroll: {
    maxHeight: 350,
  },
  teeListContent: {
    paddingBottom: spacing.sm,
  },
  teeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  teeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  teeItemColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  teeItemInfo: {
    flex: 1,
  },
  teeItemName: {
    ...typography.bodyBold,
  },
  teeItemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  teeItemDetail: {
    ...typography.small,
  },
});
