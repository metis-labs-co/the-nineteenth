import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useBiometricSetting } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import { biometricService } from '@/services/biometric';
import type { BiometricAvailability } from '@/services/biometric';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common';
import { SettingRow } from './components';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();

  const { biometricEnabled, setBiometricEnabled } = useBiometricSetting();
  const [biometricAvailability, setBiometricAvailability] = useState<BiometricAvailability | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    biometricService.checkAvailability().then(setBiometricAvailability);
  }, []);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      if (value) {
        const result = await biometricService.authenticate(
          'Confirm your identity to enable biometric lock'
        );
        if (result.success) {
          if (session?.refresh_token) {
            await biometricService.storeRefreshToken(session.refresh_token);
          }
          setBiometricEnabled(true);
        }
      } else {
        await biometricService.clearStoredRefreshToken();
        setBiometricEnabled(false);
      }
    } finally {
      setIsToggling(false);
    }
  }, [session, setBiometricEnabled, isToggling]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const biometricType = biometricAvailability?.biometricType;
  const isFacial = biometricType === 'facial';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Security"
        showBack
        onBack={handleBack}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        {biometricAvailability?.isAvailable ? (
          <View style={styles.section}>
            <SectionHeader title="Biometric Authentication" description="Protect access to your account" />
            <View
              style={[styles.settingsGroup, { backgroundColor: colors.surface }]}
              pointerEvents={isToggling ? 'none' : 'auto'}
            >
              <SettingRow
                icon={isFacial ? 'face-recognition' : 'fingerprint'}
                label={isFacial ? 'Face ID' : 'Fingerprint Lock'}
                description="Require biometric authentication to open the app"
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                colors={colors}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.unavailableContainer, { backgroundColor: colors.surface }]}>
            <Icon source="shield-off-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.unavailableTitle, { color: colors.textPrimary }]}>
              Biometric Authentication Unavailable
            </Text>
            <Text style={[styles.unavailableDescription, { color: colors.textSecondary }]}>
              Your device does not support biometric authentication, or it has not been set up in your device settings.
            </Text>
          </View>
        )}

        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            When enabled, you will be asked to authenticate using {isFacial ? 'Face ID' : 'your fingerprint'} each time you open the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  settingsGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  unavailableContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  unavailableTitle: {
    ...typography.h4,
    textAlign: 'center',
  },
  unavailableDescription: {
    ...typography.body,
    textAlign: 'center',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
  },
});
