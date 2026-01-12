/**
 * SkinsConfigBottomSheet Component Tests
 *
 * Tests for the skins configuration bottom sheet including:
 * - Rendering with/without initial config
 * - Form elements
 * - Accessibility
 *
 * @see src/components/skins/SkinsConfigBottomSheet.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { SkinsConfigBottomSheet } from '@/components/skins/SkinsConfigBottomSheet';
import type { SkinsConfig } from '@/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockConfig = (overrides: Partial<SkinsConfig> = {}): SkinsConfig => ({
  pot_type: 'per_hole',
  pot_value: 5,
  scoring_type: 'gross',
  currency: 'AUD',
  ...overrides,
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SkinsConfigBottomSheet', () => {
  const mockOnDismiss = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when visible', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('skins-config-bottom-sheet')).toBeTruthy();
    });

    it('renders title', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Skins Configuration')).toBeTruthy();
    });

    it('renders section titles', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('POT SETUP')).toBeTruthy();
      expect(screen.getByText('SCORING TYPE')).toBeTruthy();
    });

    it('renders pot type options', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Per Hole')).toBeTruthy();
      expect(screen.getByText('Total Pot')).toBeTruthy();
    });

    it('renders scoring type options', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Gross')).toBeTruthy();
      expect(screen.getByText('Net')).toBeTruthy();
    });

    it('renders participants info', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText(/All players in your group/)).toBeTruthy();
    });

    it('renders save button', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('skins-config-save-button')).toBeTruthy();
      expect(screen.getByText('Save Configuration')).toBeTruthy();
    });
  });

  describe('Save Button State', () => {
    it('save button is disabled initially when no value entered', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('skins-config-save-button');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);
    });

    it('save button has correct accessibility label', () => {
      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('skins-config-save-button');
      expect(saveButton.props.accessibilityLabel).toBe('Save skins configuration');
    });
  });

  describe('With Initial Config', () => {
    it('renders with initial config values', () => {
      const initialConfig = createMockConfig({
        pot_type: 'per_hole',
        pot_value: 5,
        scoring_type: 'gross',
      });

      render(
        <SkinsConfigBottomSheet
          visible={true}
          onDismiss={mockOnDismiss}
          initialConfig={initialConfig}
          onSave={mockOnSave}
        />
      );

      // Should render without crashing
      expect(screen.getByTestId('skins-config-bottom-sheet')).toBeTruthy();
    });
  });
});
