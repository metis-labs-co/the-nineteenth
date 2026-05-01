/**
 * SubMatchSkinsConfigSheet
 *
 * Bottom sheet for configuring a skins game scoped to a single sub-match.
 *
 * Composes the existing `SkinsConfigBottomSheet` and replaces its default
 * participants section with an interactive picker:
 *
 *  • Individual mode — chip strip of every player on either side of the
 *    sub-match. The current user toggles participants on / off.
 *  • Team-vs-team mode — the two real `Team` records (team A vs team B),
 *    using cumulative team scores per the round's team format. Disabled
 *    when the round has no real team records (`canUseTeamMode === false`).
 *
 * Save flow:
 *  1. The composed `SkinsConfigBottomSheet` validates pot + scoring fields.
 *  2. We translate the chosen participants into `CreateSkinsGameInput`
 *     (`is_team_skins` + `participant_team_ids` for team mode; raw
 *     `participant_ids` for individual mode).
 *  3. `useCreateSkinsGame` writes the row with `sub_match_id` set.
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { SkinsConfigBottomSheet } from './SkinsConfigBottomSheet';
import { SkinsDisclaimerModal, hasAcceptedSkinsDisclaimer } from './SkinsDisclaimerModal';
import { useCreateSkinsGame } from '@/hooks/skins';
import type {
  SkinsConfig,
  SkinsGame,
  CreateSkinsGameInput,
} from '@/types/database/skins.types';
import type { SubMatch } from '@/types/database/round.types';

export interface SubMatchSkinsPlayer {
  id: string;
  name: string;
  /** Which side of the sub-match this player is on. */
  side: 'a' | 'b';
}

export interface SubMatchSkinsTeam {
  id: string;
  name: string;
}

export interface SubMatchSkinsConfigSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** Sub-match being configured. */
  subMatch: SubMatch;
  /** All players in the sub-match (union of team A and team B). */
  players: SubMatchSkinsPlayer[];
  /**
   * Real team records for this sub-match's two sides, if available.
   * When omitted the team-vs-team radio is disabled.
   */
  teams?: { teamA: SubMatchSkinsTeam; teamB: SubMatchSkinsTeam } | null;
  /** ID of the current user (used for created_by + disclaimer_accepted_by). */
  currentUserId: string;
  /** Round the sub-match belongs to. */
  roundId: string;
  /** Called once the skins game has been successfully created. */
  onCreated?: (game: SkinsGame) => void;
}

type ParticipantMode = 'individual' | 'team';

const MIN_INDIVIDUAL_PARTICIPANTS = 2;

