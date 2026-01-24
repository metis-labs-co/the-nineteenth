/**
 * useConfirmationDialog Hook
 *
 * @description
 * A reusable hook that standardizes dialog state management for ConfirmationDialog.
 * Use this hook to replace Alert.alert calls with the themed ConfirmationDialog component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { dialogConfig, showDialog, showAlert, dismissDialog } = useConfirmationDialog();
 *
 *   const handleDelete = () => {
 *     showDialog({
 *       title: 'Delete Item',
 *       message: 'Are you sure you want to delete this item?',
 *       confirmLabel: 'Delete',
 *       confirmVariant: 'destructive',
 *       icon: 'trash-can-outline',
 *       onConfirm: () => {
 *         // perform delete
 *         dismissDialog();
 *       },
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <Button onPress={handleDelete}>Delete</Button>
 *       <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';

export interface DialogConfig {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'destructive';
  onConfirm: () => void;
  loading?: boolean;
  icon?: string;
  // Secondary action (3-button dialogs)
  showSecondaryAction?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const defaultConfig: DialogConfig = {
  visible: false,
  title: '',
  message: '',
  onConfirm: () => {},
};

export function useConfirmationDialog() {
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>(defaultConfig);

  const showDialog = useCallback((config: Omit<DialogConfig, 'visible'>) => {
    setDialogConfig({ ...config, visible: true });
  }, []);

  const dismissDialog = useCallback(() => {
    setDialogConfig(prev => ({ ...prev, visible: false }));
  }, []);

  // Set loading state on the dialog (useful for async confirmations)
  const setLoading = useCallback((loading: boolean) => {
    setDialogConfig(prev => ({ ...prev, loading }));
  }, []);

  // Convenience for simple info/error alerts (single "OK" button)
  const showAlert = useCallback((title: string, message: string) => {
    setDialogConfig({
      visible: true,
      title,
      message,
      confirmLabel: 'OK',
      cancelLabel: '',
      onConfirm: () => setDialogConfig(prev => ({ ...prev, visible: false })),
    });
  }, []);

  return {
    dialogConfig,
    showDialog,
    showAlert,
    dismissDialog,
    setLoading,
  };
}

export type UseConfirmationDialogReturn = ReturnType<typeof useConfirmationDialog>;
