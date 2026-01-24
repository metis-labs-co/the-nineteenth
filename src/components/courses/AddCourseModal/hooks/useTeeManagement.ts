/**
 * useTeeManagement - Hook for managing tee box editing state
 *
 * Handles:
 * - Editing state for tee boxes
 * - Local name and color state during editing
 * - Save/cancel editing actions
 */

import { useState, useCallback } from 'react';
import type { TeeFormData, TeeColor } from '../types';

interface UseTeeManagementProps {
  onAddTee: () => string;
  onUpdateTee: (teeId: string, updates: Partial<TeeFormData>) => void;
  onDeleteTee: (teeId: string) => void;
}

interface UseTeeManagementReturn {
  editingTeeId: string | null;
  newTeeName: string;
  newTeeColor: TeeColor;
  newSlopeRating: string;
  newCourseRating: string;
  setNewTeeName: (name: string) => void;
  setNewTeeColor: (color: TeeColor) => void;
  setNewSlopeRating: (rating: string) => void;
  setNewCourseRating: (rating: string) => void;
  handleAddTee: () => void;
  handleEditTee: (tee: TeeFormData) => void;
  handleSaveTee: () => void;
  handleCancelEdit: (tee: TeeFormData | undefined) => void;
  handleDeleteTee: (teeId: string) => void;
}

export function useTeeManagement({
  onAddTee,
  onUpdateTee,
  onDeleteTee,
}: UseTeeManagementProps): UseTeeManagementReturn {
  const [editingTeeId, setEditingTeeId] = useState<string | null>(null);
  const [newTeeName, setNewTeeName] = useState('');
  const [newTeeColor, setNewTeeColor] = useState<TeeColor>('white');
  const [newSlopeRating, setNewSlopeRating] = useState('');
  const [newCourseRating, setNewCourseRating] = useState('');

  const handleAddTee = useCallback(() => {
    const newTeeId = onAddTee();
    setEditingTeeId(newTeeId);
    setNewTeeName('');
    setNewTeeColor('white');
    setNewSlopeRating('');
    setNewCourseRating('');
  }, [onAddTee]);

  const handleEditTee = useCallback((tee: TeeFormData) => {
    setEditingTeeId(tee.id);
    setNewTeeName(tee.name);
    setNewTeeColor(tee.color);
    setNewSlopeRating(tee.slopeRating?.toString() ?? '');
    setNewCourseRating(tee.courseRating?.toString() ?? '');
  }, []);

  const handleSaveTee = useCallback(() => {
    if (editingTeeId && newTeeName.trim()) {
      // Parse ratings - only include if valid numbers
      const slopeRating = newSlopeRating ? parseFloat(newSlopeRating) : undefined;
      const courseRating = newCourseRating ? parseFloat(newCourseRating) : undefined;

      onUpdateTee(editingTeeId, {
        name: newTeeName.trim(),
        color: newTeeColor,
        slopeRating: slopeRating && !isNaN(slopeRating) ? slopeRating : undefined,
        courseRating: courseRating && !isNaN(courseRating) ? courseRating : undefined,
      });
      setEditingTeeId(null);
      setNewTeeName('');
      setNewTeeColor('white');
      setNewSlopeRating('');
      setNewCourseRating('');
    }
  }, [editingTeeId, newTeeName, newTeeColor, newSlopeRating, newCourseRating, onUpdateTee]);

  const handleCancelEdit = useCallback(
    (tee: TeeFormData | undefined) => {
      setEditingTeeId(null);
      // If tee has no name (newly added), delete it
      if (tee && !tee.name) {
        onDeleteTee(tee.id);
      }
    },
    [onDeleteTee]
  );

  const handleDeleteTee = useCallback(
    (teeId: string) => {
      onDeleteTee(teeId);
      if (editingTeeId === teeId) {
        setEditingTeeId(null);
      }
    },
    [editingTeeId, onDeleteTee]
  );

  return {
    editingTeeId,
    newTeeName,
    newTeeColor,
    newSlopeRating,
    newCourseRating,
    setNewTeeName,
    setNewTeeColor,
    setNewSlopeRating,
    setNewCourseRating,
    handleAddTee,
    handleEditTee,
    handleSaveTee,
    handleCancelEdit,
    handleDeleteTee,
  };
}
