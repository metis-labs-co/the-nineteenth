/**
 * TypeScript types for Supabase database schema
 *
 * This file re-exports all types from the domain-specific files
 * in src/types/database/ for backward compatibility.
 *
 * New code should import directly from '@/types/database' or
 * specific domain files like '@/types/database/player.types'.
 */

// Re-export everything from the new modular structure
export * from './database/index';
