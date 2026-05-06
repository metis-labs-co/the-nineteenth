/**
 * NewUserFallback — "Getting started" card for the Home screen.
 *
 * Shown until the user has completed all four onboarding tasks. Completed
 * tasks render as a muted, checked row but stay tappable so the user can
 * revisit them. Once every task is done, the card is hidden (returns null).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useHomeUiStore } from '@/store/homeUiStore';
import type { RootStackParamList } from '@/navigation/types';
import type { GettingStartedTasks } from '@/hooks/home/useHomeData';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DISMISS_THRESHOLD = 2;

interface NewUserFallbackProps {
  onCreateRound: () => void;
  gettingStarted: GettingStartedTasks;
}

export const NewUserFallback = React.memo(function NewUserFallback({
  onCreateRound,
  gettingStarted,
}: NewUserFallbackProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const dismissed = useHomeUiStore((s) => s.gettingStartedDismissed);
  const dismissGettingStarted = useHomeUiStore((s) => s.dismissGettingStarted);

  if (gettingStarted.allCompleted || dismissed) return null;

  const completedCount =
    Number(gettingStarted.hasCreatedRound) +
    Number(gettingStarted.hasSetUpBag) +
    Number(gettingStarted.hasJoinedCompetition) +
    Number(gettingStarted.hasAddedFriend);
  const canDismiss = completedCount >= DISMISS_THRESHOLD;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      {canDismiss ? (
        <TouchableOpacity
          onPress={dismissGettingStarted}
          accessibilityRole="button"
          accessibilityLabel="Dismiss getting started"
          hitSlop={8}
          style={styles.closeButton}
        >
          <Icon source="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      <Icon source="party-popper" size={32} color={colors.primary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Getting started
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Knock these out to get the most out of The Nineteenth.
      </Text>
      <Action
        icon="golf"
        label="Create your first round"
        completedLabel="Round created"
        completed={gettingStarted.hasCreatedRound}
        onPress={onCreateRound}
        colors={colors}
      />
      <Action
        icon="bag-personal-outline"
        label="Set up your bag"
        completedLabel="Bag set up"
        completed={gettingStarted.hasSetUpBag}
        onPress={() => navigation.navigate('WhatsInTheBag')}
        colors={colors}
      />
      <Action
        icon="trophy-outline"
        label="Join a competition"
        completedLabel="Competition joined"
        completed={gettingStarted.hasJoinedCompetition}
        onPress={() => navigation.navigate('JoinCompetition')}
        colors={colors}
      />
      <Action
        icon="account-multiple-plus-outline"
        label="Find friends"
        completedLabel="Friend added"
        completed={gettingStarted.hasAddedFriend}
        onPress={() => navigation.navigate('Friends')}
        colors={colors}
      />
    </View>
  );
});

interface ActionProps {
  icon: string;
  label: string;
  completedLabel: string;
  completed: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}

function Action({
  icon,
  label,
  completedLabel,
  completed,
  onPress,
  colors,
}: ActionProps) {
  const displayLabel = completed ? completedLabel : label;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      accessibilityState={{ checked: completed }}
      style={[styles.action, { backgroundColor: colors.surfaceVariant }]}
    >
      <Icon
        source={completed ? 'check-circle' : icon}
        size={20}
        color={completed ? colors.success : colors.primary}
      />
      <Text
        style={[
          styles.actionLabel,
          {
            color: completed ? colors.textSecondary : colors.textPrimary,
            textDecorationLine: completed ? 'line-through' : 'none',
          },
        ]}
      >
        {displayLabel}
      </Text>
      {!completed ? (
        <Icon source="chevron-right" size={20} color={colors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 1,
  },
  title: {
    ...typography.h3,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  actionLabel: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
});
