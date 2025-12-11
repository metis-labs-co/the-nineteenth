/**
 * VenueDetailsStep - Step 1 of AddCourseModal wizard
 *
 * Collects venue information:
 * - Venue name (required)
 * - City (optional)
 * - State (optional)
 */

import React from 'react';
import { StyleSheet, View, ScrollView, TextInput } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { AustralianState } from '@/types/database.types';
import { AUSTRALIAN_STATES, type Step1Data } from '../types';

interface VenueDetailsStepProps {
  data: Step1Data;
  onVenueNameChange: (text: string) => void;
  onCityChange: (text: string) => void;
  onStateChange: (state: AustralianState | null) => void;
}

export const VenueDetailsStep = React.memo(function VenueDetailsStep({
  data,
  onVenueNameChange,
  onCityChange,
  onStateChange,
}: VenueDetailsStepProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepContentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Venue Name Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Venue Name *</Text>
        <View style={[styles.textInputWrapper, { backgroundColor: colors.gray50 }]}>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            placeholder="e.g., Royal Melbourne Golf Club"
            placeholderTextColor={colors.gray400}
            value={data.venueName}
            onChangeText={onVenueNameChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            accessibilityLabel="Venue name"
          />
        </View>
      </View>

      {/* City Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>City</Text>
        <View style={[styles.textInputWrapper, { backgroundColor: colors.gray50 }]}>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary }]}
            placeholder="e.g., Melbourne"
            placeholderTextColor={colors.gray400}
            value={data.city}
            onChangeText={onCityChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="City"
          />
        </View>
      </View>

      {/* State Selection */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>State</Text>
        <View style={styles.chipsContainer}>
          {AUSTRALIAN_STATES.map((state) => (
            <Chip
              key={state.value}
              mode={data.state === state.value ? 'flat' : 'outlined'}
              selected={data.state === state.value}
              onPress={() => onStateChange(data.state === state.value ? null : state.value)}
              style={[
                styles.chip,
                { backgroundColor: colors.white, borderColor: colors.gray300 },
                data.state === state.value && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              textStyle={[
                styles.chipText,
                { color: colors.textSecondary },
                data.state === state.value && { color: colors.white },
              ]}
            >
              {state.label}
            </Chip>
          ))}
        </View>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  textInputWrapper: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    justifyContent: 'center',
  },
  textInput: {
    ...typography.body,
    paddingVertical: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {},
  chipText: {
    ...typography.small,
  },
});
