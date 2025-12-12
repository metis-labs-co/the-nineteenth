/**
 * BottomSheet Component
 *
 * Unified slide-from-bottom component for modals and sheets.
 * Supports both full-screen and partial-screen modes.
 *
 * @example
 * // Partial screen (80%)
 * <BottomSheet
 *   visible={visible}
 *   onClose={handleClose}
 *   title="Add Players"
 * >
 *   <PlayerList />
 * </BottomSheet>
 *
 * @example
 * // Full screen
 * <BottomSheet
 *   visible={visible}
 *   onClose={handleClose}
 *   height="full"
 *   title="Add Friend"
 *   showHandle={false}
 *   safeAreaTop
 * >
 *   <SearchContent />
 * </BottomSheet>
 */

export { BottomSheet } from './BottomSheet';
export { BottomSheetHeader } from './BottomSheetHeader';
export { useBottomSheet } from './hooks/useBottomSheet';

// Types
export type {
  BottomSheetProps,
  BottomSheetHeaderProps,
  BottomSheetHeight,
  BottomSheetAnimationConfig,
  UseBottomSheetReturn,
} from './types';
