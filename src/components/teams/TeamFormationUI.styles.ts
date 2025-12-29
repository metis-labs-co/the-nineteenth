// src/components/teams/TeamFormationUI.styles.ts
import { StyleSheet } from 'react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  type ColorPalette,
} from '@/constants/theme';

export const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: layout.screenPadding,
      paddingVertical: spacing.lg,
    },
    headerLeft: {
      flex: 1,
    },
    headerTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      ...typography.small,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    autoGenerateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
      ...shadows.sm,
    },
    autoGenerateButtonText: {
      ...typography.smallBold,
      color: colors.textInverse,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    divider: {
      backgroundColor: colors.border,
    },
    teamsList: {
      flex: 1,
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing.md,
    },
    noTeamsState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
      gap: spacing.md,
    },
    noTeamsText: {
      ...typography.body,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: layout.screenPadding,
      gap: spacing.md,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    emptyMessage: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: layout.buttonHeight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
  });
