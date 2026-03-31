// =============================================================================
// COMMON COMPONENTS INDEX
// Organized by category for better discoverability
// =============================================================================

// === Layout Components ===
// Components for page structure and content organization
export { BottomSheet, BottomSheetHeader, useBottomSheet } from './BottomSheet';
export type {
  BottomSheetProps,
  BottomSheetHeaderProps,
  BottomSheetHeight,
  BottomSheetAnimationConfig,
  UseBottomSheetReturn,
} from './BottomSheet';
export { Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';
export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';
export { FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { CardContainer } from './CardContainer';
export type { CardContainerProps, CardPadding } from './CardContainer';
export { SwipeableRow } from './SwipeableRow';
export type { SwipeableRowProps, SwipeableRowRef } from './SwipeableRow';
export { ExpandableItem, ExpandableList } from './ExpandableItem';
export type {
  ExpandableItemProps,
  ExpandableListProps,
} from './ExpandableItem';

// === Input Components ===
// Form inputs, selectors, and user interaction components
export { FormInput } from './FormInput';
export type { FormInputProps } from './FormInput';
export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';
export { DateTimeFieldGroup } from './DateTimeFieldGroup';
export type { DateTimeFieldGroupProps } from './DateTimeFieldGroup';
export { OtpInput } from './OtpInput';
export type { OtpInputProps } from './OtpInput';
export { SearchBar } from './SearchBar';
export { SegmentedButton } from './SegmentedButton';
export type { SegmentOption } from './SegmentedButton';
// RadioButtonOption moved to @/screens/profile/components
export {
  TeeSelector,
  TeeSelectorPills,
  TeeSelectorCards,
  TeeSelectorList,
  getTeeColor,
  isTeeSelected,
} from './TeeSelector';
export type {
  TeeSelectorProps,
  TeeSelectorVariant,
  TeeSelectorCourseInfo,
  TeeSelectorPillsProps,
  TeeSelectorCardsProps,
  TeeSelectorListProps,
} from './TeeSelector';

// === Info Components ===
// Informational sheets and modals
export { HandicapInfoSheet } from './HandicapInfoSheet';
export type { HandicapInfoSheetProps } from './HandicapInfoSheet';

// === Selection Components ===
// Modal and inline selection patterns
// Note: SelectionModal is not exported as only specialized variants are used externally
// (CourseSelectionModal, AvatarSelectionModal, etc.)
export { FriendSelector, SelectedPlayerChip, FriendListItem } from './FriendSelector';
export type {
  FriendSelectorProps,
  SelectedPlayer,
  SelectionLimits,
  LimitIndicatorConfig,
  SelectedPlayerChipProps,
  FriendListItemProps,
} from './FriendSelector';
export { PlayerSelector, PlayerListItem, SelectedPlayerPill } from './PlayerSelector';
export type {
  PlayerSelectorProps,
  SelectablePlayer,
  PlayerSelectionLimits,
  PlayerListItemProps,
  SelectedPlayerPillProps,
} from './PlayerSelector';
export { AvatarSelectionModal } from './AvatarSelectionModal';
export type { AvatarSelectionModalProps } from './AvatarSelectionModal';
export { ConfirmationDialog } from './ConfirmationDialog';
export type { ConfirmationDialogProps } from './ConfirmationDialog';

// === Typography Components ===
// Text components with accessibility support
export { ScaledText } from './ScaledText';
export type { ScaledTextProps, ScaledTextCategory } from './ScaledText';

// === Display Components ===
// Static display elements, badges, pills, and status indicators
export { Badge } from './Badge';
export type { BadgeProps, BadgeSize, BadgeVariant } from './Badge';
export { Pill } from './Pill';
export type { PillProps, PillSize, PillVariant } from './Pill';
export { FilterPill } from './FilterPill';
export type { FilterPillProps } from './FilterPill';
export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusVariant, StatusBadgeSize } from './StatusBadge';
export { DateTimeDisplay } from './DateTimeDisplay';
export type {
  DateTimeDisplayProps,
  DateTimeDisplaySize,
  DateTimeDisplayIcon,
} from './DateTimeDisplay';
export { InfoCard } from './InfoCard';
export type { InfoCardProps } from './InfoCard';
export { WinnerRow } from './WinnerRow';
export type { WinnerRowProps, WinnerInfo } from './WinnerRow';
// MenuItemRow moved to @/screens/profile/components

// === State Components ===
// Empty states, error states, and loading indicators
export { EmptyState } from './EmptyState';
export type { EmptyStateProps, EmptyStateIcon } from './EmptyState';
export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps, SpinnerSize } from './LoadingSpinner';
export { GolfBallLoader } from './GolfBallLoader';
export type { GolfBallLoaderProps, GolfBallSize } from './GolfBallLoader';
export { ProgressBar } from './ProgressBar';
export { OfflineIndicator } from './OfflineIndicator';
export { ToggleSwitch } from './ToggleSwitch';

// === Navigation Components ===
// Step indicators, progress navigation, and action buttons
export { StepIndicator } from './StepIndicator';
export type { StepIndicatorProps, Step } from './StepIndicator';
export { FullScreenWizard, useWizard } from './FullScreenWizard';
export type {
  WizardStepConfig,
  UseWizardOptions,
  UseWizardReturn,
  FullScreenWizardProps,
} from './FullScreenWizard';
// NotificationBell moved to @/screens/profile/components
export { FeatureButton } from './FeatureButton';

// === Avatar & Identity Components ===
// Player avatars, icons, and branding
export { PlayerAvatar } from './PlayerAvatar';
export type { PlayerAvatarProps } from './PlayerAvatar';
export { GolferIcon } from './GolferIcon';
export type { GolferIconProps, ColorPalette } from './GolferIcon';
export { AppIcon } from './AppIcon';
export { Logo } from './Logo';
export { LogoHorizontal } from './LogoHorizontal';

// === Hooks ===
// Shared hooks for common component behaviors
export { useSwipeToDelete } from './hooks';
export type { UseSwipeToDeleteOptions, UseSwipeToDeleteReturn } from './hooks';
