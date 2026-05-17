/**
 * Zod schema for per-club fitting metadata. Mirrors the CHECK constraints
 * on player_bag (loft 0-80, lie 50-75, shaft length 30-50, flex enum).
 *
 * Strings are trimmed and empty-coerced to null before save so we don't
 * insert noise rows of empty strings.
 */

import { z } from 'zod';
import { SHAFT_FLEXES } from '@/utils/clubFitting';

// Trim a string and return null when empty — used for every optional
// free-text field so the DB sees null instead of ''.
const optionalText = z
  .string()
  .trim()
  .max(120, 'Too long (120 chars max)')
  .nullable()
  .transform((v) => (v == null || v === '' ? null : v));

const optionalNotes = z
  .string()
  .trim()
  .max(500, 'Notes too long (500 chars max)')
  .nullable()
  .transform((v) => (v == null || v === '' ? null : v));

export const clubFittingSchema = z.object({
  brand: optionalText,
  model: optionalText,
  loftDegrees: z
    .number({ invalid_type_error: 'Loft must be a number' })
    .min(0, 'Loft must be 0° or higher')
    .max(80, 'Loft must be 80° or lower')
    .nullable(),
  lieAngleDegrees: z
    .number({ invalid_type_error: 'Lie must be a number' })
    .min(50, 'Lie must be 50° or higher')
    .max(75, 'Lie must be 75° or lower')
    .nullable(),
  shaftBrand: optionalText,
  shaftModel: optionalText,
  shaftFlex: z.enum(SHAFT_FLEXES).nullable(),
  shaftLengthInches: z
    .number({ invalid_type_error: 'Length must be a number' })
    .min(30, 'Length must be 30" or higher')
    .max(50, 'Length must be 50" or lower')
    .nullable(),
  notes: optionalNotes,
});

export type ClubFittingInput = z.infer<typeof clubFittingSchema>;
