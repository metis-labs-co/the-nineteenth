/**
 * AutoGeneratePreviewModal - Preview auto-generated pairings before confirming
 *
 * Features:
 * - Preview of generated groups with tee times
 * - Regenerate button to try again
 * - Edit Manually option
 * - Confirm button to finalize
 * - Shows warnings for small groups
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { PlayerAvatar, LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatTeeTimeForDisplay } from '@/utils';
import type { PairingGroup, PairingPlayer, GeneratePairingsResult } from '@/types';

export interface AutoGeneratePreviewModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Callback to close the modal
   */
  onClose: () => void;
  /**
   * Generated groups to preview
   */
  groups: PairingGroup[];
  /**
   * Generation result with warnings
   */
  result: GeneratePairingsResult | null;
  /**
   * Player lookup for displaying player info
   */
  playerLookup: Map<string, PairingPlayer>;
  /**
   * Callback when regenerate is pressed
   */
  onRegenerate: () => void;
  /**
   * Callback when confirm is pressed
   */
  onConfirm: () => void;
  /**
   * Callback when edit manually is pressed
   */
  onEditManually: () => void;
  /**
   * Whether regeneration is in progress
   */
  regenerating?: boolean;
}

export const AutoGeneratePreviewModal = React.memo(
  function AutoGeneratePreviewModal({
    visible,
    onClose,
    groups,
    result,
    playerLookup,
    onRegenerate,
    onConfirm,
    onEditManually,
    regenerating = false,
  }: AutoGeneratePreviewModalProps) {
    const colors = useThemeColors();

    const renderGroupPreview = useCallback(
      (group: PairingGroup, index: number) => {
        const players = group.playerIds
          .map((id) => playerLookup.get(id))
          .filter(Boolean) as PairingPlayer[];

        const isSmallGroup = players.length < 4;

        return (
          <View
            key={index}
            style={[
              styles.groupCard,
              {
                backgroundColor: colors.surface,
                borderColor: isSmallGroup ? colors.warning : colors.border,
              },
            ]}
          >
            {/* Group Header */}
            <View style={styles.groupHeader}>
              <View
                style={[
                  styles.groupBadge,
                  { backgroundColor: colors.primaryBackground },
                ]}
              >
                <Text style={[styles.groupNumber, { color: colors.primary }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
                  Group {index + 1}
                </Text>
                <Text style={[styles.teeTimeText, { color: colors.textSecondary }]}>
                  {formatTeeTimeForDisplay(group.teeTime)}
                </Text>
              </View>
              <View
                style={[
                  styles.playerCountBadge,
                  {
                    backgroundColor: isSmallGroup
                      ? colors.warningBackground
                      : colors.successBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.playerCountText,
                    { color: isSmallGroup ? colors.warning : colors.success },
                  ]}
                >
                  {players.length} players
                </Text>
              </View>
            </View>

            {/* Players List */}
            <View style={styles.playersList}>
              {players.map((player) => (
                <View key={player.id} style={styles.playerRow}>
                  <PlayerAvatar
                    photoUrl={player.photoUrl}
                    name={player.name}
                    size={32}
                  />
                  <Text
                    style={[styles.playerName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                  {player.handicap !== null && player.handicap !== undefined && (
                    <Text
                      style={[styles.handicapText, { color: colors.textSecondary }]}
                    >
                      HC: {player.handicap}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      },
      [colors, playerLookup]
    );

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.border, backgroundColor: colors.surfaceElevated },
            ]}
          >
            <View style={styles.headerLeft}>
              <Icon source="account-group" size={24} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Preview Groups
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Icon source="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Summary Banner */}
          <View
            style={[
              styles.summaryBanner,
              { backgroundColor: colors.primaryBackground },
            ]}
          >
            <Icon
              source="lightbulb-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.summaryText, { color: colors.primary }]}>
              {result
                ? `${result.groupCount} groups created for ${result.playerCount} players using snake draft`
                : 'Loading...'}
            </Text>
          </View>

          {/* Warnings */}
          {result?.warnings && result.warnings.length > 0 && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: colors.warningBackground },
              ]}
            >
              <Icon
                source="alert-circle-outline"
                size={20}
                color={colors.warning}
              />
              <View style={styles.warningTextContainer}>
                {result.warnings.map((warning, i) => (
                  <Text
                    key={i}
                    style={[styles.warningText, { color: colors.warning }]}
                  >
                    {warning}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Groups Preview */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {regenerating ? (
              <LoadingSpinner size="lg" />
            ) : (
              groups.map((group, index) => renderGroupPreview(group, index))
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border, backgroundColor: colors.surfaceElevated },
            ]}
          >
            {/* Secondary Actions */}
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={onRegenerate}
                disabled={regenerating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Regenerate groups"
              >
                <Icon
                  source="refresh"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Regenerate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: colors.border },
                ]}
                onPress={onEditManually}
                disabled={regenerating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit groups manually"
              >
                <Icon
                  source="pencil-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Edit Manually
                </Text>
              </TouchableOpacity>
            </View>

            {/* Primary Action */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                regenerating && { opacity: 0.5 },
              ]}
              onPress={onConfirm}
              disabled={regenerating || groups.length === 0}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Confirm and use these groups"
            >
              <Icon source="check" size={20} color={colors.white} />
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                Use These Groups
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  summaryText: {
    ...typography.body,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningText: {
    ...typography.caption,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  groupCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  groupBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNumber: {
    ...typography.bodyBold,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  teeTimeText: {
    ...typography.caption,
  },
  playerCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  playerCountText: {
    ...typography.caption,
    fontWeight: '600',
  },
  playersList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerName: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
  },
  handicapText: {
    ...typography.caption,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
    ...shadows.md,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  secondaryButtonText: {
    ...typography.body,
    fontWeight: '500',
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});

export default AutoGeneratePreviewModal;
