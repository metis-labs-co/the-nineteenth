/**
 * useCreateRoundWizard - State management for the create round wizard
 *
 * Manages:
 * - Current step
 * - Course/tee/match type selection
 * - Partner selection
 * - Scoring pairs configuration
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Friend, TeeBox, GameType } from '@/types/database.types';
import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import { useHomeClub } from '@/hooks/useHomeClub';
import { useAuth } from '@/hooks/useAuth';
import { useIsSocial } from '@/store/subscriptionStore';
import type { BallCount } from '@/types/multiball.types';
import type {
  WizardStep,
  WizardData,
  SelectedCourse,
  PlayingPartner,
  ScoringPairsConfig,
  StandaloneSkinsConfig,
  InitialCourse,
  ScrambleTeam,
  TeamConfig,
} from '../types';
import { MAX_PARTNERS } from '../types';

/** Team game types that require splitIntoTeams for skins */
const TEAM_GAME_TYPES: GameType[] = ['best-ball', 'scramble', 'shamble'];

/** Game types that support optional team splitting (user can choose) */
const OPTIONAL_TEAM_FORMATS: GameType[] = ['scramble', 'shamble', 'match-play'];

interface UseCreateRoundWizardOptions {
  visible: boolean;
  initialCourse?: InitialCourse;
  onStartRound: (
    courseId: string,
    courseName: string,
    partners: PlayingPartner[],
    selectedTee?: TeeBox,
    gameType?: GameType,
    scoringPairs?: ScoringPairsConfig,
    ballCount?: BallCount,
    skinsConfig?: StandaloneSkinsConfig,
    teamConfig?: TeamConfig
  ) => void;
  onClose: () => void;
}

interface UseCreateRoundWizardReturn {
  // Current state
  currentStep: WizardStep;
  data: WizardData;

  // Course selection
  setSearchQuery: (query: string) => void;
  handleSelectCourse: (course: CourseWithFavoriteStatus, club: SelectedCourse['club']) => void;
  handleSelectFavoriteCourse: (course: CourseWithFavoriteStatus & { club: SelectedCourse['club'] }) => void;

  // Tee selection
  handleSelectTee: (tee: TeeBox) => void;
  handleSkipTeeSelection: () => void;

  // Match type selection
  handleSelectMatchType: (matchType: GameType) => void;

  // Partner selection
  setFriendSearchQuery: (query: string) => void;
  handleTogglePartner: (friend: Friend) => void;
  handleRemovePartner: (partnerId: string) => void;
  isPartnerSelected: (friendId: string) => boolean;

  // Scoring pairs
  setScoringPairsEnabled: (enabled: boolean) => void;
  handleScoringPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;

  // Skins game
  setSkinsEnabled: (enabled: boolean) => void;
  handleSkinsConfigChange: (config: SkinsConfig) => void;

  // Teams (scramble format)
  shuffleTeams: () => void;
  setSplitIntoTeams: (enabled: boolean) => void;

  // Ball count (solo rounds only)
  handleSelectBallCount: (ballCount: BallCount) => void;
  handleStartSoloRound: () => void;

  // Navigation
  handleBackToCourse: () => void;
  handleBackToTee: () => void;
  handleBackToMatchType: () => void;
  handleBackToPartners: () => void;
  handleContinueToScoringSetup: () => void;

  // Actions
  handleStartScoring: () => void;
  handleClose: () => void;
}

const initialData: WizardData = {
  selectedCourse: null,
  selectedTee: null,
  selectedMatchType: null,
  selectedPartners: [],
  searchQuery: '',
  friendSearchQuery: '',
  scoringPairsEnabled: false,
  scoringPairs: [],
  scoringPairingType: 'reciprocal',
  ballCount: 1,
  skinsEnabled: false,
  skinsConfig: null,
  teams: [],
  teamsLocked: false,
  splitIntoTeams: false,
};

