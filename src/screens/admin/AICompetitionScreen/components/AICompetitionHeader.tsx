/**
 * AICompetitionHeader - Header for AI competition screen
 *
 * Shows back button, title, and beta badge
 */

import React from 'react';
import { PageHeader, Pill } from '@/components/common';
import type { ScreenState } from '../hooks';

interface AICompetitionHeaderProps {
  screenState: ScreenState;
  onBack: () => void;
}

export function AICompetitionHeader({
  screenState,
  onBack,
}: AICompetitionHeaderProps) {
  const headerTitle =
    screenState === 'preview' ? 'Review Competition' : 'Create with AI';

  return (
    <PageHeader
      title={headerTitle}
      variant="centered"
      showBack
      onBack={onBack}
      backIcon={screenState === 'input' ? 'close' : 'arrow'}
      rightContent={<Pill label="Beta" size="sm" />}
    />
  );
}
