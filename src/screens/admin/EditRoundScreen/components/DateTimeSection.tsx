/**
 * DateTimeSection - Date and tee time pickers
 *
 * Uses the reusable DateTimeFieldGroup component.
 */

import React, { useCallback } from 'react';
import { DateTimeFieldGroup } from '@/components/common';
import { formatDateAustralian, formatTimeHHMM } from '@/utils/formatting';

interface DateTimeSectionProps {
  date: string;
  teeTime: string;
  onDateChange: (date: string) => void;
  onTeeTimeChange: (time: string) => void;
  onClearTeeTime: () => void;
  getSelectedDate: () => Date;
  getSelectedTime: () => Date;
  disabled?: boolean;
}

export function DateTimeSection({
  date: _date,
  teeTime,
  onDateChange,
  onTeeTimeChange,
  onClearTeeTime,
  getSelectedDate,
  getSelectedTime,
  disabled,
}: DateTimeSectionProps) {
  // Convert Date to string format for parent
  const handleDateChange = useCallback(
    (selectedDate: Date) => {
      onDateChange(formatDateAustralian(selectedDate));
    },
    [onDateChange]
  );

  const handleTimeChange = useCallback(
    (selectedTime: Date) => {
      onTeeTimeChange(formatTimeHHMM(selectedTime));
    },
    [onTeeTimeChange]
  );

  // Get current time value (null if no time set)
  const currentTime = teeTime ? getSelectedTime() : undefined;

  return (
    <DateTimeFieldGroup
      date={getSelectedDate()}
      onDateChange={handleDateChange}
      time={currentTime}
      onTimeChange={handleTimeChange}
      showTime
      timeLabel="Tee Time (Optional)"
      onTimeClear={onClearTeeTime}
      showTimeClear
      disabled={disabled}
      minuteInterval={5}
      testID="edit-round-datetime"
    />
  );
}
