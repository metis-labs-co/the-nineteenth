/**
 * FormInput Storybook Stories
 *
 * Stories demonstrating the various configurations of the FormInput component.
 * Shows external and floating labels, validation states, accessories, and use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { FormInput, FormInputProps } from './FormInput';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof FormInput> = {
  title: 'Common/FormInput',
  component: FormInput,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    floatingLabel: { control: 'boolean' },
    error: { control: 'text' },
    hint: { control: 'text' },
    required: { control: 'boolean' },
    keyboardType: {
      control: { type: 'select' },
      options: ['default', 'email', 'phone', 'decimal', 'number'],
    },
    secureTextEntry: { control: 'boolean' },
    multiline: { control: 'boolean' },
    numberOfLines: { control: 'number' },
    maxLength: { control: 'number' },
    editable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    leftAffix: { control: 'text' },
    rightIcon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof FormInput>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function FormWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>
        {children}
      </View>
    </ScrollView>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveFormInput(props: Omit<FormInputProps, 'value' | 'onChangeText'> & { initialValue?: string }) {
  const { initialValue = '', ...rest } = props;
  const [value, setValue] = useState(initialValue);
  return <FormInput value={value} onChangeText={setValue} {...rest} />;
}

// ===========================================================================
// BASIC STORIES
// ===========================================================================

/**
 * Default form input with external label
 */
export const Default: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        placeholder="Enter your email"
      />
    </FormWrapper>
  ),
};

/**
 * Input with initial value
 */
export const WithValue: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        initialValue="user@example.com"
      />
    </FormWrapper>
  ),
};

/**
 * Input without label (placeholder only)
 */
export const NoLabel: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        placeholder="Enter something..."
      />
    </FormWrapper>
  ),
};

// ===========================================================================
// LABEL VARIANT STORIES
// ===========================================================================

/**
 * External label (default) - label appears above input
 */
export const ExternalLabel: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Full Name"
        placeholder="Enter your full name"
      />
    </FormWrapper>
  ),
};

/**
 * Floating label - label appears inside input and floats up on focus
 */
export const FloatingLabel: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Full Name"
        floatingLabel
      />
    </FormWrapper>
  ),
};

/**
 * Required field with asterisk
 */
export const RequiredField: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email Address"
        placeholder="Enter email"
        required
      />
    </FormWrapper>
  ),
};

/**
 * Comparison of label styles
 */
export const LabelComparison: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="External Label (Default)">
        <InteractiveFormInput
          label="External Label"
          placeholder="Label appears above"
        />
      </FormSection>
      <FormSection title="Floating Label">
        <InteractiveFormInput
          label="Floating Label"
          floatingLabel
        />
      </FormSection>
      <FormSection title="Required Fields">
        <InteractiveFormInput
          label="Required External"
          placeholder="Has asterisk"
          required
        />
      </FormSection>
    </FormWrapper>
  ),
};

// ===========================================================================
// VALIDATION STORIES
// ===========================================================================

/**
 * Input with error message
 */
export const WithError: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        initialValue="invalid-email"
        error="Please enter a valid email address"
      />
    </FormWrapper>
  ),
};

/**
 * Input with hint text
 */
export const WithHint: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Password"
        hint="Must be at least 8 characters with one number"
        secureTextEntry
      />
    </FormWrapper>
  ),
};

/**
 * Error takes precedence over hint
 */
export const ErrorOverHint: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="With Hint (no error)">
        <InteractiveFormInput
          label="Password"
          hint="Must be at least 8 characters"
          secureTextEntry
        />
      </FormSection>
      <FormSection title="With Error (hides hint)">
        <InteractiveFormInput
          label="Password"
          initialValue="short"
          error="Password is too short"
          hint="Must be at least 8 characters"
          secureTextEntry
        />
      </FormSection>
    </FormWrapper>
  ),
};

/**
 * All validation states
 */
export const ValidationStates: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="Valid">
        <InteractiveFormInput
          label="Email"
          initialValue="valid@example.com"
        />
      </FormSection>
      <FormSection title="With Hint">
        <InteractiveFormInput
          label="Email"
          hint="We'll never share your email"
        />
      </FormSection>
      <FormSection title="With Error">
        <InteractiveFormInput
          label="Email"
          initialValue="invalid"
          error="Please enter a valid email"
        />
      </FormSection>
      <FormSection title="Required Empty">
        <InteractiveFormInput
          label="Email"
          required
          error="This field is required"
        />
      </FormSection>
    </FormWrapper>
  ),
};

// ===========================================================================
// KEYBOARD TYPE STORIES
// ===========================================================================

/**
 * Email keyboard type
 */
export const EmailKeyboard: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        placeholder="user@example.com"
        keyboardType="email"
        autoCapitalize="none"
        autoComplete="email"
      />
    </FormWrapper>
  ),
};

/**
 * Phone keyboard type
 */
export const PhoneKeyboard: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Phone Number"
        placeholder="0400 000 000"
        keyboardType="phone"
        autoComplete="tel"
      />
    </FormWrapper>
  ),
};

