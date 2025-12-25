/**
 * Supabase Edge Function: send-support-email
 *
 * Sends support/contact emails via Resend API.
 * Routes emails to appropriate address based on inquiry type.
 *
 * Request body:
 * {
 *   inquiry_type: 'bug' | 'feature' | 'general' | 'account',
 *   subject: string,
 *   message: string,
 *   user_email?: string,    // Optional: sender's email for replies
 *   user_name?: string,     // Optional: sender's name
 *   app_version?: string,   // Optional: app version for bug reports
 *   platform?: string       // Optional: ios/android for bug reports
 * }
 *
 * Email routing:
 * - bug, account → support@thenineteenth.golf
 * - feature, general → contact@thenineteenth.golf
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// =====================================================
// TYPES
// =====================================================

type InquiryType = 'bug' | 'feature' | 'general' | 'account';

interface SendEmailRequest {
  inquiry_type: InquiryType;
  subject: string;
  message: string;
  user_email?: string;
  user_name?: string;
  app_version?: string;
  platform?: string;
}

interface SendEmailResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const RESEND_API_URL = 'https://api.resend.com/emails';

// Email routing based on inquiry type
const EMAIL_ROUTING: Record<InquiryType, string> = {
  bug: 'support@thenineteenth.golf',
  account: 'support@thenineteenth.golf',
  feature: 'contact@thenineteenth.golf',
  general: 'contact@thenineteenth.golf',
};

// Human-readable labels for inquiry types
const INQUIRY_LABELS: Record<InquiryType, string> = {
  bug: 'Bug Report',
  account: 'Account Issue',
  feature: 'Feature Request',
  general: 'General Inquiry',
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate request body
 */
function validateRequest(
  body: unknown
): { valid: true; data: SendEmailRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const request = body as Record<string, unknown>;

  // Validate inquiry_type
  const validTypes: InquiryType[] = ['bug', 'feature', 'general', 'account'];
  if (!request.inquiry_type || !validTypes.includes(request.inquiry_type as InquiryType)) {
    return {
      valid: false,
      error: `inquiry_type must be one of: ${validTypes.join(', ')}`,
    };
  }

  // Validate subject
  if (!request.subject || typeof request.subject !== 'string' || request.subject.trim().length === 0) {
    return { valid: false, error: 'subject is required and must be a non-empty string' };
  }

  if (request.subject.length > 100) {
    return { valid: false, error: 'subject must be 100 characters or less' };
  }

  // Validate message
  if (!request.message || typeof request.message !== 'string' || request.message.trim().length < 10) {
    return { valid: false, error: 'message is required and must be at least 10 characters' };
  }

  if (request.message.length > 1000) {
    return { valid: false, error: 'message must be 1000 characters or less' };
  }

  // Validate optional fields
  if (request.user_email !== undefined && typeof request.user_email !== 'string') {
    return { valid: false, error: 'user_email must be a string if provided' };
  }

  if (request.user_name !== undefined && typeof request.user_name !== 'string') {
    return { valid: false, error: 'user_name must be a string if provided' };
  }

  return {
    valid: true,
    data: {
      inquiry_type: request.inquiry_type as InquiryType,
      subject: request.subject as string,
      message: request.message as string,
      user_email: request.user_email as string | undefined,
      user_name: request.user_name as string | undefined,
      app_version: request.app_version as string | undefined,
      platform: request.platform as string | undefined,
    },
  };
}

/**
 * Build HTML email body
 */
function buildEmailBody(request: SendEmailRequest): string {
  const inquiryLabel = INQUIRY_LABELS[request.inquiry_type];
  const senderInfo = request.user_email
    ? `<p><strong>From:</strong> ${request.user_name || 'User'} &lt;${request.user_email}&gt;</p>`
    : '<p><strong>From:</strong> Anonymous user</p>';

  const deviceInfo =
    request.inquiry_type === 'bug' && (request.app_version || request.platform)
      ? `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="color: #6b7280; font-size: 14px;">
      <strong>Device Info:</strong><br />
      ${request.platform ? `Platform: ${request.platform}<br />` : ''}
      ${request.app_version ? `App Version: ${request.app_version}` : ''}
    </p>`
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%); padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">The Nineteenth</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">New ${inquiryLabel}</p>
  </div>

  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    ${senderInfo}

    <p><strong>Subject:</strong> ${escapeHtml(request.subject)}</p>

    <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 16px;">
      <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(request.message)}</p>
    </div>

    ${deviceInfo}
  </div>

  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
    This email was sent from The Nineteenth app contact form.
  </p>
</body>
</html>
`;
}

/**
 * Build plain text email body
 */
function buildPlainTextBody(request: SendEmailRequest): string {
  const inquiryLabel = INQUIRY_LABELS[request.inquiry_type];
  const senderInfo = request.user_email
    ? `From: ${request.user_name || 'User'} <${request.user_email}>`
    : 'From: Anonymous user';

  const deviceInfo =
    request.inquiry_type === 'bug' && (request.app_version || request.platform)
      ? `\n\n---\nDevice Info:\n${request.platform ? `Platform: ${request.platform}\n` : ''}${request.app_version ? `App Version: ${request.app_version}` : ''}`
      : '';

  return `The Nineteenth - New ${inquiryLabel}

${senderInfo}

Subject: ${request.subject}

Message:
${request.message}
${deviceInfo}

---
This email was sent from The Nineteenth app contact form.
`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      const response: SendEmailResponse = {
        success: false,
        error: 'Email service not configured',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validation = validateRequest(body);

    if (!validation.valid) {
      const response: SendEmailResponse = {
        success: false,
        error: validation.error,
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const request = validation.data;
    const toEmail = EMAIL_ROUTING[request.inquiry_type];
    const inquiryLabel = INQUIRY_LABELS[request.inquiry_type];

    console.log(`Sending ${request.inquiry_type} email to ${toEmail}`);

    // 3. Build email content
    const htmlBody = buildEmailBody(request);
    const textBody = buildPlainTextBody(request);
    const emailSubject = `[${inquiryLabel}] ${request.subject}`;

    // 4. Send email via Resend
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Nineteenth <noreply@thenineteenth.golf>',
        to: [toEmail],
        reply_to: request.user_email || undefined,
        subject: emailSubject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error(`Resend API error: ${resendResponse.status} - ${errorText}`);
      const response: SendEmailResponse = {
        success: false,
        error: 'Failed to send email. Please try again later.',
      };
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendResult = await resendResponse.json();
    console.log(`Email sent successfully. Message ID: ${resendResult.id}`);

    const response: SendEmailResponse = {
      success: true,
      message_id: resendResult.id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    const response: SendEmailResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
