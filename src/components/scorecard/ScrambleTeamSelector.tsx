/**
 * ScrambleTeamSelector Component
 *
 * A dropdown-style selector for switching between scramble teams.
 * Shows current team name and member names, with ability to switch teams.
 *
 * Used by:
 * - ViewRoundScreen (Team Score tab)
 * - ReviewScorecardScreen (Team Score tab during scoring)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Player } from '@/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

export interface ScrambleTeam {
  id: string;
  name: string;
  memberIds: string[];
}

interface ScrambleTeamSelectorProps {
  /** All teams available for selection */
  teams: ScrambleTeam[];
  /** Currently selected team index */
  selectedIndex: number;
  /** Callback when team selection changes */
  onSelectTeam: (index: number) => void;
  /** Function to get players for a team by index */
  getTeamPlayers: (index: number) => Player[];
  /** Optional: disable the selector */
  disabled?: boolean;
}

export const ScrambleTeamSelector = React.memo(function ScrambleTeamSelector({
  teams,
  selectedIndex,
  onSelectTeam,
  getTeamPlayers,
  disabled = false,
}: ScrambleTeamSelectorProps) {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const selectedTeam = teams[selectedIndex];
  const selectedPlayers = getTeamPlayers(selectedIndex);
  const selectedMemberNames = selectedPlayers.map((p) => p.name).join(' • ');

  // Animate sheet when modal becomes visible
  useEffect(() => {
    if (modalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
    }
  }, [modalVisible, slideAnim]);

  const handleOpenModal = useCallback(() => {
    if (!disabled && teams.length > 1) {
      setModalVisible(true);
    }
  }, [disabled, teams.length]);

  const handleCloseModal = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  }, [slideAnim]);

  const handleSelectTeam = useCallback((index: number) => {
    onSelectTeam(index);
    handleCloseModal();
  }, [onSelectTeam, handleCloseModal]);

  const handlePreviousTeam = useCallback(() => {
    if (selectedIndex > 0) {
      onSelectTeam(selectedIndex - 1);
    }
  }, [selectedIndex, onSelectTeam]);

  const handleNextTeam = useCallback(() => {
    if (selectedIndex < teams.length - 1) {
      onSelectTeam(selectedIndex + 1);
    }
  }, [selectedIndex, teams.length, onSelectTeam]);

  // Don't show selector if only one team
  if (teams.length <= 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surfaceVariant }]}>
        <View style={styles.headerContent}>
          <Icon source="account-group" size={20} color={colors.primary} />
          <Text style={[styles.teamName, { color: colors.textPrimary }]}>
            {selectedTeam?.name || 'Team'}
          </Text>
        </View>
        {selectedMemberNames && (
          <Text
            style={[styles.memberNames, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {selectedMemberNames}
          </Text>
        )}
      </View>
    );
  }

  const canGoPrevious = selectedIndex > 0;
  const canGoNext = selectedIndex < teams.length - 1;

  return (
    <>
      <View
        style={[
          styles.container,
          styles.selectable,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
        ]}
      >
        <View style={styles.navigationRow}>
          {/* Previous Arrow */}
          <TouchableOpacity
            style={[
              styles.navArrow,
              !canGoPrevious && styles.navArrowDisabled,
            ]}
            onPress={handlePreviousTeam}
            disabled={disabled || !canGoPrevious}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              source="chevron-left"
              size={28}
              color={canGoPrevious ? colors.primary : colors.gray300}
            />
          </TouchableOpacity>

          {/* Team Info (tappable to open modal) */}
          <TouchableOpacity
            style={styles.teamInfoContainer}
            onPress={handleOpenModal}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={styles.selectorRow}>
              <View style={styles.headerContent}>
                <Icon source="account-group" size={20} color={colors.primary} />
                <Text style={[styles.teamName, { color: colors.textPrimary }]}>
                  {selectedTeam?.name || 'Team'}
                </Text>
              </View>
              <View style={styles.chevronContainer}>
                <Text style={[styles.teamCount, { color: colors.textTertiary }]}>
                  {selectedIndex + 1}/{teams.length}
                </Text>
                <Icon source="chevron-down" size={16} color={colors.textSecondary} />
              </View>
            </View>
            {selectedMemberNames && (
              <Text
                style={[styles.memberNames, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {selectedMemberNames}
              </Text>
            )}
          </TouchableOpacity>

          {/* Next Arrow */}
          <TouchableOpacity
            style={[
              styles.navArrow,
              !canGoNext && styles.navArrowDisabled,
            ]}
            onPress={handleNextTeam}
            disabled={disabled || !canGoNext}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              source="chevron-right"
              size={28}
              color={canGoNext ? colors.primary : colors.gray300}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Selection Modal */}
      <Modal
        visible={modalVisible}
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
                Select Team
              </Text>

              <ScrollView style={styles.teamList} showsVerticalScrollIndicator={false}>
                {teams.map((team, index) => {
                  const isSelected = index === selectedIndex;
                  const teamPlayers = getTeamPlayers(index);
                  const memberNames = teamPlayers.map((p) => p.name).join(' • ');

                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamOption,
                        { backgroundColor: colors.surfaceVariant },
                        isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 },
                      ]}
                      onPress={() => handleSelectTeam(index)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.teamOptionHeader}>
                        <View style={[styles.teamOptionAvatar, { backgroundColor: colors.primary + '30' }]}>
                          <Icon source="account-group" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.teamOptionName, { color: colors.textPrimary }]}>
                          {team.name}
                        </Text>
                        {isSelected && (
                          <Icon source="check-circle" size={24} color={colors.primary} />
                        )}
                      </View>
                      {memberNames && (
                        <Text
                          style={[styles.teamOptionMembers, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {memberNames}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

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
  container: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  selectable: {
    borderWidth: 1,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navArrow: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowDisabled: {
    opacity: 0.4,
  },
  teamInfoContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  teamName: {
    ...typography.h3,
  },
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamCount: {
    ...typography.small,
  },
  memberNames: {
    ...typography.small,
    marginTop: spacing.xs,
    marginLeft: 28, // Align with team name (icon width + gap)
    lineHeight: 18,
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
  teamList: {
    maxHeight: 400,
  },
  teamOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  teamOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  teamOptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamOptionName: {
    ...typography.bodyBold,
    flex: 1,
  },
  teamOptionMembers: {
    ...typography.small,
    marginTop: spacing.sm,
    marginLeft: 52, // Align with team name (avatar + gap)
    lineHeight: 18,
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

export default ScrambleTeamSelector;
