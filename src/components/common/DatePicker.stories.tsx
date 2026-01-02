/**
 * DatePicker Storybook Stories
 *
 * Stories demonstrating the various configurations of the DatePicker component.
 * Shows date and time modes with different prop combinations.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker, DatePickerProps } from './DatePicker';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof DatePicker> = {
  title: 'Common/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    value: { control: 'text' },
    mode: {
      control: { type: 'select' },
      options: ['date', 'time'],
    },
    placeholder: { control: 'text' },
    label: { control: 'text' },
    error: { control: 'text' },
    hint: { control: 'text' },
    disabled: { control: 'boolean' },
    showClear: { control: 'boolean' },
    icon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

// ===========================================================================
// WRAPPER COMPONENT
// ===========================================================================

function PickerWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>
        {children}
      </View>
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: spacing.lg,
  },
  content: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 12,
  },
});

// ===========================================================================
// INTERACTIVE WRAPPER
// ===========================================================================

function InteractiveDatePicker(props: DatePickerProps) {
  const [value, setValue] = useState(props.value);

  return (
    <PickerWrapper>
      <DatePicker
        {...props}
        value={value}
        onChange={(newValue) => {
          setValue(newValue);
          props.onChange?.(newValue);
        }}
      />
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ color: '#666', fontSize: 12 }}>Current value: {value || '(empty)'}</Text>
      </View>
    </PickerWrapper>
  );
}

// ===========================================================================
// DATE MODE STORIES
// ===========================================================================

/**
 * Default date picker - empty state
 */
export const Default: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
    />
  ),
};

/**
 * Date picker with a value
 */
export const WithValue: Story = {
  render: () => (
    <InteractiveDatePicker
      value="15/01/2025"
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
    />
  ),
};

/**
 * Date picker with label
 */
export const WithLabel: Story = {
  render: () => (
    <InteractiveDatePicker
      value="20/06/2025"
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Competition Date"
    />
  ),
};

/**
 * Date picker with placeholder
 */
export const WithPlaceholder: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      placeholder="Choose a date"
      label="Start Date"
    />
  ),
};

/**
 * Date picker with hint text
 */
export const WithHint: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Round Date"
      hint="Select the date for round 1"
    />
  ),
};

/**
 * Date picker with error message
 */
export const WithError: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Start Date"
      error="Start date is required"
    />
  ),
};

/**
 * Date picker with clear button
 */
export const WithClearButton: Story = {
  render: () => (
    <InteractiveDatePicker
      value="25/12/2025"
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Event Date"
      showClear
    />
  ),
};

/**
 * Disabled date picker
 */
export const Disabled: Story = {
  render: () => (
    <PickerWrapper>
      <DatePicker
        value="01/01/2025"
        onChange={() => {}}
        mode="date"
        label="Fixed Date"
        disabled
      />
    </PickerWrapper>
  ),
};

/**
 * Date picker with minimum date constraint
 */
export const WithMinimumDate: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Future Date Only"
      hint="Select a date from today onwards"
      minimumDate={new Date()}
    />
  ),
};

/**
 * Date picker with maximum date constraint
 */
export const WithMaximumDate: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Past Date Only"
      hint="Select a date up to today"
      maximumDate={new Date()}
    />
  ),
};

/**
 * Date picker with date range constraint
 */
export const WithDateRange: Story = {
  render: () => {
    const minDate = new Date(2025, 0, 1); // Jan 1, 2025
    const maxDate = new Date(2025, 11, 31); // Dec 31, 2025

    return (
      <InteractiveDatePicker
        value=""
        onChange={(value) => console.log('Date changed:', value)}
        mode="date"
        label="2025 Date"
        hint="Select a date within 2025"
        minimumDate={minDate}
        maximumDate={maxDate}
      />
    );
  },
};

// ===========================================================================
// TIME MODE STORIES
// ===========================================================================

/**
 * Time picker - empty state
 */
export const TimePickerDefault: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
    />
  ),
};

