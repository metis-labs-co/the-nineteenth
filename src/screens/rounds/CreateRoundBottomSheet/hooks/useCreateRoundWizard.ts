/**
 * useCreateRoundWizard - Orchestrator for the create round wizard.
 *
 * Manages top-level [currentStep, data] state and delegates all logic to
 * focused sub-hooks. The return type is identical to the original monolith
 * so no consumer changes are needed.
 */

import { useState, useCallback } from 'react';
import type { Friend, TeeBox, GameType } from '@/types/database.types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { RecentCourse } from '@/hooks/courses';
import { useIsSocial } from '@/store/subscriptionStore';
import type { BallCount } from '@/types/multiball.types';
import type {
  WizardStep,
  WizardData,
  SelectedCourse,
  PlayingPartner,
  ScoringPairsConfig,
  StandaloneSkinsConfig,
  StandaloneWolfConfig,
  InitialCourse,
  TeamConfig,
} from '../types';
import type { RoundPresetId } from '@/constants/roundPresets';
import { useWizardInitialization } from './useWizardInitialization';
import { useWizardCourseSelection } from './useWizardCourseSelection';
import { useWizardTeeSelection } from './useWizardTeeSelection';
import { useWizardPartners } from './useWizardPartners';
import { useWizardSideGames } from './useWizardSideGames';
import { useWizardNavigation } from './useWizardNavigation';
import { useWizardTeams } from './useWizardTeams';
import { useWizardHandicapEdit } from './useWizardHandicapEdit';

interface UseCreateRoundWizardOptions {
  visible: boolean;
  initialCourse?: InitialCourse;
  initialPartners?: PlayingPartner[];
  /** Pre-selected match type — locks it and skips the match type step */
  initialMatchType?: import('@/types/database.types').GameType;
  /** Skip partner selection — starts the round immediately after tee selection */
  skipPartnerStep?: boolean;
  onStartRound: (
    courseId: string,
    courseName: string,
    partners: PlayingPartner[],
    selectedTee?: TeeBox,
    gameType?: GameType,
    scoringPairs?: ScoringPairsConfig,
    ballCount?: BallCount,
    skinsConfig?: StandaloneSkinsConfig,
    teamConfig?: TeamConfig,
    wolfConfig?: StandaloneWolfConfig,
    isBuildAsYouPlay?: boolean,
    handicapSource?: HandicapSource,
    nineType?: NineType,
    currentUserHandicapOverride?: number | null
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
  recentCourses: RecentCourse[];

  // Nine type selection
  handleSelectNineType: (nineType: NineType) => void;

  // Tee selection
  handleSelectTee: (tee: TeeBox) => void;
  handleSkipTeeSelection: () => void;
  handlePlayerTeeChange: (playerId: string, tee: TeeBox) => void;
  handleCurrentUserTeeChange: (tee: TeeBox) => void;

  // Handicap edit
  handleCurrentUserHandicapChange: (value: number) => void;
  handlePartnerHandicapChange: (partnerId: string, value: number) => void;

  // Preset selection (format-first wizard step 1)
  handleSelectPreset: (presetId: RoundPresetId) => void;

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

  // Wolf game
  setWolfEnabled: (enabled: boolean) => void;
  handleWolfConfigChange: (config: WolfConfig) => void;

  // Teams (scramble format)
  shuffleTeams: () => void;
  setSplitIntoTeams: (enabled: boolean) => void;

  // Ball count (solo rounds only)
  handleSelectBallCount: (ballCount: BallCount) => void;
  handleStartSoloRound: () => void;

  // Navigation
  handleBackToGameFormat: () => void;
  handleBackToCourse: () => void;
  handleBackToNineType: () => void;
  handleBackToPartners: () => void;
  handleContinueToScoringSetup: () => void;

  // Build as you play
  setBuildAsYouPlay: (enabled: boolean) => void;

  // Handicap source
  setHandicapSource: (source: HandicapSource) => void;

  // Actions
  handleStartScoring: () => void;
  handleClose: () => void;

  // Direct state update (for course data refresh)
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}

const initialData: WizardData = {
  selectedCourse: null,
  selectedTee: null,
  selectedMatchType: null,
  selectedPresetId: null,
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
  wolfEnabled: false,
  wolfConfig: null,
  isBuildAsYouPlay: false,
  handicapSource: 'profile',
  nineType: 'full' as NineType,
  currentUserHandicapOverride: null,
};

export function useCreateRoundWizard({
  visible,
  initialCourse,
  initialPartners,
  initialMatchType,
  skipPartnerStep,
  onStartRound,
  onClose,
}: UseCreateRoundWizardOptions): UseCreateRoundWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>('gameFormat');
  const [data, setData] = useState<WizardData>(initialData);

