/**
 * VenueDetailsStep - Step 1 of AddCourseModal wizard
 *
 * Collects venue information:
 * - Venue name (required)
 * - City (optional)
 * - State (optional)
 *
 * Uses FormInput for consistent text input styling.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FormInput } from '@/components/common/FormInput';
import { getRegionsForCountry } from '@/constants/countries';
import { useUserCountry } from '@/hooks/useUserCountry';
import type { Step1Data } from '../types';

interface VenueDetailsStepProps {
  data: Step1Data;
  onVenueNameChange: (text: string) => void;
  onCityChange: (text: string) => void;
  onStateChange: (state: string | null) => void;
}

export const VenueDetailsStep = React.memo(function VenueDetailsStep({
  data,
  onVenueNameChange,
  onCityChange,
  onStateChange,
}: VenueDetailsStepProps) {
  const colors = useThemeColors();
  const { country } = useUserCountry();

  const regions = useMemo(
    () => getRegionsForCountry(country),
    [country]
  );

  return (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepContentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Venue Name Input */}
      <FormInput
        label="Venue Name"
        value={data.venueName ?? ''}
        onChangeText={onVenueNameChange}
        placeholder="e.g., Royal Melbourne Golf Club"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        required
        accessibilityLabel="Venue name"
      />

      {/* City Input */}
      <FormInput
        label="City"
        value={data.city}
        onChangeText={onCityChange}
        placeholder="e.g., Melbourne"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel="City"
      />

      {/* Region Selection — only shown for countries with regions */}
      {regions.length > 0 && (
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Region</Text>
          <View style={styles.chipsContainer}>
            {regions.map((region) => (
              <Chip
                key={region.value}
                mode={data.state === region.value ? 'flat' : 'outlined'}
                selected={data.state === region.value}
                onPress={() => onStateChange(data.state === region.value ? null : region.value)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.gray300 },
                  data.state === region.value && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                textStyle={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  data.state === region.value && { color: colors.white },
                ]}
              >
                {region.label}
              </Chip>
            ))}
          </View>
        </View>
      )}
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
