/**
 * StatsRow Component
 *
 * Displays optional golf stats (FIR, GIR, Putts) for a hole.
 * Shows based on user settings visibility preferences.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { IconPlus } from '@tabler/icons-react-native';
import { DetailedStatsBadges } from '@/components/scorecard/DetailedStatsBadges';
import type { HoleScore } from '@/types/database/base';

const MAX_PUTTS = 6;

interface StatsRowProps {
  // Visibility settings
  showFIR: boolean;
  showGIR: boolean;
  showPutts: boolean;
  // Current values
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  putts?: number;
  // Handlers
  onFairwayToggle: () => void;
  onGIRToggle: () => void;
  onPuttsDecrement: () => void;
  onPuttsIncrement: () => void;
  // State
  disabled?: boolean;
  /** Full hole score for badges display */
  score?: HoleScore;
  /** Whether to show the "+" button for detailed stats */
  hasAnyDetailedStats?: boolean;
  /** Handler for opening the detailed stats sheet */
  onDetailedStatsPress?: () => void;
  /** Visibility flags for badge display */
  showFairwayMissDirection?: boolean;
  showGreenMissDirection?: boolean;
  showBunkerShots?: boolean;
  showHazards?: boolean;
  /**
   * If true, render a compact one-line summary by default that the user can tap to expand.
   * Used when scoring 3+ players to reduce vertical density.
   */
  defaultCollapsed?: boolean;
  /**
   * Optional element rendered right-aligned alongside the "Add Additional Stats"
   * button (e.g. an inline log-shot button for shot tracking).
   */
  actionAccessory?: React.ReactNode;
}

