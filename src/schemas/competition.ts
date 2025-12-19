import { z } from 'zod';
import { parse, isValid, startOfDay, isAfter, isEqual } from 'date-fns';

/**
 * Zod validation schemas for competition creation
 * MVP Phase 1: Single round Stableford only
 */

// Competition types (matches database.types.ts)
export const competitionTypes = ['league', 'event'] as const;
export type CompetitionType = (typeof competitionTypes)[number];

// Team modes (matches database.types.ts)
export const teamModes = ['none', 'fixed', 'per-round'] as const;
export type TeamMode = (typeof teamModes)[number];

// Team formats (matches database.types.ts)
export const teamFormats = ['best-ball', 'scramble', 'aggregate', 'match-play-team'] as const;
export type TeamFormat = (typeof teamFormats)[number];

// Point system entry
export interface PointSystemEntry {
  position: number;
  points: number;
}

// Default position-based point system
export const DEFAULT_POINT_SYSTEM: PointSystemEntry[] = [
  { position: 1, points: 10 },
  { position: 2, points: 8 },
  { position: 3, points: 6 },
  { position: 4, points: 5 },
  { position: 5, points: 4 },
  { position: 6, points: 3 },
  { position: 7, points: 2 },
  { position: 8, points: 1 },
];

// Helper to parse DD/MM/YYYY Australian date format
const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

// Step 1: Competition Details - Base schema (for shape extraction)
const competitionDetailsBaseSchema = z.object({
  name: z
    .string()
    .min(3, 'Competition name must be at least 3 characters')
    .max(100, 'Competition name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  competitionType: z.enum(competitionTypes, {
    required_error: 'Please select a competition type',
  }),
  startDate: z
    .string()
    .refine((date) => parseAustralianDate(date) !== null, 'Invalid date format')
    .refine((date) => {
      const parsed = parseAustralianDate(date);
      if (!parsed) return false;
      const today = startOfDay(new Date());
      return isAfter(parsed, today) || isEqual(parsed, today);
    }, 'Start date cannot be in the past'),
  endDate: z
    .string()
    .optional()
    .refine(
      (date) => !date || parseAustralianDate(date) !== null,
      'Invalid date format'
    ),
  handicapSystem: z.enum(['honor', 'golf-australia', 'gross-only'], {
    required_error: 'Please select a handicap system',
  }),
  inviteCode: z
    .union([
      z.literal(''),
      z
        .string()
        .min(4, 'Invite code must be at least 4 characters')
        .max(20, 'Invite code must be less than 20 characters')
        .regex(
          /^[A-Za-z0-9-_]+$/,
          'Invite code can only contain letters, numbers, hyphens and underscores'
        ),
    ])
    .optional(),
});

// Step 1: Competition Details - Full schema with cross-field validation
export const competitionDetailsSchema = competitionDetailsBaseSchema.refine(
  (data) => {
    // Event type requires an end date
    if (data.competitionType === 'event' && !data.endDate) {
      return false;
    }
    return true;
  },
  {
    message: 'End date is required for event competitions',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // End date must be on or after start date
    if (data.endDate && data.startDate) {
      const start = parseAustralianDate(data.startDate);
      const end = parseAustralianDate(data.endDate);
      if (start && end) {
        return isAfter(end, start) || isEqual(end, start);
      }
    }
    return true;
  },
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
);

export type CompetitionDetailsFormData = z.infer<typeof competitionDetailsSchema>;

// Step 2: Team Settings
export const pointSystemEntrySchema = z.object({
  position: z.number().min(1).max(40),
  points: z.number().min(0).max(100),
});

export const teamSettingsSchema = z.object({
  teamMode: z.enum(teamModes, {
    required_error: 'Please select a team format',
  }),
  teamSize: z
    .number()
    .min(2, 'Team size must be at least 2')
    .max(4, 'Team size cannot exceed 4'),
  pointSystem: z
    .array(pointSystemEntrySchema)
    .min(1, 'At least one position must have points')
    .max(40, 'Maximum 40 positions allowed'),
});

export type TeamSettingsFormData = z.infer<typeof teamSettingsSchema>;

// Game types for rounds (matches database.types.ts)
export const gameTypes = ['stroke', 'stableford', 'match-play', 'ambrose', 'best-ball', 'scramble'] as const;
export type GameType = (typeof gameTypes)[number];

