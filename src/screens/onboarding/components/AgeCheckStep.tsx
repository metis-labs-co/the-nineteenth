/**
 * AgeCheckStep - resolves the user's age band during onboarding.
 *
 * Tries the platform signal (Apple's Declared Age Range / Play Age Signals)
 * first and falls back to a date-of-birth picker when that yields nothing —
 * which is every iOS below 26, web, and anyone who declines.
 *
 * The date of birth lives in component state only. It is classified to a band
 * and discarded; it is never persisted, logged, or sent anywhere.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';

import { OnboardingCard } from './OnboardingCard';
import { DatePicker } from '@/components/common/DatePicker';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { classifyDateOfBirth, resolveAgeStatus } from '@/services/age';
import { useSetAgeStatus } from '@/hooks/useSetAgeStatus';
import { parseDateInput } from '@/utils/formatting';
import type { StepProps } from '../OnboardingScreen';

export function AgeCheckStep({ onNext, isActive }: StepProps) {
  const colors = useThemeColors();
  const { setStatus } = useSetAgeStatus();
  const [needsDob, setNeedsDob] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // DOB lives here and nowhere else.
  const [dob, setDob] = useState('');
  const hasRun = useRef(false);

  // ⚠️ Fires when this card BECOMES ACTIVE, never on mount. OnboardingScreen
  // renders every step eagerly (FlatList data={STEPS}, default
  // initialNumToRender of 10), so a mount effect would pop the system age sheet
  // while the user is still on the Name card. The ref guard keeps it to a
  // single prompt even if isActive flickers.
  useEffect(() => {
    if (!isActive || hasRun.current) return;
    hasRun.current = true;

    let cancelled = false;
    (async () => {
      const status = await resolveAgeStatus();
      if (cancelled) return;

      if (status === 'unknown') {
        setNeedsDob(true);
        return;
      }

      try {
        await setStatus(status, 'declared_age_range');
        if (!cancelled) onNext();
      } catch {
        // Could not persist — fall back to asking, rather than silently
        // leaving the user unresolved with social features off.
        if (!cancelled) setNeedsDob(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, setStatus, onNext]);

  const handleConfirmDob = useCallback(async () => {
    const parsed = parseDateInput(dob);
    if (!parsed) {
      setError('Enter your date of birth as DD/MM/YYYY.');
      return;
    }

    const band = classifyDateOfBirth(parsed);
    if (band === 'unknown') {
      setError('That date does not look right. Check and try again.');
      return;
    }

    setError(null);
    setIsBusy(true);
    try {
      await setStatus(band, 'self_declared');
      onNext();
    } catch {
      setError('Could not save that just now. You can confirm your age later in Settings.');
    } finally {
      setIsBusy(false);
    }
  }, [dob, setStatus, onNext]);

  if (!needsDob) {
    return (
      <OnboardingCard
        illustration={<Icon source="shield-account" size={64} color={colors.primary} />}
        title="Checking your age"
        description="One moment — we're confirming your age range with your device."
      />
    );
  }

  return (
    <OnboardingCard
      illustration={<Icon source="shield-account" size={64} color={colors.primary} />}
      title="Your date of birth"
      description="We ask so social features stay age-appropriate. We only store whether you're over 13 — never your date of birth."
      actions={
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleConfirmDob}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Confirm date of birth"
        >
          <Text style={{ ...typography.bodyBold, color: colors.white }}>
            {isBusy ? 'Saving…' : 'Continue'}
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.field}>
        <DatePicker
          value={dob}
          onChange={setDob}
          mode="date"
          label="Date of birth"
          placeholder="DD/MM/YYYY"
          maximumDate={new Date()}
          error={error ?? undefined}
        />
      </View>
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  field: {
    marginTop: spacing.lg,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    gap: spacing.sm,
  },
});
