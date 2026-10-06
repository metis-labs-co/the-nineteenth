/**
 * EditCompetitionRulesSheet
 *
 * Organiser-facing editor for the competition's `point_system`. Two modes:
 *
 *   Quick setup — pick a 1st-place value + decay model. Positions 2..N are
 *                 auto-computed via src/utils/competitionPoints/decay.ts.
 *                 Fast path for most organisers.
 *
 *   Custom      — per-position numeric inputs. Full control for anyone who
 *                 wants a bespoke point allocation.
 *
 * Match-play win/draw/loss points are edited alongside the position points
 * in both modes. Save writes a fresh `PointSystemConfig` to
 * competitions.point_system via useUpdateCompetitionField.
 *
 * Scope: 8 positions, match-play integers. Schema allows more but the
 * built-in Standard preset is 8 and that's enough for every current
 * competition format. Extend to `positions` prop when needed.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { SheetFooterActions } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import {
  DECAY_MODELS,
  applyDecayModel,
  type DecayModelId,
} from '@/utils/competitionPoints';
import type { PointSystemConfig } from '@/types/database.types';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

const POSITION_COUNT = 8;
const MAX_POSITION_VALUE = 100;
const MIN_POSITION_VALUE = 0;

type Mode = 'quick' | 'custom';

export interface EditCompetitionRulesSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentPointSystem: PointSystemConfig | null;
}

/**
 * Legacy helper kept for SettingsSection. Reports whether the saved config
 * matches the baked-in Standard preset — the row label reads "Standard" or
 * "Custom" based on this. Unused by the editor itself.
 */
export function detectActivePreset(
  config: PointSystemConfig | null
): 'standard' | null {
  if (!config) return null;
  const STANDARD_RULES: Record<string, number> = {
    '1': 10,
    '2': 8,
    '3': 6,
    '4': 5,
    '5': 4,
    '6': 3,
    '7': 2,
    '8': 1,
    default: 0,
  };
  const rulesMatch = (a: Record<string, number>, b: Record<string, number>) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (a[k] !== b[k]) return false;
    return true;
  };
  const mp = config.matchPlay;
  const matchPlayMatches = !!mp && mp.win === 3 && mp.draw === 1 && mp.loss === 0;
  return rulesMatch(config.rules, STANDARD_RULES) && matchPlayMatches ? 'standard' : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function extractPositionValues(
  rules: Record<string, number> | undefined,
  count: number
): number[] {
  const out: number[] = [];
  for (let i = 1; i <= count; i++) {
    out.push(rules?.[i.toString()] ?? 0);
  }
  return out;
}

/** Convert the editor state back into a PointSystemConfig we can save. */
function buildConfig(
  positionValues: number[],
  matchPlay: { win: number; draw: number; loss: number }
): PointSystemConfig {
  const rules: Record<string, number> = { default: 0 };
  positionValues.forEach((v, i) => {
    rules[(i + 1).toString()] = Math.max(0, Math.round(v));
  });
  return {
    type: 'position',
    rules,
    matchPlay: {
      win: Math.max(0, Math.round(matchPlay.win)),
      draw: Math.max(0, Math.round(matchPlay.draw)),
      loss: Math.max(0, Math.round(matchPlay.loss)),
    },
  };
}

