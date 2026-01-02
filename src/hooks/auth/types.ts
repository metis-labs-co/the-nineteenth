/**
 * Auth Hook Types
 *
 * Shared types for the auth hook modules.
 * Re-exports from @/types/auth for convenience.
 */

import type { Session, AuthError, User } from '@supabase/supabase-js';
import type { Player, Database } from '@/types/database.types';

// Re-export all types from the main auth types file
export type {
  AuthState,
  LoginCredentials,
  SignupCredentials,
  MagicLinkCredentials,
  OtpCredentials,
  OtpVerifyCredentials,
  PasswordResetRequest,
  PasswordUpdateRequest,
  ProfileUpdateInput,
  LoginResponse,
  SignupResponse,
  MagicLinkResponse,
  OtpResponse,
  OtpVerifyResponse,
  PasswordResetResponse,
  UseAuthReturn,
} from '@/types/auth';

// Type alias for player insert (Supabase Insert type)
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];

/**
 * User metadata from auth.users
 */
export interface UserMetadata {
  name?: string;
  handicap?: number;
  phone?: string;
}

/**
 * Session query result
 */
export interface SessionQueryResult {
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * User query result
 */
export interface UserQueryResult {
  user: User | null;
  isLoading: boolean;
}

/**
 * Player query result
 */
export interface PlayerQueryResult {
  player: Player | null;
  isLoading: boolean;
}
