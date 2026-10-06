/**
 * ScoringTypeField - shared Gross/Net radio pair for the Skins and Wolf config
 * sheets. Wraps a react-hook-form Controller over a `'gross' | 'net'` field.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { RadioButtonOption } from '@/screens/profile/components/RadioButtonOption';
import { spacing } from '@/constants/theme';

export interface ScoringTypeFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Form field name holding the `'gross' | 'net'` value. */
  name: FieldPath<T>;
  /** Prefix for the option testIDs, e.g. 'skins' → 'skins-scoring-gross'. */
  testIDPrefix: string;
}

export function ScoringTypeField<T extends FieldValues>({
  control,
  name,
  testIDPrefix,
}: ScoringTypeFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View style={styles.radioGroup}>
          <RadioButtonOption
            label="Gross"
            description="Raw strokes - no handicap adjustment"
            selected={value === 'gross'}
            onSelect={() => onChange('gross')}
            icon="numeric"
            testID={`${testIDPrefix}-scoring-gross`}
          />
          <RadioButtonOption
            label="Net"
            description="Handicap-adjusted strokes"
            selected={value === 'net'}
            onSelect={() => onChange('net')}
            icon="percent"
            testID={`${testIDPrefix}-scoring-net`}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  radioGroup: {
    gap: spacing.sm,
  },
});

export default ScoringTypeField;
