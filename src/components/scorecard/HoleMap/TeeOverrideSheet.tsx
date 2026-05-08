/**
 * TeeOverrideSheet - bottom sheet to swap the hole's origin between back
 * and front tees, any user-added custom tees, or trigger an "add a new
 * custom tee" flow on the host screen.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { BottomSheet } from '@/components/common';
import type { TeeOverride } from '@/store/teeOverrideStore';
import {
  CUSTOM_TEE_COLORS,
  type CustomHoleTee,
} from '@/types/database/customHoleTees.types';

export interface TeeOverrideSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Currently selected tee — drives the selected indicator. */
  currentSelection: TeeOverride | null;
  hasBackTee: boolean;
  hasFrontTee: boolean;
  /**
   * Optional colour info for the back tee POI (typically the course's
   * longest TeeBox). When provided, the "Back tee" row renders with a
   * colour swatch and the colour name in the label/description.
   */
  backTeeColor?: { label: string | null; swatch: string | null; teeName: string | null } | null;
  /** Same as `backTeeColor` but for the front tee POI (shortest TeeBox). */
  frontTeeColor?: { label: string | null; swatch: string | null; teeName: string | null } | null;
  /** User-defined custom tees for this hole. Empty array if none. */
  customTees?: CustomHoleTee[];
  onSelect: (selection: TeeOverride) => void;
  /** Optional: when provided, the sheet shows a "+ Add custom tee" row. */
  onAddCustom?: () => void;
}

interface RowProps {
  label: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  /** Leading swatch colour — drawn as a small circle next to the label.
   *  Used for custom tees so users can recognise them at a glance. */
  swatchColor?: string;
  testID?: string;
}

function OptionRow({
  label,
  description,
  selected,
  disabled,
  onPress,
  swatchColor,
  testID,
}: RowProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  // In light mode `primaryLighter` is a soft pastel that reads well; in dark
  // mode it's a brightened tint that glows on a dark surface and washes out
  // the text. Use a low-alpha primary on dark for a subtle "selected" wash.
  const selectedBackground = isDark
    ? `${colors.primary}26` // ~15% alpha primary, blends with dark surface
    : colors.primaryLighter;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? selectedBackground : colors.surfaceVariant,
          borderColor: selected ? colors.primary : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {swatchColor && (
        <View
          style={[
            styles.swatch,
            { backgroundColor: swatchColor, borderColor: colors.borderLight },
          ]}
        />
      )}
      <View style={styles.rowText}>
        <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
          {label}
        </Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      {selected && (
        <Icon source="check-circle" size={22} color={colors.primary} />
      )}
    </Pressable>
  );
}

function colorSwatch(color: CustomHoleTee['color']): string {
  return CUSTOM_TEE_COLORS.find((c) => c.key === color)?.swatch ?? '#9E9E9E';
}

function colorLabel(color: CustomHoleTee['color']): string {
  return (
    CUSTOM_TEE_COLORS.find((c) => c.key === color)?.label ??
    color.charAt(0).toUpperCase() + color.slice(1)
  );
}

export function TeeOverrideSheet({
  visible,
  onClose,
  currentSelection,
  hasBackTee,
  hasFrontTee,
  backTeeColor,
  frontTeeColor,
  customTees = [],
  onSelect,
  onAddCustom,
}: TeeOverrideSheetProps) {
  const colors = useThemeColors();

  const handleSelect = (selection: TeeOverride) => {
    onSelect(selection);
    onClose();
  };

  // Sheet height grows with the number of custom tees + the optional
  // "Add custom" row, so users always see all options without scrolling.
  const baseHeight = 0.42;
  const extraRows = customTees.length + (onAddCustom ? 1 : 0);
  const sheetHeight = Math.min(0.85, baseHeight + extraRows * 0.08);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={sheetHeight}
      title="Set tee origin"
      showCloseButton
      useModal
    >
      <View style={styles.content}>
        <Text style={[typography.body, styles.intro, { color: colors.textSecondary }]}>
          Pick the tee box you played from on this hole. Shot 1's distance is
          measured from here.
        </Text>

        <OptionRow
          label={
            backTeeColor?.label
              ? `${backTeeColor.label} tee (back)`
              : 'Back tee'
          }
          description={
            hasBackTee
              ? backTeeColor?.teeName
                ? `${backTeeColor.teeName} — longest yardage.`
                : 'Default — longest yardage.'
              : 'No back tee data for this hole.'
          }
          selected={currentSelection === 'back'}
          disabled={!hasBackTee}
          onPress={() => handleSelect('back')}
          swatchColor={backTeeColor?.swatch ?? undefined}
          testID="tee-override-row-back"
        />

        <OptionRow
          label={
            frontTeeColor?.label
              ? `${frontTeeColor.label} tee (front)`
              : 'Front tee'
          }
          description={
            hasFrontTee
              ? frontTeeColor?.teeName
                ? `${frontTeeColor.teeName} — shortest yardage.`
                : 'Forward tees — shorter yardage.'
              : 'No front tee data for this hole.'
          }
          selected={currentSelection === 'front'}
          disabled={!hasFrontTee}
          onPress={() => handleSelect('front')}
          swatchColor={frontTeeColor?.swatch ?? undefined}
          testID="tee-override-row-front"
        />

        {customTees.map((tee) => (
          <OptionRow
            key={tee.id}
            label={`${colorLabel(tee.color)} tee`}
            description="Custom tee — added by you."
            selected={currentSelection === tee.id}
            disabled={false}
            onPress={() => handleSelect(tee.id)}
            swatchColor={colorSwatch(tee.color)}
            testID={`tee-override-row-custom-${tee.id}`}
          />
        ))}

        {onAddCustom && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add another tee box"
            onPress={() => {
              onClose();
              onAddCustom();
            }}
            testID="tee-override-row-add-custom"
            style={({ pressed }) => [
              styles.addRow,
              {
                borderColor: colors.borderLight,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon source="plus-circle-outline" size={22} color={colors.primary} />
            <Text style={[typography.bodyBold, { color: colors.primary }]}>
              Add another tee box
            </Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  intro: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    minHeight: 64,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    minHeight: 56,
  },
});
