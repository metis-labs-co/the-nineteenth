import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { AgeLock } from '@/components/common/AgeLock';
import { useSocialAccess } from '@/hooks/useSocialAccess';

jest.mock('@/hooks/useSocialAccess');
const mockAccess = useSocialAccess as jest.Mock;

describe('AgeLock', () => {
  it('renders children when the user is eligible', () => {
    mockAccess.mockReturnValue({
      status: 'eligible', socialEnabled: true, isRestricted: false, isLoading: false,
    });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.getByText('social content')).toBeTruthy();
  });

  // REGRESSION: without this, every eligible user sees the restriction notice
  // flash on each cold start while their profile loads.
  it('shows neither children nor the notice while loading', () => {
    mockAccess.mockReturnValue({
      status: 'unknown', socialEnabled: false, isRestricted: false, isLoading: true,
    });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.queryByText('social content')).toBeNull();
    expect(screen.queryByText(/not available/i)).toBeNull();
  });

  it('hides children and explains why when restricted', () => {
    mockAccess.mockReturnValue({
      status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.queryByText('social content')).toBeNull();
    expect(screen.getByText(/not available/i)).toBeTruthy();
  });

  it('never offers an upgrade path', () => {
    mockAccess.mockReturnValue({
      status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    render(<AgeLock><Text>social content</Text></AgeLock>);
    expect(screen.queryByText(/upgrade/i)).toBeNull();
    expect(screen.queryByText(/subscri/i)).toBeNull();
  });

  it('accepts a custom message', () => {
    mockAccess.mockReturnValue({
      status: 'under13', socialEnabled: false, isRestricted: true, isLoading: false,
    });
    render(<AgeLock message="Comments are turned off."><Text>c</Text></AgeLock>);
    expect(screen.getByText('Comments are turned off.')).toBeTruthy();
  });
});
