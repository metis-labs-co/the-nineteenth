/**
 * DateTimeFields - Date and time picker fields
 *
 * Uses the reusable DateTimeFieldGroup component.
 */

import React, { memo, useCallback } from 'react';
import { DateTimeFieldGroup } from '@/components/common';

interface DateTimeFieldsProps {
  date: string;
  teeTime: string;
  dateError?: string;
  onDateChange: (date: Date) => void;
  onTimeChange: (time: Date) => void;
  onClearTime: () => void;
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
  disabled?: boolean;
}

export const DateTimeFields = memo(function DateTimeFields({
  date: _date,
  teeTime,
  dateError,
  onDateChange,
  onTimeChange,
  onClearTime,
  getSelectedDate,
  getSelectedTime,
  disabled,
}: DateTimeFieldsProps) {
  // Get current time value (undefined if no time set)
  const currentTime = teeTime ? getSelectedTime() : undefined;

  // Handle time change - pass Date directly
  const handleTimeChange = useCallback(
    (selectedTime: Date) => {
      onTimeChange(selectedTime);
    },
    [onTimeChange]
  );

  return (
    <DateTimeFieldGroup
      date={getSelectedDate()}
      onDateChange={onDateChange}
      time={currentTime}
      onTimeChange={handleTimeChange}
      showTime
      timeLabel="Tee Time (Optional)"
      dateError={dateError}
      onTimeClear={onClearTime}
      showTimeClear
      disabled={disabled}
      minuteInterval={5}
      testID="add-round-datetime"
    />
  );
});