/**
 * Time picker with a value
 */
export const TimePickerWithValue: Story = {
  render: () => (
    <InteractiveDatePicker
      value="09:30"
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
    />
  ),
};

/**
 * Time picker with label
 */
export const TimePickerWithLabel: Story = {
  render: () => (
    <InteractiveDatePicker
      value="08:00"
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      label="Tee Time"
    />
  ),
};

/**
 * Time picker with placeholder
 */
export const TimePickerWithPlaceholder: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      placeholder="Choose tee time"
      label="Tee Time"
    />
  ),
};

/**
 * Time picker with hint
 */
export const TimePickerWithHint: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      label="Start Time"
      hint="Select a time between 6:00 and 18:00"
    />
  ),
};

/**
 * Time picker with error
 */
export const TimePickerWithError: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      label="Tee Time"
      error="Tee time is required"
    />
  ),
};

/**
 * Time picker with clear button
 */
export const TimePickerWithClear: Story = {
  render: () => (
    <InteractiveDatePicker
      value="14:30"
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      label="Tee Time"
      showClear
    />
  ),
};

/**
 * Disabled time picker
 */
export const TimePickerDisabled: Story = {
  render: () => (
    <PickerWrapper>
      <DatePicker
        value="07:00"
        onChange={() => {}}
        mode="time"
        label="Fixed Time"
        disabled
      />
    </PickerWrapper>
  ),
};

// ===========================================================================
// CUSTOM ICON STORIES
// ===========================================================================

/**
 * Date picker with custom icon
 */
export const WithCustomIcon: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Event Date"
      icon="calendar-month"
    />
  ),
};

/**
 * Time picker with custom icon
 */
export const TimePickerCustomIcon: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      label="Alarm Time"
      icon="alarm"
    />
  ),
};

// ===========================================================================
// COMBINED FEATURES STORIES
// ===========================================================================

/**
 * Full featured date picker
 */
export const FullFeaturedDate: Story = {
  render: () => (
    <InteractiveDatePicker
      value="15/06/2025"
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Competition Start Date"
      placeholder="Select start date"
      hint="Choose when the competition begins"
      showClear
      minimumDate={new Date()}
    />
  ),
};

/**
 * Full featured time picker
 */
export const FullFeaturedTime: Story = {
  render: () => (
    <InteractiveDatePicker
      value="08:30"
      onChange={(value) => console.log('Time changed:', value)}
      mode="time"
      label="First Tee Time"
      placeholder="Select tee time"
      hint="Morning times are recommended"
      showClear
    />
  ),
};

// ===========================================================================
// FORM LAYOUT STORIES
// ===========================================================================

/**
 * Multiple date pickers in a form
 */
export const FormLayout: Story = {
  render: () => {
    const [startDate, setStartDate] = useState('15/01/2025');
    const [endDate, setEndDate] = useState('17/01/2025');

    return (
      <PickerWrapper>
        <DatePicker
          value={startDate}
          onChange={setStartDate}
          mode="date"
          label="Start Date"
          minimumDate={new Date()}
        />
        <DatePicker
          value={endDate}
          onChange={setEndDate}
          mode="date"
          label="End Date"
          hint="Must be after start date"
          minimumDate={new Date()}
        />
      </PickerWrapper>
    );
  },
};

/**
 * Date and time pickers together
 */
export const DateAndTimeForm: Story = {
  render: () => {
    const [date, setDate] = useState('20/01/2025');
    const [time, setTime] = useState('07:30');

    return (
      <PickerWrapper>
        <DatePicker
          value={date}
          onChange={setDate}
          mode="date"
          label="Round Date"
        />
        <DatePicker
          value={time}
          onChange={setTime}
          mode="time"
          label="Tee Time"
        />
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ color: '#666', fontSize: 12 }}>
            Selected: {date} at {time}
          </Text>
        </View>
      </PickerWrapper>
    );
  },
};

