/**
 * NewUserFallback - friendly "get started" card for users with no data.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface NewUserFallbackProps {
  onCreateRound: () => void;
}

export const NewUserFallback = React.memo(function NewUserFallback({
  onCreateRound,
}: NewUserFallbackProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <Icon source="party-popper" size={32} color={colors.primary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Welcome to The Nineteenth
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Get started by creating a round, joining a competition, or finding
        friends.
      </Text>
      <Action
        icon="golf"
        label="Create your first round"
        onPress={onCreateRound}
        colors={colors}
      />
      <Action
        icon="bag-personal-outline"
        label="Set up your bag"
        onPress={() => navigation.navigate('WhatsInTheBag')}
        colors={colors}
      />
      <Action
        icon="trophy-outline"
        label="Join a competition"
        onPress={() => navigation.navigate('JoinCompetition')}
        colors={colors}
      />
      <Action
        icon="account-multiple-plus-outline"
        label="Find friends"
        onPress={() => navigation.navigate('Friends')}
        colors={colors}
      />
    </View>
  );
});

interface ActionProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}

function Action({ icon, label, onPress, colors }: ActionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, { backgroundColor: colors.surfaceVariant }]}
    >
      <Icon source={icon} size={20} color={colors.primary} />
      <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Icon source="chevron-right" size={20} color={colors.textSecondary} />
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
