/**
 * FullScreenWizard - Reusable full-screen wizard component
 *
 * Provides a consistent wizard experience with:
 * - Centered header with title and close button
 * - Segmented progress bar with step titles
 * - Scrollable content area with keyboard avoidance
 * - Standard Back/Next/Submit footer
 *
 * @example
 * const wizard = useWizard({
 *   steps: stepConfigs,
 *   onSubmit: handleCreate,
 *   onClose: () => navigation.goBack(),
 * });
 *
 * <FullScreenWizard title="Create League" wizard={wizard}>
 *   {wizard.currentStep.render()}
 * </FullScreenWizard>
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '../PageHeader';
import { WizardProgressBar } from './WizardProgressBar';
import { WizardFooter } from './WizardFooter';
import type { FullScreenWizardProps } from './types';

export function FullScreenWizard({
  title,
  wizard,
  children,
  scrollable = true,
  showFooter = true,
  isSubmitting = false,
  onClose,
}: FullScreenWizardProps) {
  const colors = useThemeColors();

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.contentView}>{children}</View>
  );

  // Resolve the close handler: explicit onClose prop, or goBack from first step
  const handleClose = onClose ?? (wizard.isFirstStep ? wizard.goBack : undefined);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title={title}
        showBack={!wizard.isFirstStep}
        onBack={wizard.goBack}
        backIcon="arrow"
        rightActions={handleClose ? [{
          icon: 'close',
          onPress: handleClose,
          accessibilityLabel: 'Close wizard',
        }] : undefined}
      />
      <WizardProgressBar
        steps={wizard.steps}
        currentStepIndex={wizard.currentStepIndex}
      />
      <View style={styles.flex}>
        {content}
        {showFooter && <WizardFooter wizard={wizard} isSubmitting={isSubmitting} />}
      </View>
    </View>
  );
}

// Re-export hook and types for convenience
export { useWizard } from './useWizard';
export type {
  WizardStepConfig,
  UseWizardOptions,
  UseWizardReturn,
  FullScreenWizardProps,
} from './types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentView: {
    flex: 1,
  },
});
