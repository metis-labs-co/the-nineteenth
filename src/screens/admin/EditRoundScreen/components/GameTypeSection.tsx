/**
 * GameTypeSection - Game format selection
 */

import React from 'react';
import { spacing } from '@/constants/theme';
import { FormSection } from '@/components/common';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';
import type { GameType } from '@/types/database.types';

interface GameTypeSectionProps {
  value: GameType;
  onChange: (gameType: GameType) => void;
  disabled?: boolean;
  allowedGameTypes?: GameType[];
  onUpgradePress: () => void;
}

export function GameTypeSection({
  value,
  onChange,
  disabled,
  allowedGameTypes,
  onUpgradePress,
}: GameTypeSectionProps) {
  return (
    <FormSection noCard title="Format *" style={{ marginBottom: spacing.lg }}>
      <RoundGameTypeSelector
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowedGameTypes={allowedGameTypes}
        onUpgradePress={onUpgradePress}
      />
    </FormSection>
  );
}

