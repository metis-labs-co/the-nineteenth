/**
 * WhatsAppGroupSection - One-tap entry to the competition's WhatsApp group.
 *
 * Renders only when the viewer is a player in the competition AND the
 * organiser has set a valid WhatsApp group invite link. Otherwise renders
 * null. Editing / sharing the link lives on the Competition Settings screen.
 */

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { isValidWhatsAppInvite, openWhatsAppGroup } from '@/utils/whatsapp';

export interface WhatsAppGroupSectionProps {
  whatsappUrl: string | null | undefined;
  isPlayer: boolean;
}

export function WhatsAppGroupSection({
  whatsappUrl,
  isPlayer,
}: WhatsAppGroupSectionProps) {
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    if (whatsappUrl) {
      void openWhatsAppGroup(whatsappUrl);
    }
  }, [whatsappUrl]);

  if (!isPlayer) return null;
  if (!isValidWhatsAppInvite(whatsappUrl)) return null;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        testID="whatsapp-group-join"
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Join WhatsApp group"
        accessibilityHint="Opens WhatsApp to join the group"
        style={[
          styles.row,
          shadows.sm,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Icon source="whatsapp" size={22} color={colors.primary} />
        <View style={styles.rowText}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Join WhatsApp Group
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Tap to open the group in WhatsApp
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
  },
  label: {
    ...typography.bodyBold,
  },
  subtitle: {
    ...typography.small,
    marginTop: spacing.xxs,
  },
});

export default WhatsAppGroupSection;