/**
 * Factory function to create a tier-aware game type schema.
 * Use this when you know which game types are allowed for the user's tier.
 *
 * @param allowedTypes - Array of game types allowed by user's tier
 * @returns Zod enum schema with only the allowed types
 *
 * @example
 * ```typescript
 * const limits = useTierLimits();
 * const gameTypeSchema = createGameTypeSchema(limits?.allowedGameTypes ?? ['stableford']);
 *
 * // Use in form validation
 * const roundSchema = z.object({
 *   gameType: gameTypeSchema,
 *   // ... other fields
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Check if a game type is allowed
 * const allowedTypes = limits?.allowedGameTypes ?? ['stableford'];
 * const schema = createGameTypeSchema(allowedTypes);
 * const result = schema.safeParse('match-play');
 * if (!result.success) {
 *   console.log('Game type not available on your plan');
 * }
 * ```
 */
export function createGameTypeSchema(allowedTypes: string[]) {
  // Ensure we have at least one valid game type
  const validTypes = allowedTypes.filter((t): t is GameType =>
    gameTypes.includes(t as GameType)
  );

  // Default to stableford if no valid types provided
  if (validTypes.length === 0) {
    validTypes.push('stableford');
  }

  // Create enum with allowed types
  // TypeScript requires at least one element in z.enum, which we guarantee above
  return z.enum(validTypes as [GameType, ...GameType[]], {
    errorMap: () => ({
      message: `Game type not available on your plan. Upgrade to access more game types.`,
    }),
  });
}

// Tee box selection for rounds
export const teeBoxSchema = z.object({
  name: z.string(),
  color: z.string(),
  totalYardage: z.number().optional(),
  courseRating: z.number().optional(),
  slopeRating: z.number().optional(),
});

export type TeeBoxFormData = z.infer<typeof teeBoxSchema>;

// Step 2: Round Details (MVP: Single round, Stableford only)
export const roundDetailsSchema = z.object({
  courseId: z.string().uuid('Please select a course'),
  courseName: z
    .string()
    .min(3, 'Course name must be at least 3 characters')
    .max(200, 'Course name must be less than 200 characters'),
  selectedTee: teeBoxSchema.optional(), // Selected tee box for this round
  date: z
    .string()
    .refine((date) => parseAustralianDate(date) !== null, 'Invalid date format')
    .refine((date) => {
      const parsed = parseAustralianDate(date);
      if (!parsed) return false;
      const today = startOfDay(new Date());
      return isAfter(parsed, today) || isEqual(parsed, today);
    }, 'Round date cannot be in the past'),
  teeTime: z
    .string()
    .optional()
    .refine(
      (time) => !time || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time),
      'Tee time must be in HH:MM format (24-hour)'
    ),
  matchType: z.enum(gameTypes).default('stableford'),
  scoringPairsRequired: z.boolean().default(false), // Premium feature: require designated markers
});

export type RoundDetailsFormData = z.infer<typeof roundDetailsSchema>;

// Multiple rounds schema for Step 2
export const roundsListSchema = z.object({
  rounds: z
    .array(roundDetailsSchema)
    .min(1, 'At least 1 round is required')
    .max(10, 'Maximum 10 rounds allowed'),
});

export type RoundsListFormData = z.infer<typeof roundsListSchema>;

/**
 * Factory function to create a tier-aware rounds list schema.
 * Use this when you know the user's tier limits.
 *
 * @param maxRounds - Maximum rounds allowed by user's tier (use -1 or -2 for unlimited)
 * @returns Zod schema with the appropriate max constraint
 *
 * @example
 * ```typescript
 * const limits = useTierLimits();
 * const schema = createRoundsListSchema(limits?.maxRoundsPerCompetition ?? 1);
 * const result = schema.safeParse({ rounds: formData.rounds });
 * ```
 */
export function createRoundsListSchema(maxRounds: number) {
  // -1 = unlimited, -2 = no system limit (super admin)
  const effectiveMax = maxRounds < 0 ? 100 : maxRounds;
  const maxMessage =
    maxRounds < 0
      ? 'Maximum 100 rounds allowed'
      : `Maximum ${maxRounds} round${maxRounds === 1 ? '' : 's'} allowed on your plan`;

  return z.object({
    rounds: z
      .array(roundDetailsSchema)
      .min(1, 'At least 1 round is required')
      .max(effectiveMax, maxMessage),
  });
}

