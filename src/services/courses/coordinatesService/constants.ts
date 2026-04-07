/**
 * Coordinates Service Constants
 *
 * POI type constants for GPS coordinate data.
 */

import type { PoiType } from '@/types/database/enums';

/**
 * Essential POI types for basic course data
 * At minimum, we need tee_back and green_center for distance calculations
 */
export const ESSENTIAL_POI_TYPES: PoiType[] = ['tee_back', 'green_center'];

/**
 * All POI types in order of importance
 */
export const ALL_POI_TYPES: PoiType[] = [
  'tee_front',
  'tee_back',
  'green_front',
  'green_center',
  'green_back',
];
