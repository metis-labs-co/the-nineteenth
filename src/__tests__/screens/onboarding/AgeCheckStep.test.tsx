import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { AgeCheckStep } from '@/screens/onboarding/components/AgeCheckStep';
import { resolveAgeStatus } from '@/services/age';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    textPrimary: '#000', textSecondary: '#666', primary: '#2563eb',
    surface: '#fff', border: '#ddd', background: '#fff', white: '#fff', error: '#f00',
  }),
}));

// DatePicker wraps the native @react-native-community/datetimepicker, which
// does not render under jest. It has its own test suite; here we only care that
// the DOB branch is reached and wired.
jest.mock('@/components/common', () => {
  const { TextInput } = require('react-native');
  return {
    DatePicker: ({ value, onChange, label }: any) => (
      <TextInput
        testID="dob-input"
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
      />
    ),
  };
});

jest.mock('@/services/age', () => ({
  ...jest.requireActual('@/services/age'),
  resolveAgeStatus: jest.fn(),
}));

const mockSetStatus = jest.fn();
jest.mock('@/hooks/useSetAgeStatus', () => ({
  useSetAgeStatus: () => ({ setStatus: mockSetStatus }),
}));

const mockResolve = resolveAgeStatus as jest.Mock;

const baseProps = {
  onNext: jest.fn(),
  onComplete: jest.fn(),
  onSkip: jest.fn(),
  isLastStep: false,
  handicap: '',
  setHandicap: jest.fn(),
  firstName: '',
  setFirstName: jest.fn(),
  lastName: '',
  setLastName: jest.fn(),
  homeClubId: undefined,
  setHomeClubId: jest.fn(),
  isSubmitting: false,
  isActive: true,
};

describe('AgeCheckStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists the platform result and advances without prompting', async () => {
    mockResolve.mockResolvedValue('eligible');
    const onNext = jest.fn();
    render(<AgeCheckStep {...baseProps} onNext={onNext} />);
    await waitFor(() =>
      expect(mockSetStatus).toHaveBeenCalledWith('eligible', 'declared_age_range')
    );
    expect(onNext).toHaveBeenCalled();
  });

  it('persists an under13 platform result too', async () => {
    mockResolve.mockResolvedValue('under13');
    render(<AgeCheckStep {...baseProps} />);
    await waitFor(() =>
      expect(mockSetStatus).toHaveBeenCalledWith('under13', 'declared_age_range')
    );
  });

  it('falls back to the date-of-birth picker when the platform says unknown', async () => {
    mockResolve.mockResolvedValue('unknown');
    const { findByText } = render(<AgeCheckStep {...baseProps} />);
    expect(await findByText('Your date of birth')).toBeTruthy();
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  // REGRESSION: OnboardingScreen renders every step eagerly (FlatList data={STEPS}
  // with the default initialNumToRender of 10), so a mount effect would pop
  // Apple's system age sheet while the user is still on the Name card.
  it('does NOT touch the platform signal until the card is active', async () => {
    mockResolve.mockResolvedValue('eligible');
    render(<AgeCheckStep {...baseProps} isActive={false} />);
    await waitFor(() => expect(mockResolve).not.toHaveBeenCalled());
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it('resolves once the card becomes active', async () => {
    mockResolve.mockResolvedValue('eligible');
    const { rerender } = render(<AgeCheckStep {...baseProps} isActive={false} />);
    expect(mockResolve).not.toHaveBeenCalled();
    rerender(<AgeCheckStep {...baseProps} isActive />);
    await waitFor(() => expect(mockResolve).toHaveBeenCalledTimes(1));
  });
});
