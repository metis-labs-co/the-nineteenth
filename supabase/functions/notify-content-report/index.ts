// supabase/functions/notify-content-report/index.ts
/**
 * Supabase Edge Function: notify-content-report
 *
 * Emails the operator when a content report is filed, so reports can be acted
 * on promptly without an in-app console. Apple requires prompt action, not a
 * particular tool for taking it.
 *
 * Request body: { report_id: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_URL = 'https://api.resend.com/emails';
const MODERATION_INBOX = 'support@thenineteenth.golf';

serve(async (req: Request) => {
  try {
    const { report_id } = await req.json();
    if (!report_id) {
      return new Response(JSON.stringify({ error: 'report_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: report, error } = await supabase
      .from('pending_reports')
      .select('*')
      .eq('id', report_id)
      .single();

    if (error || !report) {
      return new Response(JSON.stringify({ error: 'report not found' }), { status: 404 });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      return new Response(JSON.stringify({ error: 'email not configured' }), { status: 500 });
    }

    const body = [
      `Reason: ${report.reason}`,
      `Type: ${report.content_type}`,
      `Reported by: ${report.reporter_name ?? 'unknown'}`,
      `Author: ${report.author_name ?? 'unknown'}`,
      report.note ? `Note: ${report.note}` : null,
      '',
      `Content: ${report.content_preview ?? '(not previewable)'}`,
      '',
      `Action it with:  SELECT moderate_content('${report.id}', 'actioned');`,
      `Dismiss it with: SELECT moderate_content('${report.id}', 'dismissed');`,
    ]
      .filter(Boolean)
      .join('\n');

    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Nineteenth <noreply@thenineteenth.golf>',
        to: [MODERATION_INBOX],
        subject: `Content report: ${report.reason}`,
        text: body,
      }),
    });

    if (!resendResponse.ok) {
      console.error('Resend rejected the message', await resendResponse.text());
      return new Response(JSON.stringify({ error: 'send failed' }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('notify-content-report failed', e);
    return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 });
  }
});
