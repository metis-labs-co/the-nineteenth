/**
 * PrivacyDataScreen - Privacy & Data management hub
 *
 * Provides GDPR Article 15-20 functionality:
 * - Download personal data (Article 20 - Data Portability)
 * - Delete account (Article 17 - Right to Erasure)
 * - Link to Privacy Policy
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { useConfirmationDialog } from '@/hooks/useConfirmationDialog';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { useDataExport } from '@/hooks/useDataExport';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PRIVACY_POLICY_URL, PRIVACY_EMAIL } from '@/constants/app';

export default function PrivacyDataScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { dialogConfig, showDialog, dismissDialog } = useConfirmationDialog();
  const { deleteAccount, isDeleting } = useAccountDeletion();
  const { exportData, isExporting } = useDataExport();

  // Second confirmation state (type DELETE)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const handleExportData = useCallback(async () => {
    try {
      await exportData();
    } catch (error) {
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Failed to export data. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [exportData]);

  const handleDeleteAccount = useCallback(() => {
    showDialog({
      title: 'Delete Your Account?',
      message:
        'This will permanently delete your account and all personal data. ' +
        'Historical scores will be anonymised to preserve competition records. ' +
        'This action cannot be undone.',
      confirmLabel: 'Continue',
      confirmVariant: 'destructive',
      icon: 'alert-circle-outline',
      onConfirm: () => {
        dismissDialog();
        setShowDeleteConfirm(true);
        setDeleteInput('');
      },
    });
  }, [showDialog, dismissDialog]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteInput !== 'DELETE') return;

    try {
      await deleteAccount();
      // On success, auth state change will navigate to login
    } catch (error) {
      setShowDeleteConfirm(false);
      Alert.alert(
        'Deletion Failed',
        error instanceof Error ? error.message : 'Failed to delete account. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [deleteInput, deleteAccount]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Privacy & Data"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Icon source="shield-check" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You have the right to access, export, and delete your personal data at any time.
            We comply with the Australian Privacy Act, GDPR, and UK GDPR.
          </Text>
        </View>

        {/* Your Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Your Data
          </Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
            {/* Download Data */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleExportData}
              disabled={isExporting}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Icon source="download" size={24} color={colors.primary} />
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    Download My Data
                  </Text>
                  <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                    Export all your data as JSON
                  </Text>
                </View>
              </View>
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon source="chevron-right" size={20} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Icon source="delete-forever" size={24} color={colors.error} />
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: colors.error }]}>
                    Delete Account
                  </Text>
                  <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                    Permanently delete your account and data
                  </Text>
                </View>
              </View>
              <Icon source="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Privacy
          </Text>
          <View style={[styles.menuGroup, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Icon source="file-document-outline" size={24} color={colors.textSecondary} />
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    Privacy Policy
                  </Text>
                </View>
              </View>
              <Icon source="open-in-new" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL(`mailto:${PRIVACY_EMAIL}`)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Icon source="email-outline" size={24} color={colors.textSecondary} />
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                    Privacy Inquiries
                  </Text>
                  <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                    {PRIVACY_EMAIL}
                  </Text>
                </View>
              </View>
              <Icon source="open-in-new" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* First confirmation dialog */}
      <ConfirmationDialog
        {...dialogConfig}
        onCancel={dismissDialog}
        loading={isDeleting}
      />

      {/* Second confirmation: type DELETE */}
      {showDeleteConfirm && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.deleteConfirmCard, { backgroundColor: colors.surface }, shadows.lg]}>
            <Icon source="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.deleteConfirmTitle, { color: colors.textPrimary }]}>
              Final Confirmation
            </Text>
            <Text style={[styles.deleteConfirmMessage, { color: colors.textSecondary }]}>
              Type <Text style={{ fontWeight: '700', color: colors.error }}>DELETE</Text> to permanently delete your account.
            </Text>
            <TextInput
              style={[
                styles.deleteInput,
                {
                  color: colors.textPrimary,
                  borderColor: deleteInput === 'DELETE' ? colors.error : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={deleteInput}
              onChangeText={setDeleteInput}
              placeholder="Type DELETE"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.borderStrong }]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                <Text style={[styles.deleteConfirmButtonText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  {
                    backgroundColor: deleteInput === 'DELETE' ? colors.error : colors.surfaceVariant,
                    opacity: deleteInput === 'DELETE' ? 1 : 0.5,
                  },
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteInput !== 'DELETE' || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.textOnColored} />
                ) : (
                  <Text style={[styles.deleteConfirmButtonText, { color: deleteInput === 'DELETE' ? colors.textOnColored : colors.textDisabled }]}>
                    Delete Forever
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    paddingBottom: spacing.xxxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  infoText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  menuGroup: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    ...typography.body,
  },
  menuItemSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  // Delete confirmation overlay
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteConfirmCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  deleteConfirmTitle: {
    ...typography.h3,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  deleteConfirmMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  deleteInput: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  deleteConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmButtonText: {
    ...typography.bodyBold,
  },
});
