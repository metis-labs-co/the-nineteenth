/**
 * GameTypeInfoBottomSheet
 *
 * Bottom sheet displaying detailed information about a game type or team format.
 * Shows rules, scoring breakdown, and tips to help users understand the format.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet } from '@/components/common/BottomSheet/BottomSheet';
import type { GameTypeDescription } from '@/constants/gameTypeDescriptions';

export interface GameTypeInfoBottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** Callback when the bottom sheet is closed */
  onClose: () => void;
  /** The game type description to display */
  gameType: GameTypeDescription | null;
}

/**
 * GameTypeInfoBottomSheet - Displays detailed game type information
 *
 * @example
 * ```tsx
 * <GameTypeInfoBottomSheet
 *   visible={showInfo}
 *   onClose={() => setShowInfo(false)}
 *   gameType={GAME_TYPE_DESCRIPTIONS['stableford']}
 * />
 * ```
 */
export const GameTypeInfoBottomSheet = React.memo(function GameTypeInfoBottomSheet({
  visible,
  onClose,
  gameType,
}: GameTypeInfoBottomSheetProps) {
  const colors = useThemeColors();

  if (!gameType) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={gameType.title}
      height={0.75}
      testID="game-type-info-bottom-sheet"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={[styles.summaryContainer, { backgroundColor: colors.surfaceVariant }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Icon source={gameType.icon} size={24} color={colors.white} />
          </View>
          <Text style={[styles.summary, { color: colors.textPrimary }]}>
            {gameType.summary}
          </Text>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            How It Works
          </Text>
          {gameType.howItWorks.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Scoring (if applicable) */}
        {gameType.scoring && gameType.scoring.length > 0 && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Scoring
              </Text>
              <View style={[styles.scoringTable, { backgroundColor: colors.surfaceVariant }]}>
                {gameType.scoring.map((row, index) => (
                  <View
                    key={index}
                    style={[
                      styles.scoringRow,
                      index < gameType.scoring!.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.scoringLabel, { color: colors.textSecondary }]}>
                      {row.label}
                    </Text>
                    <Text style={[styles.scoringValue, { color: colors.textPrimary }]}>
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Best For */}
        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Best For
          </Text>
          <Text style={[styles.bestForText, { color: colors.textSecondary }]}>
            {gameType.bestFor}
          </Text>
        </View>

        {/* Tip (if available) */}
        {gameType.tip && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.tipContainer, { backgroundColor: colors.infoLight }]}>
              <Icon source="lightbulb-outline" size={20} color={colors.info} />
              <View style={styles.tipContent}>
                <Text style={[styles.tipLabel, { color: colors.info }]}>Tip</Text>
                <Text style={[styles.tipText, { color: colors.infoDark }]}>
                  {gameType.tip}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    ...typography.body,
    flex: 1,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: spacing.sm,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
  },
  divider: {
    marginVertical: spacing.md,
  },
  scoringTable: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  scoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  scoringLabel: {
    ...typography.body,
    flex: 1,
  },
  scoringValue: {
    ...typography.bodyBold,
  },
  bestForText: {
    ...typography.body,
    lineHeight: 22,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  tipContent: {
    flex: 1,
  },
  tipLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs / 2,
  },
  tipText: {
    ...typography.small,
    lineHeight: 20,
  },
});

export default GameTypeInfoBottomSheet;
