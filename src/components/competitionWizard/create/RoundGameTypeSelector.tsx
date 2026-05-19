import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt, type UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
import { GameTypeInfoBottomSheet } from './GameTypeInfoBottomSheet';
import { GAME_TYPE_DESCRIPTIONS } from '@/constants/gameTypeDescriptions';
import type { GameType } from '@/types/database.types';
import type { SubscriptionTier } from '@/types/subscription.types';

/**
 * Game type configuration for round selection
 */
interface GameTypeOption {
  value: GameType;
  label: string;
  description: string;
  icon: string;
  /** Minimum tier required to use this game type */
  requiredTier: SubscriptionTier;
}

/**
 * Individual game types available for rounds
 */
const INDIVIDUAL_GAME_TYPE_OPTIONS: GameTypeOption[] = [
  {
    value: 'stableford',
    label: 'Stableford',
    description: 'Points-based scoring (2 for par, 3 for birdie)',
    icon: 'star-outline',
    requiredTier: 'free',
  },
  {
    value: 'stroke',
    label: 'Stroke Play',
    description: 'Lowest total strokes wins',
    icon: 'counter',
    requiredTier: 'free',
  },
  {
    value: 'par',
    label: 'Par',
    description: 'Win/lose each hole (+1, 0, -1 scoring)',
    icon: 'plus-minus',
    requiredTier: 'social',
  },
  {
    value: 'match-play',
    label: 'Match Play',
    description: 'Hole-by-hole head-to-head competition',
    icon: 'sword-cross',
    requiredTier: 'premium',
  },
];

/**
 * Team format game types (shown when showTeamFormats is true)
 */
const TEAM_GAME_TYPE_OPTIONS: GameTypeOption[] = [
  {
    value: 'best-ball',
    label: 'Best Ball',
    description: 'Team format - best score counts',
    icon: 'account-group',
    requiredTier: 'premium',
  },
  {
    value: 'scramble',
    label: 'Scramble',
    description: 'Team format - everyone plays from best shot',
    icon: 'account-group-outline',
    requiredTier: 'premium',
  },
  {
    value: 'shamble',
    label: 'Shamble',
    description: 'Best drive, then individual play',
    icon: 'golf-tee',
    requiredTier: 'premium',
  },
];

/**
 * Display names for tiers (for upgrade prompt)
 */
const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  enterprise: 'Enterprise',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

/**
 * Benefits for each tier upgrade
 */
const TIER_BENEFITS: Record<SubscriptionTier, string[]> = {
  free: [],
  social: [
    'Par game type',
    'Up to 5 competitions',
    'Up to 12 players per competition',
  ],
  premium: [
    'Match Play game type',
    'Team formats (Shamble, Scramble, Best Ball)',
    'Unlimited competitions',
    'Designated scoring pairs',
  ],
  enterprise: [
    'Up to 200 competitions',
    'Up to 100 players per competition',
    'All premium features',
    'Priority support',
  ],
  super_admin: [],
  developer: [],
};

/**
 * Props for RoundGameTypeSelector component
 */
export interface RoundGameTypeSelectorProps {
  /**
   * Currently selected game type
   */
  value: GameType;
  /**
   * Callback when game type changes
   */
  onChange: (gameType: GameType) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
  /**
   * Optional array of allowed game types based on subscription tier
   * If not provided, will be fetched from subscription context
   */
  allowedGameTypes?: GameType[];
  /**
   * Callback when upgrade is requested (navigates to subscription screen)
   * If not provided, upgrade prompt will be shown but no navigation
   */
  onUpgradePress?: () => void;
  /**
   * Whether to show team format options (Best Ball, Scramble, Shamble)
   * @default false
   */
  showTeamFormats?: boolean;
}

/**
 * RoundGameTypeSelector - Simplified game type selector for rounds
 *
 * Displays only individual game types (Stableford, Stroke Play, Match Play).
 * Team formats are handled separately via the team round toggle and TeamFormatSelector.
 *
 * Game types not allowed by the user's subscription tier are shown with a lock icon
 * and tapping them shows an upgrade prompt.
 *
 * @example
 * ```tsx
 * <RoundGameTypeSelector
 *   value="stableford"
 *   onChange={(type) => setGameType(type)}
 *   disabled={false}
 *   onUpgradePress={() => navigation.navigate('Subscription')}
 * />
 * ```
 */
