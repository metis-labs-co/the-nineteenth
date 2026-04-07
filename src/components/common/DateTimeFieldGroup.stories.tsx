/**
 * DateTimeFieldGroup Storybook Stories
 *
 * Stories demonstrating the various configurations of the DateTimeFieldGroup component.
 * Shows combined date and time selection with different prop combinations.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { DateTimeFieldGroup } from './DateTimeFieldGroup';
import { spacing } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof DateTimeFieldGroup> = {
  title: 'Common/DateTimeFieldGroup',
  component: DateTimeFieldGroup,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    showTime: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    label: { control: 'text' },
    timeLabel: { control: 'text' },
    dateError: { control: 'text' },
    timeError: { control: 'text' },
    showTimeClear: { control: 'boolean' },
    minuteInterval: {
      control: { type: 'select' },
      options: [1, 5, 10, 15, 30],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DateTimeFieldGroup>;

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
// INTERACTIVE WRAPPER (Date Only)
// ===========================================================================

interface InteractiveDateOnlyProps {
  initialDate?: Date;
  label?: string;
  dateError?: string;
  disabled?: boolean;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

function InteractiveDateOnly({
  initialDate = new Date(),
  label,
  dateError,
  disabled,
  required,
  minimumDate,
  maximumDate,
}: InteractiveDateOnlyProps) {
  const [date, setDate] = useState(initialDate);

  return (
    <PickerWrapper>
      <DateTimeFieldGroup
        date={date}
        onDateChange={setDate}
        label={label}
        dateError={dateError}
        disabled={disabled}
        required={required}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        testID="story-datetime"
      />
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ color: '#666', fontSize: 12 }}>
          Selected date: {date.toLocaleDateString()}
        </Text>
      </View>
    </PickerWrapper>
  );
}

// ===========================================================================
// INTERACTIVE WRAPPER (Date + Time)
// ===========================================================================

interface InteractiveDateTimeProps {
  initialDate?: Date;
  initialTime?: Date;
  label?: string;
  timeLabel?: string;
  dateError?: string;
  timeError?: string;
  disabled?: boolean;
  required?: boolean;
  showTimeClear?: boolean;
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  minimumDate?: Date;
  maximumDate?: Date;
}

function InteractiveDateTime({
  initialDate = new Date(),
  initialTime,
  label,
  timeLabel,
  dateError,
  timeError,
  disabled,
  required,
  showTimeClear = true,
  minuteInterval = 5,
  minimumDate,
  maximumDate,
}: InteractiveDateTimeProps) {
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState<Date | undefined>(initialTime);

  const handleTimeClear = () => {
    setTime(undefined);
  };

  return (
    <PickerWrapper>
      <DateTimeFieldGroup
        date={date}
        onDateChange={setDate}
        time={time}
        onTimeChange={setTime}
        showTime
        label={label}
        timeLabel={timeLabel}
        dateError={dateError}
        timeError={timeError}
        disabled={disabled}
        required={required}
        showTimeClear={showTimeClear}
        onTimeClear={handleTimeClear}
        minuteInterval={minuteInterval}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        testID="story-datetime"
      />
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ color: '#666', fontSize: 12 }}>
          Selected: {date.toLocaleDateString()}
          {time ? ` at ${time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ' (no time)'}
        </Text>
      </View>
    </PickerWrapper>
  );
}

// ===========================================================================
// DATE ONLY STORIES
// ===========================================================================

/**
 * Default date field group - date only, no time
 */
export const DateOnly: Story = {
  render: () => <InteractiveDateOnly />,
};

/**
 * Date only with custom label
 */
export const DateOnlyWithLabel: Story = {
  render: () => (
    <InteractiveDateOnly
      label="Round Date"
    />
  ),
};

/**
 * Date only with error
 */
export const DateOnlyWithError: Story = {
  render: () => (
    <InteractiveDateOnly
      label="Start Date"
      dateError="Date is required"
    />
  ),
};

/**
 * Date only - optional (not required)
 */
export const DateOnlyOptional: Story = {
  render: () => (
    <InteractiveDateOnly
      label="Preferred Date"
      required={false}
    />
  ),
};

/**
 * Date only with minimum date
 */
export const DateOnlyWithMinimum: Story = {
  render: () => (
    <InteractiveDateOnly
      label="Future Date Only"
      minimumDate={new Date()}
    />
  ),
};

/**
 * Date only disabled
 */
export const DateOnlyDisabled: Story = {
  render: () => (
    <InteractiveDateOnly
      label="Fixed Date"
      disabled
    />
  ),
};

// ===========================================================================
// DATE + TIME STORIES
// ===========================================================================

/**
 * Default date and time fields
 */
export const DateAndTime: Story = {
  render: () => <InteractiveDateTime />,
};

/**
 * Date and time with labels
 */
export const DateAndTimeWithLabels: Story = {
  render: () => (
    <InteractiveDateTime
      label="Round Date"
      timeLabel="Tee Time (Optional)"
    />
  ),
};

/**
 * Date and time with initial time set
 */
export const DateAndTimeWithInitialTime: Story = {
  render: () => {
    const initialTime = new Date();
    initialTime.setHours(8, 30, 0, 0);

    return (
      <InteractiveDateTime
        label="Round Date"
        timeLabel="Tee Time"
        initialTime={initialTime}
      />
    );
  },
};

/**
 * Date and time with errors
 */
export const DateAndTimeWithErrors: Story = {
  render: () => (
    <InteractiveDateTime
      label="Round Date"
      dateError="Date is required"
      timeError="Invalid time selected"
    />
  ),
};

/**
 * Date and time with date error only
 */
