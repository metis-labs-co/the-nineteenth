/**
 * ScoreButtons Component
 *
 * Renders the relative-to-par quick score buttons (Eagle through Triple Bogey)
 * plus a "MORE" button that opens the extended score picker modal.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { SCORE_BUTTONS } from './scoreCardHelpers';

interface ScoreButtonsProps {
  currentHolePar: number;
  selectedScore: number | undefined;
  isPickedUp: boolean;
  disabled: boolean;
  onScoreButtonPress: (relativeToPar: number) => void;
  onMorePress: () => void;
}

export const ScoreButtons = React.memo(function ScoreButtons({
  currentHolePar,
  selectedScore,
  isPickedUp,
  disabled,
  onScoreButtonPress,
  onMorePress,
}: ScoreButtonsProps) {
  const colors = useThemeColors();

  const handlePress = useCallback(
    (relativeToPar: number) => {
      onScoreButtonPress(relativeToPar);
    },
    [onScoreButtonPress]
  );

  return (
    <>
      {/* Score relative to par label */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Score Relative to Par (Par {currentHolePar})
      </Text>

      {/* Relative-to-Par Buttons */}
      <View style={styles.scoreButtonsContainer}>
        {SCORE_BUTTONS.map((button) => {
          const strokes = currentHolePar + button.relativeToPar;
          const isSelected = selectedScore === strokes && !isPickedUp;
          const buttonColor = colors[button.colorKey];

          return (
            <TouchableOpacity
              key={button.label}
              style={[
                styles.scoreButton,
                { borderColor: buttonColor },
                isSelected && { backgroundColor: buttonColor },
              ]}
              onPress={() => handlePress(button.relativeToPar)}
              disabled={disabled || strokes < 1}
              accessibilityLabel={`Score ${button.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.scoreButtonNumber,
                  { color: isSelected ? colors.textOnColored : buttonColor },
                ]}
              >
                {button.relativeToPar > 0 ? `+${button.relativeToPar}` : button.relativeToPar === 0 ? 'E' : button.relativeToPar}
              </Text>
              <Text
                style={[
                  styles.scoreButtonLabel,
                  { color: isSelected ? colors.textOnColored : buttonColor },
                ]}
              >
                {button.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* MORE button for extended scores */}
        <TouchableOpacity
          style={[
            styles.scoreButton,
            styles.moreButton,
            { borderColor: colors.textSecondary },
          ]}
          onPress={onMorePress}
          disabled={disabled}
          accessibilityLabel="More score options"
        >
          <Icon source="dots-horizontal" size={20} color={colors.textSecondary} />
          <Text style={[styles.scoreButtonLabel, { color: colors.textSecondary }]}>
            MORE
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.small,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  scoreButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreButton: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    borderStyle: 'dashed',
  },
  scoreButtonNumber: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  scoreButtonLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
