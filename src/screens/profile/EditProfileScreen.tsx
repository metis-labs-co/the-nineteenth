/**
 * EditProfileScreen - Edit player profile
 *
 * Allows users to update their player profile data:
 * - Name
 * - Phone number
 * - Handicap
 *
 * Uses React Hook Form with Zod validation.
 * Integrates with useAuth hook for profile updates.
 * Presented as a full-screen BottomSheet for consistent UX.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import type { PlayerGender } from '@/types/database/player.types';
import {
  LoadingSpinner,
  GolfBallLoader,
  FormInput,
  BottomSheet,
  ConfirmationDialog,
  FormSection,
  PlayerAvatar,
  AvatarSelectionModal,
} from '@/components/common';
import { Text, Icon, Snackbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatAvatarUrl } from '@/constants/avatars';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper to split a full name into first/last parts
function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.substring(0, spaceIndex),
    lastName: trimmed.substring(spaceIndex + 1).trim(),
  };
}

// Form validation schema
const editProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[\d\s+()-]{8,20}$/.test(val),
      'Please enter a valid phone number'
    ),
  handicap: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 54),
      'Handicap must be between 0 and 54'
    ),
  golf_id: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[A-Za-z0-9]{4,15}$/.test(val),
      'Golf ID must be 4-15 alphanumeric characters'
    ),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { player, user, updateProfile, isLoading } = useAuth();
  const colors = useThemeColors();

  // Sheet visibility - always open when screen is focused
  const [sheetVisible, setSheetVisible] = useState(false);

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Avatar selection state
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [pendingAvatarId, setPendingAvatarId] = useState<string | null>(null);

  // Gender selection state
  const [selectedGender, setSelectedGender] = useState<PlayerGender | null>(player?.gender ?? null);
  const [genderChanged, setGenderChanged] = useState(false);

  // Split player name into first/last for form
  const { firstName: defaultFirstName, lastName: defaultLastName } = splitName(player?.name || '');

  // Form setup with default values from current player data
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: defaultFirstName,
      lastName: defaultLastName,
      phone: player?.phone || '',
      handicap: player?.handicap?.toString() || '',
      golf_id: player?.golf_id || '',
    },
  });

  // Open sheet when screen is focused
  useFocusEffect(
    useCallback(() => {
      setSheetVisible(true);
      return () => {
        setSheetVisible(false);
      };
    }, [])
  );

  // Update form when player data loads
  useEffect(() => {
    if (player) {
      const { firstName, lastName } = splitName(player.name || '');
      reset({
        firstName,
        lastName,
        phone: player.phone || '',
        handicap: player.handicap?.toString() || '',
        golf_id: player.golf_id || '',
      });
      // Reset gender state to match player data
      setSelectedGender(player.gender ?? null);
      setGenderChanged(false);
    }
  }, [player, reset]);

  // Format handicap updated date for display
  const formatHandicapDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Handle form submission
  const onSubmit = async (data: EditProfileFormData) => {
    setIsSubmitting(true);
    try {
      // Concatenate first + last name for the single `name` column
      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

      // Check if handicap changed to update handicap_updated_at
      const handicapChanged = data.handicap !== (player?.handicap?.toString() || '');
      const newHandicap = data.handicap ? parseFloat(data.handicap) : player?.handicap ?? 0;

      // Build photoUrl only if avatar was changed
      const photoUrl = pendingAvatarId !== null
        ? formatAvatarUrl(pendingAvatarId)
        : undefined;

      // Pass all form fields - empty strings will be converted to null by the hook
      await updateProfile({
        name: fullName,
        phone: data.phone, // Empty string will be stored as null
        handicap: newHandicap,
        golf_id: data.golf_id || undefined,
        // Update handicap_updated_at if handicap changed
        ...(handicapChanged && { handicap_updated_at: new Date().toISOString() }),
        // Include photoUrl only when avatar was actually changed
        ...(photoUrl !== undefined && { photoUrl }),
        // Include gender if it was changed
        ...(genderChanged && { gender: selectedGender }),
      });

      // Reset pending avatar and gender states after successful save
      setPendingAvatarId(null);
      setGenderChanged(false);

      setSnackbarMessage('Profile updated successfully');
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSnackbarMessage('Failed to update profile. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sheet close
  const handleClose = useCallback(() => {
    setSheetVisible(false);
    // Small delay to let animation complete before navigation
    setTimeout(() => {
      navigation.goBack();
    }, 150);
  }, [navigation]);

  // Check if there are unsaved changes (form, avatar, or gender)
  const hasUnsavedChanges = isDirty || pendingAvatarId !== null || genderChanged;

  // Handle cancel/back - show confirmation if form is dirty
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      handleClose();
    }
  }, [hasUnsavedChanges, handleClose]);

  // Handle discard confirmation
  const handleDiscardConfirm = useCallback(() => {
    setShowDiscardDialog(false);
    handleClose();
  }, [handleClose]);

  // Handle avatar selection
  const handleAvatarSelect = useCallback((avatarId: string) => {
    setPendingAvatarId(avatarId);
    setAvatarModalVisible(false);
  }, []);

  // Handle gender selection
  const handleGenderSelect = useCallback((gender: PlayerGender | null) => {
    setSelectedGender(gender);
    setGenderChanged(gender !== (player?.gender ?? null));
  }, [player?.gender]);

  // Gender options for the selector
  const genderOptions = useMemo(() => [
    { value: 'male' as const, label: 'Male' },
    { value: 'female' as const, label: 'Female' },
    { value: null, label: 'Not specified' },
  ], []);

  // Display email (read-only)
  const displayEmail = player?.email || user?.email || '';

  // Header left button (Cancel)
  const headerLeft = (
    <TouchableOpacity
      onPress={handleCancel}
      style={styles.headerButton}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Cancel"
    >
      <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>
        Cancel
      </Text>
    </TouchableOpacity>
  );

  // Header right button (Save)
  const headerRight = (
    <TouchableOpacity
      onPress={handleSubmit(onSubmit)}
      style={[styles.headerButton, (!hasUnsavedChanges || isSubmitting) && styles.headerButtonDisabled]}
      activeOpacity={0.7}
      disabled={!hasUnsavedChanges || isSubmitting}
      accessibilityRole="button"
      accessibilityLabel="Save profile"
    >
      {isSubmitting ? (
        <GolfBallLoader size="sm" />
      ) : (
        <Text
          style={[
            styles.headerButtonText,
            { color: colors.primary, fontWeight: '600' },
            (!hasUnsavedChanges || isSubmitting) && { color: colors.textDisabled },
          ]}
        >
          Save
        </Text>
      )}
    </TouchableOpacity>
  );

  // Loading state inside sheet content
  const renderContent = () => {
    if (isLoading && !player) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => setAvatarModalVisible(true)}
            style={styles.avatarContainer}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
          >
            <PlayerAvatar
              photoUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}
              name={player?.name}
              size={100}
            />
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <Icon source="pencil" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
            Tap to change avatar
          </Text>
        </View>

        {/* Form Fields */}
        <FormSection style={{ marginHorizontal: spacing.lg, marginBottom: 0 }}>
          {/* First Name Field */}
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="First Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter your first name"
                error={errors.firstName?.message}
                required
                accessibilityHint="Enter your first name"
              />
            )}
          />

          {/* Last Name Field */}
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Last Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter your last name"
                error={errors.lastName?.message}
                required
                accessibilityHint="Enter your last name"
              />
            )}
          />

          {/* Email Field (Read-only) */}
          <FormInput
            label="Email"
            value={displayEmail}
            onChangeText={() => {}}
            editable={false}
            hint="Email cannot be changed"
          />

          {/* Phone Field */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Phone Number"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g., 0412 345 678"
                keyboardType="phone"
                error={errors.phone?.message}
                accessibilityHint="Enter your phone number"
              />
            )}
          />

          {/* Handicap Field */}
          <Controller
            control={control}
            name="handicap"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Handicap"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g., 18.5"
                keyboardType="decimal"
                error={errors.handicap?.message}
                hint={`Enter a value between 0 and 54${player?.handicap_updated_at ? ` • Last updated: ${formatHandicapDate(player.handicap_updated_at)}` : ''}`}
                leftAffix="HC:"
                accessibilityHint="Enter your golf handicap between 0 and 54"
              />
            )}
          />

          {/* Golf ID Field */}
          <Controller
            control={control}
            name="golf_id"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Golf ID"
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="1234567890"
                keyboardType="default"
                maxLength={15}
                error={errors.golf_id?.message}
                hint="Your national golf body ID"
                leftAffix="ID:"
                accessibilityHint="Enter your national golf body ID"
              />
            )}
          />

          {/* Gender Selection */}
          <View style={styles.genderSection}>
            <Text style={[styles.genderLabel, { color: colors.textPrimary }]}>
              Gender
            </Text>
            <Text style={[styles.genderHint, { color: colors.textSecondary }]}>
              Used for daily handicap calculations
            </Text>
            <View style={styles.genderButtons}>
              {genderOptions.map((option) => {
                const isSelected = selectedGender === option.value;
                return (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => handleGenderSelect(option.value)}
                    style={[
                      styles.genderButton,
                      { borderColor: isSelected ? colors.primary : colors.border },
                      isSelected && { backgroundColor: colors.primaryLight },
                    ]}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                        isSelected && { fontWeight: '600' },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </FormSection>

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: colors.gray100 }]}>
          <Icon source="information" size={20} color={colors.gray500} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Your profile information is visible to other players in your competitions.
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <BottomSheet
        visible={sheetVisible}
        onClose={handleCancel}
        height="full"
        title="Edit Profile"
        showCloseButton={false}
        headerLeft={headerLeft}
        headerRight={headerRight}
        enableSwipeToDismiss={false}
        testID="edit-profile-sheet"
      >
        {renderContent()}
      </BottomSheet>

      {/* Discard Changes Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDiscardDialog}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        confirmVariant="destructive"
        onConfirm={handleDiscardConfirm}
        onCancel={() => setShowDiscardDialog(false)}
        icon="alert-circle"
      />

      {/* Snackbar for feedback messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ backgroundColor: snackbarMessage.includes('Failed') ? colors.error : colors.success }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* Avatar Selection Modal */}
      <AvatarSelectionModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        onSelect={handleAvatarSelect}
        currentAvatarUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    ...typography.body,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    ...typography.caption,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  genderSection: {
    marginTop: spacing.md,
  },
  genderLabel: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  genderHint: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  genderButtonText: {
    ...typography.body,
  },
});
