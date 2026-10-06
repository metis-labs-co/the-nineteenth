/**
 * AgeLock - hides social content from users who are under 13 or unresolved.
 *
 * Deliberately NOT a reuse of FeatureLock. That component is framed as
 * "upgrade to unlock"; offering a 12-year-old a purchase they cannot legally
 * make is the wrong message and an App Review risk in its own right. AgeLock
 * renders a neutral explanation with no purchase path.
 *
 * @example
 * ```tsx
 * <AgeLock message="Comments are turned off for this account.">
 *   <RoundComments roundId={roundId} />
 * </AgeLock>
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';

import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useSocialAccess } from '@/hooks/useSocialAccess';

export interface AgeLockProps {
  children: React.ReactNode;
  /** Overrides the default explanation. */
  message?: string;
}

const DEFAULT_MESSAGE =
  'Social features are not available on this account. Confirm your age in Settings if this looks wrong.';

export function AgeLock({ children, message = DEFAULT_MESSAGE }: AgeLockProps) {
  const colors = useThemeColors();
  const { isRestricted, isLoading } = useSocialAccess();

  // Neither content nor notice until we actually know. Showing the notice here
  // would flash the restriction message at every eligible user on cold start.
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isRestricted) return <>{children}</>;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Icon source="lock-outline" size={24} color={colors.textSecondary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  loading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
