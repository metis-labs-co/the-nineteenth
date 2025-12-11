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
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, TextInput, Avatar, Icon, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { player, user, updateProfile, isLoading } = useAuth();
  const colors = useThemeColors();
  const isDark = useIsDark();

  // In dark mode, use gray100 instead of white for backgrounds
  const surfaceColor = isDark ? colors.gray100 : colors.white;

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

      // Pass all form fields - empty strings will be converted to null by the hook
      await updateProfile({
        name: data.name,
        phone: data.phone, // Empty string will be stored as null
        handicap: newHandicap,
        golf_id: data.golf_id || undefined,
        // Update handicap_updated_at if handicap changed
        ...(handicapChanged && { handicap_updated_at: new Date().toISOString() }),
      });

      setSnackbarMessage('Profile updated successfully');
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert(
        'Error',
        'Failed to update profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel/back
  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Display email (read-only)
  const displayEmail = player?.email || user?.email || '';

  // Loading state
  if (isLoading && !player) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: surfaceColor, borderBottomColor: colors.gray200 }]}>
        <Pressable
          onPress={handleCancel}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          style={[styles.headerButton, (!isDirty || isSubmitting) && styles.headerButtonDisabled]}
          disabled={!isDirty || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Save profile"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              style={[
                styles.headerButtonText,
                { color: colors.primary, fontWeight: '600' },
                (!isDirty || isSubmitting) && { color: colors.textDisabled },
              ]}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {player?.photo_url ? (
            <Avatar.Image
              size={100}
              source={{ uri: player.photo_url }}
              style={[styles.avatar, { backgroundColor: colors.primary }]}
            />
          ) : (
            <Avatar.Icon size={100} icon="account" style={[styles.avatar, { backgroundColor: colors.primary }]} />
          )}
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
            Photo uploads coming soon
          </Text>
        </View>

        {/* Form Fields */}
        <View style={[styles.formSection, { backgroundColor: surfaceColor }]}>
          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Name *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter your name"
                  style={[styles.input, { backgroundColor: surfaceColor }]}
                  outlineColor={errors.name ? colors.error : colors.gray300}
                  activeOutlineColor={errors.name ? colors.error : colors.primary}
                  error={!!errors.name}
                  accessibilityLabel="Name input"
                  accessibilityHint="Enter your display name"
                />
              )}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.name.message}</Text>
            )}
          </View>

          {/* Email Field (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Email</Text>
            <TextInput
              mode="outlined"
              value={displayEmail}
              editable={false}
              style={[styles.input, { backgroundColor: colors.gray100 }]}
              outlineColor={colors.gray200}
              accessibilityLabel="Email (read-only)"
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Email cannot be changed
            </Text>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Phone Number</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., 0412 345 678"
                  keyboardType="phone-pad"
                  style={[styles.input, { backgroundColor: surfaceColor }]}
                  outlineColor={errors.phone ? colors.error : colors.gray300}
                  activeOutlineColor={errors.phone ? colors.error : colors.primary}
                  error={!!errors.phone}
                  accessibilityLabel="Phone number input"
                  accessibilityHint="Enter your phone number"
                />
              )}
            />
            {errors.phone && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.phone.message}</Text>
            )}
          </View>

          {/* Handicap Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Handicap</Text>
            <Controller
              control={control}
              name="handicap"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g., 18.5"
                  keyboardType="decimal-pad"
                  style={[styles.input, { backgroundColor: surfaceColor }]}
                  outlineColor={errors.handicap ? colors.error : colors.gray300}
                  activeOutlineColor={errors.handicap ? colors.error : colors.primary}
                  error={!!errors.handicap}
                  left={<TextInput.Affix text="HC:" />}
                  accessibilityLabel="Handicap input"
                  accessibilityHint="Enter your golf handicap between 0 and 54"
                />
              )}
            />
            {errors.handicap && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.handicap.message}</Text>
            )}
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              Enter a value between 0 and 54
              {player?.handicap_updated_at && (
                ` • Last updated: ${formatHandicapDate(player.handicap_updated_at)}`
              )}
            </Text>
          </View>

          {/* Golf ID Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Golf ID</Text>
            <Controller
              control={control}
              name="golf_id"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="1234567890"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={[styles.input, { backgroundColor: surfaceColor }]}
                  outlineColor={errors.golf_id ? colors.error : colors.gray300}
                  activeOutlineColor={errors.golf_id ? colors.error : colors.primary}
                  error={!!errors.golf_id}
                  left={<TextInput.Affix text="GA:" />}
                  accessibilityLabel="Golf ID input"
                  accessibilityHint="Enter your 10-digit Golf Australia ID"
                />
              )}
            />
            {errors.golf_id && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.golf_id.message}</Text>
            )}
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              10-digit Golf Australia ID (check the GA app)
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: colors.gray100 }]}>
          <Icon source="information" size={20} color={colors.gray500} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Your profile information is visible to other players in your competitions.
          </Text>
        </View>
      </ScrollView>

      {/* Snackbar for success message */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ backgroundColor: colors.success }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.h4,
  },
  headerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 60,
    alignItems: 'center',
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
    paddingTop: spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    marginBottom: spacing.sm,
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
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.xs,
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
