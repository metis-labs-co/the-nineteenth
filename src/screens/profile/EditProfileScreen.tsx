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

import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import {
  LoadingSpinner,
  GolfBallLoader,
  FormInput,
  BottomSheet,
  ConfirmationDialog,
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
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatAvatarUrl } from '@/constants/avatars';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Form validation schema
const editProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
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
      (val) => !val || /^[0-9]{10}$/.test(val),
      'Golf ID must be exactly 10 digits'
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

  // Form setup with default values from current player data
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: player?.name || '',
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
      reset({
        name: player.name || '',
        phone: player.phone || '',
        handicap: player.handicap?.toString() || '',
        golf_id: player.golf_id || '',
      });
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
      // Check if handicap changed to update handicap_updated_at
      const handicapChanged = data.handicap !== (player?.handicap?.toString() || '');
      const newHandicap = data.handicap ? parseFloat(data.handicap) : player?.handicap ?? 0;

      // Build photoUrl only if avatar was changed
      const photoUrl = pendingAvatarId !== null
        ? formatAvatarUrl(pendingAvatarId)
        : undefined;

      // Pass all form fields - empty strings will be converted to null by the hook
      await updateProfile({
        name: data.name,
        phone: data.phone, // Empty string will be stored as null
        handicap: newHandicap,
        golf_id: data.golf_id || undefined,
        // Update handicap_updated_at if handicap changed
        ...(handicapChanged && { handicap_updated_at: new Date().toISOString() }),
        // Include photoUrl only when avatar was actually changed
        ...(photoUrl !== undefined && { photoUrl }),
      });

      // Reset pending avatar state after successful save
      setPendingAvatarId(null);

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

  // Check if there are unsaved changes (form or avatar)
  const hasUnsavedChanges = isDirty || pendingAvatarId !== null;

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
        <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
          {/* Name Field */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter your name"
                error={errors.name?.message}
                required
                accessibilityHint="Enter your display name"
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
                keyboardType="number"
                maxLength={10}
                error={errors.golf_id?.message}
                hint="10-digit Golf Australia ID (check the GA app)"
                leftAffix="GA:"
                accessibilityHint="Enter your 10-digit Golf Australia ID"
              />
            )}
          />
        </View>

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
  formSection: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
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
});
