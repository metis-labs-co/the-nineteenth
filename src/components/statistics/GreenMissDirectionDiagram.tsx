/**
 * GreenMissDirectionDiagram - SVG quadrant green miss visualization
 *
 * Shows a center green circle with 4 directional bars extending toward
 * cardinal points (Long = top, Short = bottom, Left, Right) to visualize
 * where approach shots missed the green.
 *
 * Shows an empty state with a dashed border when there is no miss data.
 *
 * @example
 * ```tsx
 * <GreenMissDirectionDiagram stats={stats.greenMissDirection} compact={false} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { GreenMissDirectionStats } from '@/hooks/playerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface GreenMissDirectionDiagramProps {
  /** Green miss direction statistics */
  stats: GreenMissDirectionStats;
  /** Whether to render in compact mode (smaller size) */
  compact?: boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const NORMAL_SIZE = 160;
const COMPACT_SIZE = 120;

// Green circle radius as proportion of diagram size
const GREEN_RADIUS_RATIO = 0.18;
// Max bar length (from green edge to diagram edge minus padding)
const BAR_THICKNESS = 8;
const PADDING = 16;

// =====================================================
// COMPONENT
// =====================================================

export const GreenMissDirectionDiagram = React.memo(function GreenMissDirectionDiagram({
  stats,
  compact = false,
}: GreenMissDirectionDiagramProps) {
  const colors = useThemeColors();
  const size = compact ? COMPACT_SIZE : NORMAL_SIZE;

  const hasData = stats.totalMisses > 0;

  const centerX = size / 2;
  const centerY = size / 2;
  const greenRadius = size * GREEN_RADIUS_RATIO;

  // Max bar length from edge of green circle to diagram edge minus padding
  const maxBarLen = centerX - greenRadius - PADDING;

  const longLen = hasData && stats.longPercentage !== null
    ? (stats.longPercentage / 100) * maxBarLen
    : 0;
  const shortLen = hasData && stats.shortPercentage !== null
    ? (stats.shortPercentage / 100) * maxBarLen
    : 0;
  const leftLen = hasData && stats.leftPercentage !== null
    ? (stats.leftPercentage / 100) * maxBarLen
    : 0;
  const rightLen = hasData && stats.rightPercentage !== null
    ? (stats.rightPercentage / 100) * maxBarLen
    : 0;

  const halfThick = BAR_THICKNESS / 2;

  return (
    <View style={styles.wrapper}>
      {hasData ? (
        <>
          <Svg width={size} height={size}>
            <G>
              {/* Long (top) bar */}
              {longLen > 0 && (
                <Rect
                  x={centerX - halfThick}
                  y={centerY - greenRadius - longLen}
                  width={BAR_THICKNESS}
                  height={longLen}
                  fill={colors.error}
                  opacity={0.7}
                  rx={2}
                />
              )}

              {/* Short (bottom) bar */}
              {shortLen > 0 && (
                <Rect
                  x={centerX - halfThick}
                  y={centerY + greenRadius}
                  width={BAR_THICKNESS}
                  height={shortLen}
                  fill={colors.error}
                  opacity={0.7}
                  rx={2}
                />
              )}

              {/* Left bar */}
              {leftLen > 0 && (
                <Rect
                  x={centerX - greenRadius - leftLen}
                  y={centerY - halfThick}
                  width={leftLen}
                  height={BAR_THICKNESS}
                  fill={colors.error}
                  opacity={0.7}
                  rx={2}
                />
              )}

              {/* Right bar */}
              {rightLen > 0 && (
                <Rect
                  x={centerX + greenRadius}
                  y={centerY - halfThick}
                  width={rightLen}
                  height={BAR_THICKNESS}
                  fill={colors.error}
                  opacity={0.7}
                  rx={2}
                />
              )}

              {/* Center green circle */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={greenRadius}
                fill={colors.success}
                opacity={0.85}
              />
            </G>
          </Svg>

          {/* Cardinal labels */}
          <View style={[styles.labelsContainer, { width: size }]}>
            {/* Long label (above diagram, rendered as top label) */}
            <View style={styles.topLabelRow}>
              <Text style={[styles.dirLabel, { color: colors.textSecondary }]}>
                Long: {stats.longPercentage ?? 0}%
              </Text>
            </View>

            {/* Left/Right labels inline */}
            <View style={styles.midRow}>
              <Text style={[styles.dirLabel, { color: colors.textSecondary }]}>
                L: {stats.leftPercentage ?? 0}%
              </Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                {stats.totalMisses}
              </Text>
              <Text style={[styles.dirLabel, { color: colors.textSecondary }]}>
                R: {stats.rightPercentage ?? 0}%
              </Text>
            </View>

            {/* Short label (below) */}
            <View style={styles.bottomLabelRow}>
              <Text style={[styles.dirLabel, { color: colors.textSecondary }]}>
                Short: {stats.shortPercentage ?? 0}%
              </Text>
            </View>
          </View>
        </>
      ) : (
        /* Empty state */
        <View
          style={[
            styles.emptyBox,
            {
              width: size,
              height: size,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No miss data yet
          </Text>
        </View>
      )}
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  labelsContainer: {
    marginTop: -spacing.sm,
  },
  topLabelRow: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  midRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  bottomLabelRow: {
    alignItems: 'center',
  },
  dirLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  totalLabel: {
    ...typography.caption,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.small,
  },
});

export default GreenMissDirectionDiagram;
