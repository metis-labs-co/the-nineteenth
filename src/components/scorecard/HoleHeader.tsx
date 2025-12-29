/**
 * HoleHeader Component
 *
 * Re-exports the HoleHeader component from its folder location.
 * This file maintains backward compatibility for existing imports.
 */

export {
  HoleDetailsSection,
  HoleHeader,
  HoleNavigationButton,
  HoleNumberDisplay,
} from './HoleHeader/index';

export type {
  HoleDetailsSectionProps,
  HoleHeaderProps,
  HoleNavigationButtonProps,
  HoleNumberDisplayProps,
  NavigationDirection,
} from './HoleHeader/index';

export { HoleHeader as default } from './HoleHeader/index';