export const DateAndTimeDateError: Story = {
  render: () => (
    <InteractiveDateTime
      label="Round Date"
      dateError="Please select a valid date"
    />
  ),
};

/**
 * Date and time with 15 minute intervals
 */
export const DateAndTime15MinInterval: Story = {
  render: () => (
    <InteractiveDateTime
      label="Round Date"
      timeLabel="Tee Time (15 min slots)"
      minuteInterval={15}
    />
  ),
};

/**
 * Date and time with 30 minute intervals
 */
export const DateAndTime30MinInterval: Story = {
  render: () => (
    <InteractiveDateTime
      label="Round Date"
      timeLabel="Tee Time (30 min slots)"
      minuteInterval={30}
    />
  ),
};

/**
 * Date and time without clear button
 */
export const DateAndTimeNoClear: Story = {
  render: () => {
    const initialTime = new Date();
    initialTime.setHours(9, 0, 0, 0);

    return (
      <InteractiveDateTime
        label="Round Date"
        timeLabel="Tee Time (Required)"
        initialTime={initialTime}
        showTimeClear={false}
      />
    );
  },
};

/**
 * Date and time disabled
 */
export const DateAndTimeDisabled: Story = {
  render: () => {
    const initialTime = new Date();
    initialTime.setHours(7, 30, 0, 0);

    return (
      <InteractiveDateTime
        label="Scheduled Round"
        initialTime={initialTime}
        disabled
      />
    );
  },
};

/**
 * Date and time with minimum date (future only)
 */
export const DateAndTimeFutureOnly: Story = {
  render: () => (
    <InteractiveDateTime
      label="Round Date"
      timeLabel="Tee Time"
      minimumDate={new Date()}
    />
  ),
};

// ===========================================================================
// USE CASE STORIES
// ===========================================================================

/**
 * Use case: Add Round form
 */
export const UseCaseAddRound: Story = {
  name: 'Use Case: Add Round',
  render: () => {
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState<Date | undefined>(undefined);

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Add New Round
        </Text>
        <DateTimeFieldGroup
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          showTime
          label="Round Date"
          timeLabel="Tee Time (Optional)"
          showTimeClear
          onTimeClear={() => setTime(undefined)}
          minuteInterval={5}
          minimumDate={new Date()}
        />
      </PickerWrapper>
    );
  },
};

/**
 * Use case: Edit Round form
 */
export const UseCaseEditRound: Story = {
  name: 'Use Case: Edit Round',
  render: () => {
    const existingDate = new Date(2025, 1, 15); // Feb 15, 2025
    const existingTime = new Date();
    existingTime.setHours(8, 0, 0, 0);

    const [date, setDate] = useState(existingDate);
    const [time, setTime] = useState<Date | undefined>(existingTime);

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Edit Round
        </Text>
        <DateTimeFieldGroup
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          showTime
          label="Round Date"
          timeLabel="Tee Time (Optional)"
          showTimeClear
          onTimeClear={() => setTime(undefined)}
          minuteInterval={5}
        />
      </PickerWrapper>
    );
  },
};

/**
 * Use case: Competition date selection
 */
export const UseCaseCompetitionDate: Story = {
  name: 'Use Case: Competition Date',
  render: () => {
    const [date, setDate] = useState(new Date());

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Competition Settings
        </Text>
        <DateTimeFieldGroup
          date={date}
          onDateChange={setDate}
          label="Start Date"
          minimumDate={new Date()}
        />
      </PickerWrapper>
    );
  },
};

/**
 * Use case: Form validation
 */
export const UseCaseFormValidation: Story = {
  name: 'Use Case: Form Validation',
  render: () => {
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState<Date | undefined>(undefined);
    const [submitted, setSubmitted] = useState(false);

    const dateError = submitted ? undefined : undefined;
    const timeError = submitted && !time ? 'Tee time is required for competitive rounds' : undefined;

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Schedule Round
        </Text>
        <DateTimeFieldGroup
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          showTime
          label="Round Date"
          timeLabel="Tee Time"
          dateError={dateError}
          timeError={timeError}
          showTimeClear
          onTimeClear={() => setTime(undefined)}
        />
        <View style={{ marginTop: spacing.lg }}>
          <Text
            style={{ color: '#3b82f6', textAlign: 'center' }}
            onPress={() => setSubmitted(true)}
          >
            Validate Form
          </Text>
        </View>
      </PickerWrapper>
    );
  },
};

// ===========================================================================
// EDGE CASE STORIES
// ===========================================================================

/**
 * Multiple date time groups in one form
 */
export const MultipleGroups: Story = {
  render: () => {
    const [round1Date, setRound1Date] = useState(new Date());
    const [round1Time, setRound1Time] = useState<Date | undefined>(undefined);
    const [round2Date, setRound2Date] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d;
    });
    const [round2Time, setRound2Time] = useState<Date | undefined>(undefined);

    return (
      <PickerWrapper>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: spacing.lg }}>
          Schedule Multiple Rounds
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.sm }}>
          Round 1
        </Text>
        <DateTimeFieldGroup
          date={round1Date}
          onDateChange={setRound1Date}
          time={round1Time}
          onTimeChange={setRound1Time}
          showTime
          timeLabel="Tee Time"
          showTimeClear
          onTimeClear={() => setRound1Time(undefined)}
        />
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: spacing.sm, marginTop: spacing.lg }}>
          Round 2
        </Text>
        <DateTimeFieldGroup
          date={round2Date}
          onDateChange={setRound2Date}
          time={round2Time}
          onTimeChange={setRound2Time}
          showTime
          timeLabel="Tee Time"
          showTimeClear
          onTimeClear={() => setRound2Time(undefined)}
          minimumDate={round1Date}
        />
      </PickerWrapper>
    );
  },
};