/**
 * Form with validation errors
 */
export const FormWithErrors: Story = {
  render: () => (
    <PickerWrapper>
      <DatePicker
        value=""
        onChange={() => {}}
        mode="date"
        label="Start Date"
        error="Start date is required"
      />
      <DatePicker
        value=""
        onChange={() => {}}
        mode="date"
        label="End Date"
        error="End date must be after start date"
      />
      <DatePicker
        value=""
        onChange={() => {}}
        mode="time"
        label="Tee Time"
        error="Tee time is required"
      />
    </PickerWrapper>
  ),
};

// ===========================================================================
// EDGE CASES STORIES
// ===========================================================================

/**
 * Date picker with very long label
 */
export const LongLabel: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Please select the start date for the upcoming golf competition event"
    />
  ),
};

/**
 * Date picker with very long error message
 */
export const LongError: Story = {
  render: () => (
    <PickerWrapper>
      <DatePicker
        value=""
        onChange={() => {}}
        mode="date"
        label="Date"
        error="The date you selected is not available because it falls on a public holiday and the golf course is closed"
      />
    </PickerWrapper>
  ),
};

/**
 * Date picker with very long hint
 */
export const LongHint: Story = {
  render: () => (
    <InteractiveDatePicker
      value=""
      onChange={(value) => console.log('Date changed:', value)}
      mode="date"
      label="Date"
      hint="Please select a date that works for all participants. Consider weather conditions and course availability when making your selection."
    />
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Competition creation form
 */
export const UseCaseCompetitionForm: Story = {
  name: 'Use Case: Competition Form',
  render: () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Create Competition
        </Text>
        <DatePicker
          value={startDate}
          onChange={setStartDate}
          mode="date"
          label="Start Date"
          placeholder="Select start date"
          minimumDate={new Date()}
        />
        <DatePicker
          value={endDate}
          onChange={setEndDate}
          mode="date"
          label="End Date"
          placeholder="Select end date"
          hint="Competition can span multiple days"
          minimumDate={new Date()}
        />
      </PickerWrapper>
    );
  },
};

/**
 * Round scheduling form
 */
export const UseCaseRoundScheduling: Story = {
  name: 'Use Case: Round Scheduling',
  render: () => {
    const [roundDate, setRoundDate] = useState('15/02/2025');
    const [teeTime, setTeeTime] = useState('07:00');

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Schedule Round 1
        </Text>
        <DatePicker
          value={roundDate}
          onChange={setRoundDate}
          mode="date"
          label="Round Date"
          minimumDate={new Date()}
        />
        <DatePicker
          value={teeTime}
          onChange={setTeeTime}
          mode="time"
          label="First Tee Time"
          hint="Groups start every 10 minutes"
        />
      </PickerWrapper>
    );
  },
};

/**
 * Handicap update date
 */
export const UseCaseHandicapUpdate: Story = {
  name: 'Use Case: Handicap Update',
  render: () => {
    const [updateDate, setUpdateDate] = useState('01/01/2025');

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Handicap Details
        </Text>
        <DatePicker
          value={updateDate}
          onChange={setUpdateDate}
          mode="date"
          label="Last Updated"
          disabled
          hint="Handicap was last verified on this date"
        />
      </PickerWrapper>
    );
  },
};

/**
 * Event reminder form
 */
export const UseCaseEventReminder: Story = {
  name: 'Use Case: Event Reminder',
  render: () => {
    const [reminderDate, setReminderDate] = useState('');
    const [reminderTime, setReminderTime] = useState('');

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Set Reminder
        </Text>
        <DatePicker
          value={reminderDate}
          onChange={setReminderDate}
          mode="date"
          label="Reminder Date"
          placeholder="When to remind"
          minimumDate={new Date()}
        />
        <DatePicker
          value={reminderTime}
          onChange={setReminderTime}
          mode="time"
          label="Reminder Time"
          placeholder="What time"
        />
      </PickerWrapper>
    );
  },
};
