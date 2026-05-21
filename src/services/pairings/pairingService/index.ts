/**
 * Pairing Service - Index Barrel
 *
 * Re-exports all pairing service modules and provides the same
 * singleton object API for backward compatibility.
 *
 * Modules:
 * - types: Type definitions and error factory
 * - helpers: Player enrichment utilities
 * - crud: Core CRUD operations
 * - generation: Auto-generation and tee time management
 */

// Re-export types
export type { PairingQueryRow, PlayerLookup } from './types';

// Re-export CRUD operations
export {
  getPairingsForRound,
  createPairings,
  updatePairing,
  deletePairing,
  deleteAllPairingsForRound,
  roundHasPairings,
  getPlayerPairing,
} from './crud';

// Re-export generation operations
export {
  autoGeneratePairings,
  replacePairings,
  updatePairingTeeTimes,
} from './generation';

// Import for the singleton object
import {
  getPairingsForRound,
  createPairings,
  updatePairing,
  deletePairing,
  deleteAllPairingsForRound,
  roundHasPairings,
  getPlayerPairing,
} from './crud';
import {
  autoGeneratePairings,
  replacePairings,
  updatePairingTeeTimes,
} from './generation';

// =====================================================
// SINGLETON EXPORT (backward compatibility)
// =====================================================

/**
 * Pairing service with all CRUD operations
 */
export const pairingService = {
  getPairingsForRound,
  createPairings,
  updatePairing,
  deletePairing,
  deleteAllPairingsForRound,
  autoGeneratePairings,
  replacePairings,
  updatePairingTeeTimes,
  roundHasPairings,
  getPlayerPairing,
};

export default pairingService;
