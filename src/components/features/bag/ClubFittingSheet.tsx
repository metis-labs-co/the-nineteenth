/**
 * Per-club fitting editor. Opens when the user taps a club chip on
 * WhatsInTheBagScreen. Captures brand, model, loft, lie, shaft details, and
 * notes. For irons, offers a "Copy to other irons" section so users can fill
 * a matching 5-PW set in one go.
 *
 * Saves are split across two mutations:
 *   - useUpdateClubFitting for the focused club
 *   - useApplyFittingToClubs for any copy targets (only non-null fields are
 *     copied so per-club lofts / lies are preserved)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormInput, FormSection, SegmentedButton, SystemModalTheme } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { CLUBS_BY_KEY, isIronKey, type ClubKey } from '@/constants/clubs';
import {
  SHAFT_FLEXES,
  SHAFT_FLEX_LABELS,
  clubKeyLabel,
  countFilledFields,
  otherIronsInBag,
  type ClubFitting,
  type ShaftFlex,
} from '@/utils/clubFitting';
import { clubFittingSchema, type ClubFittingInput } from '@/schemas/clubFitting';
import {
  useApplyFittingToClubs,
  useUpdateClubFitting,
  type BagEntry,
} from '@/hooks/queries/useBag';

interface ClubFittingSheetProps {
  visible: boolean;
  /** The currently-focused club. Null when the sheet is hidden. */
  clubKey: ClubKey | null;
  /** The existing fitting (or empty defaults). */
  initial: ClubFitting;
  /** The user's id — passed to the save mutations. */
  playerId: string;
  /** Full bag (for the "copy to other irons" picker). */
  bag: readonly ClubKey[];
  /** Existing details for the bag — used to seed copy-target defaults. */
  bagDetails: readonly BagEntry[];
  onClose: () => void;
}

interface FormState {
  brand: string;
  model: string;
  loftDegrees: string;
  lieAngleDegrees: string;
  shaftBrand: string;
  shaftModel: string;
  shaftFlex: ShaftFlex | null;
  shaftLengthInches: string;
  notes: string;
}

