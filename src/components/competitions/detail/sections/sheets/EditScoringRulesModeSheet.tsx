/**
 * EditScoringRulesModeSheet
 *
 * Two-option picker over `competitions.per_round_rules_enabled`:
 *   - "General rules" (false)   → competition.point_system applies to every round.
 *   - "Per-round rules" (true)  → rounds.rules_override takes precedence at
 *                                 finalization. Gated behind the Premium
 *                                 `advanced_round_rules` feature flag.
 *
 * Non-Premium users see the per-round option rendered with a disabled
 * appearance + inline UpgradePrompt CTA that routes to the subscription
 * flow. Picking "General rules" is always available regardless of tier —
 * that's the default and the safer mode when downgrading.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';

import { OptionRow } from './OptionRow';
import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditScoringRulesModeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentPerRoundEnabled: boolean;
  /** Optional callback when the user taps "Upgrade" on the locked option. */
  onUpgrade?: () => void;
}

export function EditScoringRulesModeSheet({
  visible,
  onDismiss,
  competitionId,
  currentPerRoundEnabled,
  onUpgrade,
}: EditScoringRulesModeSheetProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();
  const canUsePerRound = checkFeature('advanced_round_rules').allowed;

  const [showUpgrade, setShowUpgrade] = useState(false);

  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSelectGeneral = useCallback(() => {
    if (!currentPerRoundEnabled) {
      onDismiss();
      return;
    }
    mutate({ per_round_rules_enabled: false });
  }, [currentPerRoundEnabled, mutate, onDismiss]);

  const handleSelectPerRound = useCallback(() => {
    if (!canUsePerRound) {
      setShowUpgrade(true);
      return;
    }
    if (currentPerRoundEnabled) {
      onDismiss();
      return;
    }
    mutate({ per_round_rules_enabled: true });
  }, [canUsePerRound, currentPerRoundEnabled, mutate, onDismiss]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Scoring Rules Mode"
      height={0.7}
      useModal
      testID="edit-scoring-rules-mode-sheet"
    >
      {showUpgrade ? (
        <View style={styles.upgradeWrapper}>
          <UpgradePrompt
            config={{
              feature: 'advanced_round_rules',
              title: 'Unlock Per-Round Rules',
              message:
                'Customize scoring per round — best-N-of-M team totals, pair points, and more. Premium only.',
              targetTier: 'premium',
              benefits: [
                'Best 3 of 4 team Stableford',
                'Pairs better ball with 1pt/0.5pt allocation',
                'Team scramble with custom points',
                'Auto-seeded knockout bracket from qualifying rounds',
              ],
            }}
            visible
            onUpgrade={() => {
              onDismiss();
              onUpgrade?.();
            }}
            onDismiss={() => setShowUpgrade(false)}
          />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            Pick how scoring rules are decided for this competition.
          </Text>

          <OptionRow
            icon="scale-balance"
            label="General rules"
            description="One set of scoring rules applies to every round."
            selected={!currentPerRoundEnabled}
            disabled={isPending}
            onPress={handleSelectGeneral}
          />

          {canUsePerRound ? (
            <OptionRow
              icon="tune-variant"
              label="Per-round rules"
              description="Each round can override the general rules (custom team points, pairs, qualifying bracket seeding)."
              selected={currentPerRoundEnabled}
              disabled={isPending}
              onPress={handleSelectPerRound}
            />
          ) : (
            <TouchableOpacity
              style={[
                styles.lockedRow,
                { borderColor: colors.gray200, backgroundColor: colors.gray100 },
              ]}
              onPress={handleSelectPerRound}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Per-round rules (Premium required)"
            >
              <View style={[styles.lockedIcon, { backgroundColor: colors.gray200 }]}>
                <Icon source="lock-outline" size={20} color={colors.gray600} />
              </View>
              <View style={styles.lockedText}>
                <View style={styles.lockedLabelRow}>
                  <Text
                    style={[styles.lockedLabel, { color: colors.textSecondary }]}
                  >
                    Per-round rules
                  </Text>
                  <View
                    style={[styles.premiumPill, { backgroundColor: colors.warning ?? '#f59e0b' }]}
                  >
                    <Text style={[styles.premiumPillText, { color: colors.white }]}>
                      Premium
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.lockedDescription, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  Upgrade to Premium to set scoring rules per round.
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

export default EditScoringRulesModeSheet;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  intro: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  upgradeWrapper: {
    flex: 1,
  },
  lockedRow: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 72,
    ...shadows.sm,
  },
  lockedIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lockedLabel: {
    ...typography.bodyBold,
  },
  premiumPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumPillText: {
    ...typography.caption,
    fontWeight: '700',
  },
  lockedDescription: {
    ...typography.small,
  },
});
