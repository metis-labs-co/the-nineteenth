// src/screens/profile/BlockedUsersScreen.tsx
import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';

import { PageHeader } from '@/components/common/PageHeader';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useBlockedUsers, useBlockUser } from '@/hooks/moderation';

interface Props {
  navigation: { goBack: () => void };
}

/**
 * Review and undo blocks.
 *
 * Unblocking does not restore a friendship that blocking deleted — the two
 * users have to re-add each other.
 */
export default function BlockedUsersScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { data, isLoading } = useBlockedUsers();
  const { unblock, isBusy } = useBlockUser();

  const handleUnblock = useCallback((id: string) => unblock(id), [unblock]);

  const items = data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Blocked players" showBack onBack={navigation.goBack} />

      {!isLoading && items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          You haven&apos;t blocked anyone.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PlayerAvatar photoUrl={item.player?.photo_url} name={item.player?.name} size={40} />
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {item.player?.name ?? 'Player'}
              </Text>
              <TouchableOpacity
                onPress={() => handleUnblock(item.blocked_id)}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${item.player?.name ?? 'player'}`}
              >
                <Text style={{ ...typography.bodyBold, color: colors.primary }}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.lg, gap: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', padding: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  name: { ...typography.body, flex: 1 },
});
