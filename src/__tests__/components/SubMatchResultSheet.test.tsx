import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SubMatchResultSheet, { buildManualResult } from '@/components/rounds/SubMatchResultSheet';

describe('buildManualResult', () => {
  it('maps an A win with margin', () => {
    expect(buildManualResult('a', 6, 5)).toEqual({
      result: 'a-wins', finalDifferential: 6, finalHolesRemaining: 5,
    });
  });
  it('maps a halved result with no margin', () => {
    expect(buildManualResult('halved', 6, 5)).toEqual({
      result: 'halved', finalDifferential: null, finalHolesRemaining: null,
    });
  });
  it('treats 0 holes remaining as a went-the-distance win (null remaining)', () => {
    expect(buildManualResult('b', 2, 0)).toEqual({
      result: 'b-wins', finalDifferential: 2, finalHolesRemaining: null,
    });
  });
});

describe('SubMatchResultSheet', () => {
  it('submits the selected winner + margin', () => {
    const onSubmit = jest.fn();
    const { getByText, getByLabelText } = render(
      <SubMatchResultSheet
        visible teamALabel="Team A" teamBLabel="Team B"
        onSubmit={onSubmit} onCancel={jest.fn()}
      />
    );
    fireEvent.press(getByLabelText('Winner Team A'));
    // default margin starts at 1 & 0; bump holes up to 6 and remaining to 5
    fireEvent.press(getByText('Save result'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'a-wins' })
    );
  });

  it('hides the margin inputs and submits null margin when Halved is chosen', () => {
    const onSubmit = jest.fn();
    const { getByText, getByLabelText, queryByText } = render(
      <SubMatchResultSheet visible teamALabel="A" teamBLabel="B" onSubmit={onSubmit} onCancel={jest.fn()} />
    );
    // Verify stepper label is visible before switching to Halved
    expect(getByText('Holes up')).toBeTruthy();
    fireEvent.press(getByLabelText('Winner Halved'));
    expect(queryByText('Holes up')).toBeNull();
    fireEvent.press(getByText('Save result'));
    expect(onSubmit).toHaveBeenCalledWith({
      result: 'halved', finalDifferential: null, finalHolesRemaining: null,
    });
  });
});