export const RoundGameTypeSelector = React.memo(function RoundGameTypeSelector({
  value,
  onChange,
  disabled = false,
  allowedGameTypes: propAllowedGameTypes,
  onUpgradePress,
  showTeamFormats = false,
}: RoundGameTypeSelectorProps) {
  const colors = useThemeColors();
  const { limits } = useSubscription();

  // State for upgrade prompt
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeConfig, setUpgradeConfig] = useState<UpgradePromptConfig | null>(null);

  // State for game type info bottom sheet
  const [infoGameType, setInfoGameType] = useState<GameType | null>(null);

  // Use prop allowedGameTypes if provided, otherwise use subscription limits
  const allowedGameTypes = propAllowedGameTypes ?? limits?.allowedGameTypes ?? ['stableford'];

  // Combine game type options based on showTeamFormats
  const gameTypeOptions = useMemo(() => {
    return showTeamFormats
      ? [...INDIVIDUAL_GAME_TYPE_OPTIONS, ...TEAM_GAME_TYPE_OPTIONS]
      : INDIVIDUAL_GAME_TYPE_OPTIONS;
  }, [showTeamFormats]);

  // Memoize allowedGameTypes array to ensure stable reference
  // eslint-disable-next-line react-hooks/exhaustive-deps -- using JSON.stringify for deep comparison
  const memoizedAllowedTypes = useMemo(() => allowedGameTypes, [JSON.stringify(allowedGameTypes)]);

  // Check if a game type is allowed
  const isGameTypeAllowed = useCallback((gameType: GameType): boolean => {
    return memoizedAllowedTypes.includes(gameType);
  }, [memoizedAllowedTypes]);

  const handlePress = useCallback((option: GameTypeOption) => {
    if (disabled) return;

    // If game type is not allowed, show upgrade prompt
    if (!isGameTypeAllowed(option.value)) {
      const config: UpgradePromptConfig = {
        feature: 'game_type',
        title: `Unlock ${option.label}`,
        message: `Upgrade to ${TIER_DISPLAY_NAMES[option.requiredTier]} to use ${option.label} scoring`,
        targetTier: option.requiredTier,
        benefits: TIER_BENEFITS[option.requiredTier],
      };
      setUpgradeConfig(config);
      setShowUpgradePrompt(true);
      return;
    }

    onChange(option.value);
  }, [disabled, isGameTypeAllowed, onChange]);

  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    onUpgradePress?.();
  }, [onUpgradePress]);

  const handleDismiss = useCallback(() => {
    setShowUpgradePrompt(false);
    setUpgradeConfig(null);
  }, []);

  const handleInfoPress = useCallback((gameType: GameType) => {
    setInfoGameType(gameType);
  }, []);

  const handleInfoClose = useCallback(() => {
    setInfoGameType(null);
  }, []);

  const renderGameTypeOption = (option: GameTypeOption) => {
    const isSelected = value === option.value;
    const isAllowed = isGameTypeAllowed(option.value);
    const isOptionDisabled = disabled || !isAllowed;

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.optionContainer,
          {
            borderColor: isSelected && isAllowed ? colors.primary : colors.gray300,
            backgroundColor: isSelected && isAllowed
              ? withOpacity(colors.primaryLighter, 0.13)
              : !isAllowed
                ? colors.surfaceVariant
                : colors.surface,
          },
          !isAllowed && styles.optionLocked,
        ]}
        onPress={() => handlePress(option)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={isAllowed ? option.label : `${option.label} - Upgrade required`}
        accessibilityHint={isAllowed ? option.description : `Tap to upgrade to ${TIER_DISPLAY_NAMES[option.requiredTier]}`}
        accessibilityRole="radio"
        accessibilityState={{
          selected: isSelected && isAllowed,
          disabled: isOptionDisabled,
        }}
      >
        <View style={styles.optionContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isSelected && isAllowed
                  ? colors.primary
                  : !isAllowed
                    ? colors.gray300
                    : colors.gray200,
              },
            ]}
          >
            <Icon
              source={option.icon}
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
                  isSelected && isAllowed && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {!isAllowed && (
                <View style={[styles.tierBadge, { backgroundColor: colors.warningLight }]}>
                  <Text style={[styles.tierBadgeText, { color: colors.warning }]}>
                    {TIER_DISPLAY_NAMES[option.requiredTier]}
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
              {option.description}
            </Text>
          </View>

          {/* Info icon */}
          <TouchableOpacity
            style={styles.infoButton}
            onPress={(e) => {
              e.stopPropagation();
              handleInfoPress(option.value);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`View ${option.label} rules`}
            accessibilityRole="button"
          >
            <Icon
              source="information-outline"
              size={20}
              color={!isAllowed ? colors.gray400 : colors.textSecondary}
            />
          </TouchableOpacity>

          {isSelected && isAllowed && (
            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
              <Icon source="check" size={14} color={colors.white} />
            </View>
          )}

          {!isAllowed && (
            <View style={[styles.lockBadge, { backgroundColor: colors.gray200 }]}>
              <Icon source="lock" size={14} color={colors.gray500} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {gameTypeOptions.map((option) => renderGameTypeOption(option))}

      {/* Upgrade Prompt Modal */}
      {upgradeConfig && (
        <UpgradePrompt
          config={upgradeConfig}
          visible={showUpgradePrompt}
          onUpgrade={handleUpgrade}
          onDismiss={handleDismiss}
        />
      )}

      {/* Game Type Info Bottom Sheet */}
      <GameTypeInfoBottomSheet
        visible={infoGameType !== null}
        onClose={handleInfoClose}
        gameType={infoGameType ? GAME_TYPE_DESCRIPTIONS[infoGameType] : null}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  optionContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  optionDisabled: {
    opacity: 0.6,
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
  optionLabelSelected: {
    fontWeight: '700',
  },
  optionDescription: {
    ...typography.small,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
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
});

export default RoundGameTypeSelector;
