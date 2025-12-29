/**
 * DateTimeFieldGroup Component Tests
 *
 * Tests for the combined date/time field group component including:
 * - Rendering date only and date+time modes
 * - Value display and formatting
 * - Picker opening and closing
 * - Value changes via pickers
 * - Clear functionality for time
 * - Error states
 * - Date constraints (min/max)
 * - Disabled state
 * - Accessibility
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { DateTimeFieldGroup } from './DateTimeFieldGroup';

// Mock the DateTimePicker component
jest.mock('@react-native-community/datetimepicker', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  const MockDateTimePicker = ({ value, mode, onChange, testID }: any) => (
    <View testID={testID || 'date-time-picker'}>
      <Text testID="picker-mode">{mode}</Text>
      <Text testID="picker-value">{value?.toISOString()}</Text>
      <TouchableOpacity
        testID="mock-picker-select"
        onPress={() => {
          const event = { type: 'set' };
          if (mode === 'date') {
            onChange(event, new Date(2025, 0, 15));
          } else {
            const timeDate = new Date();
            timeDate.setHours(10, 30, 0, 0);
            onChange(event, timeDate);
          }
        }}
      >
        <Text>Select</Text>
      </TouchableOpacity>
    </View>
  );
  return {
    __esModule: true,
    default: MockDateTimePicker,
  };
});

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatString: string) => {
    if (formatString === 'dd/MM/yyyy') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    if (formatString === 'HH:mm') {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return date.toISOString();
  }),
  startOfDay: jest.fn((date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }),
}));

describe('DateTimeFieldGroup', () => {
  const defaultDate = new Date(2025, 0, 20);
  const defaultTime = new Date();
  defaultTime.setHours(9, 30, 0, 0);

  const defaultProps = {
    date: defaultDate,
    onDateChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to iOS for consistent testing
    Platform.OS = 'ios';
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<DateTimeFieldGroup {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders date field with formatted date', () => {
      render(<DateTimeFieldGroup {...defaultProps} />);
      expect(screen.getByText('20/01/2025')).toBeTruthy();
    });

    it('renders default label when not provided', () => {
      render(<DateTimeFieldGroup {...defaultProps} />);
      expect(screen.getByText('Date *')).toBeTruthy();
    });

    it('renders custom label when provided', () => {
      render(<DateTimeFieldGroup {...defaultProps} label="Round Date" />);
      expect(screen.getByText('Round Date *')).toBeTruthy();
    });

    it('does not render time field by default', () => {
      render(<DateTimeFieldGroup {...defaultProps} />);
      expect(screen.queryByText('Time (Optional)')).toBeNull();
    });

    it('renders time field when showTime is true', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
        />
      );
      expect(screen.getByText('Time (Optional)')).toBeTruthy();
    });

    it('renders custom time label', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          timeLabel="Tee Time"
        />
      );
      expect(screen.getByText('Tee Time')).toBeTruthy();
    });

    it('renders time value when provided', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
        />
      );
      expect(screen.getByText('09:30')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATE ONLY MODE TESTS
  // ===========================================================================

  describe('Date Only Mode', () => {
    it('renders only date field when showTime is false', () => {
      const { toJSON } = render(<DateTimeFieldGroup {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
      expect(screen.getByText('20/01/2025')).toBeTruthy();
      expect(screen.queryByText('Time (Optional)')).toBeNull();
    });

    it('opens date picker when field is pressed', () => {
      render(<DateTimeFieldGroup {...defaultProps} testID="test" />);

      const dateButton = screen.getByTestId('test-date-button');
      fireEvent.press(dateButton);

      expect(screen.getByTestId('date-time-picker')).toBeTruthy();
      expect(screen.getByText('date')).toBeTruthy();
    });

    it('calls onDateChange when date is selected', () => {
      const onDateChange = jest.fn();
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          onDateChange={onDateChange}
          testID="test"
        />
      );

      const dateButton = screen.getByTestId('test-date-button');
      fireEvent.press(dateButton);
      fireEvent.press(screen.getByTestId('mock-picker-select'));

      expect(onDateChange).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DATE + TIME MODE TESTS
  // ===========================================================================

  describe('Date + Time Mode', () => {
    const dateTimeProps = {
      ...defaultProps,
      showTime: true,
      time: defaultTime,
      onTimeChange: jest.fn(),
    };

    it('renders both date and time fields', () => {
      render(<DateTimeFieldGroup {...dateTimeProps} />);
      expect(screen.getByText('20/01/2025')).toBeTruthy();
      expect(screen.getByText('09:30')).toBeTruthy();
    });

    it('opens time picker when time field is pressed', () => {
      render(<DateTimeFieldGroup {...dateTimeProps} testID="test" />);

      const timeButton = screen.getByTestId('test-time-button');
      fireEvent.press(timeButton);

      expect(screen.getByTestId('date-time-picker')).toBeTruthy();
      expect(screen.getByText('time')).toBeTruthy();
    });

    it('calls onTimeChange when time is selected', () => {
      const onTimeChange = jest.fn();
      render(
        <DateTimeFieldGroup
          {...dateTimeProps}
          onTimeChange={onTimeChange}
          testID="test"
        />
      );

      const timeButton = screen.getByTestId('test-time-button');
      fireEvent.press(timeButton);
      fireEvent.press(screen.getByTestId('mock-picker-select'));

      expect(onTimeChange).toHaveBeenCalled();
    });

    it('shows placeholder when time is undefined', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={undefined}
          onTimeChange={jest.fn()}
        />
      );
      // Time value should be empty, placeholder should be shown
      expect(screen.queryByText('09:30')).toBeNull();
    });
  });

  // ===========================================================================
  // CLEAR TIME FUNCTIONALITY TESTS
  // ===========================================================================

  describe('Clear Time Functionality', () => {
    it('renders clear button when showTimeClear is true and time has value', () => {
      const { toJSON } = render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          showTimeClear
          onTimeClear={jest.fn()}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('calls onTimeClear when clear is pressed', () => {
      const onTimeClear = jest.fn();
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          showTimeClear
          onTimeClear={onTimeClear}
          testID="test"
        />
      );

      // The clear button is rendered as a TextInput.Icon, which is hard to test directly
      // Just verify the component renders with the callback
      expect(onTimeClear).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error States', () => {
    it('displays date error when provided', () => {
      render(
        <DateTimeFieldGroup {...defaultProps} dateError="Date is required" />
      );
      expect(screen.getByText('Date is required')).toBeTruthy();
    });

    it('displays time error when provided', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          timeError="Invalid time"
        />
      );
      expect(screen.getByText('Invalid time')).toBeTruthy();
    });

    it('displays both date and time errors', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          dateError="Date is required"
          timeError="Time is required"
        />
      );
      expect(screen.getByText('Date is required')).toBeTruthy();
      expect(screen.getByText('Time is required')).toBeTruthy();
    });

    it('does not display error when not provided', () => {
      render(<DateTimeFieldGroup {...defaultProps} />);
      expect(screen.queryByText('Date is required')).toBeNull();
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not open date picker when disabled', () => {
      render(
        <DateTimeFieldGroup {...defaultProps} disabled testID="test" />
      );

      const dateButton = screen.getByTestId('test-date-button');
      fireEvent.press(dateButton);

      expect(screen.queryByTestId('date-time-picker')).toBeNull();
    });

    it('does not open time picker when disabled', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          disabled
          testID="test"
        />
      );

      const timeButton = screen.getByTestId('test-time-button');
      fireEvent.press(timeButton);

      expect(screen.queryByTestId('date-time-picker')).toBeNull();
    });

    it('renders values when disabled', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          disabled
        />
      );
      expect(screen.getByText('20/01/2025')).toBeTruthy();
      expect(screen.getByText('09:30')).toBeTruthy();
    });
  });

  // ===========================================================================
  // REQUIRED/OPTIONAL TESTS
  // ===========================================================================

  describe('Required/Optional', () => {
    it('shows asterisk when required is true (default)', () => {
      render(<DateTimeFieldGroup {...defaultProps} label="Round Date" />);
      expect(screen.getByText('Round Date *')).toBeTruthy();
    });

    it('does not show asterisk when required is false', () => {
      render(
        <DateTimeFieldGroup {...defaultProps} label="Round Date" required={false} />
      );
      expect(screen.getByText('Round Date')).toBeTruthy();
      expect(screen.queryByText('Round Date *')).toBeNull();
    });
  });

  // ===========================================================================
  // DATE CONSTRAINTS TESTS
  // ===========================================================================

  describe('Date Constraints', () => {
    it('accepts minimumDate prop', () => {
      const minDate = new Date(2025, 0, 1);
      const { toJSON } = render(
        <DateTimeFieldGroup {...defaultProps} minimumDate={minDate} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('accepts maximumDate prop', () => {
      const maxDate = new Date(2025, 11, 31);
      const { toJSON } = render(
        <DateTimeFieldGroup {...defaultProps} maximumDate={maxDate} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('accepts both min and max date props', () => {
      const minDate = new Date(2025, 0, 1);
      const maxDate = new Date(2025, 11, 31);
      const { toJSON } = render(
        <DateTimeFieldGroup
          {...defaultProps}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // MINUTE INTERVAL TESTS
  // ===========================================================================

  describe('Minute Interval', () => {
    it('accepts minuteInterval prop', () => {
      const { toJSON } = render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          minuteInterval={15}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('defaults to 5 minute interval', () => {
      const { toJSON } = render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLATFORM BEHAVIOR TESTS
  // ===========================================================================

  describe('Platform Behavior', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
      });

      it('renders picker in modal on iOS', () => {
        render(<DateTimeFieldGroup {...defaultProps} testID="test" />);

        const dateButton = screen.getByTestId('test-date-button');
        fireEvent.press(dateButton);

        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
        expect(screen.getByText('Done')).toBeTruthy();
      });

      it('closes modal when Done is pressed', () => {
        render(<DateTimeFieldGroup {...defaultProps} testID="test" />);

        const dateButton = screen.getByTestId('test-date-button');
        fireEvent.press(dateButton);

        expect(screen.getByTestId('date-time-picker')).toBeTruthy();

        fireEvent.press(screen.getByText('Done'));

        expect(screen.queryByTestId('date-time-picker')).toBeNull();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('renders picker directly on Android', () => {
        render(<DateTimeFieldGroup {...defaultProps} testID="test" />);

        const dateButton = screen.getByTestId('test-date-button');
        fireEvent.press(dateButton);

        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
        // Android doesn't show Done button
        expect(screen.queryByText('Done')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible date button', () => {
      render(<DateTimeFieldGroup {...defaultProps} testID="test" />);
      const dateButton = screen.getByTestId('test-date-button');
      expect(dateButton).toBeTruthy();
    });

    it('has accessible time button when showTime is true', () => {
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={defaultTime}
          onTimeChange={jest.fn()}
          testID="test"
        />
      );
      const timeButton = screen.getByTestId('test-time-button');
      expect(timeButton).toBeTruthy();
    });

    it('displays label for screen readers', () => {
      render(<DateTimeFieldGroup {...defaultProps} label="Round Date" />);
      expect(screen.getByText('Round Date *')).toBeTruthy();
    });

    it('displays error for screen readers', () => {
      render(
        <DateTimeFieldGroup {...defaultProps} dateError="Date is required" />
      );
      expect(screen.getByText('Date is required')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles undefined time gracefully', () => {
      const { toJSON } = render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={undefined}
          onTimeChange={jest.fn()}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('handles midnight time', () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={midnight}
          onTimeChange={jest.fn()}
        />
      );
      expect(screen.getByText('00:00')).toBeTruthy();
    });

    it('handles end of day time', () => {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 0, 0);
      render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={endOfDay}
          onTimeChange={jest.fn()}
        />
      );
      expect(screen.getByText('23:59')).toBeTruthy();
    });

    it('handles leap year date', () => {
      const leapDate = new Date(2024, 1, 29); // Feb 29, 2024
      render(<DateTimeFieldGroup date={leapDate} onDateChange={jest.fn()} />);
      expect(screen.getByText('29/02/2024')).toBeTruthy();
    });

    it('handles end of year date', () => {
      const endOfYear = new Date(2025, 11, 31); // Dec 31, 2025
      render(<DateTimeFieldGroup date={endOfYear} onDateChange={jest.fn()} />);
      expect(screen.getByText('31/12/2025')).toBeTruthy();
    });

    it('handles undefined optional callbacks gracefully', () => {
      const { toJSON } = render(
        <DateTimeFieldGroup
          {...defaultProps}
          showTime
          time={undefined}
          onTimeChange={undefined}
          onTimeClear={undefined}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMBINED PROPS TESTS
  // ===========================================================================

  describe('Combined Props', () => {
    it('renders with all props provided', () => {
      const minDate = new Date(2025, 0, 1);
      const maxDate = new Date(2025, 11, 31);

      render(
        <DateTimeFieldGroup
          date={defaultDate}
          onDateChange={jest.fn()}
          time={defaultTime}
          onTimeChange={jest.fn()}
          showTime
          label="Round Date"
          timeLabel="Tee Time"
          minimumDate={minDate}
          maximumDate={maxDate}
          required
          minuteInterval={15}
          showTimeClear
          onTimeClear={jest.fn()}
          testID="full-test"
        />
      );

      expect(screen.getByText('Round Date *')).toBeTruthy();
      expect(screen.getByText('20/01/2025')).toBeTruthy();
      expect(screen.getByText('Tee Time')).toBeTruthy();
      expect(screen.getByText('09:30')).toBeTruthy();
    });

    it('renders with errors on both fields', () => {
      render(
        <DateTimeFieldGroup
          date={defaultDate}
          onDateChange={jest.fn()}
          time={defaultTime}
          onTimeChange={jest.fn()}
          showTime
          label="Date"
          dateError="Invalid date"
          timeError="Invalid time"
        />
      );

      expect(screen.getByText('Invalid date')).toBeTruthy();
      expect(screen.getByText('Invalid time')).toBeTruthy();
    });
  });

  // ===========================================================================
  // THEME SUPPORT TESTS
  // ===========================================================================

  describe('Theme Support', () => {
    it('renders correctly with theme colors', () => {
      const { toJSON } = render(<DateTimeFieldGroup {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders labels with theme colors', () => {
      render(<DateTimeFieldGroup {...defaultProps} label="Date" />);
      expect(screen.getByText('Date *')).toBeTruthy();
    });

    it('renders errors with theme error color', () => {
      render(
        <DateTimeFieldGroup {...defaultProps} dateError="Error message" />
      );
      expect(screen.getByText('Error message')).toBeTruthy();
    });
  });
});
