/**
 * EditCompetitionScreen - Edit competition details
 *
 * Allows organizers to edit:
 * - Competition name
 * - Description
 * - Competition type (event/league)
 * - Team mode (individual/teams)
 * - Start date
 * - End date
 *
 * Note: Prize pool configuration is handled separately via
 * EditPrizePoolBottomSheet from the CompetitionDetailScreen.
 *
 * Uses BottomSheet component for full-screen modal presentation.
 */

import React, { useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { BottomSheet, ConfirmationDialog } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';

// Hooks
import {
  useEditCompetitionForm,
  useCompetitionSubmission,
  useCompetitionData,
} from './hooks';

// Components
import {
  LoadingState,
  ErrorState,
  EditCompetitionContent,
  EditCompetitionFooter,
} from './components';

// ============================================================================
// Types
// ============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'EditCompetition'>;

// ============================================================================
// Component
// ============================================================================

export default function EditCompetitionScreen({ navigation, route }: Props) {
  const { id } = route.params;

  // Confirmation dialog state
  const { dialogConfig, showDialog, dismissDialog } = useConfirmationDialog();

  // Fetch competition data
  const {
    competition,
    isLoading,
    error: fetchError,
  } = useCompetitionData({
    competitionId: id,
  });

  // Form management
  const {
    control,
    handleSubmit,
    errors,
    isDirty,
    competitionType,
    teamMode,
    startDateParsed,
    handleCompetitionTypeChange,
    handleTeamModeChange,
    handleStartDateChange,
    handleEndDateChange,
  } = useEditCompetitionForm({
    competition,
  });

  // Submission handling
  const {
    handleSubmit: submitForm,
    isSubmitting,
    dialogConfig: submissionDialogConfig,
    dismissDialog: dismissSubmissionDialog,
  } = useCompetitionSubmission({
    competitionId: id,
    onSuccess: () => navigation.goBack(),
  });

  // Handle close with unsaved changes confirmation
  const handleClose = useCallback(() => {
    if (isDirty) {
      showDialog({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to leave?',
        confirmLabel: 'Leave',
        confirmVariant: 'destructive',
        icon: 'alert-outline',
        onConfirm: () => {
          dismissDialog();
          navigation.goBack();
        },
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, isDirty, showDialog, dismissDialog]);

  // Save button disabled state
  const isSaveDisabled = isSubmitting || !isDirty;

  // Render loading state
  if (isLoading) {
    return <LoadingState onClose={handleClose} />;
  }

  // Render error state
  if (fetchError || !competition) {
    return <ErrorState onClose={handleClose} errorMessage={fetchError?.message} />;
  }

  return (
    <BottomSheet
      visible={true}
      onClose={handleClose}
      height="full"
      title="Edit Competition"
      showHandle={false}
      safeAreaTop
      showCloseButton
      enableSwipeToDismiss={!isDirty}
      closeOnBackdropPress={!isDirty}
      testID="edit-competition-bottom-sheet"
    >
      <EditCompetitionContent
        control={control}
        errors={errors}
        competitionType={competitionType}
        teamMode={teamMode}
        startDateParsed={startDateParsed}
        inviteCode={competition.invite_code}
        onCompetitionTypeChange={handleCompetitionTypeChange}
        onTeamModeChange={handleTeamModeChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />

      <EditCompetitionFooter
        onCancel={handleClose}
        onSave={handleSubmit(submitForm)}
        isDisabled={isSaveDisabled}
        isSaving={isSubmitting}
      />

      {/* Confirmation Dialog - Unsaved changes */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />

      {/* Confirmation Dialog - Submission errors */}
      <ConfirmationDialog {...submissionDialogConfig} onCancel={dismissSubmissionDialog} />
    </BottomSheet>
  );
}
