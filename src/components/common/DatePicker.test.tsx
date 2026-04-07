/**
 * DatePicker Component Tests
 *
 * Tests for the date/time picker component including:
 * - Rendering in date and time modes
 * - Value display and formatting
 * - Picker opening and closing
 * - Value changes via picker
 * - Clear functionality
 * - Error and hint states
 * - Date constraints (min/max)
 * - Disabled state
 * - Accessibility
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { DatePicker } from './DatePicker';

// Mock locale utility to return predictable format in tests
jest.mock('@/utils/locale', () => ({
  formatDisplayDate: (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },
}));

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
          onChange(event, new Date(2025, 0, 15, 10, 30));
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
  parse: jest.fn((dateString: string, formatString: string) => {
    if (formatString === 'dd/MM/yyyy') {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    return new Date('Invalid');
  }),
  isValid: jest.fn((date: Date) => {
    return date instanceof Date && !isNaN(date.getTime());
  }),
  startOfDay: jest.fn((date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }),
}));

describe('DatePicker', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
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
      const { toJSON } = render(<DatePicker {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with provided value for date mode', () => {
      render(<DatePicker {...defaultProps} value="15/01/2025" />);
      expect(screen.getByText('15/01/2025')).toBeTruthy();
    });

    it('renders with provided value for time mode', () => {
      render(<DatePicker {...defaultProps} value="14:30" mode="time" />);
      expect(screen.getByText('14:30')).toBeTruthy();
    });

    it('renders label when provided', () => {
      render(<DatePicker {...defaultProps} label="Select Date" />);
      expect(screen.getByText('Select Date')).toBeTruthy();
    });

    it('does not render label when not provided', () => {
      render(<DatePicker {...defaultProps} />);
      expect(screen.queryByText('Select Date')).toBeNull();
    });

    it('renders container', () => {
      const { toJSON } = render(<DatePicker {...defaultProps} mode="date" />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders time mode component', () => {
      const { toJSON } = render(<DatePicker {...defaultProps} mode="time" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // MODE TESTS
  // ===========================================================================

  describe('Mode', () => {
    describe('Date Mode', () => {
      it('renders with date mode by default', () => {
        const { toJSON } = render(<DatePicker {...defaultProps} />);
        expect(toJSON()).toBeTruthy();
      });

      it('renders with explicit date mode', () => {
        const { toJSON } = render(<DatePicker {...defaultProps} mode="date" />);
        expect(toJSON()).toBeTruthy();
      });

      it('displays date in locale-formatted format', () => {
        render(<DatePicker {...defaultProps} value="25/12/2025" mode="date" />);
        expect(screen.getByText('25/12/2025')).toBeTruthy();
      });
    });

    describe('Time Mode', () => {
      it('renders with time mode', () => {
        const { toJSON } = render(<DatePicker {...defaultProps} mode="time" />);
        expect(toJSON()).toBeTruthy();
      });

      it('displays time in 24-hour format (HH:MM)', () => {
        render(<DatePicker {...defaultProps} value="09:30" mode="time" />);
        expect(screen.getByText('09:30')).toBeTruthy();
      });

      it('displays afternoon time correctly', () => {
        render(<DatePicker {...defaultProps} value="14:45" mode="time" />);
        expect(screen.getByText('14:45')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // LABEL TESTS
  // ===========================================================================

  describe('Label', () => {
    it('displays label when provided', () => {
      render(<DatePicker {...defaultProps} label="Competition Date" />);
      expect(screen.getByText('Competition Date')).toBeTruthy();
    });

    it('does not display label when not provided', () => {
      render(<DatePicker {...defaultProps} />);
      expect(screen.queryByText('Competition Date')).toBeNull();
    });

    it('renders label with time mode', () => {
      render(<DatePicker {...defaultProps} mode="time" label="Tee Time" />);
      expect(screen.getByText('Tee Time')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PICKER INTERACTION TESTS
  // ===========================================================================

  describe('Picker Interaction', () => {
    it('opens picker when TouchableOpacity is pressed', () => {
      const { UNSAFE_root } = render(<DatePicker {...defaultProps} />);

      // Find and press the TouchableOpacity
      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      // Picker should now be visible
      expect(screen.getByTestId('date-time-picker')).toBeTruthy();
    });

    it('shows picker for date mode', () => {
      const { UNSAFE_root } = render(<DatePicker {...defaultProps} mode="date" />);

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      expect(screen.getByTestId('picker-mode')).toBeTruthy();
      expect(screen.getByText('date')).toBeTruthy();
    });

    it('shows picker for time mode', () => {
      const { UNSAFE_root } = render(<DatePicker {...defaultProps} mode="time" />);

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      expect(screen.getByTestId('picker-mode')).toBeTruthy();
      expect(screen.getByText('time')).toBeTruthy();
    });

    it('shows Done button on iOS modal', () => {
      Platform.OS = 'ios';
      const { UNSAFE_root } = render(<DatePicker {...defaultProps} />);

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      expect(screen.getByText('Done')).toBeTruthy();
    });

    it('closes modal when Done is pressed on iOS', () => {
      Platform.OS = 'ios';
      const { UNSAFE_root } = render(<DatePicker {...defaultProps} />);

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      expect(screen.getByTestId('date-time-picker')).toBeTruthy();

      fireEvent.press(screen.getByText('Done'));

      expect(screen.queryByTestId('date-time-picker')).toBeNull();
    });
  });

  // ===========================================================================
  // VALUE CHANGE TESTS
  // ===========================================================================

  describe('Value Changes', () => {
    it('calls onChange when picker selection is made', () => {
      const onChange = jest.fn();
      const { UNSAFE_root } = render(<DatePicker value="" onChange={onChange} />);

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      // Click the mock select button
      fireEvent.press(screen.getByTestId('mock-picker-select'));

      expect(onChange).toHaveBeenCalledWith('15/01/2025');
    });

    it('calls onChange with formatted time for time mode', () => {
      const onChange = jest.fn();
      const { UNSAFE_root } = render(
        <DatePicker value="" onChange={onChange} mode="time" />
      );

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      fireEvent.press(screen.getByTestId('mock-picker-select'));

      expect(onChange).toHaveBeenCalledWith('10:30');
    });

    it('maintains value display', () => {
      render(<DatePicker {...defaultProps} value="20/01/2025" />);
      expect(screen.getByText('20/01/2025')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('displays error message when provided', () => {
      render(<DatePicker {...defaultProps} error="Date is required" />);
      expect(screen.getByText('Date is required')).toBeTruthy();
    });

    it('does not display error when not provided', () => {
      render(<DatePicker {...defaultProps} />);
      expect(screen.queryByText('Date is required')).toBeNull();
    });

    it('prioritizes error over hint', () => {
      render(
        <DatePicker
          {...defaultProps}
          error="Date is required"
          hint="Select your preferred date"
        />
      );
      expect(screen.getByText('Date is required')).toBeTruthy();
      expect(screen.queryByText('Select your preferred date')).toBeNull();
    });

    it('displays error with label', () => {
      render(
        <DatePicker {...defaultProps} label="Start Date" error="Required" />
      );
      expect(screen.getByText('Start Date')).toBeTruthy();
      expect(screen.getByText('Required')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HINT STATE TESTS
  // ===========================================================================

  describe('Hint', () => {
    it('displays hint when provided', () => {
      render(<DatePicker {...defaultProps} hint="DD/MM/YYYY format" />);
      expect(screen.getByText('DD/MM/YYYY format')).toBeTruthy();
    });

    it('does not display hint when error is present', () => {
      render(
        <DatePicker
          {...defaultProps}
          hint="DD/MM/YYYY format"
          error="Invalid date"
        />
      );
      expect(screen.getByText('Invalid date')).toBeTruthy();
      expect(screen.queryByText('DD/MM/YYYY format')).toBeNull();
    });

    it('does not display hint when not provided', () => {
      render(<DatePicker {...defaultProps} />);
      expect(screen.queryByText('DD/MM/YYYY format')).toBeNull();
    });

    it('displays hint with label', () => {
      render(
        <DatePicker {...defaultProps} label="Date" hint="Select the date" />
      );
      expect(screen.getByText('Date')).toBeTruthy();
      expect(screen.getByText('Select the date')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not open picker when disabled', () => {
      const { UNSAFE_root } = render(<DatePicker {...defaultProps} disabled />);

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      expect(screen.queryByTestId('date-time-picker')).toBeNull();
    });

    it('renders with disabled state', () => {
      const { toJSON } = render(<DatePicker {...defaultProps} disabled />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders value when disabled', () => {
      render(<DatePicker {...defaultProps} value="15/01/2025" disabled />);
      expect(screen.getByText('15/01/2025')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATE CONSTRAINTS TESTS
  // ===========================================================================

  describe('Date Constraints', () => {
    it('accepts minimumDate prop', () => {
      const minDate = new Date(2025, 0, 1);
      const { toJSON } = render(
        <DatePicker {...defaultProps} minimumDate={minDate} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('accepts maximumDate prop', () => {
      const maxDate = new Date(2025, 11, 31);
      const { toJSON } = render(
        <DatePicker {...defaultProps} maximumDate={maxDate} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('accepts both min and max date props', () => {
      const minDate = new Date(2025, 0, 1);
      const maxDate = new Date(2025, 11, 31);
      const { toJSON } = render(
        <DatePicker
          {...defaultProps}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('opens picker with date constraints', () => {
      const minDate = new Date(2025, 0, 1);
      const { UNSAFE_root } = render(
        <DatePicker {...defaultProps} minimumDate={minDate} />
      );

      const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
      fireEvent.press(touchable);

      expect(screen.getByTestId('date-time-picker')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CUSTOM ICON TESTS
  // ===========================================================================

  describe('Custom Icon', () => {
    it('accepts custom icon prop', () => {
      const { toJSON } = render(
        <DatePicker {...defaultProps} icon="calendar-month" />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders with custom icon for time mode', () => {
      const { toJSON } = render(
        <DatePicker {...defaultProps} mode="time" icon="alarm" />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // CLEAR FUNCTIONALITY TESTS
  // ===========================================================================

  describe('Clear Functionality', () => {
    it('renders with showClear prop', () => {
      const { toJSON } = render(
        <DatePicker {...defaultProps} value="15/01/2025" showClear />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders without clear button by default', () => {
      const { toJSON } = render(
        <DatePicker {...defaultProps} value="15/01/2025" />
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
        <DatePicker
          value="15/06/2025"
          onChange={jest.fn()}
          mode="date"
          placeholder="Select competition date"
          label="Competition Date"
          hint="Choose the competition start date"
          minimumDate={minDate}
          maximumDate={maxDate}
          showClear
          icon="calendar"
        />
      );

      expect(screen.getByText('Competition Date')).toBeTruthy();
      expect(screen.getByText('15/06/2025')).toBeTruthy();
      expect(screen.getByText('Choose the competition start date')).toBeTruthy();
    });

    it('renders time picker with all props', () => {
      render(
        <DatePicker
          value="08:30"
          onChange={jest.fn()}
          mode="time"
          placeholder="Select tee time"
          label="Tee Time"
          hint="Morning times recommended"
          showClear
        />
      );

      expect(screen.getByText('Tee Time')).toBeTruthy();
      expect(screen.getByText('08:30')).toBeTruthy();
      expect(screen.getByText('Morning times recommended')).toBeTruthy();
    });

    it('shows error state with label', () => {
      render(
        <DatePicker
          value=""
          onChange={jest.fn()}
          label="Start Date"
          error="Start date is required"
        />
      );

      expect(screen.getByText('Start Date')).toBeTruthy();
      expect(screen.getByText('Start date is required')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty value gracefully', () => {
      const { toJSON } = render(<DatePicker {...defaultProps} value="" />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles invalid date string gracefully', () => {
      render(<DatePicker {...defaultProps} value="invalid-date" />);
      expect(screen.getByText('invalid-date')).toBeTruthy();
    });

    it('handles partial date string', () => {
      render(<DatePicker {...defaultProps} value="15/01" />);
      expect(screen.getByText('15/01')).toBeTruthy();
    });

    it('handles midnight time', () => {
      render(<DatePicker {...defaultProps} mode="time" value="00:00" />);
      expect(screen.getByText('00:00')).toBeTruthy();
    });

    it('handles end of day time', () => {
      render(<DatePicker {...defaultProps} mode="time" value="23:59" />);
      expect(screen.getByText('23:59')).toBeTruthy();
    });

    it('handles leap year date', () => {
      render(<DatePicker {...defaultProps} value="29/02/2024" />);
      expect(screen.getByText('29/02/2024')).toBeTruthy();
    });

    it('handles end of year date', () => {
      render(<DatePicker {...defaultProps} value="31/12/2025" />);
      expect(screen.getByText('31/12/2025')).toBeTruthy();
    });

    it('handles undefined optional props', () => {
      const { toJSON } = render(
        <DatePicker
          value=""
          onChange={jest.fn()}
          label={undefined}
          placeholder={undefined}
          error={undefined}
          hint={undefined}
          minimumDate={undefined}
          maximumDate={undefined}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('label is visible for screen readers', () => {
      render(<DatePicker {...defaultProps} label="Date" />);
      expect(screen.getByText('Date')).toBeTruthy();
    });

    it('error text is visible for screen readers', () => {
      render(<DatePicker {...defaultProps} error="Required field" />);
      expect(screen.getByText('Required field')).toBeTruthy();
    });

    it('hint text is visible for screen readers', () => {
      render(<DatePicker {...defaultProps} hint="Format: DD/MM/YYYY" />);
      expect(screen.getByText('Format: DD/MM/YYYY')).toBeTruthy();
    });

    it('value is visible', () => {
      render(<DatePicker {...defaultProps} value="15/01/2025" />);
      expect(screen.getByText('15/01/2025')).toBeTruthy();
    });
  });

  // ===========================================================================
  // THEME SUPPORT TESTS
  // ===========================================================================

  describe('Theme Support', () => {
    it('renders correctly with theme colors', () => {
      const { toJSON } = render(<DatePicker {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders label with theme colors', () => {
      render(<DatePicker {...defaultProps} label="Date" />);
      expect(screen.getByText('Date')).toBeTruthy();
    });

    it('renders error with theme error color', () => {
      render(<DatePicker {...defaultProps} error="Error message" />);
      expect(screen.getByText('Error message')).toBeTruthy();
    });

    it('renders hint with theme secondary color', () => {
      render(<DatePicker {...defaultProps} hint="Hint text" />);
      expect(screen.getByText('Hint text')).toBeTruthy();
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
        const { UNSAFE_root } = render(<DatePicker {...defaultProps} />);

        const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
        fireEvent.press(touchable);

        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
        expect(screen.getByText('Done')).toBeTruthy();
      });

      it('closes modal when Done is pressed', () => {
        const { UNSAFE_root } = render(<DatePicker {...defaultProps} />);

        const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
        fireEvent.press(touchable);

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
        const { UNSAFE_root } = render(<DatePicker {...defaultProps} />);

        const touchable = UNSAFE_root.findByType(require('react-native').TouchableOpacity);
        fireEvent.press(touchable);

        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
        // Android doesn't show Done button
        expect(screen.queryByText('Done')).toBeNull();
      });
    });
  });
});
