/**
 * useDataExport - Data export mutation hook
 *
 * Invokes the export-data edge function to download all user data
 * as JSON (GDPR Article 20 - Right to Data Portability).
 * Saves to device and presents the native share sheet.
 */

import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/services/supabase/client';
import { getLocalDateString } from '@/utils/formatting';

export function useDataExport() {
  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('export-data', {
        method: 'GET',
      });

      if (error) {
        throw new Error(error.message || 'Failed to export data');
      }

      // Save JSON to a temporary file using expo-file-system/next API
      const filename = `the-nineteenth-data-export-${getLocalDateString()}.json`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(JSON.stringify(data, null, 2));

      // Check if sharing is available and present share sheet
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Your Data',
          UTI: 'public.json',
        });
      } else {
        Alert.alert(
          'Data Exported',
          'Your data has been exported successfully.',
          [{ text: 'OK' }]
        );
      }
    },
  });

  return {
    exportData: mutation.mutateAsync,
    isExporting: mutation.isPending,
    error: mutation.error,
  };
}