export function SubMatchSkinsConfigSheet({
  visible,
  onDismiss,
  subMatch,
  players,
  teams,
  currentUserId,
  roundId,
  onCreated,
}: SubMatchSkinsConfigSheetProps) {
  const colors = useThemeColors();
  const canUseTeamMode = !!teams;

  const [mode, setMode] = useState<ParticipantMode>(canUseTeamMode ? 'team' : 'individual');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(
    () => new Set(players.map((p) => p.id))
  );
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<SkinsConfig | null>(null);

  const createSkinsGame = useCreateSkinsGame();

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const validationError = useMemo(() => {
    if (mode === 'team') {
      if (!teams) return 'Team mode is not available for this sub-match.';
      return null;
    }
    if (selectedPlayerIds.size < MIN_INDIVIDUAL_PARTICIPANTS) {
      return `Select at least ${MIN_INDIVIDUAL_PARTICIPANTS} players.`;
    }
    return null;
  }, [mode, teams, selectedPlayerIds]);

  const handleConfigSave = async (config: SkinsConfig) => {
    if (validationError) return;

    const accepted = await hasAcceptedSkinsDisclaimer();
    if (!accepted) {
      setPendingConfig(config);
      setShowDisclaimer(true);
      return;
    }
    await createGame(config);
  };

  const createGame = async (config: SkinsConfig) => {
    const input: CreateSkinsGameInput =
      mode === 'team' && teams
        ? {
            round_id: roundId,
            sub_match_id: subMatch.id,
            participant_ids: [],
            participant_team_ids: [teams.teamA.id, teams.teamB.id],
            is_team_skins: true,
            pot_type: config.pot_type,
            pot_value: config.pot_value,
            scoring_type: config.scoring_type,
            currency: config.currency,
          }
        : {
            round_id: roundId,
            sub_match_id: subMatch.id,
            participant_ids: Array.from(selectedPlayerIds),
            is_team_skins: false,
            pot_type: config.pot_type,
            pot_value: config.pot_value,
            scoring_type: config.scoring_type,
            currency: config.currency,
          };

    try {
      const created = await createSkinsGame.mutateAsync({
        ...input,
        disclaimerAcceptedBy: currentUserId,
      });
      onCreated?.(created);
      onDismiss();
    } catch (error) {
      console.error('[SubMatchSkinsConfigSheet] create failed:', error);
    }
  };

  const handleDisclaimerAccept = async () => {
    setShowDisclaimer(false);
    if (pendingConfig) {
      const config = pendingConfig;
      setPendingConfig(null);
      await createGame(config);
    }
  };

  const handleDisclaimerCancel = () => {
    setShowDisclaimer(false);
    setPendingConfig(null);
  };

  const participantsSlot = (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        PARTICIPANTS
      </Text>

      <ModeRadio
        label="Team A vs Team B"
        description={
          canUseTeamMode
            ? 'Cumulative team score per hole (uses round team format).'
            : 'Available when this round has team records configured.'
        }
        icon="account-multiple"
        selected={mode === 'team'}
        disabled={!canUseTeamMode}
        onSelect={() => canUseTeamMode && setMode('team')}
      />
      <ModeRadio
        label="Individual"
        description="Every selected player competes for the pot."
        icon="account"
        selected={mode === 'individual'}
        onSelect={() => setMode('individual')}
      />

      {mode === 'team' && teams ? (
        <View
          style={[
            styles.teamCard,
            { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
          ]}
        >
          <Icon source="flag-checkered" size={20} color={colors.primary} />
          <Text style={[typography.small, { color: colors.textPrimary }]}>
            {teams.teamA.name}
            <Text style={{ color: colors.textSecondary }}> vs </Text>
            {teams.teamB.name}
          </Text>
        </View>
      ) : null}

      {mode === 'individual' ? (
        <View style={styles.chipGroup}>
          {players.map((player) => {
            const selected = selectedPlayerIds.has(player.id);
            return (
              <TouchableOpacity
                key={player.id}
                onPress={() => togglePlayer(player.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${player.name}`}
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    typography.small,
                    { color: selected ? colors.white : colors.textPrimary },
                  ]}
                >
                  {player.name}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: selected ? colors.white : colors.textSecondary,
                      marginLeft: spacing.xs,
                    },
                  ]}
                >
                  {player.side === 'a' ? 'Team A' : 'Team B'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {validationError ? (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.sm }]}>
          {validationError}
        </Text>
      ) : null}
    </View>
  );

  return (
    <>
      <SkinsConfigBottomSheet
        visible={visible}
        onDismiss={onDismiss}
        onSave={handleConfigSave}
        titleOverride="Sub-match Skins"
        participantsSlot={participantsSlot}
      />
      <SkinsDisclaimerModal
        visible={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onCancel={handleDisclaimerCancel}
      />
    </>
  );
}

interface ModeRadioProps {
  label: string;
  description: string;
  icon: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function ModeRadio({ label, description, icon, selected, disabled, onSelect }: ModeRadioProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      style={[
        styles.modeRow,
        {
          backgroundColor: selected ? `${colors.primary}10` : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Icon source={icon} size={20} color={selected ? colors.primary : colors.textSecondary} />
      <View style={styles.modeText}>
        <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Icon
        source={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={20}
        color={selected ? colors.primary : colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  modeText: {
    flex: 1,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
});

export default SubMatchSkinsConfigSheet;
