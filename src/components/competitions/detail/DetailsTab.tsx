/**
 * DetailsTab - Competition details and courses
 *
 * Shows:
 * - Competition header card (name, dates, players, invite code)
 * - Competition settings (type, handicap system, team settings)
 * - Current standing card (for players)
 * - Courses section listing all unique courses used in rounds
 *
 * Organizers can tap on editable fields to modify them.
 *
 * This component has been refactored to use extracted sub-components:
 * - CompetitionInfoSection: Header card with key competition info
 * - CurrentStandingSection: Player's current standing
 * - SettingsSection: Competition settings
 * - CoursesSection: List of courses used
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Competition, Course } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import { type RoundWithCourse } from './types';
import {
  CompetitionInfoSection,
  CurrentStandingSection,
  SettingsSection,
  PrizePoolSection,
  CoursesSection,
} from './sections';

// =====================================================
// TYPES
// =====================================================

export interface DetailsTabProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
  currentStanding: { position: number; points: number } | null;
  isOrganizer: boolean;
  /** Prize pool data (null if none configured) */
  prizePool?: CompetitionPrizePool | null;
  /** Prize pool placement breakdown */
  prizePoolPlacements?: PrizePoolPlacement[];
  /** Whether the prize pool is locked */
  isPrizePoolLocked?: boolean;
  onViewCourse?: (course: Course) => void;
  onEdit: () => void;
  onUpdateCompetition?: (updates: Partial<Competition>) => Promise<void>;
  /** Handler for adding a prize pool */
  onAddPrizePool?: () => void;
  /** Handler for editing the prize pool */
  onEditPrizePool?: () => void;
  /** Handler for viewing prize pool transactions */
  onViewPrizePoolTransactions?: () => void;
}

// =====================================================
// DETAILS TAB COMPONENT
// =====================================================

export const DetailsTab = React.memo(function DetailsTab({
  competition,
  rounds,
  playerCount,
  currentStanding,
  isOrganizer,
  prizePool,
  prizePoolPlacements,
  isPrizePoolLocked = false,
  onViewCourse,
  onEdit,
  onUpdateCompetition: _onUpdateCompetition,
  onAddPrizePool,
  onEditPrizePool,
  onViewPrizePoolTransactions,
}: DetailsTabProps) {
  // Extract unique courses from rounds (no duplicates)
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map<string, Course & { clubs?: { name: string; city: string | null; state: string | null } | null }>();

    for (const round of rounds) {
      if (round.course && !courseMap.has(round.course.id)) {
        courseMap.set(round.course.id, round.course);
      }
    }

    return Array.from(courseMap.values());
  }, [rounds]);

  return (
    <View>
      {/* Competition Header Card */}
      <CompetitionInfoSection
        competition={competition}
        rounds={rounds}
        playerCount={playerCount}
        isOrganizer={isOrganizer}
        onEdit={onEdit}
      />

      {/* Current Standing Card - shown for non-organizers who are players */}
      {currentStanding && !isOrganizer && (
        <CurrentStandingSection standing={currentStanding} />
      )}

      {/* Competition Settings Section */}
      <SettingsSection
        competition={competition}
        isOrganizer={isOrganizer}
        onEdit={onEdit}
      />

      {/* Prize Pool Section */}
      <PrizePoolSection
        pool={prizePool ?? null}
        placements={prizePoolPlacements ?? []}
        isOrganizer={isOrganizer}
        isLocked={isPrizePoolLocked}
        onAddPress={onAddPrizePool}
        onEditPress={onEditPrizePool}
        onViewTransactionsPress={onViewPrizePoolTransactions}
      />

      {/* Courses Section */}
      <CoursesSection courses={uniqueCourses} onViewCourse={onViewCourse} />
    </View>
  );
});

export default DetailsTab;
