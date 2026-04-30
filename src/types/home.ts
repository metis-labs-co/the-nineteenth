/**
 * Home Screen Types
 *
 * Shared types for the Home screen feature: pending action items,
 * notable stat moments, friend activity entries.
 */

import type { RootStackParamList } from '@/navigation/types';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type PendingActionType =
  | 'competition_invite'
  | 'scorecard_verify'
  | 'score_mismatch'
  | 'tag_to_league'
  | 'league_invite';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  label: string;
  subLabel?: string;
  ctaLabel: string;
  route: keyof RootStackParamList;
  // Stack params for the destination route. We don't constrain the param
  // shape here because the action list is heterogeneous.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
  createdAt: string;
}

export type NotableMoment =
  | { kind: 'course_best'; courseId: string; courseName: string; score: number }
  | { kind: 'best_recent'; score: number; courseName: string; date: string }
  | { kind: 'biggest_delta'; delta: number; courseName: string; date: string };

export interface FriendActivityItem {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatarUrl?: string;
  action: string;
  occurredAt: string;
  navigateTo: {
    route: keyof RootStackParamList;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
  };
}

export interface HandicapHighlight {
  value: number | null;
  delta30d: number | null;
  hasHandicap: boolean;
}

export interface StatsHighlights {
  handicap: number | null;
  roundsYtd: number;
  scoringAverage: number | null;
  last5Average: number | null;
  last5DeltaVsHandicap: number | null;
  notable: NotableMoment | null;
}
