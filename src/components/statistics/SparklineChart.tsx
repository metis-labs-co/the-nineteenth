/**
 * SparklineChart - Minimal SVG polyline trend chart
 *
 * Renders a small sparkline visualization using react-native-svg.
 * Filters null values, requires 2+ valid data points to render.
 * Shows a dot at the last data point for emphasis.
 *
 * @example
 * ```tsx
 * <SparklineChart
 *   data={[42, 38, 45, 39, 41]}
 *   width={80}
 *   height={24}
 *   color={colors.success}
 * />
 * ```
 */

import React from 'react';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface SparklineChartProps {
  /** Data points for the sparkline (null values are filtered) */
  data: (number | null)[];
  /** Width of the SVG canvas in pixels */
  width?: number;
  /** Height of the SVG canvas in pixels */
  height?: number;
  /** Stroke color for the line */
  color?: string;
  /** Stroke width of the line */
  strokeWidth?: number;
}

// =====================================================
// COMPONENT
// =====================================================

export const SparklineChart = React.memo(function SparklineChart({
  data,
  width = 80,
  height = 24,
  color,
  strokeWidth = 1.5,
}: SparklineChartProps) {
  const colors = useThemeColors();
  const lineColor = color ?? colors.primary;

  // Filter out nulls and require 2+ valid points
  const validPoints = data.filter((d): d is number => d !== null);
  if (validPoints.length < 2) return null;

  const minVal = Math.min(...validPoints);
  const maxVal = Math.max(...validPoints);
  const range = maxVal - minVal;

  // Padding so line/dot don't get clipped at edges
  const padX = 2;
  const padY = 2;
  const drawWidth = width - padX * 2;
  const drawHeight = height - padY * 2;

  // Map each valid point to SVG coordinates
  const points = validPoints.map((value, index) => {
    const x = padX + (validPoints.length > 1 ? (index / (validPoints.length - 1)) * drawWidth : drawWidth / 2);
    // Invert Y: higher values should appear higher (lower y in SVG)
    const y = padY + (range === 0 ? drawHeight / 2 : ((maxVal - value) / range) * drawHeight);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pointsString = points.join(' ');
  const lastPoint = points[points.length - 1];
  const [lastX, lastY] = lastPoint.split(',').map(Number);

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={pointsString}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle
        cx={lastX}
        cy={lastY}
        r={strokeWidth + 1}
        fill={lineColor}
      />
    </Svg>
  );
});

export default SparklineChart;
