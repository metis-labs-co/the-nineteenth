/**
 * Sub-match skins card.
 *
 * Mirrors the toggle UI used by `SkinsSection` on the round-settings screen
 * — same iconography, switch behaviour, summary card, and Premium gate via
 * `useCheckFeature('skins_game')`. The toggle binds to whether an *active*
 * skins game exists for this sub-match:
 *
 *   • OFF + premium → tapping opens the sub-match skins config sheet; on
 *     save, a new sub-match-scoped skins game is created.
 *   • ON  → tapping the summary edits config (re-opens the sheet); flipping
 *     the switch off cancels the active game (with confirmation).
 *   • non-premium → renders the same locked toggle row as round-level skins,
 *     pressing it routes to the Subscription screen.
 */

import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconDice, IconLock } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, skinsColor } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import {
  useActiveSkinsGameForSubMatch,
  useCancelSkinsGame,
  useProcessSkinsHole,
  useProcessTeamSkinsHole,
  backfillSkinsResults,
} from '@/hooks/skins';
import { SubMatchSkinsConfigSheet } from '@/components/skins/SubMatchSkinsConfigSheet';
import type {
  SubMatchSkinsPlayer,
  SubMatchSkinsTeam,
} from '@/components/skins/SubMatchSkinsConfigSheet';
import type { SubMatch } from '@/types/database/round.types';
import type { RootStackParamList } from '@/navigation/types';

export interface SubMatchSkinsCardProps {
  subMatch: SubMatch;
  roundId: string;
  /** All sub-match players, with the side they're on. */
  players: SubMatchSkinsPlayer[];
  /** Two real Team records for this sub-match's sides, when team mode is available. */
  teams?: { teamA: SubMatchSkinsTeam; teamB: SubMatchSkinsTeam } | null;
  /** Current user id (creator + disclaimer accepter). Null when no auth. */
  currentUserId: string | null;
  /** Whether the current user may create / cancel skins on this sub-match. */
  canManageSkins: boolean;
}

