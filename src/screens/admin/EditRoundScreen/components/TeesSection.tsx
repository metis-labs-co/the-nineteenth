/**
 * TeesSection - Tee selection UI
 */

import React from 'react';
import { spacing } from '@/constants/theme';
import { FormSection, TeeSelector } from '@/components/common';
import type { TeeBox } from '@/types/database.types';

interface TeesSectionProps {
  tees: TeeBox[];
  selectedTee: TeeBox | null;
  onSelectTee: (tee: TeeBox) => void;
  disabled?: boolean;
}

export function TeesSection({
  tees,
  selectedTee,
  onSelectTee,
  disabled,
}: TeesSectionProps) {
  return (
    <FormSection noCard title="Tee" style={{ marginBottom: spacing.lg }}>
      <TeeSelector
        tees={tees}
        selectedTee={selectedTee}
        onSelectTee={onSelectTee}
        variant="cards"
        disabled={disabled}
      />
    </FormSection>
  );
}
