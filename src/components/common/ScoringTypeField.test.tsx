/**
 * ScoringTypeField component tests.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { ScoringTypeField } from './ScoringTypeField';

jest.mock('@/screens/profile/components/RadioButtonOption', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    RadioButtonOption: ({ label, selected, onSelect, testID }: any) => (
      <TouchableOpacity testID={testID} onPress={onSelect}>
        <Text>{`${label}${selected ? ' selected' : ''}`}</Text>
      </TouchableOpacity>
    ),
  };
});

function Harness({ prefix = 'skins' }: { prefix?: string }) {
  const { control } = useForm<{ scoring_type: 'gross' | 'net' }>({
    defaultValues: { scoring_type: 'gross' },
  });
  return <ScoringTypeField control={control} name="scoring_type" testIDPrefix={prefix} />;
}

describe('ScoringTypeField', () => {
  it('renders Gross and Net with prefixed testIDs, Gross selected by default', () => {
    render(<Harness prefix="wolf" />);
    expect(screen.getByTestId('wolf-scoring-gross')).toBeTruthy();
    expect(screen.getByTestId('wolf-scoring-net')).toBeTruthy();
    expect(screen.getByText('Gross selected')).toBeTruthy();
    expect(screen.getByText('Net')).toBeTruthy();
  });

  it('selects Net when the Net option is pressed', () => {
    render(<Harness prefix="skins" />);
    fireEvent.press(screen.getByTestId('skins-scoring-net'));
    expect(screen.getByText('Net selected')).toBeTruthy();
    expect(screen.getByText('Gross')).toBeTruthy();
  });
});
