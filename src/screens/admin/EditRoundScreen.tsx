/**
 * EditRoundScreen - Edit round details
 *
 * Allows organizers to edit:
 * - Date
 * - Tee time
 * - Game type (format)
 * - Selected tee
 * - Scoring pairs required (premium only)
 * - Shuffle scoring pairs (if enabled and premium)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import {
  Text,
  TextInput,
  Button,
  Surface,
  Icon,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parse, isValid } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium, useSubscriptionContext } from '@/context/SubscriptionContext';
import { supabase } from '@/services/supabase/client';
import { roundKeys, scoringPairsKeys } from '@/hooks/queryKeys';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';
import type { GameType, Round, TeeBox, Course } from '@/types/database.types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditRound'>;

// =====================================================
// HELPERS
// =====================================================

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

// Format Date to DD/MM/YYYY string
const formatAustralianDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};

// Format time for display (HH:MM)
const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

// Parse HH:MM string to Date object
const parseTime = (timeString: string): Date | null => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Parse ISO date string to Date object
const parseISODate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

// =====================================================
// TYPES
// =====================================================

interface RoundFormData {
  date: string;
  teeTime: string;
  gameType: GameType;
  selectedTee: TeeBox | null;
  scoringPairsRequired: boolean;
}

interface RoundWithCourse extends Round {
  courses: Course | null;
}

// =====================================================
// DATA FETCHING
// =====================================================

async function fetchRoundWithCourse(roundId: string): Promise<RoundWithCourse> {
  const { data, error } = await supabase
    .from('rounds')
    .select(`
      *,
      courses (*)
    `)
    .eq('id', roundId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch round: ${error.message}`);
  }

  return data as RoundWithCourse;
}

async function updateRound(
  roundId: string,
  updates: {
    date?: string;
    tee_time?: string | null;
    game_type?: GameType;
    selected_tee?: TeeBox | null;
    scoring_pairs_required?: boolean;
  }
): Promise<void> {
  const { error } = await (supabase as any)
    .from('rounds')
    .update(updates)
    .eq('id', roundId);

  if (error) {
    throw new Error(`Failed to update round: ${error.message}`);
  }
}

async function shuffleScoringPairs(roundId: string): Promise<void> {
  // Delete existing scoring pairs
  const { error: deleteError } = await supabase
    .from('scoring_pairs')
    .delete()
    .eq('round_id', roundId);

  if (deleteError) {
    throw new Error(`Failed to shuffle scoring pairs: ${deleteError.message}`);
  }
}

// =====================================================
// TEE SELECTOR COMPONENT
// =====================================================

interface TeeSelectorProps {
  tees: TeeBox[];
  selectedTee: TeeBox | null;
  onSelect: (tee: TeeBox) => void;
  disabled?: boolean;
}

function TeeSelector({ tees, selectedTee, onSelect, disabled }: TeeSelectorProps) {
  const colors = useThemeColors();

  if (tees.length === 0) {
    return (
      <View style={[styles.emptyTees, { backgroundColor: colors.gray100 }]}>
        <Icon source="golf-tee" size={24} color={colors.gray400} />
        <Text style={[styles.emptyTeesText, { color: colors.textSecondary }]}>
          No tees configured for this course
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.teeGrid}>
      {tees.map((tee) => {
        const isSelected = selectedTee?.name === tee.name;
        return (
          <Pressable
            key={tee.name}
            style={[
              styles.teeCard,
              {
                backgroundColor: isSelected ? colors.primaryLighter : colors.gray100,
                borderColor: isSelected ? colors.primary : colors.gray200,
              },
            ]}
            onPress={() => onSelect(tee)}
            disabled={disabled}
          >
            <View
              style={[
                styles.teeColorIndicator,
                { backgroundColor: tee.color || colors.gray400 },
              ]}
            />
            <Text
              style={[
                styles.teeName,
                { color: isSelected ? colors.primary : colors.textPrimary },
              ]}
            >
              {tee.name}
            </Text>
            {tee.courseRating && (
              <Text style={[styles.teeRating, { color: colors.textSecondary }]}>
                CR: {tee.courseRating}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function EditRoundScreen({ navigation, route }: Props) {
  const { roundId, competitionId } = route.params;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const { limits } = useSubscriptionContext();

  // Form state
  const [formData, setFormData] = useState<RoundFormData>({
    date: '',
    teeTime: '',
    gameType: 'stableford',
    selectedTee: null,
    scoringPairsRequired: false,
  });

  // Original values for dirty check
  const [originalData, setOriginalData] = useState<RoundFormData | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Fetch round data
  const {
    data: round,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: roundKeys.detail(roundId),
    queryFn: () => fetchRoundWithCourse(roundId),
    enabled: !!roundId,
  });

  // Populate form when data loads
  useEffect(() => {
    if (round) {
      const parsedDate = parseISODate(round.date);
      const data: RoundFormData = {
        date: parsedDate ? formatAustralianDate(parsedDate) : '',
        teeTime: round.tee_time || '',
        gameType: round.game_type,
        selectedTee: round.selected_tee,
        scoringPairsRequired: round.scoring_pairs_required,
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [round]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!originalData) return false;
    return (
      formData.date !== originalData.date ||
      formData.teeTime !== originalData.teeTime ||
      formData.gameType !== originalData.gameType ||
      formData.selectedTee?.name !== originalData.selectedTee?.name ||
      formData.scoringPairsRequired !== originalData.scoringPairsRequired
    );
  }, [formData, originalData]);

  // Get available tees from course
  const availableTees = useMemo(() => {
    return round?.courses?.tees || [];
  }, [round?.courses?.tees]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const parsedDate = parseAustralianDate(formData.date);
      if (!parsedDate) {
        throw new Error('Invalid date format');
      }

      await updateRound(roundId, {
        date: format(parsedDate, 'yyyy-MM-dd'),
        tee_time: formData.teeTime || null,
        game_type: formData.gameType,
        selected_tee: formData.selectedTee,
        scoring_pairs_required: formData.scoringPairsRequired,
      });
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      if (competitionId) {
        queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'details'] });
      }
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update round');
    },
  });

  // Shuffle scoring pairs mutation
  const shuffleMutation = useMutation({
    mutationFn: () => shuffleScoringPairs(roundId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scoringPairsKeys.list(roundId) });
      Alert.alert(
        'Scoring Pairs Shuffled',
        'Existing scoring pairs have been cleared. New pairs will be auto-generated when players view the round.',
        [{ text: 'OK' }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to shuffle scoring pairs');
    },
  });

  // Handlers
  const handleBack = useCallback(() => {
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

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && date) {
      setFormData((prev) => ({ ...prev, date: formatAustralianDate(date) }));
    }
  };

  const handleDatePickerDismiss = () => {
    setShowDatePicker(false);
  };

  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && time) {
      setFormData((prev) => ({ ...prev, teeTime: formatTime(time) }));
    }
  };

  const handleTimePickerDismiss = () => {
    setShowTimePicker(false);
  };

  const clearTeeTime = () => {
    setFormData((prev) => ({ ...prev, teeTime: '' }));
  };

  const handleGameTypeChange = useCallback((gameType: GameType) => {
    setFormData((prev) => ({ ...prev, gameType }));
  }, []);

  const handleTeeSelect = useCallback((tee: TeeBox) => {
    setFormData((prev) => ({ ...prev, selectedTee: tee }));
  }, []);

  const handleScoringPairsToggle = useCallback((value: boolean) => {
    setFormData((prev) => ({ ...prev, scoringPairsRequired: value }));
  }, []);

  const handleShuffleScoringPairs = useCallback(() => {
    Alert.alert(
      'Shuffle Scoring Pairs',
      'This will clear all existing scoring pairs and generate new random ones. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shuffle',
          style: 'destructive',
          onPress: () => shuffleMutation.mutate(),
        },
      ]
    );
  }, [shuffleMutation]);

  const handleSubmit = useCallback(() => {
    if (!formData.date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    updateMutation.mutate();
  }, [formData.date, updateMutation]);

  // Get selected date for picker
  const getSelectedDate = () => {
    if (formData.date) {
      return parseAustralianDate(formData.date) || new Date();
    }
    return new Date();
  };

  // Get selected time for picker
  const getSelectedTime = () => {
    if (formData.teeTime) {
      return parseTime(formData.teeTime) || new Date();
    }
    return new Date();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading round...</Text>
      </View>
    );
  }

  // Error state
  if (fetchError || !round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centerContent]}>
        <Icon source="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Unable to load round</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {fetchError?.message || 'Round not found'}
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top, backgroundColor: colors.white, borderBottomColor: colors.gray200 },
        ]}
      >
        <Pressable
          style={styles.headerButton}
          onPress={handleBack}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Icon source="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Round</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Update round details below. Changes will apply to all players.
        </Text>

        {/* Course Info (Read-only) */}
        <Surface style={[styles.courseInfoSection, { backgroundColor: colors.white }]} elevation={1}>
          <View style={styles.courseInfoRow}>
            <View style={[styles.courseIcon, { backgroundColor: colors.primaryLighter }]}>
              <Icon source="golf" size={24} color={colors.primary} />
            </View>
            <View style={styles.courseDetails}>
              <Text style={[styles.courseLabel, { color: colors.textSecondary }]}>Course</Text>
              <Text style={[styles.courseName, { color: colors.textPrimary }]}>
                {round.courses?.name || 'Unknown Course'}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Form Section */}
        <Surface style={[styles.formSection, { backgroundColor: colors.white }]} elevation={1}>
          {/* Date Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Date *</Text>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <TextInput
                mode="outlined"
                value={formData.date}
                placeholder="Select a date"
                editable={false}
                pointerEvents="none"
                style={[styles.input, { backgroundColor: colors.white }]}
                outlineColor={colors.gray300}
                activeOutlineColor={colors.primary}
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => setShowDatePicker(true)}
                    color={colors.primary}
                  />
                }
              />
            </Pressable>

            {/* Date Picker */}
            {showDatePicker &&
              (Platform.OS === 'ios' ? (
                <Surface
                  style={[styles.datePickerContainer, { backgroundColor: colors.white }]}
                  elevation={2}
                >
                  <View style={[styles.datePickerHeader, { borderBottomColor: colors.gray200 }]}>
                    <Button onPress={handleDatePickerDismiss} textColor={colors.primary}>
                      Done
                    </Button>
                  </View>
                  <DateTimePicker
                    value={getSelectedDate()}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                  />
                </Surface>
              ) : (
                <DateTimePicker
                  value={getSelectedDate()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              ))}
          </View>

          {/* Tee Time (Optional) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee Time (Optional)</Text>
            <Pressable onPress={() => setShowTimePicker(true)}>
              <TextInput
                mode="outlined"
                value={formData.teeTime}
                placeholder="Select tee time"
                editable={false}
                pointerEvents="none"
                style={[styles.input, { backgroundColor: colors.white }]}
                outlineColor={colors.gray300}
                activeOutlineColor={colors.primary}
                right={
                  formData.teeTime ? (
                    <TextInput.Icon icon="close" onPress={clearTeeTime} color={colors.gray400} />
                  ) : (
                    <TextInput.Icon
                      icon="clock-outline"
                      onPress={() => setShowTimePicker(true)}
                      color={colors.primary}
                    />
                  )
                }
              />
            </Pressable>

            {/* Time Picker */}
            {showTimePicker &&
              (Platform.OS === 'ios' ? (
                <Surface
                  style={[styles.datePickerContainer, { backgroundColor: colors.white }]}
                  elevation={2}
                >
                  <View style={[styles.datePickerHeader, { borderBottomColor: colors.gray200 }]}>
                    <Button onPress={handleTimePickerDismiss} textColor={colors.primary}>
                      Done
                    </Button>
                  </View>
                  <DateTimePicker
                    value={getSelectedTime()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    minuteInterval={5}
                  />
                </Surface>
              ) : (
                <DateTimePicker
                  value={getSelectedTime()}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                  minuteInterval={5}
                />
              ))}
          </View>

          {/* Game Type Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format *</Text>
            <RoundGameTypeSelector
              value={formData.gameType}
              onChange={handleGameTypeChange}
              disabled={updateMutation.isPending}
              allowedGameTypes={limits?.allowedGameTypes}
              onUpgradePress={() => navigation.navigate('Subscription')}
            />
          </View>

          {/* Tee Selection */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Tee</Text>
            <TeeSelector
              tees={availableTees}
              selectedTee={formData.selectedTee}
              onSelect={handleTeeSelect}
              disabled={updateMutation.isPending}
            />
          </View>
        </Surface>

        {/* Scoring Pairs Section - Premium Only */}
        <Surface style={[styles.formSection, { backgroundColor: colors.white }]} elevation={1}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scoring Pairs</Text>

          {isPremium ? (
            <>
              {/* Toggle */}
              <View style={styles.toggleContainer}>
                <View style={styles.toggleContent}>
                  <View style={[styles.toggleIcon, { backgroundColor: colors.primaryLighter }]}>
                    <Icon source="account-switch" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.toggleTextContainer}>
                    <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                      Require Scoring Pairs
                    </Text>
                    <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                      Specify which players score each other
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.scoringPairsRequired}
                  onValueChange={handleScoringPairsToggle}
                  trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                  thumbColor={formData.scoringPairsRequired ? colors.primary : colors.gray100}
                  disabled={updateMutation.isPending}
                />
              </View>

              {/* Shuffle Button - Only show if scoring pairs are enabled */}
              {formData.scoringPairsRequired && (
                <>
                  <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />
                  <Pressable
                    style={[styles.shuffleButton, { borderColor: colors.gray300 }]}
                    onPress={handleShuffleScoringPairs}
                    disabled={shuffleMutation.isPending}
                  >
                    <Icon
                      source="shuffle-variant"
                      size={20}
                      color={shuffleMutation.isPending ? colors.gray400 : colors.primary}
                    />
                    <Text
                      style={[
                        styles.shuffleButtonText,
                        { color: shuffleMutation.isPending ? colors.gray400 : colors.primary },
                      ]}
                    >
                      {shuffleMutation.isPending ? 'Shuffling...' : 'Shuffle Scoring Pairs'}
                    </Text>
                  </Pressable>
                  <Text style={[styles.shuffleHint, { color: colors.textSecondary }]}>
                    Clear existing pairs and generate new random assignments
                  </Text>
                </>
              )}
            </>
          ) : (
            // Locked for non-premium
            <Pressable
              style={styles.lockedContainer}
              onPress={() => navigation.navigate('Subscription')}
            >
              <View style={styles.toggleContent}>
                <View style={[styles.toggleIcon, { backgroundColor: colors.gray200 }]}>
                  <Icon source="lock" size={24} color={colors.gray500} />
                </View>
                <View style={styles.toggleTextContainer}>
                  <View style={styles.lockedLabelRow}>
                    <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
                      Require Scoring Pairs
                    </Text>
                    <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                      <Text style={styles.premiumBadgeText}>Premium</Text>
                    </View>
                  </View>
                  <Text style={[styles.toggleDescription, { color: colors.textTertiary }]}>
                    Upgrade to Premium to assign designated markers
                  </Text>
                </View>
              </View>
              <Icon source="chevron-right" size={24} color={colors.gray400} />
            </Pressable>
          )}
        </Surface>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: colors.white,
            borderTopColor: colors.gray200,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={handleBack}
          style={[styles.cancelButton, { borderColor: colors.gray300 }]}
          contentStyle={styles.buttonContent}
          textColor={colors.textSecondary}
          disabled={updateMutation.isPending}
          theme={{ colors: { outline: colors.gray300 } }}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={updateMutation.isPending}
          disabled={updateMutation.isPending || !isDirty}
          style={styles.saveButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.primary}
          textColor={colors.white}
        >
          Save Changes
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    borderRadius: borderRadius.md,
  },

  // Course Info Section
  courseInfoSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  courseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseLabel: {
    ...typography.caption,
  },
  courseName: {
    ...typography.bodyBold,
    marginTop: 2,
  },

  // Form Section
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  datePickerContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
  },

  // Tee Selector
  teeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  teeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  teeColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teeName: {
    ...typography.smallBold,
  },
  teeRating: {
    ...typography.caption,
  },
  emptyTees: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyTeesText: {
    ...typography.small,
    flex: 1,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyBold,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },

  // Locked state
  lockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Shuffle button
  divider: {
    marginVertical: spacing.md,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  shuffleButtonText: {
    ...typography.bodyBold,
  },
  shuffleHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  saveButton: {
    flex: 2,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
});
