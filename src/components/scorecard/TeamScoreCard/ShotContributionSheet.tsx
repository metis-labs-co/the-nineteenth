/**
 * ShotContributionSheet Component
 *
 * Displays par-aware shot contribution chips and the player selection modal
 * with a slide-up animation for the TeamScoreCard.
 *
 * Slot layout depends on the par of the current hole:
 *   Par 3: Tee Shot · Chip · Putt
 *   Par 4: Tee Shot · Approach · Putt
 *   Par 5: Tee Shot · Second Shot · Approach · Putt
 *
 * See `getShotSlotsForPar` for the source of truth.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import {
  getShotSlotsForPar,
  type ShotSlot,
  type ShotSlotColorKey,
  type ShotSlotConfig,
} from '@/utils/teamScoring';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ShotContributionSheetProps {
  team: TeamWithMembers;
  currentHole: Hole;
  shotContributions?: ShotContributions;
  activeShotType: ShotSlot | null;
  setActiveShotType: (type: ShotSlot | null) => void;
  slideAnim: Animated.Value;
  getShotPlayerName: (playerId: string | undefined) => string;
  handlePlayerSelectForShot: (playerId: string) => void;
  handleClearShot: () => void;
  handleCloseModal: () => void;
  disabled?: boolean;
}

function resolveSlotColor(
  colors: ReturnType<typeof useThemeColors>,
  colorKey: ShotSlotColorKey,
): string {
  switch (colorKey) {
    case 'primary': return colors.primary;
    case 'info': return colors.info;
    case 'success': return colors.success;
    case 'warning': return colors.warning;
  }
}

export const ShotContributionSheet = React.memo(function ShotContributionSheet({
  team,
  currentHole,
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
  const [isExpanded, setIsExpanded] = useState(false);

  const slots = useMemo<ShotSlotConfig[]>(
    () => getShotSlotsForPar(currentHole.par),
    [currentHole.par],
  );

  // Auto-expand when the player picker opens so the chips are visible
  // when the modal closes and the user sees their selection.
  useEffect(() => {
    if (activeShotType !== null && !isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(true);
    }
  }, [activeShotType, isExpanded]);

  const handleToggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const anyFilled = slots.some((s) => !!shotContributions?.[s.slot]);

  const activeSlotConfig = activeShotType
    ? slots.find((s) => s.slot === activeShotType)
    : undefined;
  const activeSlotColor = activeSlotConfig
    ? resolveSlotColor(colors, activeSlotConfig.colorKey)
    : colors.primary;

  return (
    <>
      <View style={styles.shotContributionsContainer}>
        <TouchableOpacity
          style={styles.shotContributionsHeader}
          onPress={handleToggleExpanded}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel="Shot Contributions"
          accessibilityHint={isExpanded ? 'Collapse shot contributions' : 'Expand shot contributions'}
        >
          <Text style={[styles.shotContributionsTitle, { color: colors.textSecondary }]}>
            Shot Contributions
          </Text>
          <View style={styles.shotContributionsHeaderRight}>
            {!isExpanded && (
              anyFilled ? (
                <View style={styles.statusDots}>
                  {slots.map((slot) => {
                    const slotColor = resolveSlotColor(colors, slot.colorKey);
                    const filled = !!shotContributions?.[slot.slot];
                    return (
                      <View
                        key={slot.slot}
                        style={[
                          styles.statusDot,
                          { borderColor: slotColor },
                          filled && { backgroundColor: slotColor },
                        ]}
                      />
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.tapToTrack, { color: colors.textTertiary }]}>
                  Tap to track
                </Text>
              )
            )}
            <Icon
              source={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {/* Shot type chips */}
        {isExpanded && (
        <View style={styles.shotChipsContainer}>
          {slots.map((slot) => {
            const slotColor = resolveSlotColor(colors, slot.colorKey);
            const playerId = shotContributions?.[slot.slot];
            const filled = !!playerId;
            return (
              <TouchableOpacity
                key={slot.slot}
                style={[
                  styles.shotChip,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  filled && { backgroundColor: slotColor + '20', borderColor: slotColor },
                ]}
                onPress={() => setActiveShotType(slot.slot)}
                disabled={disabled}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${slot.label} contributor`}
              >
                <Icon source={slot.icon} size={16} color={filled ? slotColor : colors.textSecondary} />
                <View style={styles.shotChipContent}>
                  <Text style={[styles.shotChipLabel, { color: colors.textSecondary }]}>
                    {slot.label}
                  </Text>
                  <Text
                    style={[
                      styles.shotChipPlayer,
                      { color: filled ? slotColor : colors.textTertiary },
                    ]}
                    numberOfLines={1}
                  >
                    {getShotPlayerName(playerId)}
                  </Text>
                </View>
                {filled && (
                  <Icon source="check-circle" size={16} color={slotColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        )}
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
                Select {activeSlotConfig?.label ?? 'Shot'} Contributor
              </Text>

              <ScrollView style={styles.modalPlayerList} showsVerticalScrollIndicator={false}>
                {team.members?.map((member) => {
                  const selectedPlayerId = activeShotType
                    ? shotContributions?.[activeShotType]
                    : undefined;
                  const isSelected = selectedPlayerId === member.player_id;

                  return (
                    <TouchableOpacity
                      key={member.player_id}
                      style={[
                        styles.modalPlayerItem,
                        { backgroundColor: colors.surfaceVariant },
                        isSelected && { backgroundColor: activeSlotColor + '20', borderColor: activeSlotColor, borderWidth: 2 },
                      ]}
                      onPress={() => handlePlayerSelectForShot(member.player_id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.modalPlayerAvatar, { backgroundColor: activeSlotColor + '30' }]}>
                        <Text style={[styles.modalPlayerInitial, { color: activeSlotColor }]}>
                          {(member.player?.name ?? 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.modalPlayerName, { color: colors.textPrimary }]}>
                        {member.player?.name ?? 'Unknown'}
                      </Text>
                      {isSelected && (
                        <Icon source="check-circle" size={24} color={activeSlotColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Clear selection button */}
              {activeShotType && shotContributions?.[activeShotType] && (
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
  shotContributionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  shotContributionsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shotContributionsTitle: {
    ...typography.smallBold,
  },
  statusDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  tapToTrack: {
    ...typography.caption,
  },
  shotChipsContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
