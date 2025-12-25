import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import {
  AVATARS,
  isAvatarId,
  getAvatarId,
  type AvatarOption,
} from '@/constants/avatars';
import { GolferIcon } from './GolferIcon';
import { BottomSheet } from './BottomSheet';

const NUM_COLUMNS = 4;
const AVATAR_SIZE = 60;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 3) / NUM_COLUMNS;

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
 * Displays a 4x3 grid of golfer icon avatars with different colour palettes.
 * The currently selected avatar is highlighted with a border ring.
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

      return (
        <TouchableOpacity
          onPress={() => handleAvatarPress(item.id)}
          style={[
            styles.avatarItem,
            { width: ITEM_WIDTH },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} golfer avatar`}
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
            <GolferIcon size={AVATAR_SIZE} colorPalette={item.colorPalette} />
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.55}
      title="Choose Avatar"
      showCloseButton={true}
      testID="avatar-selection-modal"
    >
      <FlatList
        data={AVATARS}
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
