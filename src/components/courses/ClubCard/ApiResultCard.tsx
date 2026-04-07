/**
 * ApiResultCard - Card for GolfAPI.io search results (not yet imported)
 *
 * Displays a simplified card for clubs found via API search that
 * haven't been imported to the local database yet. Shows club name,
 * location, multi-course badge, and import loading state.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatDistanceKm } from '@/utils/gpsCalculations';
import type { GolfApiSearchResultItem } from '@/hooks/useGolfApiSearch';

// =====================================================
// TYPES
// =====================================================

interface ApiResultCardProps {
  item: GolfApiSearchResultItem;
  onPress: () => void;
  isImporting: boolean;
  selectionMode: boolean;
  distanceMeters?: number;
}

// =====================================================
// COMPONENT
// =====================================================

export const ApiResultCard = React.memo(function ApiResultCard({
  item,
  onPress,
  isImporting,
  selectionMode,
  distanceMeters,
}: ApiResultCardProps) {
  const colors = useThemeColors();
  const distanceLabel = distanceMeters != null ? formatDistanceKm(distanceMeters) : null;
  const locationText = [item.city, item.state, distanceLabel].filter(Boolean).join(' · ');
  const isSingleCourse = !item.is_multi_course;

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.courseRow}
        onPress={onPress}
        disabled={isImporting}
        activeOpacity={0.7}
      >
        <View style={styles.courseRowContent}>
          {/* Icon - golf for single course, home-city for multi-course */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source={isSingleCourse ? 'golf' : 'home-city'} size={24} color={colors.primary} />
          </View>

          {/* Info */}
          <View style={styles.courseInfo}>
            <View style={styles.courseNameRow}>
              <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {/* Multi-course badge */}
              {!isSingleCourse && (
                <View style={[styles.courseCountBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.courseCountText, { color: colors.textOnColored }]}>
                    {item.course_count || '?'}
                  </Text>
                </View>
              )}
            </View>
            {locationText && (
              <Text style={[styles.clubSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {locationText}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.courseActions}>
            {isImporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : selectionMode ? (
              <Icon source="chevron-right" size={24} color={colors.gray400} />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  courseRow: {
  },
  courseRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  courseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  courseName: {
    ...typography.bodyBold,
    flex: 1,
  },
  clubSubtitle: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  courseCountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  courseCountText: {
    ...typography.caption,
    fontWeight: '600',
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
