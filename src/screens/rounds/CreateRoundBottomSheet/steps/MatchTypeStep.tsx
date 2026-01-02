/**
 * MatchTypeStep - Third step in the create round wizard
 *
 * Features:
 * - Display selected course/tee info
 * - Select match type (Stableford, Stroke, Match Play, team formats)
 * - Show tier restrictions with locked state for unavailable types
 * - Upgrade prompt for locked game types
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { IconGolf, IconCheck, IconLock } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt, type UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { TeeBox, GameType } from '@/types/database.types';
import type { SelectedCourse, MatchTypeOption } from '../types';
import { MATCH_TYPES, TIER_DISPLAY_NAMES } from '../types';

/**
 * Benefits shown in upgrade prompt for each tier
 */
const TIER_BENEFITS: Record<string, string[]> = {
  social: [
    'Stroke Play & Match Play',
    'Up to 8 competitions',
    'Up to 16 players per competition',
  ],
  premium: [
    'Team formats (Ambrose, Best Ball, Scramble)',
    'Unlimited competitions',
    'Up to 40 players per competition',
    'Designated scoring pairs',
  ],
};

interface MatchTypeStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType | null;
  onSelectMatchType: (matchType: GameType) => void;
  /** Optional callback when upgrade is requested */
  onUpgradePress?: () => void;
}

export const MatchTypeStep = memo(function MatchTypeStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  onSelectMatchType,
  onUpgradePress,
}: MatchTypeStepProps) {
  const colors = useThemeColors();
  const { limits } = useSubscription();

  // State for upgrade prompt
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeConfig, setUpgradeConfig] = useState<UpgradePromptConfig | null>(null);

  // Get allowed game types from subscription
  const allowedGameTypes = limits?.allowedGameTypes ?? ['stableford'];

  // Memoize allowedGameTypes array to ensure stable reference
  // eslint-disable-next-line react-hooks/exhaustive-deps -- using JSON.stringify for deep comparison
  const memoizedAllowedTypes = useMemo(() => allowedGameTypes, [JSON.stringify(allowedGameTypes)]);

  // Check if a game type is allowed
  const isGameTypeAllowed = useCallback((gameType: GameType): boolean => {
    return memoizedAllowedTypes.includes(gameType);
  }, [memoizedAllowedTypes]);

  // Handle press on a match type option
  const handlePress = useCallback((matchType: MatchTypeOption) => {
    // If game type is not allowed, show upgrade prompt
    if (!isGameTypeAllowed(matchType.value)) {
      const config: UpgradePromptConfig = {
        feature: 'game_type',
        title: `Unlock ${matchType.label}`,
        message: `Upgrade to ${TIER_DISPLAY_NAMES[matchType.requiredTier]} to use ${matchType.label} scoring`,
        targetTier: matchType.requiredTier,
        benefits: TIER_BENEFITS[matchType.requiredTier] ?? [],
      };
      setUpgradeConfig(config);
      setShowUpgradePrompt(true);
      return;
    }

    onSelectMatchType(matchType.value);
  }, [isGameTypeAllowed, onSelectMatchType]);

  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    onUpgradePress?.();
  }, [onUpgradePress]);

  const handleDismiss = useCallback(() => {
    setShowUpgradePrompt(false);
    setUpgradeConfig(null);
  }, []);

  return (
    <>
      {/* Selected Course Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.primaryLighter }]}>
        <IconGolf size={20} color={colors.primary} />
        <View style={styles.selectedBannerText}>
          <Text style={[styles.selectedBannerName, { color: colors.primaryDark }]}>
            {selectedCourse?.courseName}
            {selectedTee && (
              <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
            )}
          </Text>
          {selectedCourse?.venue && (
            <Text style={[styles.selectedBannerLocation, { color: colors.primary }]}>
              {selectedCourse.venue.name}
              {(selectedCourse.venue.city || selectedCourse.venue.state) &&
                ` · ${[selectedCourse.venue.city, selectedCourse.venue.state]
                  .filter(Boolean)
                  .join(', ')}`}
            </Text>
          )}
        </View>
      </View>

      {/* Match Type Options */}
      <View style={styles.matchTypeContainer}>
        <Text style={[styles.matchTypeTitle, { color: colors.textSecondary }]}>
          How would you like to score?
        </Text>
        <View style={styles.matchTypeList}>
          {MATCH_TYPES
            // Filter out team formats - practice rounds don't support teams
            .filter((matchType) => !['ambrose', 'best-ball', 'scramble'].includes(matchType.value))
            .map((matchType: MatchTypeOption) => {
            const isSelected = selectedMatchType === matchType.value;
            const isAllowed = isGameTypeAllowed(matchType.value);
            const isLocked = !isAllowed;

            return (
              <TouchableOpacity
                key={matchType.value}
                style={[
                  styles.matchTypeOption,
                  {
                    backgroundColor: isLocked
                      ? colors.surfaceVariant
                      : colors.surface,
                    borderColor: colors.border
                  },
                  isSelected && isAllowed && { backgroundColor: colors.primaryLighter, borderColor: colors.primary },
                  isLocked && styles.matchTypeLocked,
                ]}
                onPress={() => handlePress(matchType)}
                activeOpacity={0.7}
                accessibilityLabel={isAllowed ? matchType.label : `${matchType.label} - Upgrade required`}
                accessibilityHint={isAllowed ? matchType.description : `Requires ${TIER_DISPLAY_NAMES[matchType.requiredTier]} subscription`}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected && isAllowed,
                  disabled: isLocked,
                }}
              >
                <View style={styles.matchTypeContent}>
                  <View style={styles.matchTypeLabelRow}>
                    <Text
                      style={[
                        styles.matchTypeLabel,
                        { color: isLocked ? colors.textDisabled : colors.textPrimary },
                        isSelected && isAllowed && { color: colors.primaryDark },
                      ]}
                    >
                      {matchType.label}
                    </Text>
                    {isLocked && (
                      <StatusBadge
                        status="custom"
                        label={TIER_DISPLAY_NAMES[matchType.requiredTier]}
                        size="sm"
                        backgroundColor={colors.warningBackground}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.matchTypeDescription,
                      { color: isLocked ? colors.textDisabled : colors.textSecondary },
                      isSelected && isAllowed && { color: colors.primary },
                    ]}
                  >
                    {matchType.description}
                  </Text>
                </View>
                {isSelected && isAllowed && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <IconCheck size={16} color={colors.white} strokeWidth={2.5} />
                  </View>
                )}
                {isLocked && (
                  <View style={[styles.lockBadge, { backgroundColor: colors.gray200 }]}>
                    <IconLock size={14} color={colors.gray500} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Upgrade Prompt Modal */}
      {upgradeConfig && (
        <UpgradePrompt
          config={upgradeConfig}
          visible={showUpgradePrompt}
          onUpgrade={handleUpgrade}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
  },
  matchTypeContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  matchTypeTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  matchTypeList: {
    gap: spacing.sm,
  },
  matchTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  matchTypeLocked: {
    opacity: 0.85,
  },
  matchTypeContent: {
    flex: 1,
  },
  matchTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  matchTypeLabel: {
    ...typography.bodyBold,
  },
  matchTypeDescription: {
    ...typography.small,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
