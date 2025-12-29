/**
 * CompetitionBasicInfo - Name and description fields
 */

import React from 'react';
import { Controller } from 'react-hook-form';
import { FormInput } from '@/components/common';
import type { Control, FieldErrors } from 'react-hook-form';
import type { EditCompetitionFormData } from '../hooks/useCompetitionValidation';

interface CompetitionBasicInfoProps {
  control: Control<EditCompetitionFormData>;
  errors: FieldErrors<EditCompetitionFormData>;
}

export function CompetitionBasicInfo({ control, errors }: CompetitionBasicInfoProps) {
  return (
    <>
      {/* Competition Name */}
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Competition Name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Enter competition name"
            error={errors.name?.message}
            required
          />
        )}
      />

      {/* Description */}
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label="Description"
            value={value || ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Enter description"
            multiline
            numberOfLines={4}
            error={errors.description?.message}
          />
        )}
      />
    </>
  );
}