export const StatsRow = React.memo(function StatsRow({
  showFIR,
  showGIR,
  showPutts,
  fairwayHit,
  greenInRegulation,
  putts,
  onFairwayToggle,
  onGIRToggle,
  onPuttsDecrement,
  onPuttsIncrement,
  disabled = false,
  score,
  hasAnyDetailedStats,
  onDetailedStatsPress,
  showFairwayMissDirection,
  showGreenMissDirection,
  showBunkerShots,
  showHazards,
  defaultCollapsed = false,
  actionAccessory,
}: StatsRowProps) {
  const colors = useThemeColors();

  // Check if any stats are visible
  const hasVisibleStats = showFIR || showGIR || showPutts;

  // Track collapsed state internally; re-seed if the parent's default flips
  // (e.g. user toggles the auto-collapse setting mid-round).
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  if (!hasVisibleStats) {
    return null;
  }

  // Center putts if it's the only stat shown
  const centerPutts = showPutts && !showFIR && !showGIR;

  if (collapsed) {
    return (
      <CollapsedSummary
        showFIR={showFIR}
        showGIR={showGIR}
        showPutts={showPutts}
        fairwayHit={fairwayHit}
        greenInRegulation={greenInRegulation}
        putts={putts}
        score={score}
        onPress={() => setCollapsed(false)}
        disabled={disabled}
      />
    );
  }

  return (
    <View>
    <View style={[styles.container, centerPutts && styles.containerCentered]}>
      {/* FIR Toggle — shows check when hit, miss direction when missed */}
      {showFIR && (
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              fairwayHit === true && { backgroundColor: colors.success, borderColor: colors.success },
              fairwayHit !== true && score?.fairwayMissDirection && { borderColor: colors.error },
              disabled && styles.buttonDisabled,
            ]}
            onPress={onFairwayToggle}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel="Fairway in regulation"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: fairwayHit === true }}
          >
            {fairwayHit !== true && score?.fairwayMissDirection ? (
              <Text style={[styles.missDirectionText, { color: colors.error }]}>
                {{ left: 'L', right: 'R', long: 'Lo', short: 'Sh' }[score.fairwayMissDirection]}
              </Text>
            ) : (
              <Icon
                source="check"
                size={24}
                color={fairwayHit === true ? colors.white : colors.gray300}
              />
            )}
          </TouchableOpacity>
          <Text style={[styles.label, { color: colors.textSecondary }]}>FIR</Text>
        </View>
      )}

      {/* GIR Toggle — shows check when hit, miss direction when missed */}
      {showGIR && (
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              greenInRegulation === true && { backgroundColor: colors.success, borderColor: colors.success },
              greenInRegulation !== true && score?.greenMissDirection && { borderColor: colors.error },
              disabled && styles.buttonDisabled,
            ]}
            onPress={onGIRToggle}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel="Green in regulation"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: greenInRegulation === true }}
          >
            {greenInRegulation !== true && score?.greenMissDirection ? (
              <Text style={[styles.missDirectionText, { color: colors.error }]}>
                {{ left: 'L', right: 'R', long: 'Lo', short: 'Sh' }[score.greenMissDirection]}
              </Text>
            ) : (
              <Icon
                source="check"
                size={24}
                color={greenInRegulation === true ? colors.white : colors.gray300}
              />
            )}
          </TouchableOpacity>
          <Text style={[styles.label, { color: colors.textSecondary }]}>GIR</Text>
        </View>
      )}

      {/* Putts Counter */}
      {showPutts && (
        <View style={styles.puttsContainer}>
          <View style={styles.puttsStepperRow}>
            <TouchableOpacity
              style={[
                styles.puttsButton,
                { borderColor: colors.gray300, backgroundColor: colors.white },
                (disabled || (putts ?? 0) <= 0) && styles.buttonDisabled,
              ]}
              onPress={onPuttsDecrement}
              disabled={disabled || (putts ?? 0) <= 0}
              activeOpacity={0.7}
              accessibilityLabel="Decrease putts"
              accessibilityRole="button"
            >
              <Text style={[styles.puttsButtonText, { color: colors.textPrimary }]}>−</Text>
            </TouchableOpacity>

            <View style={styles.puttsDisplay}>
              <Text style={[styles.puttsDisplayText, { color: colors.textPrimary }]}>
                {putts !== undefined ? putts : '-'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.puttsButton,
                { borderColor: colors.gray300, backgroundColor: colors.white },
                (disabled || (putts ?? 0) >= MAX_PUTTS) && styles.buttonDisabled,
              ]}
              onPress={onPuttsIncrement}
              disabled={disabled || (putts ?? 0) >= MAX_PUTTS}
              activeOpacity={0.7}
              accessibilityLabel="Increase putts"
              accessibilityRole="button"
            >
              <Text style={[styles.puttsButtonText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>PUTTS</Text>
        </View>
      )}

    </View>

      {/* Additional Stats Button + optional right-aligned action (e.g. Log Shot) */}
      {(hasAnyDetailedStats || actionAccessory) && (
        <View style={styles.statsActionRow}>
          {hasAnyDetailedStats && (
            <TouchableOpacity
              style={[
                styles.additionalStatsButton,
                { borderColor: colors.border },
              ]}
              onPress={onDetailedStatsPress}
              disabled={disabled}
              activeOpacity={0.7}
              accessibilityLabel="Add additional stats"
              accessibilityRole="button"
            >
              <View style={styles.additionalStatsContent}>
                <IconPlus size={14} color={colors.primary} />
                <Text style={[styles.additionalStatsText, { color: colors.primary }]}>
                  Stats
                </Text>
              </View>
              <DetailedStatsBadges
                score={score}
                showFairwayMissDirection={showFairwayMissDirection ?? false}
                showGreenMissDirection={showGreenMissDirection ?? false}
                showBunkerShots={showBunkerShots ?? false}
                showHazards={showHazards ?? false}
              />
            </TouchableOpacity>
          )}
          {actionAccessory && (
            <View style={styles.actionAccessory}>{actionAccessory}</View>
          )}
        </View>
      )}

      {defaultCollapsed && (
        <TouchableOpacity
          style={styles.hideButton}
          onPress={() => setCollapsed(true)}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityLabel="Hide stats"
          accessibilityRole="button"
        >
          <Text style={[styles.hideButtonText, { color: colors.textSecondary }]}>
            Hide stats
          </Text>
          <Icon source="chevron-up" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
});

interface CollapsedSummaryProps {
  showFIR: boolean;
  showGIR: boolean;
  showPutts: boolean;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  putts?: number;
  score?: HoleScore;
  onPress: () => void;
  disabled: boolean;
}

function CollapsedSummary({
  showFIR,
  showGIR,
  showPutts,
  fairwayHit,
  greenInRegulation,
  putts,
  score,
  onPress,
  disabled,
}: CollapsedSummaryProps) {
  const colors = useThemeColors();

  const renderHitMissIcon = (hit: boolean | undefined, missDir: string | undefined) => {
    if (hit === true) return <Icon source="check" size={14} color={colors.success} />;
    if (missDir) return <Text style={[styles.summaryMiss, { color: colors.error }]}>×</Text>;
    return <Text style={[styles.summaryDash, { color: colors.textTertiary }]}>—</Text>;
  };

  return (
    <TouchableOpacity
      style={[styles.summaryRow, { borderColor: colors.border }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel="Show stats"
      accessibilityRole="button"
      accessibilityState={{ expanded: false }}
    >
      <View style={styles.summaryItems}>
        {showFIR && (
          <View style={styles.summaryItem}>
            {renderHitMissIcon(fairwayHit, score?.fairwayMissDirection)}
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>FIR</Text>
          </View>
        )}
        {showGIR && (
          <View style={styles.summaryItem}>
            {renderHitMissIcon(greenInRegulation, score?.greenMissDirection)}
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>GIR</Text>
          </View>
        )}
        {showPutts && (
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryPutts, { color: colors.textPrimary }]}>
              {putts !== undefined ? putts : '—'}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>PUTTS</Text>
          </View>
        )}
      </View>
      <Icon source="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  containerCentered: {
    justifyContent: 'center',
  },
  checkboxContainer: {
    alignItems: 'center',
  },
  checkbox: {
    width: 60,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  puttsContainer: {
    alignItems: 'center',
  },
  puttsStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  puttsButton: {
    width: 56,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puttsButtonText: {
    fontSize: 28,
    fontWeight: '500',
  },
  puttsDisplay: {
    width: 40,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puttsDisplayText: {
    fontSize: 32,
    fontWeight: '800',
  },
  missDirectionText: {
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  statsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  additionalStatsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionAccessory: {
    marginLeft: 'auto',
  },
  additionalStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  additionalStatsText: {
    ...typography.caption,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  summaryItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryPutts: {
    ...typography.bodyBold,
  },
  summaryDash: {
    ...typography.caption,
    fontWeight: '600',
  },
  summaryMiss: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
  },
  hideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  hideButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default StatsRow;
