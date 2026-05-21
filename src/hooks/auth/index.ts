/**
 * Auth Hooks Module
 *
 * Focused, single-responsibility hooks for authentication.
 * Use these hooks directly for granular access, or use useAuth
 * from the parent directory for the full combined API.
 */

// Core hooks
export { useAuthSession } from './useAuthSession';
export { useAuthUser } from './useAuthUser';
export { useAuthMutations } from './useAuthMutations';
export { useSocialAuth } from './useSocialAuth';
export { usePasswordReset } from './usePasswordReset';
export { useProfileMutations } from './useProfileMutations';
export { useAvatarUpload } from './useAvatarUpload';

// Utilities
export { ensurePlayerProfile } from './utils';

// Types
export type { UploadAvatarInput } from './useAvatarUpload';

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
  PlayerInsert,
  UserMetadata,
  SessionQueryResult,
  UserQueryResult,
  PlayerQueryResult,
} from './types';

// Account management
export { useAccountDeletion } from './accountDeletion';

// Biometric lock
export { useBiometricLock } from './biometricLock';
export type { UseBiometricLockReturn } from './biometricLock';