export function SubMatchSkinsCard({
  subMatch,
  roundId,
  players,
  teams,
  currentUserId,
  canManageSkins,
}: SubMatchSkinsCardProps) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('skins_game').allowed;

  const [configVisible, setConfigVisible] = useState(false);

  const { data: activeGame, isLoading } = useActiveSkinsGameForSubMatch(subMatch.id);
  const cancelMutation = useCancelSkinsGame();
  const processSkinsHoleMutation = useProcessSkinsHole();
  const processTeamSkinsHoleMutation = useProcessTeamSkinsHole();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const skinsEnabled = !!activeGame;
  const isDisabled = !canManageSkins || !currentUserId;

  const handleToggle = useCallback(() => {
    if (isDisabled) return;
    if (skinsEnabled && activeGame) {
      Alert.alert(
        'Cancel skins game?',
        'This stops the game and removes any pending payouts. This cannot be undone.',
        [
          { text: 'Keep playing', style: 'cancel' },
          {
            text: 'Cancel game',
            style: 'destructive',
            onPress: () => cancelMutation.mutate({ gameId: activeGame.id }),
          },
        ]
      );
      return;
    }
    setConfigVisible(true);
  }, [isDisabled, skinsEnabled, activeGame, cancelMutation]);

  const handleEditConfig = useCallback(() => {
    if (!canManageSkins) return;
    // Editing an active game is destructive (we'd cancel + recreate). For
    // now expose this as a cancel-then-reconfigure flow via the toggle.
    handleToggle();
  }, [canManageSkins, handleToggle]);

  const handleRecalculate = useCallback(() => {
    if (!activeGame || isRecalculating) return;
    Alert.alert(
      'Recalculate skins?',
      'Reprocesses every hole that already has scores. Useful if this game was created mid-round and earlier holes are missing results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalculate',
          onPress: async () => {
            setIsRecalculating(true);
            try {
              await backfillSkinsResults(
                activeGame,
                processSkinsHoleMutation,
                processTeamSkinsHoleMutation
              );
              Alert.alert('Skins recalculated', 'Scored holes have been processed.');
            } catch (error) {
              Alert.alert(
                'Recalculation failed',
                error instanceof Error ? error.message : 'Unknown error'
              );
            } finally {
              setIsRecalculating(false);
            }
          },
        },
      ]
    );
  }, [activeGame, isRecalculating, processSkinsHoleMutation, processTeamSkinsHoleMutation]);

  const handleUpgradePress = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  return (
    <View
      style={[
        styles.outerCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

      {isPremium ? (
        <>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: skinsEnabled ? `${skinsColor}20` : colors.surfaceVariant },
                ]}
              >
                <IconDice size={24} color={skinsEnabled ? skinsColor : colors.textSecondary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  {skinsEnabled ? 'Sub-match Skins Enabled' : 'Enable Sub-match Skins'}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {skinsEnabled
                    ? activeGame?.is_team_skins
                      ? 'Team A vs Team B betting on cumulative scores'
                      : 'Hole-by-hole betting between sub-match players'
                    : 'Hole-by-hole betting scoped to this sub-match'}
                </Text>
              </View>
            </View>
            <Switch
              value={skinsEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: `${skinsColor}80` }}
              thumbColor={skinsEnabled ? skinsColor : colors.surfaceVariant}
              disabled={isDisabled || isLoading}
            />
          </View>

          {skinsEnabled && activeGame ? (
            <TouchableOpacity
              style={[
                styles.configSummary,
                {
                  backgroundColor: `${skinsColor}10`,
                  borderColor: `${skinsColor}40`,
                },
              ]}
              onPress={handleEditConfig}
              activeOpacity={canManageSkins ? 0.7 : 1}
              accessibilityRole="button"
              accessibilityLabel="Edit sub-match skins configuration"
              disabled={!canManageSkins}
            >
              <View style={styles.configSummaryContent}>
                <Row label="Pot">
                  ${activeGame.pot_value.toFixed(2)}
                  {activeGame.pot_type === 'per_hole'
                    ? `/hole ($${(activeGame.pot_value * 18).toFixed(2)} total)`
                    : ' total'}
                </Row>
                <Row label="Scoring">
                  {activeGame.scoring_type === 'gross' ? 'Gross' : 'Net (with handicap)'}
                </Row>
                <Row label="Mode">
                  {activeGame.is_team_skins ? 'Team A vs Team B' : 'Individual'}
                </Row>
              </View>
              {canManageSkins ? (
                <Text style={[styles.tapHint, { color: skinsColor }]}>Tap to edit</Text>
              ) : null}
            </TouchableOpacity>
          ) : null}

          {skinsEnabled && activeGame && canManageSkins ? (
            <TouchableOpacity
              style={[
                styles.recalcButton,
                {
                  borderColor: `${skinsColor}40`,
                  opacity: isRecalculating ? 0.6 : 1,
                },
              ]}
              onPress={handleRecalculate}
              disabled={isRecalculating}
              accessibilityRole="button"
              accessibilityLabel="Recalculate skins for already-scored holes"
              accessibilityState={{ disabled: isRecalculating, busy: isRecalculating }}
            >
              <Icon
                source="refresh"
                size={16}
                color={skinsColor}
              />
              <Text style={[styles.recalcButtonText, { color: skinsColor }]}>
                {isRecalculating ? 'Recalculating…' : 'Recalculate scored holes'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {!canManageSkins ? (
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Only the competition organiser or a player in this sub-match can manage skins.
            </Text>
          ) : null}
        </>
      ) : (
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={handleUpgradePress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium to use skins games"
          activeOpacity={0.7}
        >
          <View style={styles.toggleContent}>
            <View
              style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}
            >
              <IconLock size={24} color={colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Enable Sub-match Skins
                </Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Upgrade to Premium for skins betting
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {currentUserId ? (
        <SubMatchSkinsConfigSheet
          visible={configVisible}
          onDismiss={() => setConfigVisible(false)}
          subMatch={subMatch}
          players={players}
          teams={teams ?? null}
          roundId={roundId}
          currentUserId={currentUserId}
        />
      ) : null}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.configRow}>
      <Text style={[styles.configLabel, { color: colors.textSecondary }]}>{label}:</Text>
      <Text style={[styles.configValue, { color: colors.textPrimary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outerCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  divider: {
    marginBottom: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.caption,
    marginTop: spacing.xs / 2,
  },
  configSummary: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  configSummaryContent: {
    gap: spacing.xs,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    ...typography.small,
  },
  configValue: {
    ...typography.bodyBold,
  },
  tapHint: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  recalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 44,
  },
  recalcButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
