// src/hooks/moderation/useReportContent.ts
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/services/supabase/client';

export type ReportReason = 'offensive' | 'harassment' | 'spam' | 'nudity' | 'other';

export interface ReportInput {
  contentType: 'round_comment' | 'round_photo' | 'player';
  contentId: string;
  authorId: string | null;
  reason: ReportReason;
  note?: string;
}

/**
 * Report a comment, photo or player.
 *
 * The content disappears for the reporter immediately because the RLS policies
 * exclude anything they have reported — so the invalidation below is what makes
 * the change visible, not local state. It stays hidden across devices and
 * reinstalls.
 */
export function useReportContent() {
  const queryClient = useQueryClient();
  const [isReporting, setIsReporting] = useState(false);

  const report = useCallback(
    async (input: ReportInput) => {
      setIsReporting(true);
      try {
        const { data: reportId, error } = await (supabase as any).rpc('report_content', {
          p_content_type: input.contentType,
          p_content_id: input.contentId,
          p_author: input.authorId,
          p_reason: input.reason,
          p_note: input.note ?? null,
        });
        if (error) throw error;

        // Best-effort: the report is already recorded, so a failed alert must
        // not surface to the user as a failed report.
        if (reportId) {
          void (supabase as any).functions
            .invoke('notify-content-report', { body: { report_id: reportId } })
            .catch(() => undefined);
        }

        await queryClient.invalidateQueries({ queryKey: ['activity'] });
      } finally {
        setIsReporting(false);
      }
    },
    [queryClient]
  );

  return { report, isReporting };
}
