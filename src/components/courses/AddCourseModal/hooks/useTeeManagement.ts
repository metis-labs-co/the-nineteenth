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
  setNewTeeName: (name: string) => void;
  setNewTeeColor: (color: TeeColor) => void;
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

  const handleAddTee = useCallback(() => {
    const newTeeId = onAddTee();
    setEditingTeeId(newTeeId);
    setNewTeeName('');
    setNewTeeColor('white');
  }, [onAddTee]);

  const handleEditTee = useCallback((tee: TeeFormData) => {
    setEditingTeeId(tee.id);
    setNewTeeName(tee.name);
    setNewTeeColor(tee.color);
  }, []);

  const handleSaveTee = useCallback(() => {
    if (editingTeeId && newTeeName.trim()) {
      onUpdateTee(editingTeeId, { name: newTeeName.trim(), color: newTeeColor });
      setEditingTeeId(null);
      setNewTeeName('');
      setNewTeeColor('white');
    }
  }, [editingTeeId, newTeeName, newTeeColor, onUpdateTee]);

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
    setNewTeeName,
    setNewTeeColor,
    handleAddTee,
    handleEditTee,
    handleSaveTee,
    handleCancelEdit,
    handleDeleteTee,
  };
}
