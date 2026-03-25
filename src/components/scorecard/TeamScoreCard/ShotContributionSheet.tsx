/**
 * ShotContributionSheet Component
 *
 * Displays shot contribution chips (Drive, Approach, Putt) and the
 * player selection modal with slide-up animation for the TeamScoreCard.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable, Animated } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';

interface ShotContributionSheetProps {
  team: TeamWithMembers;
  shotContributions?: ShotContributions;
  activeShotType: 'drive' | 'approach' | 'putt' | null;
  setActiveShotType: (type: 'drive' | 'approach' | 'putt' | null) => void;
  slideAnim: Animated.Value;
  getShotPlayerName: (playerId: string | undefined) => string;
  handlePlayerSelectForShot: (playerId: string) => void;
  handleClearShot: () => void;
  handleCloseModal: () => void;
  disabled?: boolean;
}

export const ShotContributionSheet = React.memo(function ShotContributionSheet({
  team,
  shotContributions,
  activeShotType,
  setActiveShotType,
  slideAnim,
  getShotPlayerName,
  handlePlayerSelectForShot,
  handleClearShot,
  handleCloseModal,
  disabled = false,
}: ShotContributionSheetProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={styles.shotContributionsContainer}>
        <Text style={[styles.shotContributionsTitle, { color: colors.textSecondary }]}>
          Shot Contributions
        </Text>

        {/* Shot type chips */}
        <View style={styles.shotChipsContainer}>
          {/* Drive */}
          <TouchableOpacity
            style={[
              styles.shotChip,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              shotContributions?.drive && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
            ]}
            onPress={() => setActiveShotType('drive')}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon source="golf-tee" size={16} color={shotContributions?.drive ? colors.primary : colors.textSecondary} />
            <View style={styles.shotChipContent}>
              <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>Drive</Text>
              <Text
                style={[
                  styles.shotChipPlayer,
                  { color: shotContributions?.drive ? colors.primary : colors.textTertiary }
                ]}
                numberOfLines={1}
              >
                {getShotPlayerName(shotContributions?.drive)}
              </Text>
            </View>
            {shotContributions?.drive && (
              <Icon source="check-circle" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>

          {/* Approach */}
          <TouchableOpacity
            style={[
              styles.shotChip,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              shotContributions?.approach && { backgroundColor: colors.success + '20', borderColor: colors.success },
            ]}
            onPress={() => setActiveShotType('approach')}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon source="flag" size={16} color={shotContributions?.approach ? colors.success : colors.textSecondary} />
            <View style={styles.shotChipContent}>
              <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>Approach</Text>
              <Text
                style={[
                  styles.shotChipPlayer,
                  { color: shotContributions?.approach ? colors.success : colors.textTertiary }
                ]}
                numberOfLines={1}
              >
                {getShotPlayerName(shotContributions?.approach)}
              </Text>
            </View>
            {shotContributions?.approach && (
              <Icon source="check-circle" size={16} color={colors.success} />
            )}
          </TouchableOpacity>

          {/* Putt */}
          <TouchableOpacity
            style={[
              styles.shotChip,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              shotContributions?.putt && { backgroundColor: colors.warning + '20', borderColor: colors.warning },
            ]}
            onPress={() => setActiveShotType('putt')}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Icon source="circle-outline" size={16} color={shotContributions?.putt ? colors.warning : colors.textSecondary} />
            <View style={styles.shotChipContent}>
              <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>Putt</Text>
              <Text
                style={[
                  styles.shotChipPlayer,
                  { color: shotContributions?.putt ? colors.warning : colors.textTertiary }
                ]}
                numberOfLines={1}
              >
                {getShotPlayerName(shotContributions?.putt)}
              </Text>
            </View>
            {shotContributions?.putt && (
              <Icon source="check-circle" size={16} color={colors.warning} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Player Selection Modal */}
      <Modal
        visible={activeShotType !== null}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCloseModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle}>
                <View style={[styles.modalHandleBar, { backgroundColor: colors.gray300 }]} />
              </View>

              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select {activeShotType === 'drive' ? 'Drive' : activeShotType === 'approach' ? 'Approach' : 'Putt'} Contributor
              </Text>

              <ScrollView style={styles.modalPlayerList} showsVerticalScrollIndicator={false}>
                {team.members?.map((member) => {
                  const isSelected = activeShotType === 'drive'
                    ? shotContributions?.drive === member.player_id
                    : activeShotType === 'approach'
                      ? shotContributions?.approach === member.player_id
                      : shotContributions?.putt === member.player_id;

                  const shotColor = activeShotType === 'drive'
                    ? colors.primary
                    : activeShotType === 'approach'
                      ? colors.success
                      : colors.warning;

                  return (
                    <TouchableOpacity
                      key={member.player_id}
                      style={[
                        styles.modalPlayerItem,
                        { backgroundColor: colors.surfaceVariant },
                        isSelected && { backgroundColor: shotColor + '20', borderColor: shotColor, borderWidth: 2 },
                      ]}
                      onPress={() => handlePlayerSelectForShot(member.player_id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.modalPlayerAvatar, { backgroundColor: shotColor + '30' }]}>
                        <Text style={[styles.modalPlayerInitial, { color: shotColor }]}>
                          {(member.player?.name ?? 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.modalPlayerName, { color: colors.textPrimary }]}>
                        {member.player?.name ?? 'Unknown'}
                      </Text>
                      {isSelected && (
                        <Icon source="check-circle" size={24} color={shotColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Clear selection button */}
              {((activeShotType === 'drive' && shotContributions?.drive) ||
                (activeShotType === 'approach' && shotContributions?.approach) ||
                (activeShotType === 'putt' && shotContributions?.putt)) && (
                <TouchableOpacity
                  style={[styles.modalClearButton, { borderColor: colors.border }]}
                  onPress={handleClearShot}
                  activeOpacity={0.7}
                >
                  <Icon source="close-circle-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.modalClearText, { color: colors.textSecondary }]}>
                    Clear selection
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={handleCloseModal}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCloseText, { color: colors.white }]}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  // Shot contributions styles
  shotContributionsContainer: {
    paddingTop: spacing.xs,
  },
  shotContributionsTitle: {
    ...typography.smallBold,
    marginBottom: spacing.md,
  },
  shotChipsContainer: {
    gap: spacing.sm,
  },
  shotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shotChipContent: {
    flex: 1,
  },
  shotChipLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  shotChipPlayer: {
    ...typography.bodyBold,
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
  modalPlayerName: {
    ...typography.body,
    flex: 1,
  },
  modalClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  modalClearText: {
    ...typography.body,
  },
  modalCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  modalCloseText: {
    ...typography.bodyBold,
  },
});
