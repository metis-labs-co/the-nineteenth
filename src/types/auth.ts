/**
 * Authentication Type Definitions
 *
 * Types for Supabase Auth integration with the app
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Player } from './database.types';

// =====================================================
// AUTH STATE
// =====================================================

/**
 * Authentication state interface
 * Returned by useAuth hook
 */
export interface AuthState {
  // User & Session
  user: User | null;
  session: Session | null;
  player: Player | null; // Extended player profile

  // Loading States
  isLoading: boolean;
  isInitializing: boolean; // True during app startup while checking session
  isAuthenticating: boolean; // True during login/signup

  // Error State
  error: AuthError | null;

  // Auth Status
  isAuthenticated: boolean;
}

// =====================================================
// SOCIAL AUTH
// =====================================================

/**
 * Supported social login providers
 */
export type SocialProvider = 'apple' | 'google';

/**
 * Social login response (success)
 */
export interface SocialLoginResponse {
  user: User;
  session: Session;
  player: Player;
  isNewUser: boolean;
}

// =====================================================
// AUTH INPUTS
// =====================================================

/**
 * Email + password login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Email signup with player details
 */
export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
  phone?: string;
  handicap?: number;
  golf_id?: string; // 4-15 character national golf body ID
}

/**
 * Magic link (passwordless) login
 */
export interface MagicLinkCredentials {
  email: string;
  redirectTo?: string; // Deep link for mobile
}

/**
 * OTP (One-Time Password) request
 */
export interface OtpCredentials {
  email: string;
}

/**
 * OTP verification
 */
export interface OtpVerifyCredentials {
  email: string;
  token: string; // 6-digit code
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
  redirectTo?: string; // Deep link for mobile
}

/**
 * Password update (when logged in)
 */
export interface PasswordUpdateRequest {
  newPassword: string;
}

/**
 * Profile update input
 */
export interface ProfileUpdateInput {
  name?: string;
  phone?: string;
  handicap?: number;
  golf_id?: string; // 4-15 character national golf body ID
  handicap_updated_at?: string; // ISO timestamp
  photoUrl?: string;
  gender?: 'male' | 'female' | null; // For WHS Daily Handicap consistency factor
  home_club_id?: string | null;
}

// =====================================================
// AUTH EVENTS
// =====================================================

/**
 * Supabase auth events
 * @see https://supabase.com/docs/reference/javascript/auth-onauthstatechange
 */
export type AuthEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'TOKEN_REFRESHED'
  | 'MFA_CHALLENGE_VERIFIED';

/**
 * Auth state change callback
 */
export type AuthStateChangeCallback = (event: AuthEvent, session: Session | null) => void;

// =====================================================
// AUTH RESPONSES
// =====================================================

/**
 * Login response (success)
 */
export interface LoginResponse {
  user: User;
  session: Session;
  player: Player;
}

/**
 * Signup response (success)
 * Note: When email confirmation is enabled, session will be null until confirmed
 */
export interface SignupResponse {
  user: User;
  session: Session | null;
  player: Player;
  /** True when user must confirm email before they can log in */
  emailConfirmationRequired?: boolean;
}

/**
 * Magic link response (success)
 * Note: No session returned immediately, user must click email link
 */
export interface MagicLinkResponse {
  success: true;
  message: string;
}

/**
 * OTP send response (success)
 */
export interface OtpResponse {
  success: true;
  message: string;
}

/**
 * OTP verify response (success)
 */
export interface OtpVerifyResponse {
  user: User;
  session: Session;
  player: Player | null;
}

/**
 * Password reset response (success)
 */
export interface PasswordResetResponse {
  success: true;
  message: string;
}

// =====================================================
// HOOK RETURN TYPES
// =====================================================

/**
 * useAuth hook return type
 */
export interface UseAuthReturn extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  signup: (credentials: SignupCredentials) => Promise<SignupResponse>;
  loginWithMagicLink: (credentials: MagicLinkCredentials) => Promise<MagicLinkResponse>;
  sendOtp: (credentials: OtpCredentials) => Promise<OtpResponse>;
  verifyOtp: (credentials: OtpVerifyCredentials) => Promise<OtpVerifyResponse>;
  logout: () => Promise<void>;

  // Social Auth
  loginWithApple: () => Promise<SocialLoginResponse>;
  loginWithGoogle: () => Promise<SocialLoginResponse>;
  isSocialLoggingIn: boolean;
  isAppleAvailable: boolean;

  // Password Management
  resetPassword: (request: PasswordResetRequest) => Promise<PasswordResetResponse>;
  updatePassword: (request: PasswordUpdateRequest) => Promise<void>;

  // Profile Management
  updateProfile: (updates: ProfileUpdateInput) => Promise<Player>;
  refreshProfile: () => Promise<void>;

  // Token Management
  getToken: () => Promise<string | null>;
  refreshSession: () => Promise<Session | null>;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Auth context provider props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Deep link configuration for auth redirects
 */
export interface AuthDeepLinkConfig {
  magicLink: string; // e.g., 'thenineteenth://auth/magic-link'
  passwordReset: string; // e.g., 'thenineteenth://auth/reset-password'
}