export function useCreateRoundWizard({
  visible,
  initialCourse,
  onStartRound,
  onClose,
}: UseCreateRoundWizardOptions): UseCreateRoundWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>('course');
  const [data, setData] = useState<WizardData>(initialData);

  // Subscription tier for multi-ball feature gating
  const isSocialOrHigher = useIsSocial();

  // Fetch home club for pre-fill
  const { data: homeClub } = useHomeClub();

  // Get current user for team generation
  const { user, player } = useAuth();

  // Build current user as PlayingPartner for team generation
  const currentUserAsPartner = useMemo((): PlayingPartner | null => {
    if (player) {
      return {
        id: player.id,
        name: player.name || user?.email?.split('@')[0] || 'You',
        handicap: player.handicap ?? undefined,
      };
    }
    if (user) {
      return {
        id: user.id,
        name: user.email?.split('@')[0] || 'You',
        handicap: undefined,
      };
    }
    return null;
  }, [player, user]);

  // Handle initial course when sheet opens (priority: initialCourse > homeClub single course)
  useEffect(() => {
    if (visible) {
      // Determine which course to use:
      // 1. Explicit initialCourse (passed from CourseDetailScreen)
      // 2. Home club with single course (auto-select the only course)
      // 3. Home club with multiple courses: don't pre-fill, user must select
      let courseToUse: {
        courseId: string;
        courseName: string;
        club: SelectedCourse['club'];
        tees: TeeBox[] | null | undefined;
      } | null = null;

      if (initialCourse) {
        courseToUse = {
          courseId: initialCourse.courseId,
          courseName: initialCourse.courseName,
          club: initialCourse.club ?? initialCourse.venue, // Support both old and new property names
          tees: initialCourse.tees,
        };
      } else if (homeClub && homeClub.courses && homeClub.courses.length === 1) {
        // Single-course club: auto-select the only course
        const singleCourse = homeClub.courses[0];
        courseToUse = {
          courseId: singleCourse.id,
          courseName: singleCourse.name,
          club: homeClub,
          tees: singleCourse.tees,
        };
      }
      // For multi-course clubs, don't pre-fill - user must select a course

      if (courseToUse) {
        const courseData: SelectedCourse = {
          courseId: courseToUse.courseId,
          courseName: courseToUse.courseName,
          club: courseToUse.club,
          venue: courseToUse.club, // Deprecated alias for backward compatibility
          tees: courseToUse.tees,
        };

        setData((prev) => ({
          ...prev,
          selectedCourse: courseData,
        }));

        // Go to tee selection if tees available, otherwise match type
        if (courseToUse.tees && courseToUse.tees.length > 0) {
          setCurrentStep('tee');
        } else {
          setCurrentStep('matchType');
        }
      }
    }
  }, [visible, initialCourse, homeClub]);

  // Reset state helper
  const resetState = useCallback(() => {
    setData(initialData);
    setCurrentStep('course');
  }, []);

  // Course selection handlers
  const setSearchQuery = useCallback((query: string) => {
    setData((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handleSelectCourse = useCallback(
    (course: CourseWithFavoriteStatus, club: SelectedCourse['club']) => {
      const courseData: SelectedCourse = {
        courseId: course.id,
        courseName: course.name,
        club,
        venue: club, // Deprecated alias for backward compatibility
        tees: course.tees,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
        searchQuery: '',
      }));

      // If course has tees, go to tee selection; otherwise skip to match type
      if (course.tees && course.tees.length > 0) {
        setCurrentStep('tee');
      } else {
        setCurrentStep('matchType');
      }
    },
    []
  );

  const handleSelectFavoriteCourse = useCallback(
    (course: CourseWithFavoriteStatus & { club: SelectedCourse['club'] }) => {
      const courseData: SelectedCourse = {
        courseId: course.id,
        courseName: course.name,
        club: course.club,
        venue: course.club, // Deprecated alias for backward compatibility
        tees: course.tees,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
        searchQuery: '',
      }));

      // If course has tees, go to tee selection; otherwise skip to match type
      if (course.tees && course.tees.length > 0) {
        setCurrentStep('tee');
      } else {
        setCurrentStep('matchType');
      }
    },
    []
  );

  // Tee selection handlers
  const handleSelectTee = useCallback((tee: TeeBox) => {
    setData((prev) => ({ ...prev, selectedTee: tee }));
    setCurrentStep('matchType');
  }, []);

  const handleSkipTeeSelection = useCallback(() => {
    setData((prev) => ({ ...prev, selectedTee: null }));
    setCurrentStep('matchType');
  }, []);

  // Match type selection
  const handleSelectMatchType = useCallback((matchType: GameType) => {
    setData((prev) => ({ ...prev, selectedMatchType: matchType }));
    setCurrentStep('partners');
  }, []);

  // Partner selection handlers
  const setFriendSearchQuery = useCallback((query: string) => {
    setData((prev) => ({ ...prev, friendSearchQuery: query }));
  }, []);

  const handleTogglePartner = useCallback((friend: Friend) => {
    setData((prev) => {
      const isSelected = prev.selectedPartners.some((p) => p.id === friend.id);

      if (isSelected) {
        return {
          ...prev,
          selectedPartners: prev.selectedPartners.filter((p) => p.id !== friend.id),
        };
      }

      if (prev.selectedPartners.length >= MAX_PARTNERS) {
        return prev;
      }

      return {
        ...prev,
        selectedPartners: [
          ...prev.selectedPartners,
          {
            id: friend.id,
            name: friend.name,
            handicap: friend.handicap ?? undefined,
          },
        ],
      };
    });
  }, []);

  const handleRemovePartner = useCallback((partnerId: string) => {
    setData((prev) => ({
      ...prev,
      selectedPartners: prev.selectedPartners.filter((p) => p.id !== partnerId),
    }));
  }, []);

  const isPartnerSelected = useCallback(
    (friendId: string) => {
      return data.selectedPartners.some((p) => p.id === friendId);
    },
    [data.selectedPartners]
  );

  // Scoring pairs handlers
  const setScoringPairsEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      scoringPairsEnabled: enabled,
      // Clear pairs when enabling so they get regenerated
      scoringPairs: enabled ? [] : prev.scoringPairs,
    }));
  }, []);

  const handleScoringPairsChange = useCallback(
    (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => {
      setData((prev) => ({
        ...prev,
        scoringPairs: pairs,
        scoringPairingType: type,
      }));
    },
    []
  );

  // Skins game handlers
  const setSkinsEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      skinsEnabled: enabled,
      // Reset skins config when disabling
      skinsConfig: enabled ? prev.skinsConfig : null,
    }));
  }, []);

  const handleSkinsConfigChange = useCallback((config: SkinsConfig) => {
    setData((prev) => ({
      ...prev,
      skinsConfig: config,
    }));
  }, []);

  // Team generation for scramble format
  const generateTeams = useCallback(
    (players: PlayingPartner[]): ScrambleTeam[] => {
      if (!currentUserAsPartner) return [];

      const allPlayers = [currentUserAsPartner, ...players];
      const teams: ScrambleTeam[] = [];

      for (let i = 0; i < allPlayers.length; i += 2) {
        const members = [allPlayers[i]];
        if (i + 1 < allPlayers.length) {
          members.push(allPlayers[i + 1]);
        } else if (teams.length > 0) {
          // Odd player: add to last team as 3rd member
          teams[teams.length - 1].members.push(allPlayers[i]);
          continue;
        }
        teams.push({
          id: `team-${teams.length + 1}`,
          name: `Team ${teams.length + 1}`,
          members,
        });
      }
      return teams;
    },
    [currentUserAsPartner]
  );

  // Fisher-Yates shuffle for team randomization
  const shuffleTeams = useCallback(() => {
    if (data.teamsLocked || !currentUserAsPartner) return;

    const allPlayers = [currentUserAsPartner, ...data.selectedPartners];

    // Fisher-Yates shuffle
    const shuffled = [...allPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Re-generate teams from shuffled players
    const teams: ScrambleTeam[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const members = [shuffled[i]];
      if (i + 1 < shuffled.length) {
        members.push(shuffled[i + 1]);
      } else if (teams.length > 0) {
        // Odd player: add to last team as 3rd member
        teams[teams.length - 1].members.push(shuffled[i]);
        continue;
      }
      teams.push({
        id: `team-${teams.length + 1}`,
        name: `Team ${teams.length + 1}`,
        members,
      });
    }

    setData((prev) => ({ ...prev, teams }));
  }, [data.teamsLocked, data.selectedPartners, currentUserAsPartner]);

  // Handler for split into teams toggle
  const setSplitIntoTeams = useCallback(
    (enabled: boolean) => {
      if (enabled && currentUserAsPartner) {
        // Generate teams when toggle is turned on
        const teams = generateTeams(data.selectedPartners);
        setData((prev) => ({ ...prev, splitIntoTeams: true, teams }));
      } else {
        // Clear teams when toggle is turned off
        // Also disable skins if this is a team game type (skins requires teams for team formats)
        const isTeamFormat = data.selectedMatchType && TEAM_GAME_TYPES.includes(data.selectedMatchType);
        setData((prev) => ({
          ...prev,
          splitIntoTeams: false,
          teams: [],
          // Auto-disable skins for team formats when teams are disabled
          skinsEnabled: isTeamFormat ? false : prev.skinsEnabled,
          skinsConfig: isTeamFormat ? null : prev.skinsConfig,
        }));
      }
    },
    [currentUserAsPartner, data.selectedPartners, data.selectedMatchType, generateTeams]
  );

  // Auto-enable teams for Best Ball format (it's always a team format)
  // Clear split teams setting when match type changes away from team formats
  // Also disable skins if switching from a team format (skins validation requires re-check)
  useEffect(() => {
    const isTeamFormat = data.selectedMatchType && TEAM_GAME_TYPES.includes(data.selectedMatchType);
    const isBestBall = data.selectedMatchType === 'best-ball';

    if (isBestBall && currentUserAsPartner && data.selectedPartners.length >= 1) {
      // Best Ball: auto-enable teams when there are partners
      if (!data.splitIntoTeams) {
        const teams = generateTeams(data.selectedPartners);
        setData((prev) => ({
          ...prev,
          splitIntoTeams: true,
          teams,
        }));
      }
    } else if (!isTeamFormat && data.splitIntoTeams && !OPTIONAL_TEAM_FORMATS.includes(data.selectedMatchType!)) {
      // Non-team format (and not an optional team format like match-play): clear teams
      setData((prev) => ({
        ...prev,
        splitIntoTeams: false,
        teams: [],
      }));
    }
  }, [data.selectedMatchType, data.splitIntoTeams, data.selectedPartners.length, currentUserAsPartner, generateTeams]);

  // Regenerate teams when partners change for Best Ball (teams must stay in sync)
  useEffect(() => {
    const isBestBall = data.selectedMatchType === 'best-ball';
    if (isBestBall && data.splitIntoTeams && currentUserAsPartner) {
      // Regenerate teams to include all current partners
      const teams = generateTeams(data.selectedPartners);
      setData((prev) => {
        // Only update if teams actually changed (avoid infinite loop)
        const currentMemberIds = prev.teams.flatMap((t) => t.members.map((m) => m.id)).sort().join(',');
        const newMemberIds = teams.flatMap((t) => t.members.map((m) => m.id)).sort().join(',');
        if (currentMemberIds !== newMemberIds) {
          return { ...prev, teams };
        }
        return prev;
      });
    }
  }, [data.selectedMatchType, data.splitIntoTeams, data.selectedPartners, currentUserAsPartner, generateTeams]);

  // Navigation handlers
  const handleBackToCourse = useCallback(() => {
    setCurrentStep('course');
    setData((prev) => ({
      ...prev,
      selectedTee: null,
      friendSearchQuery: '',
    }));
  }, []);

  const handleBackToTee = useCallback(() => {
    setCurrentStep('tee');
    setData((prev) => ({ ...prev, friendSearchQuery: '' }));
  }, []);

  const handleBackToMatchType = useCallback(() => {
    setCurrentStep('matchType');
    setData((prev) => ({ ...prev, friendSearchQuery: '' }));
  }, []);

  const handleBackToPartners = useCallback(() => {
    setCurrentStep('partners');
  }, []);

  const handleContinueToScoringSetup = useCallback(() => {
    // Skip scoring setup for solo rounds - scoring pairs are only relevant with partners
    if (data.selectedPartners.length === 0) {
      // Solo round - check if user can access multi-ball feature
      if (isSocialOrHigher) {
        // Social+ tier: show ball count selection step
        setCurrentStep('ballCount');
      } else {
        // Free tier: start single-ball round directly
        if (data.selectedCourse) {
          onStartRound(
            data.selectedCourse.courseId,
            data.selectedCourse.courseName,
            [],
            data.selectedTee ?? undefined,
            data.selectedMatchType ?? undefined,
            undefined, // No scoring pairs for solo rounds
            1 // Single ball
          );
          resetState();
        }
      }
    } else {
      setCurrentStep('scoringSetup');
    }
  }, [data.selectedPartners.length, data.selectedCourse, data.selectedTee, data.selectedMatchType, onStartRound, resetState, isSocialOrHigher]);

  // Ball count handlers (solo rounds only)
  const handleSelectBallCount = useCallback((ballCount: BallCount) => {
    setData((prev) => ({ ...prev, ballCount }));
  }, []);

  const handleStartSoloRound = useCallback(() => {
    if (data.selectedCourse) {
      onStartRound(
        data.selectedCourse.courseId,
        data.selectedCourse.courseName,
        [],
        data.selectedTee ?? undefined,
        data.selectedMatchType ?? undefined,
        undefined, // No scoring pairs for solo rounds
        data.ballCount
      );
      resetState();
    }
  }, [data.selectedCourse, data.selectedTee, data.selectedMatchType, data.ballCount, onStartRound, resetState]);

  // Action handlers
  const handleStartScoring = useCallback(() => {
    if (data.selectedCourse) {
      // Build scoring pairs config if enabled
      const scoringPairsConfig: ScoringPairsConfig | undefined =
        data.scoringPairsEnabled && data.scoringPairs.length > 0
          ? {
              enabled: true,
              pairs: data.scoringPairs,
              pairingType: data.scoringPairingType,
            }
          : undefined;

      // Build skins config if enabled and config exists
      const standaloneSkinsConfig: StandaloneSkinsConfig | undefined =
        data.skinsEnabled && data.skinsConfig
          ? {
              enabled: true,
              config: data.skinsConfig,
            }
          : undefined;

      // Build team config for scramble format (only for standalone rounds, not competition)
      const teamConfig: TeamConfig | undefined =
        data.teams.length > 0 && !data.teamsLocked
          ? {
              teams: data.teams.map((t) => ({
                id: t.id,
                name: t.name,
                memberIds: t.members.map((m) => m.id),
              })),
            }
          : undefined;

      // DEBUG: Log skins configuration being passed to round creation
      console.log('[CreateRoundWizard] handleStartScoring - Skins config:', {
        skinsEnabled: data.skinsEnabled,
        hasSkinsConfig: !!data.skinsConfig,
        skinsConfig: data.skinsConfig,
        standaloneSkinsConfig,
        partnersCount: data.selectedPartners.length,
      });

      onStartRound(
        data.selectedCourse.courseId,
        data.selectedCourse.courseName,
        data.selectedPartners,
        data.selectedTee ?? undefined,
        data.selectedMatchType ?? undefined,
        scoringPairsConfig,
        undefined, // ballCount is only for solo rounds
        standaloneSkinsConfig,
        teamConfig
      );

      resetState();
    }
  }, [data, onStartRound, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  return {
    currentStep,
    data,
    setSearchQuery,
    handleSelectCourse,
    handleSelectFavoriteCourse,
    handleSelectTee,
    handleSkipTeeSelection,
    handleSelectMatchType,
    setFriendSearchQuery,
    handleTogglePartner,
    handleRemovePartner,
    isPartnerSelected,
    setScoringPairsEnabled,
    handleScoringPairsChange,
    setSkinsEnabled,
    handleSkinsConfigChange,
    shuffleTeams,
    setSplitIntoTeams,
    handleSelectBallCount,
    handleStartSoloRound,
    handleBackToCourse,
    handleBackToTee,
    handleBackToMatchType,
    handleBackToPartners,
    handleContinueToScoringSetup,
    handleStartScoring,
    handleClose,
  };
}
