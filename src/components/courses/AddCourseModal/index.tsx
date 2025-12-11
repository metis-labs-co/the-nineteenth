/**
 * AddCourseModal - Multi-step wizard for adding a new venue with course details
 *
 * Features:
 * - Step 1: Venue details (name, city, state)
 * - Step 2: Course name and tee boxes
 * - Step 3: Hole-by-hole data entry (par, SI, distances)
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Icon, Button, ProgressBar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAddCourseWizard } from './hooks/useAddCourseWizard';
import { useTeeManagement } from './hooks/useTeeManagement';
import { VenueDetailsStep } from './steps/VenueDetailsStep';
import { CourseTeesStep } from './steps/CourseTeesStep';
import { HoleDataStep } from './steps/HoleDataStep';
import { STEPS, type AddCourseModalProps } from './types';

export type { AddCourseModalProps };

export function AddCourseModal({ visible, onClose, onVenueCreated }: AddCourseModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const wizard = useAddCourseWizard({ onClose, onVenueCreated });

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={wizard.handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[
          styles.modalContainer,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {STEPS[wizard.currentStep - 1].title}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={wizard.handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon source="close" size={24} color={colors.gray600} />
          </Pressable>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepIndicator}>
            {STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: colors.gray200 },
                    wizard.currentStep >= step.number && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepCircleText,
                      { color: colors.textSecondary },
                      wizard.currentStep >= step.number && { color: colors.white },
                    ]}
                  >
                    {step.number}
                  </Text>
                </View>
                {index < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: colors.gray200 },
                      wizard.currentStep > step.number && { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
          <ProgressBar
            progress={wizard.progress / 100}
            color={colors.primary}
            style={[styles.progressBar, { backgroundColor: colors.gray100 }]}
          />
        </View>

        {/* Step Content */}
        <View style={styles.contentContainer}>
          {wizard.currentStep === 1 && (
            <VenueDetailsStep
              data={wizard.wizardData.step1}
              onVenueNameChange={wizard.handleVenueNameChange}
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
              onCourseNameChange={wizard.handleCourseNameChange}
              onAddTee={teeManagement.handleAddTee}
              onEditTee={teeManagement.handleEditTee}
              onSaveTee={teeManagement.handleSaveTee}
              onCancelEdit={teeManagement.handleCancelEdit}
              onDeleteTee={teeManagement.handleDeleteTee}
              onTeeNameChange={teeManagement.setNewTeeName}
              onTeeColorChange={teeManagement.setNewTeeColor}
            />
          )}
          {wizard.currentStep === 3 && (
            <HoleDataStep
              holes={wizard.wizardData.step3.holes}
              currentHoleIndex={wizard.wizardData.step3.currentHoleIndex}
              tees={wizard.wizardData.step2.tees}
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
        <View
          style={[
            styles.modalFooter,
            {
              paddingBottom: insets.bottom + spacing.lg,
              borderTopColor: colors.gray100,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.footerButtons}>
            {wizard.currentStep > 1 && (
              <Button
                mode="outlined"
                onPress={wizard.handleBack}
                style={[styles.backButton, { borderColor: colors.gray300 }]}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, { color: colors.textPrimary }]}
              >
                Back
              </Button>
            )}
            <Button
              mode="contained"
              onPress={wizard.currentStep === 3 ? wizard.handleCreate : wizard.handleNext}
              loading={wizard.isPending}
              disabled={!wizard.canProceed || wizard.isPending}
              style={[
                styles.nextButton,
                wizard.currentStep === 1 && styles.fullWidthButton,
                { backgroundColor: wizard.canProceed ? colors.primary : colors.gray300 },
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={[styles.buttonLabel, { color: colors.white }]}
            >
              {getButtonLabel()}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h3,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleText: {
    ...typography.smallBold,
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: spacing.xs,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.lg,
  },
  fullWidthButton: {
    flex: 1,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});