function fittingToForm(f: ClubFitting): FormState {
  return {
    brand: f.brand ?? '',
    model: f.model ?? '',
    loftDegrees: f.loftDegrees != null ? String(f.loftDegrees) : '',
    lieAngleDegrees: f.lieAngleDegrees != null ? String(f.lieAngleDegrees) : '',
    shaftBrand: f.shaftBrand ?? '',
    shaftModel: f.shaftModel ?? '',
    shaftFlex: f.shaftFlex,
    shaftLengthInches: f.shaftLengthInches != null ? String(f.shaftLengthInches) : '',
    notes: f.notes ?? '',
  };
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formToInput(form: FormState): ClubFittingInput {
  return {
    brand: form.brand,
    model: form.model,
    loftDegrees: parseNumber(form.loftDegrees),
    lieAngleDegrees: parseNumber(form.lieAngleDegrees),
    shaftBrand: form.shaftBrand,
    shaftModel: form.shaftModel,
    shaftFlex: form.shaftFlex,
    shaftLengthInches: parseNumber(form.shaftLengthInches),
    notes: form.notes,
  } as ClubFittingInput;
}

const SHAFT_FLEX_OPTIONS = SHAFT_FLEXES.map((v) => ({
  value: v,
  label: v,
}));

export function ClubFittingSheet({
  visible,
  clubKey,
  initial,
  playerId,
  bag,
  bagDetails,
  onClose,
}: ClubFittingSheetProps) {
  const colors = useThemeColors();
  const [form, setForm] = useState<FormState>(() => fittingToForm(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [copyTargets, setCopyTargets] = useState<Set<ClubKey>>(() => new Set());

  const updateFitting = useUpdateClubFitting();
  const applyToClubs = useApplyFittingToClubs();
  const saving = updateFitting.isPending || applyToClubs.isPending;

  // Reset local state every time the sheet opens or the focused club changes.
  useEffect(() => {
    if (visible) {
      setForm(fittingToForm(initial));
      setErrors({});
      setCopyTargets(new Set());
    }
  }, [visible, initial, clubKey]);

  const ironTargets = useMemo<ClubKey[]>(() => {
    if (!clubKey || !isIronKey(clubKey)) return [];
    return otherIronsInBag(bag, clubKey);
  }, [bag, clubKey]);

  const filledCount = useMemo(
    () => countFilledFields(formToInput(form) as ClubFitting),
    [form]
  );

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const toggleTarget = useCallback((target: ClubKey) => {
    setCopyTargets((prev) => {
      const next = new Set(prev);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  }, []);

  const selectAllIrons = useCallback(() => {
    setCopyTargets(new Set(ironTargets));
  }, [ironTargets]);

  const clearTargets = useCallback(() => {
    setCopyTargets(new Set());
  }, []);

  const handleSave = useCallback(async () => {
    if (!clubKey) return;
    const parsed = clubFittingSchema.safeParse(formToInput(form));
    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string') {
          next[path as keyof FormState] = issue.message;
        }
      }
      setErrors(next);
      return;
    }
    const fitting: ClubFitting = parsed.data as ClubFitting;
    try {
      await updateFitting.mutateAsync({ playerId, clubKey, fitting });
      if (copyTargets.size > 0) {
        await applyToClubs.mutateAsync({
          playerId,
          source: fitting,
          targets: Array.from(copyTargets),
        });
      }
      onClose();
    } catch {
      // Mutation hooks already rolled back any optimistic updates.
      // Leaving the sheet open so the user can retry; no UI error toast yet.
    }
  }, [clubKey, form, playerId, updateFitting, applyToClubs, copyTargets, onClose]);

  if (!clubKey) {
    return null;
  }

  const club = CLUBS_BY_KEY[clubKey];
  const showCopySection = isIronKey(clubKey) && ironTargets.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={saving ? undefined : onClose}
      transparent={false}
    >
      <SystemModalTheme>
        <SafeAreaView
          edges={['top', 'bottom']}
          style={[styles.flex, { backgroundColor: colors.background }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onClose}
              disabled={saving}
              hitSlop={12}
              style={styles.cancelHit}
            >
              <Text
                style={[
                  typography.body,
                  { color: saving ? colors.textTertiary : colors.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text
                style={[typography.h3, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {club.label}
              </Text>
              <Text
                style={[
                  typography.caption,
                  styles.subtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {filledCount === 0
                  ? 'Add fitting details'
                  : `${filledCount} detail${filledCount === 1 ? '' : 's'} filled`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save fitting details"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={handleSave}
              hitSlop={12}
              style={styles.saveHit}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color: saving ? colors.textTertiary : colors.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
            >
              <FormSection
                title="Brand & Model"
                description="Manufacturer and specific model name."
              >
                <FormInput
                  label="Brand"
                  value={form.brand}
                  onChangeText={(v) => setField('brand', v)}
                  placeholder="e.g. TaylorMade"
                  autoCapitalize="words"
                  error={errors.brand}
                  maxLength={120}
                />
                <FormInput
                  label="Model"
                  value={form.model}
                  onChangeText={(v) => setField('model', v)}
                  placeholder="e.g. Stealth 2"
                  autoCapitalize="words"
                  error={errors.model}
                  maxLength={120}
                />
              </FormSection>

              <FormSection
                title="Loft & Lie"
                description="Loft is most useful for drivers, woods, hybrids and wedges. Lie is most useful for irons."
              >
                <FormInput
                  label="Loft (°)"
                  value={form.loftDegrees}
                  onChangeText={(v) => setField('loftDegrees', v)}
                  placeholder="e.g. 10.5"
                  keyboardType="decimal"
                  error={errors.loftDegrees}
                />
                <FormInput
                  label="Lie angle (°)"
                  value={form.lieAngleDegrees}
                  onChangeText={(v) => setField('lieAngleDegrees', v)}
                  placeholder="e.g. 62.5"
                  keyboardType="decimal"
                  error={errors.lieAngleDegrees}
                />
              </FormSection>

              <FormSection title="Shaft" description="Aftermarket or stock shaft fitting.">
                <FormInput
                  label="Shaft brand"
                  value={form.shaftBrand}
                  onChangeText={(v) => setField('shaftBrand', v)}
                  placeholder="e.g. Mitsubishi"
                  autoCapitalize="words"
                  error={errors.shaftBrand}
                  maxLength={120}
                />
                <FormInput
                  label="Shaft model"
                  value={form.shaftModel}
                  onChangeText={(v) => setField('shaftModel', v)}
                  placeholder="e.g. Tensei AV Blue"
                  autoCapitalize="words"
                  error={errors.shaftModel}
                  maxLength={120}
                />
                <Text
                  style={[
                    typography.smallBold,
                    styles.flexLabel,
                    { color: colors.textPrimary },
                  ]}
                >
                  Flex
                </Text>
                <SegmentedButton<ShaftFlex>
                  value={form.shaftFlex ?? ('' as ShaftFlex)}
                  onValueChange={(v) =>
                    setField('shaftFlex', form.shaftFlex === v ? null : v)
                  }
                  buttons={SHAFT_FLEX_OPTIONS}
                  size="small"
                />
                <Text
                  style={[
                    typography.caption,
                    styles.flexHint,
                    { color: colors.textSecondary },
                  ]}
                >
                  {form.shaftFlex
                    ? `${SHAFT_FLEX_LABELS[form.shaftFlex]} — tap again to clear`
                    : 'Optional. Tap a flex to set, tap again to clear.'}
                </Text>
                <FormInput
                  label="Shaft length (inches)"
                  value={form.shaftLengthInches}
                  onChangeText={(v) => setField('shaftLengthInches', v)}
                  placeholder="e.g. 45.5"
                  keyboardType="decimal"
                  error={errors.shaftLengthInches}
                  containerStyle={styles.lengthInput}
                />
              </FormSection>

              <FormSection
                title="Notes"
                description="Grip, swing weight, fitting date — whatever's helpful."
              >
                <FormInput
                  label="Notes"
                  value={form.notes}
                  onChangeText={(v) => setField('notes', v)}
                  placeholder="e.g. Golf Pride MCC +4, swing weight D2"
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  error={errors.notes}
                />
              </FormSection>

              {showCopySection && (
                <FormSection
                  title="Copy to other irons"
                  description="Tick the irons that share these settings. Empty fields above won't overwrite anything — per-club lofts and lies are preserved."
                >
                  <View style={styles.copyActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Select all irons"
                      onPress={selectAllIrons}
                      style={[
                        styles.copyActionButton,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.textPrimary, fontWeight: '600' },
                        ]}
                      >
                        Select all
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear copy selection"
                      onPress={clearTargets}
                      disabled={copyTargets.size === 0}
                      style={[
                        styles.copyActionButton,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderColor: colors.border,
                          opacity: copyTargets.size === 0 ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: colors.textPrimary, fontWeight: '600' },
                        ]}
                      >
                        Clear
                      </Text>
                    </Pressable>
                  </View>
                  <View style={[styles.targetList, { backgroundColor: colors.surface }]}>
                    {ironTargets.map((target, idx) => {
                      const checked = copyTargets.has(target);
                      const targetDetails = bagDetails.find((e) => e.clubKey === target);
                      const targetSummary =
                        targetDetails &&
                        (targetDetails.brand || targetDetails.shaftFlex)
                          ? `${targetDetails.brand ?? ''}${
                              targetDetails.brand && targetDetails.shaftFlex ? ' · ' : ''
                            }${
                              targetDetails.shaftFlex
                                ? SHAFT_FLEX_LABELS[targetDetails.shaftFlex]
                                : ''
                            }`.trim()
                          : null;
                      return (
                        <Pressable
                          key={target}
                          accessibilityRole="checkbox"
                          accessibilityLabel={clubKeyLabel(target)}
                          accessibilityState={{ checked }}
                          onPress={() => toggleTarget(target)}
                          style={[
                            styles.targetRow,
                            idx > 0 && {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: checked ? colors.primary : colors.border,
                                backgroundColor: checked
                                  ? colors.primary
                                  : 'transparent',
                              },
                            ]}
                          >
                            {checked && (
                              <Icon source="check" size={14} color={colors.white} />
                            )}
                          </View>
                          <View style={styles.targetText}>
                            <Text
                              style={[typography.body, { color: colors.textPrimary }]}
                            >
                              {clubKeyLabel(target)}
                            </Text>
                            {targetSummary && (
                              <Text
                                style={[
                                  typography.caption,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Currently: {targetSummary}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </FormSection>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SystemModalTheme>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelHit: {
    minWidth: 60,
  },
  saveHit: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: 2,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  flexLabel: {
    marginBottom: spacing.xs,
  },
  flexHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  lengthInput: {
    marginBottom: 0,
  },
  copyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  copyActionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetList: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: 48,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetText: {
    flex: 1,
  },
});
