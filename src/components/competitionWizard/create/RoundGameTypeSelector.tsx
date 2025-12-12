import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, RadioButton, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt, type UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
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
 * Team formats are handled separately via TeamFormatSelector
 */
const ROUND_GAME_TYPE_OPTIONS: GameTypeOption[] = [
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
 * Display names for tiers (for upgrade prompt)
 */
const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  super_admin: 'Super Admin',
};

/**
 * Benefits for each tier upgrade
 */
const TIER_BENEFITS: Record<SubscriptionTier, string[]> = {
  free: [],
  social: [
    'Stroke Play game type',
    'Up to 5 competitions',
    'Up to 16 players per competition',
  ],
  premium: [
    'Match Play game type',
    'Team formats (Ambrose, Best Ball)',
    'Unlimited competitions',
    'Designated scoring pairs',
  ],
  super_admin: [],
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
}: RoundGameTypeSelectorProps) {
  const colors = useThemeColors();
  const { limits } = useSubscription();

  // State for upgrade prompt
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeConfig, setUpgradeConfig] = useState<UpgradePromptConfig | null>(null);

  // Use prop allowedGameTypes if provided, otherwise use subscription limits
  const allowedGameTypes = propAllowedGameTypes ?? limits?.allowedGameTypes ?? ['stableford'];

  // Check if a game type is allowed
  const isGameTypeAllowed = useCallback((gameType: GameType): boolean => {
    return allowedGameTypes.includes(gameType);
  }, [allowedGameTypes]);

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
              ? colors.primaryLighter + '20'
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
          <View style={styles.radioContainer}>
            {isAllowed ? (
              <RadioButton
                value={option.value}
                status={isSelected ? 'checked' : 'unchecked'}
                onPress={() => handlePress(option)}
                disabled={disabled}
                color={colors.primary}
                uncheckedColor={disabled ? colors.gray400 : colors.gray500}
              />
            ) : (
              <View style={[styles.lockIconWrapper, { backgroundColor: colors.gray200 }]}>
                <Icon source="lock" size={18} color={colors.gray500} />
              </View>
            )}
          </View>

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

          {isSelected && isAllowed && (
            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
              <Icon source="check" size={14} color={colors.white} />
            </View>
          )}

          {!isAllowed && (
            <Icon source="chevron-right" size={20} color={colors.gray400} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <RadioButton.Group onValueChange={(v) => {
        const option = ROUND_GAME_TYPE_OPTIONS.find(opt => opt.value === v);
        if (option) handlePress(option);
      }} value={value}>
        {ROUND_GAME_TYPE_OPTIONS.map((option) => renderGameTypeOption(option))}
      </RadioButton.Group>

      {/* Upgrade Prompt Modal */}
      {upgradeConfig && (
        <UpgradePrompt
          config={upgradeConfig}
          visible={showUpgradePrompt}
          onUpgrade={handleUpgrade}
          onDismiss={handleDismiss}
        />
      )}
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
  radioContainer: {
    marginLeft: -spacing.sm,
  },
  lockIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
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
