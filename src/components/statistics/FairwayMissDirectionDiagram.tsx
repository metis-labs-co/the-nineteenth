/**
 * FairwayMissDirectionDiagram - SVG left/right fairway miss visualization
 *
 * Shows horizontal bars on each side of a center fairway rectangle to
 * visualize the direction of missed fairways. Left bar extends to the left,
 * right bar extends to the right.
 *
 * Shows an empty state with a dashed border when there is no miss data.
 *
 * @example
 * ```tsx
 * <FairwayMissDirectionDiagram stats={stats.fairwayMissDirection} compact={false} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Rect, G } from 'react-native-svg';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { FairwayMissDirectionStats } from '@/hooks/playerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface FairwayMissDirectionDiagramProps {
  /** Fairway miss direction statistics */
  stats: FairwayMissDirectionStats;
  /** Whether to render in compact mode (smaller size) */
  compact?: boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const NORMAL_WIDTH = 200;
const COMPACT_WIDTH = 140;

// Proportional height for the diagram
const DIAGRAM_HEIGHT = 80;

// Center fairway rectangle dimensions
const FAIRWAY_W = 24;
const FAIRWAY_H = 48;

// Max bar width (side bars fill from fairway edge to diagram edge minus padding)
const PADDING = 8;

// =====================================================
// COMPONENT
// =====================================================

export const FairwayMissDirectionDiagram = React.memo(function FairwayMissDirectionDiagram({
  stats,
  compact = false,
}: FairwayMissDirectionDiagramProps) {
  const colors = useThemeColors();
  const svgWidth = compact ? COMPACT_WIDTH : NORMAL_WIDTH;
  const svgHeight = DIAGRAM_HEIGHT;

  const hasData = stats.totalMisses > 0;

  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Fairway rectangle (centered)
  const fairwayX = centerX - FAIRWAY_W / 2;
  const fairwayY = centerY - FAIRWAY_H / 2;

  // Available space on each side between fairway edge and diagram edge
  const maxBarWidth = centerX - FAIRWAY_W / 2 - PADDING;

  const leftBarWidth = hasData && stats.leftPercentage !== null
    ? (stats.leftPercentage / 100) * maxBarWidth
    : 0;

  const rightBarWidth = hasData && stats.rightPercentage !== null
    ? (stats.rightPercentage / 100) * maxBarWidth
    : 0;

  const barHeight = FAIRWAY_H * 0.5;
  const barY = centerY - barHeight / 2;

  return (
    <View style={styles.wrapper}>
      {hasData ? (
        <>
          <Svg width={svgWidth} height={svgHeight}>
            <G>
              {/* Left miss bar */}
              {leftBarWidth > 0 && (
                <Rect
                  x={fairwayX - leftBarWidth}
                  y={barY}
                  width={leftBarWidth}
                  height={barHeight}
                  fill={colors.error}
                  opacity={0.7}
                  rx={2}
                />
              )}

              {/* Right miss bar */}
              {rightBarWidth > 0 && (
                <Rect
                  x={fairwayX + FAIRWAY_W}
                  y={barY}
                  width={rightBarWidth}
                  height={barHeight}
                  fill={colors.error}
                  opacity={0.7}
                  rx={2}
                />
              )}

              {/* Center fairway rectangle */}
              <Rect
                x={fairwayX}
                y={fairwayY}
                width={FAIRWAY_W}
                height={FAIRWAY_H}
                fill={colors.success}
                opacity={0.8}
                rx={3}
              />
            </G>
          </Svg>

          {/* Labels row */}
          <View style={[styles.labelsRow, { width: svgWidth }]}>
            <Text style={[styles.dirLabel, { color: colors.error }]}>
              L: {stats.leftPercentage ?? 0}%
            </Text>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              {stats.totalMisses} miss{stats.totalMisses !== 1 ? 'es' : ''}
            </Text>
            <Text style={[styles.dirLabel, { color: colors.error }]}>
              R: {stats.rightPercentage ?? 0}%
            </Text>
          </View>

          {/* Long/Short totals (when present) */}
          {(stats.longCount > 0 || stats.shortCount > 0) && (
            <View style={[styles.labelsRow, { width: svgWidth }]}>
              <Text style={[styles.dirLabel, { color: colors.error }]}>
                Long: {stats.longPercentage ?? 0}%
              </Text>
              <Text style={[styles.dirLabel, { color: colors.error }]}>
                Short: {stats.shortPercentage ?? 0}%
              </Text>
            </View>
          )}
        </>
      ) : (
        /* Empty state */
        <View
          style={[
            styles.emptyBox,
            {
              width: svgWidth,
              height: svgHeight + 24,
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
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
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

export default FairwayMissDirectionDiagram;
