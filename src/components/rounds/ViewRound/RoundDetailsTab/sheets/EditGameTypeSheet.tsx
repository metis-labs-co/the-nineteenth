/**
 * EditGameTypeSheet - Edit a round's format in a focused bottom sheet.
 *
 * Treats "Team Match Play" as its own composite selection (game_type +
 * team_format) rather than a bare game_type so users can distinguish it
 * from individual Match Play at a glance. On save, writes game_type,
 * is_team_round and team_format atomically via updateRound.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { roundKeys } from '@/hooks/queryKeys';
import { updateRound } from '@/screens/admin/EditRoundScreen/hooks/useEditRoundData';
import { GameTypeInfoBottomSheet } from '@/components/competitionWizard/create/GameTypeInfoBottomSheet';
import {
  GAME_TYPE_DESCRIPTIONS,
  TEAM_FORMAT_DESCRIPTIONS,
  type GameTypeDescription,
} from '@/constants/gameTypeDescriptions';
import type { GameType, TeamFormat } from '@/types/database.types';
import type { SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// Format model
// ============================================================================

/**
 * Composite format identifier. Distinguishes individual Match Play from
 * Team Match Play, which would otherwise both serialise to
 * game_type='match-play'.
 */
type FormatId =
  | 'stableford'
  | 'stroke'
  | 'par'
  | 'match-play'
  | 'best-ball'
  | 'scramble'
  | 'shamble'
  | 'match-play-team';

interface FormatOption {
  id: FormatId;
  label: string;
  description: string;
  icon: string;
  /** Whether this option is a team format (group + team-mode gate). */
  isTeam: boolean;
  /** GameType-level tier requirement. Team Match Play borrows match-play's. */
  requiredTier: SubscriptionTier;
  /** Which `game_type` row to check against `limits.allowedGameTypes`. */
  gameTypeForTier: GameType;
}

const INDIVIDUAL_OPTIONS: FormatOption[] = [
  {
    id: 'stableford',
    label: 'Stableford',
    description: 'Points-based scoring (2 for par, 3 for birdie)',
    icon: 'star-outline',
    isTeam: false,
    requiredTier: 'free',
    gameTypeForTier: 'stableford',
  },
  {
    id: 'stroke',
    label: 'Stroke Play',
    description: 'Lowest total strokes wins',
    icon: 'counter',
    isTeam: false,
    requiredTier: 'social',
    gameTypeForTier: 'stroke',
  },
  {
    id: 'par',
    label: 'Par',
    description: 'Win/lose each hole (+1, 0, -1 scoring)',
    icon: 'plus-minus',
    isTeam: false,
    requiredTier: 'social',
    gameTypeForTier: 'par',
  },
  {
    id: 'match-play',
    label: 'Match Play',
    description: 'Hole-by-hole head-to-head competition',
    icon: 'sword-cross',
    isTeam: false,
    requiredTier: 'premium',
    gameTypeForTier: 'match-play',
  },
];

const TEAM_OPTIONS: FormatOption[] = [
  {
    id: 'best-ball',
    label: 'Best Ball',
    description: 'Team format — best score counts',
    icon: 'account-group',
    isTeam: true,
    requiredTier: 'premium',
    gameTypeForTier: 'best-ball',
  },
  {
    id: 'scramble',
    label: 'Scramble',
    description: 'Team format — everyone plays from best shot',
    icon: 'account-group-outline',
    isTeam: true,
    requiredTier: 'premium',
    gameTypeForTier: 'scramble',
  },
  {
    id: 'shamble',
    label: 'Shamble',
    description: 'Best drive, then individual play',
    icon: 'golf-tee',
    isTeam: true,
    requiredTier: 'premium',
    gameTypeForTier: 'shamble',
  },
  {
    id: 'match-play-team',
    label: 'Team Match Play',
    description: 'Team vs team — hole by hole',
    icon: 'sword-cross',
    isTeam: true,
    requiredTier: 'premium',
    // For tier purposes, Team Match Play rides on the match-play game type
    // allowance (since it serialises to game_type='match-play').
    gameTypeForTier: 'match-play',
  },
];

const TIER_DISPLAY: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  enterprise: 'Enterprise',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

// ============================================================================
// Encoding helpers
// ============================================================================

function decodeFormat(round: {
  game_type: GameType;
  is_team_round: boolean;
  team_format: TeamFormat | null;
}): FormatId {
  if (round.is_team_round && round.team_format === 'match-play-team') {
    return 'match-play-team';
  }
  return round.game_type;
}

function encodeFormat(id: FormatId): {
  game_type: GameType;
  is_team_round: boolean;
  team_format: TeamFormat | null;
} {
  switch (id) {
    case 'match-play-team':
      return {
        game_type: 'match-play',
        is_team_round: true,
        team_format: 'match-play-team',
      };
    case 'best-ball':
      return { game_type: 'best-ball', is_team_round: true, team_format: 'best-ball' };
    case 'scramble':
      return { game_type: 'scramble', is_team_round: true, team_format: 'scramble' };
    case 'shamble':
      return { game_type: 'shamble', is_team_round: true, team_format: 'shamble' };
    default:
      return { game_type: id, is_team_round: false, team_format: null };
  }
}

