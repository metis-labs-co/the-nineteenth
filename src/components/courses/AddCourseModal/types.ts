/**
 * Types and constants for AddCourseModal wizard
 */

import type { AustralianState, Course, Club } from '@/types/database.types';

// =====================================================
// CONSTANTS
// =====================================================

export const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
];

export const TEE_COLORS = [
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'blue', label: 'Blue', hex: '#2196F3' },
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'yellow', label: 'Yellow', hex: '#FFEB3B' },
  { value: 'red', label: 'Red', hex: '#F44336' },
  { value: 'gold', label: 'Gold', hex: '#FFD700' },
  { value: 'green', label: 'Green', hex: '#4CAF50' },
  { value: 'silver', label: 'Silver', hex: '#C0C0C0' },
] as const;

export type TeeColor = (typeof TEE_COLORS)[number]['value'];

export const STEPS = [
  { number: 1, title: 'Club' },
  { number: 2, title: 'Course & Tees' },
  { number: 3, title: 'Hole Data' },
] as const;

export const PAR_OPTIONS = [3, 4, 5] as const;

// =====================================================
// TYPES
// =====================================================

export interface TeeFormData {
  id: string;
  name: string;
  color: TeeColor;
  slopeRating?: number; // For daily handicap calculation
  courseRating?: number; // For daily handicap calculation
}

export interface HoleFormData {
  number: number;
  par: 3 | 4 | 5;
  strokeIndex: number;
  yardages: Record<string, number>;
}

export interface Step1Data {
  clubName: string;
  /** @deprecated Use clubName instead */
  venueName?: string;
  city: string;
  state: AustralianState | null;
}

export interface Step2Data {
  courseName: string;
  tees: TeeFormData[];
}

export interface Step3Data {
  holes: HoleFormData[];
  currentHoleIndex: number;
}

export interface WizardState {
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
}

export interface AddCourseModalProps {
  visible: boolean;
  onClose: () => void;
  onClubCreated: (club: Club, course: Course) => void;
  /** @deprecated Use onClubCreated instead */
  onVenueCreated?: (club: Club, course: Course) => void;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createDefaultHoles(): HoleFormData[] {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    strokeIndex: i + 1,
    yardages: {},
  }));
}

export function getDefaultWizardState(): WizardState {
  return {
    step1: {
      clubName: '',
      city: '',
      state: null,
    },
    step2: {
      courseName: '',
      tees: [],
    },
    step3: {
      holes: createDefaultHoles(),
      currentHoleIndex: 0,
    },
  };
}

export function getTeeColorHex(color: TeeColor): string {
  return TEE_COLORS.find((t) => t.value === color)?.hex || '#808080';
}
