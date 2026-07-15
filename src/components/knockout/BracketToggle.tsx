/**
 * BracketToggle - Toggle between Main and Consolation brackets
 *
 * Uses SegmentedButton for consistent styling.
 */

import React from 'react';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import type { BracketType } from '@/types/database';

export interface BracketToggleProps {
  value: BracketType;
  onValueChange: (value: BracketType) => void;
  hasConsolation: boolean;
  style?: object;
}

export const BracketToggle = React.memo(function BracketToggle({
  value,
  onValueChange,
  hasConsolation,
  style,
}: BracketToggleProps) {
  if (!hasConsolation) return null;

  return (
    <SegmentedButton<BracketType>
      value={value}
      onValueChange={onValueChange}
      buttons={[
        { value: 'main', label: 'Main', icon: 'trophy-outline' },
        { value: 'consolation', label: 'Consolation', icon: 'shield-outline' },
      ]}
      size="small"
      style={style}
    />
  );
});
