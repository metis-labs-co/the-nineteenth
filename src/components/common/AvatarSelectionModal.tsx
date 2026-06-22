import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import {
  AVATARS,
  SIMPLE_AVATARS,
  isAvatarId,
  getAvatarId,
  getAvatarVariant,
  type AvatarOption,
  type AvatarVariant,
} from '@/constants/avatars';
import { GolferIcon } from './GolferIcon';
import { SimpleGolferIcon } from './SimpleGolferIcon';
import { BottomSheet } from './BottomSheet';

const NUM_COLUMNS = 4;
const AVATAR_SIZE = 60;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 3) / NUM_COLUMNS;

/** Sub-categories shown as tabs in the avatar picker. */
const CATEGORIES: { variant: AvatarVariant; label: string; data: AvatarOption[] }[] = [
  { variant: 'beer', label: 'Beer', data: AVATARS },
  { variant: 'simple', label: 'Simple', data: SIMPLE_AVATARS },
];

/**
 * Props for the AvatarSelectionModal component.
 */
export interface AvatarSelectionModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when an avatar is selected, receives the avatar ID */
  onSelect: (avatarId: string) => void;
  /** The current avatar URL (can be avatar:id format or null) */
  currentAvatarUrl: string | null | undefined;
}

/**
 * AvatarSelectionModal - A bottom sheet modal for selecting player avatars.
 *
 * Displays the avatars grouped into two sub-category tabs:
 * - "Beer"   - the full golfer mascot in 12 colour palettes
 * - "Simple" - the simplified golf-ball + cap mark in the same 12 colours
 *
 * The currently selected avatar is highlighted with a border ring, and the
 * picker opens on the tab that matches the current selection.
 *
 * @example
 * ```tsx
 * <AvatarSelectionModal
 *   visible={modalVisible}
 *   onClose={() => setModalVisible(false)}
 *   onSelect={(avatarId) => handleAvatarSelect(avatarId)}
 *   currentAvatarUrl={player?.photo_url}
 * />
 * ```
 */
function AvatarSelectionModalComponent({
  visible,
  onClose,
  onSelect,
  currentAvatarUrl,
}: AvatarSelectionModalProps) {
  const colors = useThemeColors();

  // Get the current avatar ID from the URL
  const currentAvatarId =
    currentAvatarUrl && isAvatarId(currentAvatarUrl)
      ? getAvatarId(currentAvatarUrl)
      : null;

  // Active sub-category tab; defaults to the style of the current selection.
  const [activeVariant, setActiveVariant] = useState<AvatarVariant>(
    currentAvatarId ? getAvatarVariant(currentAvatarId) : 'beer'
  );

  // When the sheet is (re)opened, jump to the tab matching the current avatar.
  useEffect(() => {
    if (visible && currentAvatarId) {
      setActiveVariant(getAvatarVariant(currentAvatarId));
    }
  }, [visible, currentAvatarId]);

  const handleAvatarPress = useCallback(
    (avatarId: string) => {
      onSelect(avatarId);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderAvatarItem = useCallback(
    ({ item }: { item: AvatarOption }) => {
      const isSelected = item.id === currentAvatarId;
      const isSimple = getAvatarVariant(item.id) === 'simple';
      const variantLabel = isSimple ? 'simple' : 'golfer';

      return (
        <TouchableOpacity
          onPress={() => handleAvatarPress(item.id)}
          style={[styles.avatarItem, { width: ITEM_WIDTH }]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} ${variantLabel} avatar`}
          accessibilityState={{ selected: isSelected }}
          accessibilityHint={
            isSelected ? 'Currently selected' : 'Double tap to select'
          }
        >
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: colors.surfaceVariant },
              isSelected && {
                borderColor: colors.primary,
                borderWidth: 3,
              },
            ]}
          >
            {isSimple ? (
              <SimpleGolferIcon size={AVATAR_SIZE} colorPalette={item.colorPalette} />
            ) : (
              <GolferIcon size={AVATAR_SIZE} colorPalette={item.colorPalette} />
            )}
          </View>
          <Text
            style={[
              styles.avatarLabel,
              { color: isSelected ? colors.primary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      );
    },
    [colors, currentAvatarId, handleAvatarPress]
  );

  const keyExtractor = useCallback((item: AvatarOption) => item.id, []);

  const activeData =
    CATEGORIES.find((c) => c.variant === activeVariant)?.data ?? AVATARS;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.6}
      title="Choose Avatar"
      showCloseButton={true}
      testID="avatar-selection-modal"
    >
      <View style={styles.tabBar}>
        {CATEGORIES.map((category) => {
          const isActive = category.variant === activeVariant;
          return (
            <TouchableOpacity
              key={category.variant}
              onPress={() => setActiveVariant(category.variant)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : colors.surfaceVariant,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${category.label} avatars`}
            >
              <Text
                style={[
                  typography.bodyBold,
                  { color: isActive ? colors.white : colors.textSecondary },
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={activeData}
        renderItem={renderAvatarItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 40,
  },
  gridContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  avatarItem: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: AVATAR_SIZE + spacing.md,
    height: AVATAR_SIZE + spacing.md,
    borderRadius: (AVATAR_SIZE + spacing.md) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

/**
 * Memoized AvatarSelectionModal component for performance
 */
export const AvatarSelectionModal = React.memo(AvatarSelectionModalComponent);

export default AvatarSelectionModal;