function getDescription(id: FormatId): GameTypeDescription | null {
  if (id === 'match-play-team') return TEAM_FORMAT_DESCRIPTIONS['match-play-team'];
  return GAME_TYPE_DESCRIPTIONS[id] ?? null;
}

// ============================================================================
// Props
// ============================================================================

export interface EditGameTypeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  currentGameType: GameType;
  currentIsTeamRound: boolean;
  currentTeamFormat: TeamFormat | null;
  /** Whether team formats should be offered (i.e. competition has teams on). */
  supportsTeams?: boolean;
  onUpgradePress: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function EditGameTypeSheet({
  visible,
  onDismiss,
  roundId,
  currentGameType,
  currentIsTeamRound,
  currentTeamFormat,
  supportsTeams = false,
  onUpgradePress,
}: EditGameTypeSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { limits } = useSubscriptionContext();

  const [infoFormat, setInfoFormat] = useState<FormatId | null>(null);

  const currentFormat = useMemo<FormatId>(
    () =>
      decodeFormat({
        game_type: currentGameType,
        is_team_round: currentIsTeamRound,
        team_format: currentTeamFormat,
      }),
    [currentGameType, currentIsTeamRound, currentTeamFormat]
  );

  const allowed = limits?.allowedGameTypes ?? ['stableford'];
  const isFormatAllowed = useCallback(
    (opt: FormatOption) => allowed.includes(opt.gameTypeForTier),
    [allowed]
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async (id: FormatId) => {
      await updateRound(roundId, encodeFormat(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      onDismiss();
    },
  });

  const handleSelect = useCallback(
    (opt: FormatOption) => {
      if (!isFormatAllowed(opt)) {
        onUpgradePress();
        return;
      }
      if (opt.id === currentFormat) {
        onDismiss();
        return;
      }
      mutate(opt.id);
    },
    [currentFormat, isFormatAllowed, mutate, onDismiss, onUpgradePress]
  );

  const renderOption = (opt: FormatOption) => {
    const isSelected = currentFormat === opt.id;
    const isAllowed = isFormatAllowed(opt);
    const isDisabled = isPending;

    return (
      <TouchableOpacity
        key={opt.id}
        style={[
          styles.optionContainer,
          {
            borderColor: isSelected && isAllowed ? colors.primary : colors.gray300,
            backgroundColor:
              isSelected && isAllowed
                ? withOpacity(colors.primaryLighter, 0.13)
                : !isAllowed
                  ? colors.surfaceVariant
                  : colors.surface,
          },
          !isAllowed && styles.optionLocked,
        ]}
        onPress={() => handleSelect(opt)}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityLabel={opt.label}
        accessibilityHint={isAllowed ? opt.description : `Upgrade to ${TIER_DISPLAY[opt.requiredTier]}`}
        accessibilityState={{ selected: isSelected && isAllowed, disabled: isDisabled }}
      >
        <View style={styles.optionContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  isSelected && isAllowed
                    ? colors.primary
                    : !isAllowed
                      ? colors.gray300
                      : colors.gray200,
              },
            ]}
          >
            <Icon
              source={opt.icon}
              size={20}
              color={
                isSelected && isAllowed
                  ? colors.white
                  : !isAllowed
                    ? colors.gray400
                    : colors.gray600
              }
            />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.optionLabel,
                  { color: !isAllowed ? colors.textDisabled : colors.textPrimary },
                ]}
              >
                {opt.label}
              </Text>
              {!isAllowed && (
                <View style={[styles.tierBadge, { backgroundColor: colors.warningLight }]}>
                  <Text style={[styles.tierBadgeText, { color: colors.warning }]}>
                    {TIER_DISPLAY[opt.requiredTier]}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.optionDescription,
                { color: !isAllowed ? colors.textDisabled : colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {opt.description}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={(e) => {
              e.stopPropagation();
              setInfoFormat(opt.id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`View ${opt.label} rules`}
            accessibilityRole="button"
          >
            <Icon
              source="information-outline"
              size={20}
              color={!isAllowed ? colors.gray400 : colors.textSecondary}
            />
          </TouchableOpacity>

          {isSelected && isAllowed && (
            <View style={[styles.marker, { backgroundColor: colors.primary }]}>
              <Icon source="check" size={14} color={colors.white} />
            </View>
          )}
          {!isAllowed && (
            <View style={[styles.marker, { backgroundColor: colors.gray200 }]}>
              <Icon source="lock" size={14} color={colors.gray500} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onDismiss}
        title="Format"
        height={0.8}
        useModal
        testID="edit-game-type-sheet"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>Individual</Text>
          {INDIVIDUAL_OPTIONS.map(renderOption)}

          {supportsTeams && (
            <>
              <Text
                style={[
                  styles.groupLabel,
                  { color: colors.textSecondary, marginTop: spacing.lg },
                ]}
              >
                Team
              </Text>
              {TEAM_OPTIONS.map(renderOption)}
            </>
          )}
        </ScrollView>
      </BottomSheet>

      <GameTypeInfoBottomSheet
        visible={infoFormat !== null}
        onClose={() => setInfoFormat(null)}
        gameType={infoFormat ? getDescription(infoFormat) : null}
      />
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  groupLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  optionContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
    ...shadows.sm,
  },
  optionLocked: {
    opacity: 0.8,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 72,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.bodyBold,
  },
  optionDescription: {
    ...typography.small,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tierBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  infoButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EditGameTypeSheet;
