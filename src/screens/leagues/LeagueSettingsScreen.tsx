/**
 * LeagueSettingsScreen - Admin settings for a league
 *
 * - Edit name/description
 * - Manage players (remove)
 * - Archive league
 * - Share invite code
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, FormInput, Pill, ConfirmationDialog, SectionHeader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  useLeague,
  useLeaguePlayers,
  useUpdateLeague,
  useArchiveLeague,
  useRemoveLeaguePlayer,
} from '@/hooks/useLeagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SettingsRoute = RouteProp<RootStackParamList, 'LeagueSettings'>;

export default function LeagueSettingsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SettingsRoute>();
  const { user } = useAuth();
  const leagueId = route.params.leagueId;

  const { data: league } = useLeague(leagueId);
  const { data: players } = useLeaguePlayers(leagueId);
  const updateMutation = useUpdateLeague(leagueId);
  const archiveMutation = useArchiveLeague();
  const removePlayerMutation = useRemoveLeaguePlayer(leagueId);

  const [name, setName] = useState(league?.name ?? '');
  const [description, setDescription] = useState(league?.description ?? '');
  const [hasChanges, setHasChanges] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{ id: string; name: string } | null>(null);

  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setHasChanges(true);
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges || name.trim().length < 2) return;
    try {
      await updateMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setHasChanges(false);
      Alert.alert('Saved', 'League settings updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [hasChanges, name, description, updateMutation]);

  const handleShare = useCallback(async () => {
    if (!league) return;
    try {
      await Share.share({
        message: `Join my league "${league.name}" on The Nineteenth! Use code: ${league.invite_code}`,
      });
    } catch {
      // User cancelled
    }
  }, [league]);

  const handleArchive = useCallback(() => {
    setShowArchiveDialog(true);
  }, []);

  const confirmArchive = useCallback(async () => {
    setShowArchiveDialog(false);
    try {
      await archiveMutation.mutateAsync(leagueId);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [leagueId, archiveMutation, navigation]);

  const handleRemovePlayer = useCallback(
    (playerId: string, playerName: string) => {
      setPlayerToRemove({ id: playerId, name: playerName });
    },
    []
  );

  const confirmRemovePlayer = useCallback(() => {
    if (!playerToRemove) return;
    removePlayerMutation.mutate(playerToRemove.id);
    setPlayerToRemove(null);
  }, [playerToRemove, removePlayerMutation]);

  const isArchived = league?.status === 'archived';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="League Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Edit Details */}
        {!isArchived && (
          <View style={styles.section}>
            <SectionHeader title="Details" />

            <FormInput
              label="League Name"
              floatingLabel
              placeholder="League name"
              value={name}
              onChangeText={handleNameChange}
              maxLength={50}
              accessibilityHint="Edit league name"
            />

            <FormInput
              label="Description"
              floatingLabel
              placeholder="Optional description"
              value={description}
              onChangeText={handleDescriptionChange}
              maxLength={200}
              multiline
              numberOfLines={3}
              accessibilityHint="Edit league description"
            />

            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={name.trim().length < 2 || updateMutation.isPending}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      name.trim().length >= 2 ? colors.primary : colors.gray200,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Save changes"
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    {
                      color:
                        name.trim().length >= 2
                          ? colors.white
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Invite Code */}
        <View style={styles.section}>
          <SectionHeader title="Invite Code" />
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.inviteRow, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel="Share invite code"
          >
            <Icon source="share-variant-outline" size={20} color={colors.primary} />
            <Text style={[styles.inviteCode, { color: colors.primary }]}>
              {league?.invite_code}
            </Text>
            <Text style={[styles.shareTap, { color: colors.textSecondary }]}>
              Tap to share
            </Text>
          </TouchableOpacity>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Players */}
        <View style={styles.section}>
          <SectionHeader title={`Players (${players?.length ?? 0})`} />

          {players?.map((lp: any) => {
            const isCreator = lp.player_id === league?.created_by;
            return (
              <View
                key={lp.player_id}
                style={[styles.playerRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primaryBackground }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(lp.player?.name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                  {lp.player?.name}
                </Text>
                {isCreator ? (
                  <Pill label="Creator" variant="primary" size="sm" />
                ) : !isArchived ? (
                  <TouchableOpacity
                    onPress={() =>
                      handleRemovePlayer(
                        lp.player_id,
                        lp.player?.name ?? ''
                      )
                    }
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel={`Remove ${lp.player?.name}`}
                  >
                    <Icon source="close-circle-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Archive */}
        {!isArchived && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <TouchableOpacity
                onPress={handleArchive}
                style={[styles.archiveButton, { borderColor: colors.error }]}
                activeOpacity={0.7}
                accessibilityLabel="Archive this league"
              >
                <Icon source="archive-outline" size={20} color={colors.error} />
                <Text style={[styles.archiveButtonText, { color: colors.error }]}>
                  Archive League
                </Text>
              </TouchableOpacity>
              <Text style={[styles.archiveHint, { color: colors.textSecondary }]}>
                Archived leagues are read-only. The leaderboard is preserved but no new rounds can be tagged.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmationDialog
        visible={showArchiveDialog}
        title="Archive League"
        message="Archived leagues are read-only. No new rounds can be tagged and no players can join. This cannot be undone."
        confirmLabel="Archive"
        confirmVariant="destructive"
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />
      <ConfirmationDialog
        visible={playerToRemove !== null}
        title="Remove Player"
        message={playerToRemove ? `Remove ${playerToRemove.name} from this league? Their tagged rounds will also be removed.` : ''}
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={confirmRemovePlayer}
        onCancel={() => setPlayerToRemove(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  divider: {
    marginHorizontal: spacing.lg,
  },
  saveButton: {
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  inviteCode: {
    ...typography.bodyBold,
    flex: 1,
  },
  shareTap: {
    ...typography.caption,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.bodyBold,
  },
  playerName: {
    ...typography.body,
    flex: 1,
  },
  archiveButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  archiveButtonText: {
    ...typography.bodyBold,
  },
  archiveHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
