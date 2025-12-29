/**
 * StatsRow Component
 *
 * Displays optional golf stats (FIR, GIR, Putts) for a hole.
 * Shows based on user settings visibility preferences.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

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
}: StatsRowProps) {
  const colors = useThemeColors();

  // Check if any stats are visible
  const hasVisibleStats = showFIR || showGIR || showPutts;
  if (!hasVisibleStats) {
    return null;
  }

  // Center putts if it's the only stat shown
  const centerPutts = showPutts && !showFIR && !showGIR;

  return (
    <View style={[styles.container, centerPutts && styles.containerCentered]}>
      {/* FIR Toggle */}
      {showFIR && (
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              fairwayHit === true && { backgroundColor: colors.success, borderColor: colors.success },
              disabled && styles.buttonDisabled,
            ]}
            onPress={onFairwayToggle}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel="Fairway in regulation"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: fairwayHit === true }}
          >
            <Icon
              source="check"
              size={24}
              color={fairwayHit === true ? colors.white : colors.gray300}
            />
          </TouchableOpacity>
          <Text style={[styles.label, { color: colors.textSecondary }]}>FIR</Text>
        </View>
      )}

      {/* GIR Toggle */}
      {showGIR && (
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              greenInRegulation === true && { backgroundColor: colors.success, borderColor: colors.success },
              disabled && styles.buttonDisabled,
            ]}
            onPress={onGIRToggle}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel="Green in regulation"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: greenInRegulation === true }}
          >
            <Icon
              source="check"
              size={24}
              color={greenInRegulation === true ? colors.white : colors.gray300}
            />
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
  );
});

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
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
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
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puttsButtonText: {
    fontSize: 28,
    fontWeight: '400',
  },
  puttsDisplay: {
    width: 40,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puttsDisplayText: {
    fontSize: 32,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default StatsRow;