/**
 * Number keyboard type
 */
export const NumberKeyboard: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Handicap"
        placeholder="Enter handicap"
        keyboardType="number"
      />
    </FormWrapper>
  ),
};

/**
 * Decimal keyboard type
 */
export const DecimalKeyboard: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Price"
        placeholder="0.00"
        keyboardType="decimal"
        leftAffix="$"
      />
    </FormWrapper>
  ),
};

/**
 * All keyboard types
 */
export const AllKeyboardTypes: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="Default">
        <InteractiveFormInput
          label="Name"
          keyboardType="default"
        />
      </FormSection>
      <FormSection title="Email">
        <InteractiveFormInput
          label="Email"
          keyboardType="email"
        />
      </FormSection>
      <FormSection title="Phone">
        <InteractiveFormInput
          label="Phone"
          keyboardType="phone"
        />
      </FormSection>
      <FormSection title="Number">
        <InteractiveFormInput
          label="Quantity"
          keyboardType="number"
        />
      </FormSection>
      <FormSection title="Decimal">
        <InteractiveFormInput
          label="Amount"
          keyboardType="decimal"
        />
      </FormSection>
    </FormWrapper>
  ),
};

// ===========================================================================
// PASSWORD STORIES
// ===========================================================================

/**
 * Password input with toggle visibility
 */
export const PasswordInput: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Password"
        placeholder="Enter password"
        secureTextEntry
        required
      />
    </FormWrapper>
  ),
};

/**
 * Password with hint
 */
export const PasswordWithHint: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Password"
        placeholder="Create a strong password"
        secureTextEntry
        hint="Must contain at least 8 characters, one uppercase, one number"
        required
      />
    </FormWrapper>
  ),
};

/**
 * Password with error
 */
export const PasswordWithError: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Password"
        initialValue="weak"
        secureTextEntry
        error="Password does not meet requirements"
        required
      />
    </FormWrapper>
  ),
};

// ===========================================================================
// MULTILINE STORIES
// ===========================================================================

/**
 * Multiline text area
 */
export const MultilineInput: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Description"
        placeholder="Enter a description..."
        multiline
        numberOfLines={4}
      />
    </FormWrapper>
  ),
};

/**
 * Multiline with max length
 */
export const MultilineWithMaxLength: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Bio"
        placeholder="Tell us about yourself..."
        multiline
        numberOfLines={4}
        maxLength={200}
        hint="Maximum 200 characters"
      />
    </FormWrapper>
  ),
};

/**
 * Multiline with initial content
 */
export const MultilineWithContent: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Notes"
        initialValue="This is a longer text that spans multiple lines. It shows how the multiline input handles content that exceeds a single line of text."
        multiline
        numberOfLines={4}
      />
    </FormWrapper>
  ),
};

// ===========================================================================
// ACCESSORY STORIES
// ===========================================================================

/**
 * Input with left affix (currency)
 */
export const WithCurrencyAffix: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Entry Fee"
        placeholder="0.00"
        keyboardType="decimal"
        leftAffix="$"
      />
    </FormWrapper>
  ),
};

/**
 * Input with different affixes
 */
export const WithAffixes: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="Currency">
        <InteractiveFormInput
          label="Amount"
          placeholder="0.00"
          keyboardType="decimal"
          leftAffix="$"
        />
      </FormSection>
      <FormSection title="Percentage">
        <InteractiveFormInput
          label="Discount"
          placeholder="0"
          keyboardType="number"
          leftAffix="%"
        />
      </FormSection>
      <FormSection title="At Symbol">
        <InteractiveFormInput
          label="Username"
          placeholder="username"
          leftAffix="@"
        />
      </FormSection>
    </FormWrapper>
  ),
};

/**
 * Input with right icon
 */
export const WithRightIcon: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Search"
        placeholder="Search players..."
        rightIcon="magnify"
        onRightIconPress={() => Alert.alert('Search pressed')}
      />
    </FormWrapper>
  ),
};

/**
 * Different right icons
 */
export const RightIconVariations: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="Search">
        <InteractiveFormInput
          label="Search"
          placeholder="Search..."
          rightIcon="magnify"
          onRightIconPress={() => Alert.alert('Search')}
        />
      </FormSection>
      <FormSection title="Clear">
        <InteractiveFormInput
          label="Filter"
          initialValue="Active players"
          rightIcon="close"
          onRightIconPress={() => Alert.alert('Clear')}
        />
      </FormSection>
      <FormSection title="Calendar">
        <InteractiveFormInput
          label="Date"
          placeholder="Select date"
          rightIcon="calendar"
          onRightIconPress={() => Alert.alert('Open calendar')}
        />
      </FormSection>
    </FormWrapper>
  ),
};

// ===========================================================================
// DISABLED STATE STORIES
// ===========================================================================

/**
 * Disabled input
 */
export const DisabledInput: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        initialValue="user@example.com"
        disabled
      />
    </FormWrapper>
  ),
};

/**
 * Non-editable input
 */
export const NonEditableInput: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="User ID"
        initialValue="USR-12345"
        editable={false}
      />
    </FormWrapper>
  ),
};

