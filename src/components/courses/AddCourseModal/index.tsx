/**
 * AddCourseModal - Full-screen wizard for adding a new venue with course details
 *
 * Features:
 * - Step 1: Venue details (name, city, state)
 * - Step 2: Course name and tee boxes
 * - Step 3: Hole-by-hole data entry (par, SI, distances)
 *
 * Uses FullScreenWizard for consistent full-screen presentation.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsSuperAdmin } from '@/store/subscriptionStore';
import { FullScreenWizard } from '@/components/common/FullScreenWizard';
import { SystemModalTheme } from '@/components/common';
import type { UseWizardReturn, WizardStepConfig } from '@/components/common/FullScreenWizard';
import { useAddCourseWizard } from './hooks/useAddCourseWizard';
import { useTeeManagement } from './hooks/useTeeManagement';
import { VenueDetailsStep } from './steps/VenueDetailsStep';
import { CourseTeesStep } from './steps/CourseTeesStep';
import { HoleDataStep } from './steps/HoleDataStep';
import { STEPS, type AddCourseModalProps } from './types';

export type { AddCourseModalProps };

export function AddCourseModal({ visible, onClose, onVenueCreated }: AddCourseModalProps) {
  const colors = useThemeColors();
  const isSuperAdmin = useIsSuperAdmin();

  const wizard = useAddCourseWizard({ onClose, onClubCreated: onVenueCreated ?? (() => {}) });

  const teeManagement = useTeeManagement({
    onAddTee: wizard.handleAddTee,
    onUpdateTee: wizard.handleUpdateTee,
    onDeleteTee: wizard.handleDeleteTee,
  });

  const getButtonLabel = () => {
    if (wizard.currentStep === 3) {
      return 'Create Course';
    }
    return 'Next';
  };

  // Build wizard-compatible object for FullScreenWizard
  const wizardCompat = useMemo((): UseWizardReturn => {
    const steps: WizardStepConfig[] = STEPS.map((step) => ({
      key: `step-${step.number}`,
      title: step.title,
      canProceed: wizard.canProceed,
      render: () => null,
    }));
    const currentIndex = wizard.currentStep - 1;

    return {
      currentStepIndex: currentIndex,
      currentStep: steps[currentIndex] || steps[0],
      steps,
      goNext: () => {},
      goBack: wizard.currentStep === 1 ? wizard.handleClose : wizard.handleBack,
      goToStep: () => {},
      isFirstStep: wizard.currentStep === 1,
      isLastStep: currentIndex === steps.length - 1,
      totalSteps: steps.length,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- STEPS is a module-level constant
  }, [wizard.currentStep, wizard.canProceed, wizard.handleClose, wizard.handleBack]);

  // Footer with navigation buttons
  const footer = (
    <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.footerButtons}>
        {wizard.currentStep > 1 && (
          <TouchableOpacity
            onPress={wizard.handleBack}
            style={[styles.backButton, { borderColor: colors.gray300 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={wizard.currentStep === 3 ? wizard.handleCreate : wizard.handleNext}
          disabled={!wizard.canProceed || wizard.isPending}
          style={[
            styles.nextButton,
            wizard.currentStep === 1 && styles.fullWidthButton,
            { backgroundColor: wizard.canProceed ? colors.primary : colors.gray300 },
          ]}
          activeOpacity={0.7}
        >
          {wizard.isPending ? (
            <Text style={[styles.nextButtonText, { color: colors.white }]}>Creating...</Text>
          ) : (
            <Text style={[styles.nextButtonText, { color: colors.white }]}>{getButtonLabel()}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={wizard.handleClose}
    >
      <SystemModalTheme>
      <FullScreenWizard
        title="Add Course"
        wizard={wizardCompat}
        showFooter={false}
        scrollable={false}
        onClose={wizard.handleClose}
      >
        <View style={styles.container}>
          {/* Step Content */}
          <View style={styles.contentContainer}>
            {wizard.currentStep === 1 && (
              <VenueDetailsStep
                data={wizard.wizardData.step1}
                onVenueNameChange={wizard.handleClubNameChange}
                onCityChange={wizard.handleCityChange}
                onStateChange={wizard.handleStateChange}
              />
            )}
            {wizard.currentStep === 2 && (
              <CourseTeesStep
                courseName={wizard.wizardData.step2.courseName}
                tees={wizard.wizardData.step2.tees}
                editingTeeId={teeManagement.editingTeeId}
                newTeeName={teeManagement.newTeeName}
                newTeeColor={teeManagement.newTeeColor}
                newSlopeRating={teeManagement.newSlopeRating}
                newCourseRating={teeManagement.newCourseRating}
                numHoles={wizard.wizardData.step2.numHoles}
                showNumHolesToggle={isSuperAdmin}
                onCourseNameChange={wizard.handleCourseNameChange}
                onNumHolesChange={wizard.handleNumHolesChange}
                onAddTee={teeManagement.handleAddTee}
                onEditTee={teeManagement.handleEditTee}
                onSaveTee={teeManagement.handleSaveTee}
                onCancelEdit={teeManagement.handleCancelEdit}
                onDeleteTee={teeManagement.handleDeleteTee}
                onTeeNameChange={teeManagement.setNewTeeName}
                onTeeColorChange={teeManagement.setNewTeeColor}
                onSlopeRatingChange={teeManagement.setNewSlopeRating}
                onCourseRatingChange={teeManagement.setNewCourseRating}
              />
            )}
            {wizard.currentStep === 3 && (
              <HoleDataStep
                holes={wizard.wizardData.step3.holes}
                currentHoleIndex={wizard.wizardData.step3.currentHoleIndex}
                tees={wizard.wizardData.step2.tees}
                numHoles={wizard.wizardData.step2.numHoles}
                duplicateSiValues={wizard.duplicateSiValues}
                onHoleChange={wizard.handleHoleChange}
                onHoleYardageChange={wizard.handleHoleYardageChange}
                onNextHole={wizard.handleNextHole}
                onPrevHole={wizard.handlePrevHole}
                onJumpToHole={wizard.handleJumpToHole}
              />
            )}
          </View>

          {/* Footer */}
          {footer}
        </View>
      </FullScreenWizard>
      </SystemModalTheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    ...typography.bodyBold,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
  nextButtonText: {
    ...typography.bodyBold,
  },
});
