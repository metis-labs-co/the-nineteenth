/**
 * Active Brand Configuration
 *
 * !! SINGLE SWAP POINT !!
 *
 * To change the brand for a white-label build:
 * 1. Import the desired brand configuration
 * 2. Export it as `activeBrand`
 *
 * @example
 * ```typescript
 * // Switch to a different client:
 * import { greenGolfBrand } from './greenGolf.brand';
 * export const activeBrand = greenGolfBrand;
 * ```
 */

// Available brands
import { theNineteenthBrand } from './theNineteenth.brand';
import { greenGolfBrand } from './greenGolf.brand';

/**
 * The currently active brand configuration.
 * Change this import/export to switch brands.
 */
export const activeBrand = theNineteenthBrand;

// Re-export types for convenience
export type { BrandConfig } from '../brand.types';

// Export all available brands (useful for testing/preview)
export { theNineteenthBrand } from './theNineteenth.brand';
export { greenGolfBrand } from './greenGolf.brand';

/**
 * Alternative: Environment-based brand selection
 *
 * Uncomment below for builds that select brand via environment variable.
 * Add new brands to the `brands` object as they are created.
 *
 * Then set EXPO_PUBLIC_BRAND_ID in your .env or EAS build config:
 *   EXPO_PUBLIC_BRAND_ID=the-nineteenth
 *
 * @example EAS build profiles (eas.json):
 * ```json
 * {
 *   "build": {
 *     "production-the-nineteenth": {
 *       "env": { "EXPO_PUBLIC_BRAND_ID": "the-nineteenth" }
 *     },
 *     "production-green-golf": {
 *       "env": { "EXPO_PUBLIC_BRAND_ID": "green-golf" }
 *     }
 *   }
 * }
 * ```
 */

// import { theNineteenthBrand } from './theNineteenth.brand';
// // import { greenGolfBrand } from './greenGolf.brand';
//
// const brands = {
//   'the-nineteenth': theNineteenthBrand,
//   // 'green-golf': greenGolfBrand,
// } as const;
//
// type BrandId = keyof typeof brands;
// const brandId = (process.env.EXPO_PUBLIC_BRAND_ID || 'the-nineteenth') as BrandId;
// export const activeBrand = brands[brandId] || theNineteenthBrand;
