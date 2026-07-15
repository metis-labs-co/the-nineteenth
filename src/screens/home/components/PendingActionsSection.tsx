/**
 * PendingActionsSection - "stuff waiting on you" rows.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { PendingAction, PendingActionType } from '@/types/home';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface PendingActionsSectionProps {
  actions: PendingAction[];
}

const ICON_BY_TYPE: Record<PendingActionType, string> = {
  competition_invite: 'trophy-outline',
  league_invite: 'medal-outline',
  scorecard_verify: 'clipboard-check-outline',
  score_mismatch: 'alert-circle-outline',
  tag_to_league: 'tag-outline',
};

export const PendingActionsSection = React.memo(
  function PendingActionsSection({ actions }: PendingActionsSectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    if (actions.length === 0) return null;

    const handlePress = (action: PendingAction) => {
      // Cast: PendingAction.params is intentionally untyped; the route name
      // and param shape are paired correctly at the source (see
      // notificationToPendingAction).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigation.navigate(action.route as any, action.params);
    };

    return (
      <View style={styles.container}>
        <SectionHeader title="Pending" />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {actions.map((action, idx) => (
            <TouchableOpacity
              key={action.id}
              onPress={() => handlePress(action)}
              accessibilityRole="button"
              accessibilityLabel={`${action.label}. ${action.ctaLabel}`}
              style={[
                styles.row,
                idx < actions.length - 1 && {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Icon
                source={ICON_BY_TYPE[action.type] ?? 'circle-outline'}
                size={20}
                color={colors.primary}
              />
              <View style={styles.rowText}>
                <Text
                  style={[styles.label, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {action.label}
                </Text>
                {action.subLabel ? (
                  <Text
                    style={[styles.subLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {action.subLabel}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.cta, { color: colors.primary }]}>
                {action.ctaLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
  },
  subLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  cta: {
    ...typography.small,
    fontWeight: '700',
  },
});
