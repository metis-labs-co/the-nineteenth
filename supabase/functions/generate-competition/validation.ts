/**
 * Zod validation schemas for AI Competition Generation
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Enum schemas matching the app's types
const gameTypeSchema = z.enum([
  'stroke',
  'stableford',
  'match-play',
  'par',
  'best-ball',
  'scramble',
  'shamble',
]);

const teamFormatSchema = z.enum([
  'best-ball',
  'scramble',
  'aggregate',
  'match-play-team',
  'shamble',
]);

const teamModeSchema = z.enum(['none', 'fixed', 'per-round']);

const handicapSystemSchema = z.enum(['honor', 'golf-australia', 'gross-only']);

const competitionTypeSchema = z.enum(['league', 'event']);

// Date format: DD/MM/YYYY
const dateFormatRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

// Time format: HH:MM (24-hour)
const timeFormatRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Schema for a generated round
 */
export const generatedRoundSchema = z.object({
  roundNumber: z.number().int().min(1),
  courseId: z.string().uuid().nullable(),
  courseName: z.string().min(1),
  venueName: z.string().min(1),
  date: z.string().regex(dateFormatRegex, 'Date must be in DD/MM/YYYY format'),
  teeTime: z
    .string()
    .regex(timeFormatRegex, 'Time must be in HH:MM format')
    .nullable(),
  gameType: gameTypeSchema,
  courseNotFound: z.boolean().optional(),
  teamFormat: teamFormatSchema.optional(),
  isTeamRound: z.boolean().optional(),
  scoringPairsRequired: z.boolean().optional(),
  ballCount: z.number().int().min(1).max(4).optional(),
});

/**
 * Schema for a generated player
 */
export const generatedPlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  handicap: z.number().min(-5).max(54).nullable(),
  isPlaceholder: z.boolean().optional(), // True if this is a new placeholder to be created
});

/**
 * Schema for a generated team
 */
export const generatedTeamSchema = z.object({
  name: z.string().min(1).max(50),
  playerIds: z.array(z.string().uuid()).min(2),
});

/**
 * Complete schema for generated competition from Claude
 */
export const generatedCompetitionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).nullable(),
  competitionType: competitionTypeSchema,
  startDate: z
    .string()
    .regex(dateFormatRegex, 'Start date must be in DD/MM/YYYY format'),
  endDate: z
    .string()
    .regex(dateFormatRegex, 'End date must be in DD/MM/YYYY format')
    .nullable(),
  handicapSystem: handicapSystemSchema,
  teamMode: teamModeSchema,
  teamSize: z.number().int().min(2).max(4).nullable(),
  visibility: z.enum(['private', 'public', 'unlisted']).optional(),
  handicapSource: z.enum(['profile', 'calculated', 'none']).optional(),
  rounds: z.array(generatedRoundSchema).min(1),
  players: z.array(generatedPlayerSchema).min(2),
  teams: z.array(generatedTeamSchema).optional(),
  assumptions: z.array(z.string()).optional(),
  validationErrors: z.array(z.string()).optional(),
});

/**
 * Schema for a favorite course from mobile app
 */
const favoriteCourseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  club_id: z.string().uuid(),
  club_name: z.string().min(1),
  state: z.string().min(1),
  city: z.string().nullable(),
});

/**
 * Schema for a placeholder player from mobile app
 */
const placeholderPlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  handicap: z.number().nullable(),
});

/**
 * Schema for organizer (current user) from mobile app
 */
const organizerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  handicap: z.number().nullable(),
});

/**
 * Schema for request body from mobile app
 */
export const requestBodySchema = z.object({
  prompt: z.string().min(10).max(2000),
  friends: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      handicap: z.number().nullable(),
    })
  ),
  tierLimits: z.object({
    maxRounds: z.number().int().min(1),
    maxPlayers: z.number().int().min(2),
    allowedGameTypes: z.array(gameTypeSchema),
  }),
  favoriteCourses: z.array(favoriteCourseSchema).optional(),
  placeholderPlayers: z.array(placeholderPlayerSchema).optional(),
  organizer: organizerSchema,
});

export type GeneratedCompetitionParsed = z.infer<
  typeof generatedCompetitionSchema
>;
export type RequestBodyParsed = z.infer<typeof requestBodySchema>;
