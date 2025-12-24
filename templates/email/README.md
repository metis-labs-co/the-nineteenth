# Supabase Email Templates

Branded email templates for The Nineteenth authentication flows.

## Templates

| File | Supabase Setting | Purpose |
|------|------------------|---------|
| `confirm-signup.html` | Confirm signup | New user email verification |
| `reset-password.html` | Reset password | Password reset request |
| `change-email.html` | Change Email Address | Confirm new email address |
| `magic-link.html` | Magic Link | Passwordless sign in |
| `invite-user.html` | Invite user | Admin invites new user |
| `password-changed.html` | *Manual trigger* | Notification after password change |

## Setup

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Email Templates**
3. Copy the contents of each template into the corresponding section
4. Save changes

### Password Changed Template

Supabase doesn't have a built-in "password changed" notification. To use this template, trigger it manually via:

**Option 1: Supabase Edge Function**

```typescript
// supabase/functions/send-password-changed/index.ts
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  const { email } = await req.json();

  await resend.emails.send({
    from: 'The Nineteenth <hello@yourdomain.com>',
    to: email,
    subject: 'Your password has been changed',
    html: `<!-- paste password-changed.html contents -->`,
  });

  return new Response(JSON.stringify({ success: true }));
});
```

**Option 2: Call from your app after password update**

```typescript
// After successful password change
await supabase.functions.invoke('send-password-changed', {
  body: { email: user.email }
});
```

## SMTP Configuration (Resend)

For custom sender address, configure SMTP in **Project Settings → Authentication → SMTP Settings**:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: re_YOUR_API_KEY
Sender email: hello@yourdomain.com
Sender name: The Nineteenth
```

## Template Variables

Supabase provides these variables for use in templates:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The confirmation/action link |
| `{{ .SiteURL }}` | Your app's site URL |
| `{{ .Email }}` | User's email address |
| `{{ .Token }}` | Raw token (if needed) |

## Customisation

- Brand colour: `#1B5E20` (primary green)
- All styles are inline for email client compatibility
- Templates are mobile-responsive
