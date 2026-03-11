/**
 * CreateLeagueScreen - 2-step wizard to create a new league
 *
 * Step 1: Type selection + name/description
 * Step 2: Type-specific configuration
 *   - Ongoing: info only
 *   - Season: start/end date pickers
 *   - Round Limit: max rounds stepper + optional counting rounds
 *   - Ladder: challenge range picker + seeding method
 *   - Eclectic: course search, tee selector, gross/net toggle
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, FormInput, FormSection } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useCreateLeague } from '@/hooks/useLeagues';
import { useFeatureAccess } from '@/hooks/subscription/useFeatureAccess';
import { useClubsWithCourses, useSearchClubs, useFavoriteCoursesWithClubs } from '@/hooks/clubs';
import { useTeesByCourse } from '@/hooks/useTees';
import { CourseSelectionModal } from '@/components/competitionWizard/create/RoundDetailsStep/components/CourseSelectionModal';
import { TeeSelectionModal } from '@/components/competitionWizard/create/RoundDetailsStep/components/TeeSelectionModal';
import LeagueTypeSelector from '@/components/leagues/LeagueTypeSelector';
import type { LeagueType, LadderSeeding, EclecticScoring, PartnershipFormat, Tee } from '@/types/database';
import type { TeeBox } from '@/types/database/base';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem, SearchResultItem } from '@/hooks/clubs';
import type { Club } from '@/types/database.types';
import type { CreateLeagueInput } from '@/services/api/leagues';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Step 2 config components
function SeasonConfig({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}) {
  const _colors = useThemeColors();

  return (
    <FormSection noCard title="Season Dates" description="Only rounds played within these dates can be tagged.">
      <FormInput
        label="Start Date"
        floatingLabel
        placeholder="DD/MM/YYYY"
        value={startDate}
        onChangeText={onStartDateChange}
        keyboardType="default"
        accessibilityHint="Enter start date in DD/MM/YYYY format"
      />
      <FormInput
        label="End Date"
        floatingLabel
        placeholder="DD/MM/YYYY"
        value={endDate}
        onChangeText={onEndDateChange}
        keyboardType="default"
        accessibilityHint="Enter end date in DD/MM/YYYY format"
      />
    </FormSection>
  );
}

function RoundLimitConfig({
  maxRounds,
  countingRounds,
  useBestOf,
  onMaxRoundsChange,
  onCountingRoundsChange,
  onUseBestOfChange,
}: {
  maxRounds: number;
  countingRounds: number;
  useBestOf: boolean;
  onMaxRoundsChange: (value: number) => void;
  onCountingRoundsChange: (value: number) => void;
  onUseBestOfChange: (value: boolean) => void;
}) {
  const colors = useThemeColors();
  const roundOptions = [5, 8, 10, 12, 15, 20];

  return (
    <FormSection noCard title="Total Rounds" description="Maximum rounds each player can tag.">
      <View style={styles.stepperRow}>
        {roundOptions.map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => {
              onMaxRoundsChange(value);
              if (countingRounds > value) onCountingRoundsChange(value);
            }}
            style={[
              styles.stepperButton,
              {
                backgroundColor: maxRounds === value ? colors.primary : colors.surface,
                borderColor: maxRounds === value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.stepperText,
              { color: maxRounds === value ? colors.white : colors.textPrimary },
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => onUseBestOfChange(!useBestOf)}
        style={[styles.toggleRow, { borderColor: colors.border }]}
      >
        <View style={styles.toggleTextContainer}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
            Best N of {maxRounds}
          </Text>
          <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
            Only count the best rounds for the leaderboard
          </Text>
        </View>
        <Icon
          source={useBestOf ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={useBestOf ? colors.primary : colors.gray300}
        />
      </TouchableOpacity>

      {useBestOf && (
        <View style={styles.countingSection}>
          <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
            Best {countingRounds} of {maxRounds} rounds count
          </Text>
          <View style={styles.stepperRow}>
            {Array.from({ length: maxRounds - 1 }, (_, i) => i + 1)
              .filter((v) => v <= maxRounds && v >= Math.max(1, maxRounds - 6))
              .map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => onCountingRoundsChange(value)}
                  style={[
                    styles.stepperButton,
                    {
                      backgroundColor: countingRounds === value ? colors.primary : colors.surface,
                      borderColor: countingRounds === value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.stepperText,
                    { color: countingRounds === value ? colors.white : colors.textPrimary },
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}
    </FormSection>
  );
}

function LadderConfig({
  challengeRange,
  seeding,
  onChallengeRangeChange,
  onSeedingChange,
}: {
  challengeRange: number;
  seeding: LadderSeeding;
  onChallengeRangeChange: (value: number) => void;
  onSeedingChange: (value: LadderSeeding) => void;
}) {
  const colors = useThemeColors();
  const rangeOptions = [1, 2, 3, 4, 5];
  const seedingOptions: { value: LadderSeeding; label: string }[] = [
    { value: 'join_order', label: 'Join Order' },
    { value: 'handicap', label: 'By Handicap' },
    { value: 'random', label: 'Random' },
  ];

  return (
    <FormSection noCard title="Challenge Range" description="How many positions above can a player challenge?">
      <View style={styles.stepperRow}>
        {rangeOptions.map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => onChallengeRangeChange(value)}
            style={[
              styles.stepperButton,
              {
                backgroundColor: challengeRange === value ? colors.primary : colors.surface,
                borderColor: challengeRange === value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.stepperText,
              { color: challengeRange === value ? colors.white : colors.textPrimary },
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.configTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
        Initial Seeding
      </Text>
      <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
        How players are initially ranked on the ladder.
      </Text>
      <View style={styles.stepperRow}>
        {seedingOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSeedingChange(option.value)}
            style={[
              styles.seedingButton,
              {
                backgroundColor: seeding === option.value ? colors.primary : colors.surface,
                borderColor: seeding === option.value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[
              styles.seedingText,
              { color: seeding === option.value ? colors.white : colors.textPrimary },
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </FormSection>
  );
}

function EclecticConfig({
  courseName,
  teeName,
  scoring,
  onCoursePress,
  onTeePress,
  onScoringChange,
}: {
  courseName: string | null;
  teeName: string | null;
  scoring: EclecticScoring;
  onCoursePress: () => void;
  onTeePress: () => void;
  onScoringChange: (value: EclecticScoring) => void;
}) {
  const colors = useThemeColors();

  return (
    <FormSection noCard title="Course" description="All tagged rounds must be from this course.">
      <TouchableOpacity
        onPress={onCoursePress}
        style={[styles.selectorButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Icon source="golf" size={20} color={courseName ? colors.primary : colors.gray400} />
        <Text style={[
          styles.selectorText,
          { color: courseName ? colors.textPrimary : colors.textSecondary },
        ]}>
          {courseName ?? 'Select a course...'}
        </Text>
        <Icon source="chevron-right" size={20} color={colors.gray400} />
      </TouchableOpacity>

      <Text style={[styles.configTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
        Scoring
      </Text>
      <View style={styles.stepperRow}>
        {(['gross', 'net'] as EclecticScoring[]).map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onScoringChange(option)}
            style={[
              styles.seedingButton,
              {
                backgroundColor: scoring === option ? colors.primary : colors.surface,
                borderColor: scoring === option ? colors.primary : colors.border,
                flex: 1,
              },
            ]}
          >
            <Text style={[
              styles.seedingText,
              { color: scoring === option ? colors.white : colors.textPrimary },
            ]}>
              {option === 'gross' ? 'Gross' : 'Net'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {scoring === 'net' && (
        <>
          <Text style={[styles.configTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Tee
          </Text>
          <Text style={[styles.configDescription, { color: colors.textSecondary }]}>
            Required for net scoring. Used to calculate strokes received.
          </Text>
          <TouchableOpacity
            onPress={onTeePress}
            style={[styles.selectorButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Icon source="flag-variant" size={20} color={teeName ? colors.primary : colors.gray400} />
            <Text style={[
              styles.selectorText,
              { color: teeName ? colors.textPrimary : colors.textSecondary },
            ]}>
              {teeName ?? 'Select a tee...'}
            </Text>
            <Icon source="chevron-right" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </>
      )}
    </FormSection>
  );
}

function PartnershipConfig({
  format,
  onFormatChange,
}: {
  format: PartnershipFormat;
  onFormatChange: (value: PartnershipFormat) => void;
}) {
  const colors = useThemeColors();

  const formatOptions: { value: PartnershipFormat; label: string; description: string }[] = [
    { value: 'combined_stroke', label: 'Combined Stroke', description: 'Both play own ball. Scores added together.' },
    { value: 'scramble', label: 'Scramble', description: 'One team ball. Pick the best shot each time.' },
    { value: 'shamble', label: 'Shamble', description: 'Best drive, then each plays own ball.' },
    { value: 'best_ball', label: 'Best Ball', description: 'Both play own ball. Best net score counts.' },
  ];

  return (
    <>
      <FormSection noCard title="Format" description="How the partnership plays each round.">
        <View style={styles.formatOptions}>
          {formatOptions.map((option) => {
            const isSelected = format === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onFormatChange(option.value)}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: isSelected ? colors.primaryBackground : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel={`${option.label} format`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.formatTextRow}>
                  <Text style={[styles.formatLabel, { color: colors.textPrimary }]}>
                    {option.label}
                  </Text>
                  {isSelected && <Icon source="check-circle" size={18} color={colors.primary} />}
                </View>
                <Text style={[styles.formatDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FormSection>

      <View style={[styles.infoBox, { backgroundColor: colors.primaryBackground }]}>
        <Icon source="information-outline" size={20} color={colors.primary} />
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            How It Works
          </Text>
          <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
            Pairs form partnerships and tag rounds together. Target scores are calculated from combined handicaps. Leaderboard ranks by average target differential &mdash; lower is better.
          </Text>
        </View>
      </View>
    </>
  );
}

function OngoingConfig() {
  const colors = useThemeColors();

  return (
    <View style={[styles.infoBox, { backgroundColor: colors.primaryBackground }]}>
      <Icon source="information-outline" size={20} color={colors.primary} />
      <View style={styles.infoTextContainer}>
        <Text style={[styles.infoTitle, { color: colors.primary }]}>
          How Scoring Works
        </Text>
        <Text style={[styles.infoDescription, { color: colors.textSecondary }]}>
          Players tag completed 18-hole rounds to the league. Leaderboard ranks by the average of each player&apos;s best 8 handicap differentials from their last 20 rounds.
        </Text>
      </View>
    </View>
  );
}

// Helper to parse DD/MM/YYYY to ISO date string
function parseDateInput(input: string): string | null {
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2020) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export default function CreateLeagueScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const createLeague = useCreateLeague();
  const { checkAccess } = useFeatureAccess();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Type + Name
  const [leagueType, setLeagueType] = useState<LeagueType>('ongoing');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Type-specific config
  // Season
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Round Limit
  const [maxRounds, setMaxRounds] = useState(10);
  const [countingRounds, setCountingRounds] = useState(8);
  const [useBestOf, setUseBestOf] = useState(true);
  // Ladder
  const [challengeRange, setChallengeRange] = useState(3);
  const [ladderSeeding, setLadderSeeding] = useState<LadderSeeding>('join_order');
  // Partnership
  const [partnershipFormat, setPartnershipFormat] = useState<PartnershipFormat>('combined_stroke');
  // Eclectic
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string | null>(null);
  const [teeId, setTeeId] = useState<string | null>(null);
  const [teeName, setTeeName] = useState<string | null>(null);
  const [eclecticScoring, setEclecticScoring] = useState<EclecticScoring>('gross');

  // Check if user can create premium league types (ladder/eclectic)
  const premiumAccess = checkAccess('create_premium_league');
  const canCreatePremium = premiumAccess.allowed;

  // Course/Tee selection for eclectic
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTeeModal, setShowTeeModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  const { data: allClubs = [], isLoading: isLoadingCourses } = useClubsWithCourses({
    enabled: leagueType === 'eclectic',
  });
  const { data: searchResults = [], isLoading: isSearching } = useSearchClubs(
    courseSearchQuery,
    undefined
  );
  const { data: favoriteCourses = [] } = useFavoriteCoursesWithClubs();
  const { data: courseTees = [] } = useTeesByCourse(courseId ?? '', {
    enabled: !!courseId,
  });

  // Transform clubs to display items for CourseSelectionModal
  const displayItems: ClubCourseDisplayItem[] = useMemo(() => {
    const clubs = courseSearchQuery.length >= 2 ? searchResults : allClubs;
    return (clubs ?? []).map((club: SearchResultItem) => {
      const type: 'single-course' | 'multi-course-club' = club.is_multi_course
        ? 'multi-course-club'
        : 'single-course';
      return {
        type,
        club: club as Club,
        venue: club as Club,
        courses: club.courses ?? [],
        is_home: club.is_home,
      };
    });
  }, [courseSearchQuery, searchResults, allClubs]);

  // Convert Tee[] to TeeBox[] for the TeeSelectionModal
  const availableTeeBoxes: TeeBox[] = useMemo(() => {
    return courseTees.map((tee: Tee) => ({
      name: tee.name,
      color: tee.color ?? 'white',
      totalYardage: tee.total_length ?? undefined,
      courseRating: tee.course_rating ?? undefined,
      slopeRating: tee.slope ?? undefined,
    }));
  }, [courseTees]);

  const canProceedStep1 = name.trim().length >= 2;

  const canCreateLeague = useMemo(() => {
    if (!canProceedStep1) return false;

    switch (leagueType) {
      case 'season': {
        const start = parseDateInput(startDate);
        const end = parseDateInput(endDate);
        return !!start && !!end && start < end;
      }
      case 'round_limit':
        return maxRounds > 0;
      case 'ladder':
        return challengeRange >= 1 && challengeRange <= 5;
      case 'eclectic':
        return !!courseId && (eclecticScoring === 'gross' || !!teeId);
      case 'partnership':
        return !!partnershipFormat;
      default:
        return true;
    }
  }, [canProceedStep1, leagueType, startDate, endDate, maxRounds, challengeRange, courseId, eclecticScoring, teeId, partnershipFormat]);

  const handleCreate = useCallback(async () => {
    if (!canCreateLeague) return;

    const input: CreateLeagueInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      league_type: leagueType,
    };

    if (leagueType === 'season') {
      input.start_date = parseDateInput(startDate)!;
      input.end_date = parseDateInput(endDate)!;
    } else if (leagueType === 'round_limit') {
      input.max_rounds = maxRounds;
      input.counting_rounds = useBestOf ? countingRounds : undefined;
    } else if (leagueType === 'ladder') {
      input.challenge_range = challengeRange;
      input.ladder_seeding = ladderSeeding;
    } else if (leagueType === 'eclectic') {
      input.course_id = courseId!;
      input.tee_id = eclecticScoring === 'net' ? teeId! : undefined;
      input.eclectic_scoring = eclecticScoring;
    } else if (leagueType === 'partnership') {
      input.partnership_format = partnershipFormat;
    }

    try {
      const league = await createLeague.mutateAsync(input);
      navigation.replace('LeagueDetail', { id: league.id });
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create league');
    }
  }, [
    canCreateLeague, name, description, leagueType, startDate, endDate,
    maxRounds, countingRounds, useBestOf, challengeRange, ladderSeeding,
    courseId, teeId, eclecticScoring, partnershipFormat, createLeague, navigation,
  ]);

  const handleCoursePress = useCallback(() => {
    setShowCourseModal(true);
  }, []);

  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, club: Club) => {
      const displayName =
        course.name === club.name ? club.name : `${course.name} @ ${club.name}`;
      setCourseId(course.id);
      setCourseName(displayName);
      // Reset tee when course changes
      setTeeId(null);
      setTeeName(null);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    []
  );

  const handleTeePress = useCallback(() => {
    if (!courseId) {
      Alert.alert('Select Course First', 'Please select a course before choosing tees.');
      return;
    }
    setShowTeeModal(true);
  }, [courseId]);

  const handleTeeSelect = useCallback(
    (teeBox: TeeBox) => {
      // Find matching Tee from the tees table to get the ID
      const matchingTee = courseTees.find((t: Tee) => t.name === teeBox.name);
      if (matchingTee) {
        setTeeId(matchingTee.id);
        setTeeName(teeBox.name);
      }
      setShowTeeModal(false);
    },
    [courseTees]
  );

  const handlePremiumPress = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <PageHeader
          title={step === 1 ? 'Create League' : 'Configure League'}
          showBack
          onBack={handleBack}
        />

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.stepLine, { backgroundColor: step === 2 ? colors.primary : colors.gray200 }]} />
          <View style={[styles.stepDot, { backgroundColor: step === 2 ? colors.primary : colors.gray200 }]} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <View style={styles.form}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                League Type
              </Text>
              <LeagueTypeSelector
                selectedType={leagueType}
                onSelectType={setLeagueType}
                canCreatePremium={canCreatePremium}
                onPremiumPress={handlePremiumPress}
              />

              <View style={styles.nameSection}>
                <FormInput
                  label="League Name"
                  floatingLabel
                  placeholder="e.g. Sunday Social League"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  accessibilityHint="Enter a name for your league"
                />

                <FormInput
                  label="Description"
                  floatingLabel
                  placeholder="Optional description"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                  accessibilityHint="Optionally describe your league"
                />
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              {leagueType === 'ongoing' && <OngoingConfig />}
              {leagueType === 'season' && (
                <SeasonConfig
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              )}
              {leagueType === 'round_limit' && (
                <RoundLimitConfig
                  maxRounds={maxRounds}
                  countingRounds={countingRounds}
                  useBestOf={useBestOf}
                  onMaxRoundsChange={setMaxRounds}
                  onCountingRoundsChange={setCountingRounds}
                  onUseBestOfChange={setUseBestOf}
                />
              )}
              {leagueType === 'ladder' && (
                <LadderConfig
                  challengeRange={challengeRange}
                  seeding={ladderSeeding}
                  onChallengeRangeChange={setChallengeRange}
                  onSeedingChange={setLadderSeeding}
                />
              )}
              {leagueType === 'eclectic' && (
                <EclecticConfig
                  courseName={courseName}
                  teeName={teeName}
                  scoring={eclecticScoring}
                  onCoursePress={handleCoursePress}
                  onTeePress={handleTeePress}
                  onScoringChange={setEclecticScoring}
                />
              )}
              {leagueType === 'partnership' && (
                <PartnershipConfig
                  format={partnershipFormat}
                  onFormatChange={setPartnershipFormat}
                />
              )}
            </View>
          )}

          <View style={styles.footer}>
            {step === 1 ? (
              <TouchableOpacity
                onPress={() => setStep(2)}
                disabled={!canProceedStep1}
                style={[
                  styles.createButton,
                  { backgroundColor: canProceedStep1 ? colors.primary : colors.gray200 },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Continue to configuration"
              >
                <Text
                  style={[
                    styles.createButtonText,
                    { color: canProceedStep1 ? colors.white : colors.textSecondary },
                  ]}
                >
                  Continue
                </Text>
                <Icon source="arrow-right" size={20} color={canProceedStep1 ? colors.white : colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!canCreateLeague || createLeague.isPending}
                style={[
                  styles.createButton,
                  { backgroundColor: canCreateLeague ? colors.primary : colors.gray200 },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Create league"
              >
                <Text
                  style={[
                    styles.createButtonText,
                    { color: canCreateLeague ? colors.white : colors.textSecondary },
                  ]}
                >
                  {createLeague.isPending ? 'Creating...' : 'Create League'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Course Selection Modal (for eclectic) */}
      <CourseSelectionModal
        visible={showCourseModal}
        displayItems={displayItems}
        favoriteCourses={favoriteCourses}
        courseSearchQuery={courseSearchQuery}
        isLoading={isLoadingCourses}
        isSearching={isSearching}
        onCourseSelect={handleCourseSelect}
        onSearchChange={setCourseSearchQuery}
        onClose={() => setShowCourseModal(false)}
      />

      {/* Tee Selection Modal (for eclectic net scoring) */}
      <TeeSelectionModal
        visible={showTeeModal}
        availableTees={availableTeeBoxes}
        selectedTeeName={teeName ?? undefined}
        onSelect={handleTeeSelect}
        onClose={() => setShowTeeModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  nameSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  configTitle: {
    ...typography.bodyBold,
  },
  configDescription: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepperText: {
    ...typography.bodyBold,
  },
  seedingButton: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  seedingText: {
    ...typography.smallBold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
  },
  toggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  countingSection: {
    marginTop: spacing.sm,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  selectorText: {
    ...typography.body,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    ...typography.small,
    lineHeight: 20,
  },
  formatOptions: {
    gap: spacing.sm,
  },
  formatCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  formatTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  formatLabel: {
    ...typography.bodyBold,
  },
  formatDescription: {
    ...typography.small,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  createButton: {
    height: 52,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  createButtonText: {
    ...typography.bodyBold,
  },
});