  // Subscription tier for multi-ball feature gating
  const isSocialOrHigher = useIsSocial();

  // --- Sub-hooks ---

  const { currentUserAsPartner, resetState, startRoundWithCurrentState } =
    useWizardInitialization({
      visible,
      initialCourse,
      initialPartners,
      initialMatchType,
      skipPartnerStep,
      initialData,
      setCurrentStep,
      setData,
      onStartRound,
    });

  const { setSearchQuery, handleSelectCourse, handleSelectFavoriteCourse, recentCourses } =
    useWizardCourseSelection({
      initialMatchType,
      initialPartners,
      skipPartnerStep,
      setCurrentStep,
      setData,
      startRoundWithCurrentState,
    });

  const { handleSelectTee, handleSkipTeeSelection, handlePlayerTeeChange, handleCurrentUserTeeChange } =
    useWizardTeeSelection({
      setData,
    });

  const { handleCurrentUserHandicapChange, handlePartnerHandicapChange } =
    useWizardHandicapEdit({ setData });

  const {
    setFriendSearchQuery,
    handleTogglePartner,
    handleRemovePartner,
    isPartnerSelected,
    handleSelectPreset,
  } = useWizardPartners({ data, setData, setCurrentStep, skipPartnerStep });

  const {
    setScoringPairsEnabled,
    handleScoringPairsChange,
    setSkinsEnabled,
    handleSkinsConfigChange,
    setWolfEnabled,
    handleWolfConfigChange,
    setBuildAsYouPlay,
    handleSelectBallCount,
    setHandicapSource,
  } = useWizardSideGames({ setData });

  const { shuffleTeams, setSplitIntoTeams } = useWizardTeams({
    currentUserAsPartner,
    data,
    setData,
  });

  // NineType selection handler
  const handleSelectNineType = useCallback((nineType: NineType) => {
    setData((prev) => ({ ...prev, nineType }));
    setCurrentStep('partners');
  }, [setData, setCurrentStep]);

  const {
    handleBackToGameFormat,
    handleBackToCourse,
    handleBackToNineType,
    handleBackToPartners,
    handleContinueToScoringSetup,
    handleStartSoloRound,
    handleStartScoring,
    handleClose,
  } = useWizardNavigation({
    data,
    isSocialOrHigher,
    setCurrentStep,
    setData,
    resetState,
    onStartRound,
    onClose,
  });

  // --- Return identical shape ---

  return {
    currentStep,
    data,
    setSearchQuery,
    handleSelectCourse,
    handleSelectFavoriteCourse,
    recentCourses,
    handleSelectNineType,
    handleSelectTee,
    handleSkipTeeSelection,
    handlePlayerTeeChange,
    handleCurrentUserTeeChange,
    handleCurrentUserHandicapChange,
    handlePartnerHandicapChange,
    handleSelectPreset,
    setFriendSearchQuery,
    handleTogglePartner,
    handleRemovePartner,
    isPartnerSelected,
    setScoringPairsEnabled,
    handleScoringPairsChange,
    setSkinsEnabled,
    handleSkinsConfigChange,
    setWolfEnabled,
    handleWolfConfigChange,
    shuffleTeams,
    setSplitIntoTeams,
    handleSelectBallCount,
    handleStartSoloRound,
    handleBackToGameFormat,
    handleBackToCourse,
    handleBackToNineType,
    handleBackToPartners,
    handleContinueToScoringSetup,
    setBuildAsYouPlay,
    setHandicapSource,
    handleStartScoring,
    handleClose,
    setData,
  };
}
