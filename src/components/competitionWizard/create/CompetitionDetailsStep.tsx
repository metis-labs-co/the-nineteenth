import React from 'react';
import { View, StyleSheet, Platform, ScrollView, LayoutAnimation, UIManager, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parse, isValid, startOfDay } from 'date-fns';
import {
  competitionDetailsSchema,
  type CompetitionDetailsFormData,
  type CompetitionType,
  type HandicapSource,
} from '@/schemas/competition';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { DatePicker, FormInput, FormSection, Pill, SegmentedButton } from '@/components/common';
import { useIsPremium, useCheckFeature } from '@/context/SubscriptionContext';
import { IconTrophy, IconLock } from '@tabler/icons-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CompetitionDetailsStepProps {
  initialData?: CompetitionDetailsFormData;
  onComplete: (data: CompetitionDetailsFormData) => void;
  onBack: () => void;
  onUpgradePress?: () => void;
}

// Parse DD/MM/YYYY string to Date object
const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

// Prize pool color for styling
const PRIZE_POOL_COLOR = '#059669';

export default function CompetitionDetailsStep({
  initialData,
  onComplete,
  onBack,
  onUpgradePress,
}: CompetitionDetailsStepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isPremium = useIsPremium();
  const checkFeature = useCheckFeature();
  const teamFormatsAccess = checkFeature('team_formats');
  const canUseTeams = teamFormatsAccess.allowed;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompetitionDetailsFormData>({
    resolver: zodResolver(competitionDetailsSchema),
    mode: 'onSubmit', // Only validate when clicking Next
    defaultValues: initialData || {
      name: '',
      description: '',
      competitionType: 'event',
      startDate: '',
      endDate: '',
      handicapSystem: 'whs', // Always WHS - no toggle exposed
      handicapSource: 'profile', // Default to profile handicap (Social Index is premium)
      inviteCode: '',
      enableTeams: false,
      enablePrizePool: false,
    },
  });

  // Watch competition type to conditionally show end date
  const competitionType = useWatch({ control, name: 'competitionType' });

  // Watch start date for end date minimum
  const startDateValue = useWatch({ control, name: 'startDate' });
  const startDateParsed = parseAustralianDate(startDateValue);

  // Watch handicap source for hint text
  const handicapSource = useWatch({ control, name: 'handicapSource' });

  const handleCompetitionTypeChange = (value: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValue('competitionType', value as CompetitionType);
    // Clear end date when switching to knockout
    if (value === 'knockout') {
      setValue('endDate', '');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Enter the basic details for your competition. You can edit these later.
        </Text>

        {/* Form Section */}
        <FormSection>
          {/* Competition Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Competition Name"
                placeholder="e.g., Summer Classic 2025"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
                returnKeyType="next"
                required
              />
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Description (Optional)"
                placeholder="Add a description for your competition..."
                value={value || ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                multiline
                numberOfLines={4}
              />
            )}
          />

          {/* Competition Type */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Competition Type *</Text>
            <Controller
              control={control}
              name="competitionType"
              render={({ field: { value } }) => (
                <SegmentedButton
                  value={value}
                  onValueChange={handleCompetitionTypeChange}
                  buttons={[
                    { value: 'event', label: 'Event', icon: 'calendar-star' },
                    { value: 'knockout', label: 'Knockout', icon: 'sword-cross' },
                  ]}
                  size="large"
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {competitionType === 'event'
                ? 'A fixed-term competition with a set end date'
                : 'A bracket-style elimination competition'}
            </Text>
          </View>

          {/* Invite Code */}
          <Controller
            control={control}
            name="inviteCode"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Invite Code (Optional)"
                placeholder="e.g., SUMMER2025"
                value={value || ''}
                onChangeText={(text) => onChange(text.toUpperCase().replace(/[^A-Z0-9-_]/g, ''))}
                onBlur={onBlur}
                error={errors.inviteCode?.message}
                hint={!errors.inviteCode ? 'Custom code for players to join. Leave blank to auto-generate.' : undefined}
                autoCapitalize="characters"
                returnKeyType="next"
              />
            )}
          />

          {/* Start Date */}
          <Controller
            control={control}
            name="startDate"
            render={({ field: { onChange, value } }) => (
              <DatePicker
                value={value}
                onChange={onChange}
                mode="date"
                label="Start Date *"
                placeholder="Select a date"
                error={errors.startDate?.message}
                hint={!errors.startDate ? 'When the competition begins' : undefined}
                minimumDate={startOfDay(new Date())}
              />
            )}
          />

          {/* End Date - Only shown for Event type */}
          {competitionType === 'event' && (
            <Controller
              control={control}
              name="endDate"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  value={value || ''}
                  onChange={onChange}
                  mode="date"
                  label="End Date *"
                  placeholder="Select end date"
                  error={errors.endDate?.message}
                  hint={!errors.endDate ? 'Competition will auto-complete after this date' : undefined}
                  minimumDate={startDateParsed || startOfDay(new Date())}
                  icon="calendar-end"
                />
              )}
            />
          )}

          {/* Team Toggle */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format</Text>
            {canUseTeams ? (
              <Controller
                control={control}
                name="enableTeams"
                render={({ field: { value, onChange } }) => (
                  <SegmentedButton
                    value={value ? 'team' : 'individual'}
                    onValueChange={(newValue) => onChange(newValue === 'team')}
                    buttons={[
                      { value: 'individual', label: 'Individual', icon: 'account' },
                      { value: 'team', label: 'Team', icon: 'account-group' },
                    ]}
                    size="large"
                  />
                )}
              />
            ) : (
              <TouchableOpacity
                onPress={onUpgradePress}
                style={[
                  styles.teamToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.gray300,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.teamToggleContent}>
                  <View
                    style={[
                      styles.prizePoolIconContainer,
                      { backgroundColor: colors.gray200 },
                    ]}
                  >
                    <IconLock size={20} color={colors.gray500} />
                  </View>
                  <View style={styles.teamToggleText}>
                    <View style={styles.prizePoolLabelRow}>
                      <Text style={[styles.teamToggleLabel, { color: colors.textSecondary }]}>
                        Team Format
                      </Text>
                      <Pill
                        label={teamFormatsAccess.requiredTier === 'premium' ? 'Premium' : 'Social'}
                        variant="warning"
                        filled
                        size="sm"
                      />
                    </View>
                    <Text style={[styles.teamToggleDescription, { color: colors.textTertiary }]}>
                      Upgrade to use team competitions
                    </Text>
                  </View>
                </View>
                <Icon source="chevron-right" size={24} color={colors.gray400} />
              </TouchableOpacity>
            )}
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {canUseTeams
                ? 'Team format can be configured in competition settings after creation'
                : 'Individual format only on your current plan'}
            </Text>
          </View>

          {/* Handicap Source */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Handicap Source</Text>
            <Controller
              control={control}
              name="handicapSource"
              render={({ field: { value, onChange } }) => (
                <SegmentedButton
                  value={value || 'profile'}
                  onValueChange={(newValue) => onChange(newValue as HandicapSource)}
                  buttons={[
                    { value: 'calculated', label: 'Social Index', icon: 'calculator', disabled: !isPremium },
                    { value: 'profile', label: 'Handicap', icon: 'card-account-details' },
                  ]}
                  size="large"
                />
              )}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              {!isPremium
                ? 'Social Index requires a Premium subscription'
                : (handicapSource || 'profile') === 'calculated'
                  ? "Uses Social Handicap Index (calculated from app rounds) with profile handicap fallback"
                  : "Uses player's handicap (manually entered in profile)"}
            </Text>
          </View>

          {/* Prize Pool Toggle */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Prize Pool</Text>
            {isPremium ? (
              <Controller
                control={control}
                name="enablePrizePool"
                render={({ field: { value, onChange } }) => (
                  <TouchableOpacity
                    onPress={() => onChange(!value)}
                    style={[
                      styles.teamToggle,
                      {
                        backgroundColor: value ? `${PRIZE_POOL_COLOR}15` : colors.surface,
                        borderColor: value ? PRIZE_POOL_COLOR : colors.gray300,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.teamToggleContent}>
                      <View
                        style={[
                          styles.prizePoolIconContainer,
                          {
                            backgroundColor: value ? `${PRIZE_POOL_COLOR}20` : colors.gray200,
                          },
                        ]}
                      >
                        <IconTrophy
                          size={20}
                          color={value ? PRIZE_POOL_COLOR : colors.gray500}
                        />
                      </View>
                      <View style={styles.teamToggleText}>
                        <Text style={[styles.teamToggleLabel, { color: colors.textPrimary }]}>
                          {value ? 'Prize Pool Enabled' : 'Add Prize Pool'}
                        </Text>
                        <Text style={[styles.teamToggleDescription, { color: colors.textSecondary }]}>
                          {value ? 'Configure in next step' : 'Fund skins games and competition prizes'}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: value ? PRIZE_POOL_COLOR : colors.surface,
                          borderColor: value ? PRIZE_POOL_COLOR : colors.gray300,
                        },
                      ]}
                    >
                      {value && <Icon source="check" size={14} color={colors.white} />}
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <TouchableOpacity
                onPress={onUpgradePress}
                style={[
                  styles.teamToggle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.gray300,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.teamToggleContent}>
                  <View
                    style={[
                      styles.prizePoolIconContainer,
                      { backgroundColor: colors.gray200 },
                    ]}
                  >
                    <IconLock size={20} color={colors.gray500} />
                  </View>
                  <View style={styles.teamToggleText}>
                    <View style={styles.prizePoolLabelRow}>
                      <Text style={[styles.teamToggleLabel, { color: colors.textSecondary }]}>
                        Add Prize Pool
                      </Text>
                      <Pill label="Premium" variant="warning" filled size="sm" />
                    </View>
                    <Text style={[styles.teamToggleDescription, { color: colors.textTertiary }]}>
                      Upgrade to Premium for prize pools
                    </Text>
                  </View>
                </View>
                <Icon source="chevron-right" size={24} color={colors.gray400} />
              </TouchableOpacity>
            )}
            {isPremium && (
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                Prize pool configuration in a dedicated step after rounds
              </Text>
            )}
          </View>
        </FormSection>
      </ScrollView>

      {/* Action Buttons - Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.surface, borderTopColor: colors.gray200 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.cancelButton, { borderColor: colors.gray300, borderWidth: 1 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit(onComplete)}
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>Next: Rounds</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 2,
    borderRadius: borderRadius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
  teamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  teamToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  teamToggleText: {
    flex: 1,
  },
  teamToggleLabel: {
    ...typography.bodyBold,
  },
  teamToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizePoolIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prizePoolLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
