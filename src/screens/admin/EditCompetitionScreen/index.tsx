/**
 * EditCompetitionScreen - Edit competition details
 *
 * Allows organizers to edit:
 * - Competition name
 * - Description
 * - Competition type (event/league)
 * - Team mode
 * - Start date
 * - End date
 *
 * Uses BottomSheet component for full-screen modal presentation.
 */

import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { BottomSheet } from '@/components/common';

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

  // Fetch competition data
  const { competition, isLoading, error: fetchError } = useCompetitionData({
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
  } = useEditCompetitionForm({ competition });

  // Submission handling
  const { handleSubmit: submitForm, isSubmitting } = useCompetitionSubmission({
    competitionId: id,
    onSuccess: () => navigation.goBack(),
  });

  // Handle close with unsaved changes confirmation
  const handleClose = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [navigation, isDirty]);

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
    </BottomSheet>
  );
}
