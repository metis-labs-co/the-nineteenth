# Staging Auth Testing - Deep Link Redirect Issue

## Problem

When testing sign-up in Expo Go (connected to staging Supabase), the confirmation email redirects to `thenineteenth.golf`, which is configured to redirect to the production app — not Expo Go.

Adding Expo Go's appID to the AASA file won't work because Expo Go has its own bundle ID (`host.exp.Exponent`) and Apple team ID that we don't control.

## Options

### Option 1: Quick fix — Change staging Supabase email templates

In the **staging** Supabase dashboard (Authentication → Email Templates), revert to the default Supabase verification flow instead of routing through the website:

```
{{ .SiteURL }}/auth/v1/verify?token={{ .TokenHash }}&type=signup&redirect_to=thenineteenth://auth/confirm
```

Flow: email link → Supabase server verifies the token → server-side redirect to `thenineteenth://auth/confirm`.

Server-side redirects to custom schemes work more reliably than client-side JavaScript redirects, and Expo Go (SDK 54) handles the `thenineteenth://` scheme.

### Option 2: Best long-term — Use a development build

```bash
eas build --profile development --platform ios
```

A dev build uses the actual bundle ID (`golf.thenineteenth`), so universal links and custom schemes work properly. It installs as a separate app from production, so there's no conflict.

### Option 3: Simplest hack — Uninstall the production app

Uninstall the production app from the test device. The `thenineteenth://` scheme redirect from the website will fall through to Expo Go instead of the production app.

## Recommendation

Option 2 (dev build) is the right investment. Deep linking in Expo Go is a known pain point, and a dev build is needed for proper testing before app store submission anyway.
