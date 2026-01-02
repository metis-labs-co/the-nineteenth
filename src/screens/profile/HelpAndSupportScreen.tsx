/**
 * HelpAndSupportScreen - FAQs and Contact/Bug Submission
 *
 * Provides users with:
 * - Frequently Asked Questions with expandable answers
 * - Contact form for bug reports and general inquiries
 *
 * Accessible via Help & Support menu item in ProfileScreen.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { RadioButtonOption } from './components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ExpandableItem, ExpandableList } from '@/components/common/ExpandableItem';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  APP_NAME,
  APP_VERSION,
  APP_TAGLINE,
  SUPPORT_EMAIL,
  CONTACT_SUBJECT_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  FAQ_DATA,
  INQUIRY_OPTIONS,
  getEmailForInquiryType,
  type InquiryType,
} from '@/constants/app';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// =====================================================
// CUSTOM HOOKS
// =====================================================

interface ContactFormState {
  inquiryType: InquiryType | null;
  subject: string;
  message: string;
  isSubmitting: boolean;
}

function useContactForm() {
  const [state, setState] = useState<ContactFormState>({
    inquiryType: null,
    subject: '',
    message: '',
    isSubmitting: false,
  });

  const subjectInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);

  const setInquiryType = useCallback((type: InquiryType) => {
    setState((prev) => ({ ...prev, inquiryType: type }));
  }, []);

  const setSubject = useCallback((subject: string) => {
    setState((prev) => ({ ...prev, subject }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setState((prev) => ({ ...prev, message }));
  }, []);

  const setIsSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const resetForm = useCallback(() => {
    setState({
      inquiryType: null,
      subject: '',
      message: '',
      isSubmitting: false,
    });
  }, []);

  const canSubmit = useMemo(
    () =>
      state.inquiryType !== null &&
      state.subject.trim().length > 0 &&
      state.message.trim().length >= CONTACT_MESSAGE_MIN_LENGTH,
    [state.inquiryType, state.subject, state.message]
  );

  const validate = useCallback(() => {
    if (!state.inquiryType) {
      Alert.alert('Required', 'Please select an inquiry type');
      return false;
    }
    if (!state.subject.trim()) {
      Alert.alert('Required', 'Please enter a subject');
      subjectInputRef.current?.focus();
      return false;
    }
    if (!state.message.trim()) {
      Alert.alert('Required', 'Please enter a message');
      messageInputRef.current?.focus();
      return false;
    }
    if (state.message.trim().length < CONTACT_MESSAGE_MIN_LENGTH) {
      Alert.alert('Too Short', 'Please provide more detail in your message');
      messageInputRef.current?.focus();
      return false;
    }
    return true;
  }, [state.inquiryType, state.subject, state.message]);

  return {
    ...state,
    setInquiryType,
    setSubject,
    setMessage,
    setIsSubmitting,
    resetForm,
    canSubmit,
    validate,
    subjectInputRef,
    messageInputRef,
  };
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function HelpAndSupportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { player } = useAuth();

  // FAQ state
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Contact form hook
  const form = useContactForm();

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const toggleFAQ = useCallback((id: string) => {
    setExpandedFAQ((current) => (current === id ? null : id));
  }, []);

  const handleEmailSupport = useCallback(
    (email: string = SUPPORT_EMAIL) => {
      const mailtoUrl = `mailto:${email}?subject=Support Request`;
      Linking.openURL(mailtoUrl).catch(() => {
        Alert.alert('Cannot Open Email', `Please email us directly at ${email}`, [
          { text: 'OK' },
        ]);
      });
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!form.validate()) return;
    if (!form.inquiryType) return;

    form.setIsSubmitting(true);
    const targetEmail = getEmailForInquiryType(form.inquiryType);
    const inquiryLabel = INQUIRY_OPTIONS.find((o) => o.type === form.inquiryType)?.label || 'Inquiry';

    try {
      const { data, error } = await supabase.functions.invoke('send-support-email', {
        body: {
          inquiry_type: form.inquiryType,
          subject: form.subject.trim(),
          message: form.message.trim(),
          user_email: player?.email,
          user_name: player?.name || undefined,
          app_version: APP_VERSION,
          platform: Platform.OS,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to send email');
      }

      Alert.alert(
        'Message Sent',
        "Thank you for your feedback! We'll get back to you as soon as possible.",
        [{ text: 'OK', onPress: form.resetForm }]
      );
    } catch (err) {
      console.error('[HelpAndSupportScreen] Failed to send support email:', err);

      // Fallback: Open email client with pre-filled content
      const subject = encodeURIComponent(`[${inquiryLabel}] ${form.subject.trim()}`);
      const deviceInfo =
        form.inquiryType === 'bug'
          ? `\n\n---\nApp Version: ${APP_VERSION}\nPlatform: ${Platform.OS}`
          : '';
      const body = encodeURIComponent(`${form.message.trim()}${deviceInfo}`);
      const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;

      Alert.alert(
        'Open Email App?',
        "We couldn't send your message directly. Would you like to open your email app instead?",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Email',
            onPress: () => {
              Linking.openURL(mailtoUrl).catch(() => {
                Alert.alert('Error', `Please email us directly at ${targetEmail}`);
              });
              form.resetForm();
            },
          },
        ]
      );
    } finally {
      form.setIsSubmitting(false);
    }
  }, [form, player]);

  // Memoized styles for dynamic colors
  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      surface: { backgroundColor: colors.surface },
      input: {
        backgroundColor: colors.surface,
        borderColor: colors.gray200,
        color: colors.textPrimary,
      },
      submitEnabled: { backgroundColor: colors.primary },
      submitDisabled: { backgroundColor: colors.gray300 },
      charCount: { color: colors.textTertiary },
      infoBox: { backgroundColor: colors.gray50 },
      footerText: { color: colors.textTertiary },
      answerText: { color: colors.textSecondary },
    }),
    [colors]
  );

  const isSubmitDisabled = !form.canSubmit || form.isSubmitting;

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <PageHeader title="Help & Support" showBack onBack={handleBack} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* FAQs Section */}
          <View style={styles.section}>
            <SectionHeader
              title="Frequently Asked Questions"
              description="Find quick answers to common questions"
              icon="frequently-asked-questions"
            />

            <ExpandableList
              expandedId={expandedFAQ}
              onToggle={toggleFAQ}
            >
              {FAQ_DATA.map((item, index) => (
                <ExpandableItem
                  key={item.id}
                  title={item.question}
                  isExpanded={expandedFAQ === item.id}
                  onToggle={() => toggleFAQ(item.id)}
                  isLast={index === FAQ_DATA.length - 1}
                >
                  <Text style={[styles.answerText, dynamicStyles.answerText]}>
                    {item.answer}
                  </Text>
                </ExpandableItem>
              ))}
            </ExpandableList>
          </View>

          <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

          {/* Contact Form Section */}
          <View style={styles.section}>
            <SectionHeader
              title="Contact Us"
              description="Can't find what you're looking for? Send us a message"
              icon="email-outline"
            />

            {/* Inquiry Type Selection */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              What can we help you with?
            </Text>
            <View style={styles.inquiryTypeContainer}>
              {INQUIRY_OPTIONS.map((option) => (
                <RadioButtonOption
                  key={option.type}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  selected={form.inquiryType === option.type}
                  onSelect={() => form.setInquiryType(option.type)}
                  testID={`inquiry-type-${option.type}`}
                />
              ))}
            </View>

            {/* Subject Input */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Subject
            </Text>
            <TextInput
              ref={form.subjectInputRef}
              style={[styles.textInput, dynamicStyles.input]}
              value={form.subject}
              onChangeText={form.setSubject}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.textTertiary}
              maxLength={CONTACT_SUBJECT_MAX_LENGTH}
              returnKeyType="next"
              onSubmitEditing={() => form.messageInputRef.current?.focus()}
              accessibilityLabel="Subject"
              accessibilityHint="Enter a brief description of your issue"
            />

            {/* Message Input */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Message
            </Text>
            <TextInput
              ref={form.messageInputRef}
              style={[styles.textInput, styles.textArea, dynamicStyles.input]}
              value={form.message}
              onChangeText={form.setMessage}
              placeholder="Please provide as much detail as possible..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={CONTACT_MESSAGE_MAX_LENGTH}
              accessibilityLabel="Message"
              accessibilityHint="Provide details about your issue or feedback"
            />
            <Text style={[styles.charCount, dynamicStyles.charCount]}>
              {form.message.length}/{CONTACT_MESSAGE_MAX_LENGTH}
            </Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitDisabled
                  ? dynamicStyles.submitDisabled
                  : dynamicStyles.submitEnabled,
              ]}
              activeOpacity={0.7}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              accessibilityRole="button"
              accessibilityLabel="Submit message"
              accessibilityState={{ disabled: isSubmitDisabled }}
            >
              {form.isSubmitting ? (
                <GolfBallLoader size="sm" />
              ) : (
                <>
                  <Icon source="send" size={20} color={colors.white} />
                  <Text style={[styles.submitButtonText, { color: colors.white }]}>
                    Send Message
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Alternative Contact */}
            <View style={[styles.alternativeContact, dynamicStyles.infoBox]}>
              <Icon source="information-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.alternativeText, { color: colors.textSecondary }]}>
                You can also email us directly at{' '}
                <Text
                  style={[styles.emailLink, { color: colors.primary }]}
                  onPress={() =>
                    handleEmailSupport(
                      form.inquiryType ? getEmailForInquiryType(form.inquiryType) : SUPPORT_EMAIL
                    )
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`Email ${form.inquiryType ? getEmailForInquiryType(form.inquiryType) : SUPPORT_EMAIL}`}
                >
                  {form.inquiryType ? getEmailForInquiryType(form.inquiryType) : SUPPORT_EMAIL}
                </Text>
                {form.inquiryType && (
                  <Text style={{ color: colors.textTertiary }}>
                    {' '}
                    for {INQUIRY_OPTIONS.find((o) => o.type === form.inquiryType)?.label.toLowerCase()}
                  </Text>
                )}
              </Text>
            </View>
          </View>

          {/* App Info Footer */}
          <View style={styles.footer}>
            <Text style={dynamicStyles.footerText}>
              {APP_NAME} v{APP_VERSION}
            </Text>
            <Text style={dynamicStyles.footerText}>{APP_TAGLINE}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  divider: {
    marginVertical: spacing.lg,
  },
  // FAQ Styles
  answerText: {
    ...typography.small,
    lineHeight: 22,
  },
  // Inquiry Type Styles
  inquiryTypeContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  // Form Styles
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  textInput: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    minHeight: 48,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  charCount: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  submitButtonText: {
    ...typography.bodyBold,
  },
  alternativeContact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  alternativeText: {
    ...typography.caption,
    flex: 1,
  },
  emailLink: {
    textDecorationLine: 'underline',
  },
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
});
