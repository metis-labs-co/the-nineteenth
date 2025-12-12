/**
 * Social Comparison Components
 *
 * Reusable components for comparing player statistics.
 */

export { ComparisonRow, type ComparisonRowProps } from './ComparisonRow';
export { DistributionComparison, type DistributionComparisonProps } from './DistributionComparison';
export { PlayerCompareHeader, type PlayerCompareHeaderProps, type PlayerInfo } from './PlayerCompareHeader';
export { ComparisonLegend, type ComparisonLegendProps } from './ComparisonLegend';

// Re-export SectionHeader from common for backwards compatibility
export { SectionHeader, type SectionHeaderProps } from '@/components/common/SectionHeader';