function clampPositionValue(raw: string): number {
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(MAX_POSITION_VALUE, Math.max(MIN_POSITION_VALUE, parsed));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditCompetitionRulesSheet({
  visible,
  onDismiss,
  competitionId,
  currentPointSystem,
}: EditCompetitionRulesSheetProps) {
  const colors = useThemeColors();

  // Mode defaults to quick. We don't try to reverse-engineer the decay model
  // from the saved values — the user picks whichever they want to start
  // from and the preview fills in immediately.
  const [mode, setMode] = useState<Mode>('quick');

  const initialPositions = useMemo(
    () => extractPositionValues(currentPointSystem?.rules, POSITION_COUNT),
    [currentPointSystem]
  );
  const initialTopValue = initialPositions[0] ?? 10;

  const initialMatchPlay = useMemo(
    () => ({
      win: currentPointSystem?.matchPlay?.win ?? 3,
      draw: currentPointSystem?.matchPlay?.draw ?? 1,
      loss: currentPointSystem?.matchPlay?.loss ?? 0,
    }),
    [currentPointSystem]
  );

  // Quick-setup state
  const [topValue, setTopValue] = useState<number>(initialTopValue);
  const [decayModel, setDecayModel] = useState<DecayModelId>('scaled_standard');

  // Custom-mode state (position values 1..N)
  const [customValues, setCustomValues] = useState<number[]>(initialPositions);

  // Match-play state (shared between modes)
  const [matchPlay, setMatchPlay] = useState(initialMatchPlay);

  // Reset state when the sheet re-opens — otherwise stale data survives a close/reopen.
  useEffect(() => {
    if (visible) {
      setTopValue(initialTopValue);
      setDecayModel('scaled_standard');
      setCustomValues(initialPositions);
      setMatchPlay(initialMatchPlay);
      setMode('quick');
    }
  }, [visible, initialTopValue, initialPositions, initialMatchPlay]);

  // Live preview for Quick mode. Custom mode reads customValues directly.
  const quickPreview = useMemo(
    () => applyDecayModel(decayModel, topValue, POSITION_COUNT),
    [decayModel, topValue]
  );

  const effectivePositions = mode === 'quick' ? quickPreview : customValues;

  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSave = useCallback(() => {
    const config = buildConfig(effectivePositions, matchPlay);
    mutate({ point_system: config });
  }, [effectivePositions, matchPlay, mutate]);

  const handleTopValueChange = useCallback((raw: string) => {
    setTopValue(clampPositionValue(raw));
  }, []);

  const handleCustomChange = useCallback((index: number, raw: string) => {
    setCustomValues((prev) => {
      const next = [...prev];
      next[index] = clampPositionValue(raw);
      return next;
    });
  }, []);

  const handleMatchPlayChange = useCallback(
    (field: 'win' | 'draw' | 'loss', raw: string) => {
      setMatchPlay((prev) => ({ ...prev, [field]: clampPositionValue(raw) }));
    },
    []
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="General Rules"
      height={0.92}
      useModal
      testID="edit-competition-rules-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Points awarded to each finishing position. Applies to every round unless
          per-round rules are enabled.
        </Text>

        <SegmentedButton<Mode>
          value={mode}
          onValueChange={setMode}
          buttons={[
            { value: 'quick', label: 'Quick setup', icon: 'flash' },
            { value: 'custom', label: 'Custom', icon: 'pencil-outline' },
          ]}
          style={styles.modeToggle}
        />

        {mode === 'quick' ? (
          <QuickSetup
            topValue={topValue}
            decayModel={decayModel}
            preview={quickPreview}
            onTopValueChange={handleTopValueChange}
            onDecayModelChange={setDecayModel}
            disabled={isPending}
          />
        ) : (
          <CustomEditor
            values={customValues}
            onChange={handleCustomChange}
            disabled={isPending}
          />
        )}

        {/* Match-play inputs (shared) */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginTop: spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.cardHeader,
              { borderBottomColor: colors.border, backgroundColor: colors.surfaceVariant },
            ]}
          >
            <Icon source="sword-cross" size={18} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.textPrimary }]}>
              Match Play
            </Text>
          </View>
          <MatchPlayRow
            label="Win"
            value={matchPlay.win}
            onChange={(v) => handleMatchPlayChange('win', v)}
            disabled={isPending}
            divider
          />
          <MatchPlayRow
            label="Draw"
            value={matchPlay.draw}
            onChange={(v) => handleMatchPlayChange('draw', v)}
            disabled={isPending}
            divider
          />
          <MatchPlayRow
            label="Loss"
            value={matchPlay.loss}
            onChange={(v) => handleMatchPlayChange('loss', v)}
            disabled={isPending}
          />
        </View>
      </ScrollView>

      <SheetFooterActions onCancel={onDismiss} onSave={handleSave} saving={isPending} />
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface QuickSetupProps {
  topValue: number;
  decayModel: DecayModelId;
  preview: number[];
  onTopValueChange: (raw: string) => void;
  onDecayModelChange: (id: DecayModelId) => void;
  disabled: boolean;
}