// Step 3: Add Players
export const playerSchema = z.object({
  id: z.string().uuid().optional(), // Player ID if existing user (friend with account)
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')), // Allow empty string
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (phone) => !phone || /^(\+?61|0)[2-478]( ?\d){8}$/.test(phone.replace(/\s/g, '')),
      'Invalid Australian phone number'
    ),
  handicap: z
    .string()
    .optional()
    .refine(
      (hc) => !hc || (!Number.isNaN(parseFloat(hc)) && parseFloat(hc) >= -5 && parseFloat(hc) <= 54),
      'Handicap must be between -5 and 54'
    ),
  golf_id: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (id) => !id || /^[0-9]{10}$/.test(id),
      'Golf ID must be exactly 10 digits'
    ),
});

export type PlayerFormData = z.infer<typeof playerSchema>;

export const playersListSchema = z.object({
  players: z
    .array(playerSchema)
    .min(2, 'At least 2 players are required')
    .max(40, 'Maximum 40 players allowed in MVP'),
});

export type PlayersListFormData = z.infer<typeof playersListSchema>;

/**
 * Factory function to create a tier-aware players list schema.
 * Use this when you know the user's tier limits.
 *
 * @param maxPlayers - Maximum players allowed by user's tier (use -1 or -2 for unlimited)
 * @returns Zod schema with the appropriate max constraint
 *
 * @example
 * ```typescript
 * const limits = useTierLimits();
 * const schema = createPlayersListSchema(limits?.maxPlayersPerCompetition ?? 8);
 * const result = schema.safeParse({ players: formData.players });
 * ```
 */
export function createPlayersListSchema(maxPlayers: number) {
  // -1 = unlimited, -2 = no system limit (super admin)
  const effectiveMax = maxPlayers < 0 ? 100 : maxPlayers;
  const maxMessage =
    maxPlayers < 0
      ? 'Maximum 100 players allowed'
      : `Maximum ${maxPlayers} player${maxPlayers === 1 ? '' : 's'} allowed on your plan`;

  return z.object({
    players: z
      .array(playerSchema)
      .min(2, 'At least 2 players are required')
      .max(effectiveMax, maxMessage),
  });
}

// Complete competition creation (all steps combined)
export const createCompetitionSchema = z.object({
  // Step 1
  name: competitionDetailsBaseSchema.shape.name,
  description: competitionDetailsBaseSchema.shape.description,
  competitionType: competitionDetailsBaseSchema.shape.competitionType,
  startDate: competitionDetailsBaseSchema.shape.startDate,
  endDate: competitionDetailsBaseSchema.shape.endDate,
  handicapSystem: competitionDetailsBaseSchema.shape.handicapSystem,
  inviteCode: competitionDetailsBaseSchema.shape.inviteCode,

  // Step 2 - Now supports multiple rounds
  rounds: roundsListSchema.shape.rounds,

  // Step 3
  players: playersListSchema.shape.players,
});

export type CreateCompetitionFormData = z.infer<typeof createCompetitionSchema>;

// Helper function to convert form data to API payload
export function formatCompetitionPayload(data: CreateCompetitionFormData) {
  // Dates are validated by schema, so these should always succeed
  const startDate = parseAustralianDate(data.startDate) ?? new Date();

  return {
    competition: {
      name: data.name,
      description: data.description || '',
      startDate,
      handicapSystem: data.handicapSystem,
      inviteCode: data.inviteCode || undefined,
      visibility: 'private' as const, // MVP: private only
    },
    rounds: data.rounds.map((round) => ({
      courseId: round.courseId,
      courseName: round.courseName,
      selectedTee: round.selectedTee || undefined,
      date: parseAustralianDate(round.date) ?? new Date(),
      teeTime: round.teeTime || undefined,
      gameType: round.matchType || 'stableford',
    })),
    players: data.players.map((player) => ({
      name: player.name,
      email: player.email || undefined,
      phone: player.phone || undefined,
      handicap: player.handicap ? parseFloat(player.handicap) : undefined,
      golf_id: player.golf_id || undefined,
    })),
  };
}
