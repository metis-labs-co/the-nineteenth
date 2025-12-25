import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AvatarSelectionModal, AvatarSelectionModalProps } from './AvatarSelectionModal';
import { PlayerAvatar } from './PlayerAvatar';
import { formatAvatarUrl } from '@/constants/avatars';

/**
 * AvatarSelectionModal displays a bottom sheet modal with a 4x3 grid of
 * avatar options. Users can select from 12 colour variations of the
 * golfer icon. The currently selected avatar is highlighted.
 */
const meta: Meta<typeof AvatarSelectionModal> = {
  title: 'Common/AvatarSelectionModal',
  component: AvatarSelectionModal,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the modal is visible',
    },
    currentAvatarUrl: {
      control: 'select',
      options: [
        null,
        'avatar:avatar-green',
        'avatar:avatar-blue',
        'avatar:avatar-navy',
        'avatar:avatar-teal',
        'avatar:avatar-purple',
        'avatar:avatar-violet',
        'avatar:avatar-red',
        'avatar:avatar-orange',
        'avatar:avatar-gold',
        'avatar:avatar-pink',
        'avatar:avatar-slate',
        'avatar:avatar-charcoal',
        'https://example.com/photo.jpg',
      ],
      description: 'The current avatar URL (avatar:id format or remote URL)',
    },
    onClose: { action: 'closed' },
    onSelect: { action: 'selected' },
  },
};

export default meta;
type Story = StoryObj<typeof AvatarSelectionModal>;

/**
 * Default state with no current selection
 */
export const Default: Story = {
  args: {
    visible: true,
    currentAvatarUrl: null,
  },
};

/**
 * With a current selection (Blue avatar)
 */
export const WithSelection: Story = {
  args: {
    visible: true,
    currentAvatarUrl: 'avatar:avatar-blue',
  },
};

/**
 * With Green avatar selected
 */
export const GreenSelected: Story = {
  args: {
    visible: true,
    currentAvatarUrl: 'avatar:avatar-green',
  },
};

/**
 * With Purple avatar selected
 */
export const PurpleSelected: Story = {
  args: {
    visible: true,
    currentAvatarUrl: 'avatar:avatar-purple',
  },
};

/**
 * With Charcoal avatar selected (dark variant)
 */
export const CharcoalSelected: Story = {
  args: {
    visible: true,
    currentAvatarUrl: 'avatar:avatar-charcoal',
  },
};

/**
 * Hidden state (modal not visible)
 */
export const Hidden: Story = {
  args: {
    visible: false,
    currentAvatarUrl: 'avatar:avatar-blue',
  },
};

/**
 * With remote URL as current avatar (no bundled selection highlighted)
 */
export const RemoteUrlCurrent: Story = {
  args: {
    visible: true,
    currentAvatarUrl: 'https://example.com/user-photo.jpg',
  },
};

/**
 * Interactive example showing the full flow with avatar display
 */
const InteractiveTemplate = (args: AvatarSelectionModalProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>('avatar-green');

  const handleSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    args.onSelect?.(avatarId);
  };

  const currentAvatarUrl = selectedAvatarId
    ? formatAvatarUrl(selectedAvatarId)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.avatarButton}
        >
          <PlayerAvatar
            photoUrl={currentAvatarUrl}
            name="Test User"
            size={100}
          />
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Edit</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.instruction}>Tap avatar to change</Text>
        <Text style={styles.selectedText}>
          Selected: {selectedAvatarId || 'None'}
        </Text>
      </View>

      <AvatarSelectionModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          args.onClose?.();
        }}
        onSelect={handleSelect}
        currentAvatarUrl={currentAvatarUrl}
      />
    </View>
  );
};

export const Interactive: Story = {
  render: InteractiveTemplate,
  args: {
    visible: true,
    currentAvatarUrl: 'avatar:avatar-green',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive example demonstrating the full avatar selection flow. Tap the avatar to open the modal and select a new avatar.',
      },
    },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarButton: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E7F5E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instruction: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  selectedText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
});