function QuickSetup({
  topValue,
  decayModel,
  preview,
  onTopValueChange,
  onDecayModelChange,
  disabled,
}: QuickSetupProps) {
  const colors = useThemeColors();
  const activeModel = DECAY_MODELS.find((m) => m.id === decayModel);

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.md },
        ]}
      >
        <View
          style={[
            styles.cardHeader,
            { borderBottomColor: colors.border, backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Icon source="trophy-outline" size={18} color={colors.primary} />
          <Text style={[styles.cardHeaderText, { color: colors.textPrimary }]}>
            1st Place
          </Text>
        </View>
        <View style={styles.topValueRow}>
          <Text style={[styles.topValueLabel, { color: colors.textPrimary }]}>
            Points for 1st
          </Text>
          <TextInput
            style={[
              styles.numericInput,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceVariant,
              },
            ]}
            keyboardType="number-pad"
            value={String(topValue)}
            onChangeText={onTopValueChange}
            editable={!disabled}
            maxLength={3}
            selectTextOnFocus
          />
        </View>
      </View>

      <View style={styles.sectionLabelRow}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Decay Model
        </Text>
      </View>
      {DECAY_MODELS.map((model) => (
        <TouchableOpacity
          key={model.id}
          style={[
            styles.modelRow,
            {
              borderColor: decayModel === model.id ? colors.primary : colors.border,
              backgroundColor:
                decayModel === model.id ? colors.surfaceVariant : colors.surface,
            },
          ]}
          onPress={() => onDecayModelChange(model.id)}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ selected: decayModel === model.id }}
        >
          <View
            style={[
              styles.radio,
              {
                borderColor: decayModel === model.id ? colors.primary : colors.gray400,
                backgroundColor: decayModel === model.id ? colors.primary : 'transparent',
              },
            ]}
          >
            {decayModel === model.id && (
              <Icon source="check" size={12} color={colors.white} />
            )}
          </View>
          <View style={styles.modelText}>
            <Text style={[styles.modelTitle, { color: colors.textPrimary }]}>
              {model.title}
            </Text>
            <Text
              style={[styles.modelSummary, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {model.summary}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Live preview */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.md },
        ]}
      >
        <View
          style={[
            styles.cardHeader,
            { borderBottomColor: colors.border, backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Icon source="eye-outline" size={18} color={colors.primary} />
          <Text style={[styles.cardHeaderText, { color: colors.textPrimary }]}>
            Preview — {activeModel?.title ?? ''}
          </Text>
        </View>
        {preview.map((points, i) => (
          <View
            key={i}
            style={[
              styles.previewRow,
              i < preview.length - 1 && {
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
              },
            ]}
          >
            <Text style={[styles.previewLabel, { color: colors.textPrimary }]}>
              {ordinal(i + 1)}
            </Text>
            <Text style={[styles.previewValue, { color: colors.textPrimary }]}>
              {points} {points === 1 ? 'pt' : 'pts'}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

interface CustomEditorProps {
  values: number[];
  onChange: (index: number, raw: string) => void;
  disabled: boolean;
}

function CustomEditor({ values, onChange, disabled }: CustomEditorProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.md },
      ]}
    >
      <View
        style={[
          styles.cardHeader,
          { borderBottomColor: colors.border, backgroundColor: colors.surfaceVariant },
        ]}
      >
        <Icon source="podium" size={18} color={colors.primary} />
        <Text style={[styles.cardHeaderText, { color: colors.textPrimary }]}>
          Position Points
        </Text>
      </View>
      {values.map((value, i) => (
        <View
          key={i}
          style={[
            styles.customRow,
            i < values.length - 1 && {
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            },
          ]}
        >
          <Text style={[styles.customLabel, { color: colors.textPrimary }]}>
            {ordinal(i + 1)}
          </Text>
          <TextInput
            style={[
              styles.numericInputCompact,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.surfaceVariant,
              },
            ]}
            keyboardType="number-pad"
            value={String(value)}
            onChangeText={(raw) => onChange(i, raw)}
            editable={!disabled}
            maxLength={3}
            selectTextOnFocus
          />
        </View>
      ))}
    </View>
  );
}

interface MatchPlayRowProps {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  disabled: boolean;
  divider?: boolean;
}

function MatchPlayRow({ label, value, onChange, disabled, divider }: MatchPlayRowProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.customRow,
        divider && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <Text style={[styles.customLabel, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        style={[
          styles.numericInputCompact,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surfaceVariant,
          },
        ]}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={onChange}
        editable={!disabled}
        maxLength={3}
        selectTextOnFocus
      />
    </View>
  );
}

export default EditCompetitionRulesSheet;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: {
    padding: spacing.lg,
  },
  intro: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  modeToggle: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  cardHeaderText: {
    ...typography.bodyBold,
  },
  topValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topValueLabel: {
    ...typography.body,
  },
  numericInput: {
    minWidth: 72,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    textAlign: 'right',
    ...typography.bodyBold,
  },
  numericInputCompact: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    textAlign: 'right',
    ...typography.bodyBold,
  },
  sectionLabelRow: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelText: {
    flex: 1,
  },
  modelTitle: {
    ...typography.bodyBold,
  },
  modelSummary: {
    ...typography.caption,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewLabel: {
    ...typography.body,
  },
  previewValue: {
    ...typography.bodyBold,
  },
  customRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customLabel: {
    ...typography.body,
  },
});
