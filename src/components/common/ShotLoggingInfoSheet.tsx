/**
 * ShotLoggingInfoSheet - Bottom sheet explaining how to log shots
 *
 * Surfaced from the score-entry header info icon. Walks the player through
 * the GPS-based shot tracking flow and the requirements for it to work.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface ShotLoggingInfoSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface StepProps {
  step: number;
  title: string;
  description: string;
}

function Step({ step, title, description }: StepProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.step, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
        <Text style={[styles.stepBadgeText, { color: colors.white }]}>
          {step}
        </Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

interface BulletProps {
  text: string;
}

function Bullet({ text }: BulletProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

export function ShotLoggingInfoSheet({
  visible,
  onClose,
}: ShotLoggingInfoSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.8}
      title="How to Log Shots"
      showCloseButton
      useModal
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Tracking your shots builds a GPS map of your round so you can see
          distances, club performance and shot dispersion afterwards.
        </Text>

        <Step
          step={1}
          title="Hit your shot"
          description="Play as you normally would. Don't tap anything yet — accuracy comes from logging at your ball, not at the tee."
        />

        <Step
          step={2}
          title="Walk to your ball"
          description="Once you reach where your ball came to rest, you're ready to log. Standing next to the ball gives the GPS its best fix."
        />

        <Step
          step={3}
          title="Tap Log Shot"
          description="Hit the green Log Shot button on the score card. Your current GPS position is captured the instant you tap."
        />

        <Step
          step={4}
          title="Pick the club you hit"
          description="Select the club you used for that shot from your bag. The shot is then saved to the round."
        />

        <View style={[styles.tipsContainer, { backgroundColor: colors.infoLight }]}>
          <View style={styles.tipsHeader}>
            <Icon source="lightbulb-outline" size={20} color={colors.infoDark} />
            <Text style={[styles.tipsTitle, { color: colors.infoDark }]}>
              Tips for accurate tracking
            </Text>
          </View>
          <View style={styles.tipsBody}>
            <Bullet text="Log each shot at your ball — not as you walk away from the previous one." />
            <Bullet text="Wait a beat after walking up so the GPS settles before tapping." />
            <Bullet text="Set up your bag in your profile so the club picker shows the clubs you actually carry." />
            <Bullet text="If you tapped by mistake, use Undo on the toast that appears after logging." />
          </View>
        </View>

        <View style={[styles.requirementsContainer, { backgroundColor: colors.surfaceVariant }]}>
          <View style={styles.tipsHeader}>
            <Icon source="information-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>
              Requirements
            </Text>
          </View>
          <View style={styles.tipsBody}>
            <Bullet text="Premium subscription — shot tracking is a Premium feature." />
            <Bullet text="Solo round — tracking is only available when you're the only player on the round." />
            <Bullet text="Location permission — The Nineteenth needs GPS access while the app is open." />
            <Bullet text="Shot tracking enabled in Settings → Game." />
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    ...typography.bodyBold,
  },
  stepBody: {
    flex: 1,
    gap: spacing.xs,
  },
  stepTitle: {
    ...typography.bodyBold,
  },
  stepDescription: {
    ...typography.small,
    lineHeight: 20,
  },
  tipsContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  requirementsContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipsTitle: {
    ...typography.bodyBold,
  },
  tipsBody: {
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
});
