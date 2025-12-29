/**
 * Hook for competition form validation
 */

import { z } from 'zod';
import { parseAustralianDate } from '../utils';

/**
 * Zod schema for competition form validation
 */
export const editCompetitionSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(50, 'Name must be less than 50 characters'),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional()
      .nullable(),
    competitionType: z.enum(['league', 'event']),
    teamMode: z.enum(['none', 'fixed', 'per-round']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.competitionType === 'event' && !data.endDate) {
        return false;
      }
      return true;
    },
    {
      message: 'End date is required for event competitions',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data.endDate && data.startDate) {
        const start = parseAustralianDate(data.startDate);
        const end = parseAustralianDate(data.endDate);
        if (start && end) {
          return end >= start;
        }
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  );

export type EditCompetitionFormData = z.infer<typeof editCompetitionSchema>;
