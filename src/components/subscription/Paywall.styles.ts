/**
 * Paywall Styles
 *
 * Styles for the Paywall component, extracted for maintainability.
 */

import { StyleSheet } from 'react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  trialText: {
    ...typography.bodyBold,
  },
  tierSelection: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  periodToggle: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  periodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  periodText: {
    ...typography.bodyBold,
  },
  saveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  saveBadgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  price: {
    ...typography.h1,
  },
  priceSubtext: {
    ...typography.body,
  },
  purchaseButton: {
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  trialNote: {
    ...typography.small,
    textAlign: 'center',
  },
  divider: {
    marginVertical: spacing.lg,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  restoreText: {
    ...typography.body,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalLink: {
    ...typography.small,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    ...typography.small,
  },
  subscriptionInfo: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
});
