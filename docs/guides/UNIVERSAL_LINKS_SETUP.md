# Universal Links Setup Guide

This guide explains how to set up Universal Links (iOS) and App Links (Android) so that email links work from Gmail and other email clients.

## Why This Is Needed

Email clients like Gmail **do not support custom URL schemes** (e.g., `thenineteenth://...`) for security reasons. They only make `http://` and `https://` links clickable.

Universal Links allow `https://thenineteenth.golf/auth/...` URLs to:
1. Open directly in the app when installed
2. Fall back to a web page when the app is not installed

## Files to Host on Your Website

You need to host two verification files on `thenineteenth.golf`:

### 1. iOS: Apple App Site Association

**File location:** `https://thenineteenth.golf/.well-known/apple-app-site-association`

**Content (no file extension, serve as `application/json`):**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "9D3K8VW249.golf.thenineteenth",
        "paths": ["/app/auth/*"]
      }
    ]
  }
}
```

> **Note:** We use `/app/auth/*` instead of `/auth/*` to avoid conflicts with existing web auth routes.

**Important:**
- The `appID` format is `<Team ID>.<Bundle ID>`
- Team ID: `9D3K8VW249` (from app.json)
- Bundle ID: `golf.thenineteenth`
- Must be served over HTTPS with valid certificate
- Must NOT have a file extension
- Content-Type must be `application/json`

### 2. Android: Asset Links

**File location:** `https://thenineteenth.golf/.well-known/assetlinks.json`

**Content:**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "golf.thenineteenth",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

**To get your SHA256 fingerprint:**

```bash
# For debug builds
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For production (EAS managed credentials)
eas credentials -p android
# Look for the SHA256 fingerprint in the output
```

## Web Redirect Page (Required)

Create a page at `https://thenineteenth.golf/app/auth/*` that handles redirects. This page should:

1. Attempt to open the app using the custom scheme
2. Show a fallback if app is not installed

**Example `/app/auth/confirm.html` (or Next.js page at `app/app/auth/confirm/page.tsx`):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opening The Nineteenth...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
      text-align: center;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 { color: #1a1a1a; margin-bottom: 16px; }
    p { color: #4a4a4a; margin-bottom: 24px; }
    .button {
      display: inline-block;
      background: #6eac4d;
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
    .store-links { margin-top: 24px; }
    .store-links a { margin: 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Opening The Nineteenth...</h1>
    <p>If the app doesn't open automatically, tap the button below.</p>
    <a id="openApp" class="button" href="#">Open App</a>
    <div class="store-links">
      <p style="font-size: 14px; color: #888;">Don't have the app?</p>
      <a href="https://apps.apple.com/app/the-nineteenth/id123456789">App Store</a>
      <a href="https://play.google.com/store/apps/details?id=golf.thenineteenth">Google Play</a>
    </div>
  </div>
  <script>
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    // Build the custom scheme URL
    const path = window.location.pathname.replace('/app/auth/', '');
    const appUrl = `thenineteenth://auth/${path}?token_hash=${tokenHash}&type=${type}`;

    // Update button href
    document.getElementById('openApp').href = appUrl;

    // Try to open the app automatically
    window.location.href = appUrl;
  </script>
</body>
</html>
```

## App Configuration (Already Done)

The following has been configured in `app.json`:

### iOS
```json
"associatedDomains": [
  "applinks:thenineteenth.golf",
  "applinks:www.thenineteenth.golf"
]
```

### Android
```json
"intentFilters": [
  {
    "action": "VIEW",
    "autoVerify": true,
    "data": [
      {
        "scheme": "https",
        "host": "thenineteenth.golf",
        "pathPrefix": "/app/auth"
      },
      {
        "scheme": "https",
        "host": "www.thenineteenth.golf",
        "pathPrefix": "/app/auth"
      }
    ],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

## Email Templates (Already Updated)

All email templates have been updated to use `https://thenineteenth.golf/app/auth/...` URLs:

- `confirm-signup.html` → `/app/auth/confirm`
- `magic-link.html` → `/app/auth/magic-link`
- `reset-password.html` → `/app/auth/reset-password`
- `change-email.html` → `/app/auth/confirm-email-change`
- `invite-user.html` → `/app/auth/invite`
- `reauthentication.html` → `/app/auth/reauthenticate`

> **Why `/app/auth/` instead of `/auth/`?** To avoid conflicts with existing web authentication routes.

## Deployment Steps

1. **Build new app version** (required for iOS/Android configuration changes):
   ```bash
   eas build --platform ios
   eas build --platform android
   ```

2. **Host verification files** on thenineteenth.golf:
   - `/.well-known/apple-app-site-association`
   - `/.well-known/assetlinks.json`

3. **Create redirect pages** for each auth path:
   - `/app/auth/confirm`
   - `/app/auth/magic-link`
   - `/app/auth/reset-password`
   - `/app/auth/confirm-email-change`
   - `/app/auth/invite`
   - `/app/auth/reauthenticate`

4. **Update Supabase email templates** in the Supabase dashboard with the new template HTML

5. **Test the flow**:
   - Send a test email
   - Click link in Gmail
   - Verify it opens the app

## Verification

### Test iOS Universal Links
```bash
# Check if Apple can fetch your file
curl -I https://thenineteenth.golf/.well-known/apple-app-site-association
```

### Test Android App Links
```bash
# Use the Android App Links Assistant in Android Studio
# Or check Google's validation tool:
# https://developers.google.com/digital-asset-links/tools/generator
```

## Troubleshooting

### Links still not working?

1. **Cache issues**: iOS caches AASA files. Delete and reinstall the app.
2. **HTTPS required**: Both files must be served over HTTPS.
3. **Content-Type**: AASA must be `application/json`.
4. **No redirects**: The .well-known files must NOT redirect.
5. **Rebuild required**: Native changes require a new build (not just OTA update).

### Debug on device

iOS: Enable Developer Mode and check Settings > Developer > Associated Domains Diagnostics

Android: Use `adb logcat | grep "IntentFilter"` to debug.
