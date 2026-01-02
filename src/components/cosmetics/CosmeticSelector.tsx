/**
 * CosmeticSelector Component
 *
 * A grid selector for displaying and equipping cosmetics.
 * Shows locked/unlocked/equipped states with points-based unlock requirements.
 *
 * @example
 * ```tsx
 * <CosmeticSelector
 *   type="badge"
 *   cosmetics={allBadges}
 *   unlocked={playerCosmetics}
 *   equipped={equippedBadge}
 *   totalPoints={1500}
 *   onEquip={handleEquip}
 *   onUnequip={handleUnequip}
 * />
 * ```
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  type ListRenderItemInfo,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type {
  CosmeticDefinition,
  CosmeticType,
  PlayerCosmetic,
} from '@/types/database/cosmetic.types';
import {
  COSMETIC_TYPE_DISPLAY_NAMES,
  COSMETIC_TYPE_ICONS,
  BADGE_STYLES,
  FRAME_STYLES,
  TITLE_STYLES,
} from '@/types/database/cosmetic.types';

// ===========================================================================
// TYPES
// ===========================================================================

/**
 * Props for the CosmeticSelector component
 */
export interface CosmeticSelectorProps {
  /** The type of cosmetic being displayed */
  type: CosmeticType;
  /** All cosmetic definitions of this type */
  cosmetics: CosmeticDefinition[];
  /** Player's unlocked cosmetics (to check unlock status) */
  unlocked: PlayerCosmetic[];
  /** Currently equipped cosmetic of this type (null if none) */
  equipped: CosmeticDefinition | null;
  /** Player's total achievement points (for unlock checks) */
  totalPoints: number;
  /** Callback when a cosmetic is equipped */
  onEquip: (cosmetic: CosmeticDefinition) => void;
  /** Callback when equipped cosmetic is unequipped */
  onUnequip: () => void;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Internal type for cosmetic item with computed status
 */
interface CosmeticItemData {
  cosmetic: CosmeticDefinition;
  isUnlocked: boolean;
  isEquipped: boolean;
  pointsNeeded: number;
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Get the icon for a cosmetic based on its type and code
 */
function getCosmeticIcon(cosmetic: CosmeticDefinition): string {
  // First check if cosmetic has a custom icon
  if (cosmetic.icon) {
    return cosmetic.icon;
  }

  // Check type-specific styles
  switch (cosmetic.type) {
    case 'badge':
      return BADGE_STYLES[cosmetic.code]?.icon ?? 'shield-star';
    case 'frame':
      return 'image-frame';
    case 'title':
      return 'format-title';
    default:
      return COSMETIC_TYPE_ICONS[cosmetic.type] ?? 'star';
  }
}

/**
 * Get the accent color for a cosmetic based on its type and code
 */
function getCosmeticColor(cosmetic: CosmeticDefinition): string | null {
  switch (cosmetic.type) {
    case 'badge':
      return BADGE_STYLES[cosmetic.code]?.color ?? null;
    case 'frame':
      return FRAME_STYLES[cosmetic.code]?.borderColor ?? null;
    case 'title':
      return TITLE_STYLES[cosmetic.code]?.color ?? null;
    default:
      return null;
  }
}

// ===========================================================================
// COSMETIC ITEM COMPONENT
// ===========================================================================

interface CosmeticItemProps {
  item: CosmeticItemData;
  onPress: () => void;
  testID?: string;
}

const CosmeticItem = memo(function CosmeticItem({
  item,
  onPress,
  testID,
}: CosmeticItemProps) {
  const colors = useThemeColors();
  const { cosmetic, isUnlocked, isEquipped, pointsNeeded } = item;

  // Get cosmetic-specific styling
  const accentColor = getCosmeticColor(cosmetic);
  const iconName = getCosmeticIcon(cosmetic);

  // Determine the appearance based on state
  const isLocked = !isUnlocked;

  // Container style based on state
  const containerStyle = useMemo(() => {
    if (isEquipped) {
      return {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 2,
      };
    }
    if (isLocked) {
      return {
        backgroundColor: colors.gray200,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: 0.6,
      };
    }
    return {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    };
  }, [isEquipped, isLocked, colors]);

  // Icon color based on state
  const iconColor = useMemo(() => {
    if (isLocked) return colors.textDisabled;
    if (accentColor) return accentColor;
    return colors.primary;
  }, [isLocked, accentColor, colors]);

  // Text color based on state
  const textColor = isLocked ? colors.textDisabled : colors.textPrimary;
  const secondaryTextColor = isLocked ? colors.textDisabled : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.itemContainer, containerStyle]}
      onPress={onPress}
      disabled={isLocked}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isLocked,
        selected: isEquipped,
      }}
      accessibilityLabel={`${cosmetic.name}${isLocked ? ', locked' : ''}${isEquipped ? ', equipped' : ''}`}
      accessibilityHint={
        isLocked
          ? `Requires ${pointsNeeded} more points to unlock`
          : isEquipped
            ? 'Tap to unequip'
            : 'Tap to equip'
      }
      testID={testID}
    >
      {/* Icon/Preview */}
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Icon source={iconName} size={28} color={iconColor} />
        {isLocked && (
          <View style={[styles.lockOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Icon source="lock" size={16} color={colors.white} />
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={[styles.itemName, { color: textColor }]}
        numberOfLines={2}
      >
        {cosmetic.name}
      </Text>

      {/* Points required or Equipped indicator */}
      {isEquipped ? (
        <View style={[styles.equippedBadge, { backgroundColor: colors.primary }]}>
          <Icon source="check" size={12} color={colors.white} />
        </View>
      ) : isLocked ? (
        <Text style={[styles.pointsText, { color: secondaryTextColor }]}>
          {pointsNeeded} pts
        </Text>
      ) : (
        <Text style={[styles.pointsText, { color: colors.success }]}>
          Unlocked
        </Text>
      )}
    </TouchableOpacity>
  );
});

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================

export const CosmeticSelector = memo(function CosmeticSelector({
  type,
  cosmetics,
  unlocked,
  equipped,
  totalPoints,
  onEquip,
  onUnequip,
  testID,
}: CosmeticSelectorProps) {
  const colors = useThemeColors();

  // Create a set of unlocked cosmetic IDs for O(1) lookup
  const unlockedIds = useMemo(() => {
    return new Set(unlocked.map((pc) => pc.cosmetic_id));
  }, [unlocked]);

  // Prepare item data with computed status
  const itemData = useMemo((): CosmeticItemData[] => {
    return cosmetics
      .filter((c) => c.type === type)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cosmetic) => {
        const isUnlocked = unlockedIds.has(cosmetic.id);
        const isEquipped = equipped?.id === cosmetic.id;
        const pointsNeeded = Math.max(0, cosmetic.points_required - totalPoints);

        return {
          cosmetic,
          isUnlocked,
          isEquipped,
          pointsNeeded,
        };
      });
  }, [cosmetics, type, unlockedIds, equipped, totalPoints]);

  // Handle item press
  const handleItemPress = useCallback(
    (item: CosmeticItemData) => {
      if (item.isEquipped) {
        onUnequip();
      } else if (item.isUnlocked) {
        onEquip(item.cosmetic);
      }
    },
    [onEquip, onUnequip]
  );

  // Render individual item
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CosmeticItemData>) => (
      <CosmeticItem
        item={item}
        onPress={() => handleItemPress(item)}
        testID={testID ? `${testID}-item-${index}` : undefined}
      />
    ),
    [handleItemPress, testID]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: CosmeticItemData) => item.cosmetic.id,
    []
  );

  // Get section title based on type
  const sectionTitle = COSMETIC_TYPE_DISPLAY_NAMES[type] || `${type}s`;
  const sectionIcon = COSMETIC_TYPE_ICONS[type] || 'star';

  // Don't render if no items
  if (itemData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Section Header */}
      <View style={styles.header}>
        <Icon source={sectionIcon} size={20} color={colors.textSecondary} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {sectionTitle}
        </Text>
        <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
          {itemData.filter((i) => i.isUnlocked).length}/{itemData.length}
        </Text>
      </View>

      {/* Horizontal Scrollable Grid */}
      <FlatList
        data={itemData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
});

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.bodyBold,
    flex: 1,
  },
  headerCount: {
    ...typography.small,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  separator: {
    width: spacing.md,
  },
  itemContainer: {
    width: 100,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.xs,
    minHeight: 32,
  },
  pointsText: {
    ...typography.caption,
  },
  equippedBadge: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CosmeticSelector;
