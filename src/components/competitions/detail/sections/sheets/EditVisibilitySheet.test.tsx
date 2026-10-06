import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { EditVisibilitySheet } from './EditVisibilitySheet';
import { useUpdateCompetitionField } from './useUpdateCompetitionField';

const mockShowErrorToast = jest.fn();
const mockMutate = jest.fn();

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showErrorToast: mockShowErrorToast }),
}));

jest.mock('./useUpdateCompetitionField', () => ({
  useUpdateCompetitionField: jest.fn(),
}));

describe('EditVisibilitySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUpdateCompetitionField as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('optimistically selects visibility and rolls back on failure', () => {
    render(
      <EditVisibilitySheet
        visible
        onDismiss={jest.fn()}
        competitionId="competition-1"
        currentVisibility="private"
      />
    );

    fireEvent.press(screen.getByLabelText('Public'));
    expect(screen.getByLabelText('Public, selected')).toBeTruthy();

    const options = mockMutate.mock.calls[0][1];
    act(() => options.onError());

    expect(screen.getByLabelText('Private, selected')).toBeTruthy();
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'Visibility not saved',
      'Could not update competition visibility. Please try again.'
    );
  });
});