/**
 * Disabled vs editable comparison
 */
export const DisabledComparison: Story = {
  render: () => (
    <FormWrapper>
      <FormSection title="Enabled (default)">
        <InteractiveFormInput
          label="Name"
          placeholder="Enter name"
        />
      </FormSection>
      <FormSection title="Disabled">
        <InteractiveFormInput
          label="Name"
          initialValue="Cannot edit this"
          disabled
        />
      </FormSection>
      <FormSection title="Non-Editable">
        <InteractiveFormInput
          label="Name"
          initialValue="Read-only value"
          editable={false}
        />
      </FormSection>
    </FormWrapper>
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Login form
 */
export const UseCaseLoginForm: Story = {
  name: 'Use Case: Login Form',
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        placeholder="you@example.com"
        keyboardType="email"
        autoCapitalize="none"
        autoComplete="email"
        required
      />
      <InteractiveFormInput
        label="Password"
        placeholder="Enter password"
        secureTextEntry
        required
      />
    </FormWrapper>
  ),
};

/**
 * Registration form
 */
export const UseCaseRegistrationForm: Story = {
  name: 'Use Case: Registration Form',
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Full Name"
        placeholder="Enter your full name"
        autoComplete="name"
        required
      />
      <InteractiveFormInput
        label="Email"
        placeholder="you@example.com"
        keyboardType="email"
        autoCapitalize="none"
        autoComplete="email"
        required
      />
      <InteractiveFormInput
        label="Phone"
        placeholder="0400 000 000"
        keyboardType="phone"
        autoComplete="tel"
      />
      <InteractiveFormInput
        label="Password"
        placeholder="Create a password"
        secureTextEntry
        hint="At least 8 characters with one number"
        required
      />
    </FormWrapper>
  ),
};

/**
 * Player profile form
 */
export const UseCasePlayerProfile: Story = {
  name: 'Use Case: Player Profile',
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Display Name"
        initialValue="John Smith"
        required
      />
      <InteractiveFormInput
        label="Handicap"
        initialValue="12"
        keyboardType="number"
        hint="Your official golf handicap"
      />
      <InteractiveFormInput
        label="Home Club"
        placeholder="Enter your home club"
      />
      <InteractiveFormInput
        label="Bio"
        placeholder="Tell us about yourself..."
        multiline
        numberOfLines={3}
        maxLength={200}
        hint="Max 200 characters"
      />
    </FormWrapper>
  ),
};

/**
 * Competition entry form
 */
export const UseCaseCompetitionEntry: Story = {
  name: 'Use Case: Competition Entry',
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Competition Name"
        placeholder="e.g., Summer Championship"
        required
      />
      <InteractiveFormInput
        label="Entry Fee"
        placeholder="0.00"
        keyboardType="decimal"
        leftAffix="$"
      />
      <InteractiveFormInput
        label="Max Players"
        placeholder="16"
        keyboardType="number"
      />
      <InteractiveFormInput
        label="Description"
        placeholder="Describe the competition..."
        multiline
        numberOfLines={4}
      />
    </FormWrapper>
  ),
};

/**
 * Search form
 */
export const UseCaseSearchForm: Story = {
  name: 'Use Case: Search',
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        placeholder="Search players..."
        rightIcon="magnify"
        onRightIconPress={() => Alert.alert('Search')}
      />
    </FormWrapper>
  ),
};

// ===========================================================================
// FLOATING LABEL USE CASES
// ===========================================================================

/**
 * Floating label login form
 */
export const FloatingLabelLoginForm: Story = {
  name: 'Floating Label: Login Form',
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        floatingLabel
        keyboardType="email"
        autoCapitalize="none"
      />
      <InteractiveFormInput
        label="Password"
        floatingLabel
        secureTextEntry
      />
    </FormWrapper>
  ),
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Very long label
 */
export const LongLabel: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="This is a very long label that might wrap to multiple lines"
        placeholder="Enter value"
      />
    </FormWrapper>
  ),
};

/**
 * Very long error message
 */
export const LongErrorMessage: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        initialValue="invalid"
        error="This is a very long error message that explains in detail what went wrong and how to fix it. Please make sure you enter a valid email address."
      />
    </FormWrapper>
  ),
};

/**
 * Very long hint
 */
export const LongHint: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Password"
        hint="Your password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        secureTextEntry
      />
    </FormWrapper>
  ),
};

/**
 * Empty/minimal input
 */
export const MinimalInput: Story = {
  render: () => (
    <FormWrapper>
      <FormInput
        value=""
        onChangeText={() => {}}
      />
    </FormWrapper>
  ),
};

// ===========================================================================
// ACCESSIBILITY STORIES
// ===========================================================================

/**
 * Input with custom accessibility
 */
export const WithAccessibility: Story = {
  render: () => (
    <FormWrapper>
      <InteractiveFormInput
        label="Email"
        placeholder="Enter email"
        accessibilityLabel="Email input field"
        accessibilityHint="Enter your email address to sign in"
      />
    </FormWrapper>
  ),
};
