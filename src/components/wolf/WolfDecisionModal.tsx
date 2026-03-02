/**
 * WolfDecisionModal - Partner selection modal for Wolf game
 *
 * Modal that allows the Wolf player to choose their partner for the current hole,
 * or declare Lone Wolf / Blind Wolf. Shows point values for each choice.
 *
 * Decision Options:
 * - Partner: Pick a player to team up with (2pts each if win, opponents get 3pts each if lose)
 * - Lone Wolf: Play alone vs the pack (4pts if win, 1pt to each opponent if lose)
 * - Blind Wolf: Declare alone BEFORE tee shots for double stakes (6pts if win, 2pts to each if lose)
 *
 * @example
 * ```tsx
 * <WolfDecisionModal
 *   visible={showDecision}
 *   onDismiss={() => setShowDecision(false)}
 *   wolfGame={wolfGame}
 *   currentHole={5}
 *   wolfId="player-123"
 *   wolfName="John"
 *   otherPlayers={[
 *     { id: "player-456", name: "Sarah" },
 *     { id: "player-789", name: "Mike" },
 *     { id: "player-012", name: "Lisa" },
 *   ]}
 *   blindWolfEnabled={true}
 *   canSelectBlindWolf={true}
 *   onSelectPartner={(partnerId, isBlindWolf) => {
 *     submitWolfDecision({ partnerId, isBlindWolf });
 *     setShowDecision(false);
 *   }}
 * />
 * ```
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, wolfColor } from '@/constants/theme';
import { WOLF_POINTS } from '@/types/database/wolf.types';
import type { WolfGame } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfDecisionModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is dismissed */
  onDismiss: () => void;
  /** The Wolf game configuration */
  wolfGame: WolfGame;
  /** Current hole number (1-18) */
  currentHole: number;
  /** The Wolf player's ID for this hole */
  wolfId: string;
  /** The Wolf player's name */
  wolfName: string;
  /** Other players who can be chosen as partner */
  otherPlayers: { id: string; name: string }[];
  /** Whether Blind Wolf is enabled in game settings */
  blindWolfEnabled: boolean;
  /** Whether Blind Wolf can still be selected (only before any scores entered) */
  canSelectBlindWolf: boolean;
  /** Callback when a choice is made */
  onSelectPartner: (partnerId: string | null, isBlindWolf: boolean) => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WolfDecisionModal({
  visible,
  onDismiss,
  wolfGame,
  currentHole,
  wolfName,
  otherPlayers,
  blindWolfEnabled,
  canSelectBlindWolf,
  onSelectPartner,
  testID,
}: WolfDecisionModalProps) {
  const colors = useThemeColors();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Announce for accessibility
      AccessibilityInfo.announceForAccessibility(
        `Wolf's Choice for Hole ${currentHole}. ${wolfName} is Wolf. Choose a partner or go alone.`
      );
    } else {
      // Reset animations
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, currentHole, wolfName]);

  // Handle partner selection
  const handleSelectPartner = useCallback(
    (partnerId: string) => {
      AccessibilityInfo.announceForAccessibility('Partner selected');
      onSelectPartner(partnerId, false);
    },
    [onSelectPartner]
  );

  // Handle Lone Wolf selection
  const handleLoneWolf = useCallback(() => {
    AccessibilityInfo.announceForAccessibility('Lone Wolf selected');
    onSelectPartner(null, false);
  }, [onSelectPartner]);

  // Handle Blind Wolf selection
  const handleBlindWolf = useCallback(() => {
    AccessibilityInfo.announceForAccessibility('Blind Wolf selected');
    onSelectPartner(null, true);
  }, [onSelectPartner]);

  // Format pot value display
  const formatPoints = (points: number): string => {
    if (wolfGame.pot_enabled && wolfGame.pot_value_per_point) {
      const value = points * wolfGame.pot_value_per_point;
      return `${points}pts ($${value.toFixed(2)})`;
    }
    return `${points}pts`;
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        testID={testID}
      >
        <TouchableOpacity
          style={styles.backdropPressable}
          onPress={onDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close decision modal"
        />
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
            shadows.xl,
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`Wolf's choice for hole ${currentHole}`}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIconContainer, { backgroundColor: `${wolfColor}15` }]}>
              <Icon source="dog-side" size={32} color={wolfColor} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Wolf&apos;s Choice
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Hole {currentHole} • {wolfName} is Wolf
              </Text>
            </View>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Options */}
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Partner Options */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Choose a Partner
            </Text>
            {otherPlayers.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSelectPartner(player.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Partner with ${player.name}`}
                accessibilityHint={`Win: ${WOLF_POINTS.PARTNER_WIN} points each, Lose: opponents get ${WOLF_POINTS.PARTNER_LOSE_OPPONENT} points each`}
                testID={`${testID}-partner-${player.id}`}
              >
                <View style={styles.optionMain}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.primaryLighter }]}>
                    <Icon source="account-plus" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                      {player.name}
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      Team up for best ball
                    </Text>
                  </View>
                </View>
                <View style={styles.optionPoints}>
                  <View style={styles.pointRow}>
                    <Text style={[styles.pointLabel, { color: colors.success }]}>Win:</Text>
                    <Text style={[styles.pointValue, { color: colors.success }]}>
                      {formatPoints(WOLF_POINTS.PARTNER_WIN)} each
                    </Text>
                  </View>
                  <View style={styles.pointRow}>
                    <Text style={[styles.pointLabel, { color: colors.error }]}>Lose:</Text>
                    <Text style={[styles.pointValue, { color: colors.error }]}>
                      {formatPoints(WOLF_POINTS.PARTNER_LOSE_OPPONENT)} to each opponent
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Divider with "OR" */}
            <View style={styles.orDivider}>
              <Divider style={[styles.orLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.textSecondary }]}>OR</Text>
              <Divider style={[styles.orLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Lone Wolf Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                styles.loneWolfCard,
                {
                  backgroundColor: `${wolfColor}10`,
                  borderColor: wolfColor,
                },
              ]}
              onPress={handleLoneWolf}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go Lone Wolf"
              accessibilityHint={`Win: ${WOLF_POINTS.LONE_WOLF_WIN} points, Lose: ${WOLF_POINTS.LONE_WOLF_LOSE_OPPONENT} point to each opponent`}
              testID={`${testID}-lone-wolf`}
            >
              <View style={styles.optionMain}>
                <View style={[styles.optionIcon, { backgroundColor: `${wolfColor}20` }]}>
                  <Icon source="dog-side" size={24} color={wolfColor} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: wolfColor }]}>
                    Lone Wolf
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Play alone against the pack
                  </Text>
                </View>
              </View>
              <View style={styles.optionPoints}>
                <View style={styles.pointRow}>
                  <Text style={[styles.pointLabel, { color: colors.success }]}>Win:</Text>
                  <Text style={[styles.pointValue, { color: colors.success }]}>
                    {formatPoints(WOLF_POINTS.LONE_WOLF_WIN)}
                  </Text>
                </View>
                <View style={styles.pointRow}>
                  <Text style={[styles.pointLabel, { color: colors.error }]}>Lose:</Text>
                  <Text style={[styles.pointValue, { color: colors.error }]}>
                    {formatPoints(WOLF_POINTS.LONE_WOLF_LOSE_OPPONENT)} to each opponent
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Blind Wolf Option */}
            {blindWolfEnabled && (
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  styles.blindWolfCard,
                  {
                    backgroundColor: canSelectBlindWolf ? `${colors.warning}15` : colors.surfaceVariant,
                    borderColor: canSelectBlindWolf ? colors.warning : colors.border,
                    opacity: canSelectBlindWolf ? 1 : 0.6,
                  },
                ]}
                onPress={canSelectBlindWolf ? handleBlindWolf : undefined}
                disabled={!canSelectBlindWolf}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Go Blind Wolf"
                accessibilityState={{ disabled: !canSelectBlindWolf }}
                accessibilityHint={
                  canSelectBlindWolf
                    ? `Win: ${WOLF_POINTS.BLIND_WOLF_WIN} points, Lose: ${WOLF_POINTS.BLIND_WOLF_LOSE_OPPONENT} points to each opponent`
                    : 'Must declare before any tee shots'
                }
                testID={`${testID}-blind-wolf`}
              >
                <View style={styles.optionMain}>
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: canSelectBlindWolf ? `${colors.warning}25` : colors.gray200 },
                    ]}
                  >
                    <Text style={styles.fireEmoji}>🔥</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <View style={styles.blindWolfTitleRow}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: canSelectBlindWolf ? colors.warning : colors.textDisabled },
                        ]}
                      >
                        Blind Wolf
                      </Text>
                      {!canSelectBlindWolf && (
                        <View style={[styles.lockedBadge, { backgroundColor: colors.gray300 }]}>
                          <Icon source="lock" size={12} color={colors.textDisabled} />
                          <Text style={[styles.lockedText, { color: colors.textDisabled }]}>
                            Too late
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: canSelectBlindWolf ? colors.textSecondary : colors.textDisabled },
                      ]}
                    >
                      {canSelectBlindWolf
                        ? 'Declare before tee shots for 2x stakes'
                        : 'Must declare before any player tees off'}
                    </Text>
                  </View>
                </View>
                {canSelectBlindWolf && (
                  <View style={styles.optionPoints}>
                    <View style={styles.pointRow}>
                      <Text style={[styles.pointLabel, { color: colors.success }]}>Win:</Text>
                      <Text style={[styles.pointValue, { color: colors.success }]}>
                        {formatPoints(WOLF_POINTS.BLIND_WOLF_WIN)}
                      </Text>
                    </View>
                    <View style={styles.pointRow}>
                      <Text style={[styles.pointLabel, { color: colors.error }]}>Lose:</Text>
                      <Text style={[styles.pointValue, { color: colors.error }]}>
                        {formatPoints(WOLF_POINTS.BLIND_WOLF_LOSE_OPPONENT)} to each opponent
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderTopColor: colors.border }]}
            onPress={onDismiss}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Decide later"
            accessibilityHint="Close this dialog and decide later"
            testID={`${testID}-cancel`}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Decide Later
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '92%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  divider: {
    marginHorizontal: spacing.lg,
  },
  optionsScroll: {
    maxHeight: 400,
  },
  optionsContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  optionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  loneWolfCard: {
    borderWidth: 2,
  },
  blindWolfCard: {
    borderWidth: 2,
    marginTop: spacing.sm,
  },
  optionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...typography.bodyBold,
  },
  optionDescription: {
    ...typography.small,
    marginTop: 2,
  },
  blindWolfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  lockedText: {
    ...typography.caption,
  },
  optionPoints: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  pointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointLabel: {
    ...typography.caption,
  },
  pointValue: {
    ...typography.captionBold,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    ...typography.captionBold,
    marginHorizontal: spacing.md,
  },
  cancelButton: {
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.bodyBold,
  },
});

export default WolfDecisionModal;
