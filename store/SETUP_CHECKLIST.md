# App Store Submission Setup Checklist

Complete these steps before submitting to the App Store and Google Play.

---

## 1. EAS Project Setup

### Run EAS Init
```bash
npx eas-cli login        # Login to your Expo account
npx eas-cli init         # Initialize EAS project
```

This will:
- Create a project on Expo's servers
- Generate a unique project ID
- Update `app.json` automatically with the project ID

### After Running `eas init`

The following will be automatically updated in `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  // Auto-generated
  }
}
```

**Manually update** `app.json`:
```json
"owner": "your-expo-username",  // Your Expo account username
"updates": {
  "url": "https://u.expo.dev/YOUR_PROJECT_ID"  // Use the generated project ID
}
```

---

## 2. Apple Developer Setup

### Prerequisites
- Apple Developer Program membership ($99/year)
- App Store Connect access

### Get Your Apple Credentials

| Credential | Where to Find | Update In |
|------------|---------------|-----------|
| Apple ID | Your Apple account email | `eas.json` → `appleId` |
| Apple Team ID | [Apple Developer Portal](https://developer.apple.com/account) → Membership → Team ID | `eas.json` → `appleTeamId` |
| App Store Connect App ID | Create app in App Store Connect → App Information → Apple ID | `eas.json` → `ascAppId` |

### Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: The Nineteenth
   - Primary Language: English (Australia)
   - Bundle ID: `com.thenineteenth.app`
   - SKU: `the-nineteenth-ios`
4. Save and note the **Apple ID** (numeric, e.g., `1234567890`)

### Update `eas.json`
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your.email@example.com",      // TODO: Your Apple ID email
      "ascAppId": "1234567890",                  // TODO: From App Store Connect
      "appleTeamId": "XXXXXXXXXX"                // TODO: 10-character Team ID
    }
  }
}
```

---

## 3. Google Play Setup

### Prerequisites
- Google Play Developer account ($25 one-time)
- Google Cloud project for service account

### Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google Play Android Developer API"
4. Go to IAM & Admin → Service Accounts
5. Create service account with name like "eas-submit"
6. Create JSON key and download it
7. Save as `google-service-account.json` in project root

### Link Service Account to Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Settings → API access
3. Link your Google Cloud project
4. Grant "Release manager" access to your service account

### Create App in Google Play Console
1. All apps → Create app
2. Fill in:
   - App name: The Nineteenth
   - Default language: English (Australia)
   - App or game: App
   - Free or paid: Free
3. Complete the app content questionnaire

### Update `.gitignore`
Ensure service account key is not committed:
```
# Already in .gitignore, but verify:
google-service-account.json
```

---

## 4. Update Legal Documents

Replace placeholders in `store/legal/` files:

| Placeholder | Replace With |
|-------------|--------------|
| `[DATE]` | Current date (e.g., "15 December 2024") |
| `[SUPPORT_EMAIL]` | Your support email (e.g., "support@thenineteenth.app") |
| `[WEBSITE_URL]` | Your website (e.g., "https://thenineteenth.app") |

### Host Legal Pages
You need to host these documents publicly. Options:
1. **Your website** - Upload HTML versions to your domain
2. **GitHub Pages** - Free hosting for static files
3. **Notion** - Create public pages (free)
4. **Termly/Iubenda** - Legal document hosting services

### URLs to Provide
After hosting, update `store/APP_STORE_METADATA.md` with actual URLs:
- Privacy Policy: `https://thenineteenth.app/privacy`
- Terms of Service: `https://thenineteenth.app/terms`
- Support: `https://thenineteenth.app/support`

---

## 5. Build and Test

### Development Build (for testing)
```bash
# iOS Simulator
eas build --platform ios --profile development

# Android Emulator/Device
eas build --platform android --profile development
```

### Preview Build (for internal testing)
```bash
# iOS (requires Apple Developer account)
eas build --platform ios --profile preview

# Android APK (easy to share)
eas build --platform android --profile preview
```

### Production Build (for store submission)
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

---

## 6. Submit to Stores

### iOS App Store
```bash
eas submit --platform ios --profile production
```

Or manually:
1. Download `.ipa` from EAS dashboard
2. Upload via Transporter app or `xcrun altool`

### Google Play Store
```bash
eas submit --platform android --profile production
```

Or manually:
1. Download `.aab` from EAS dashboard
2. Upload in Google Play Console → Release → Production

---

## Quick Reference: Files to Update

### `app.json`
- [ ] `extra.eas.projectId` → Run `eas init`
- [ ] `owner` → Your Expo username
- [ ] `updates.url` → Use your project ID

### `eas.json`
- [ ] `ios.appleId` → Your Apple ID email
- [ ] `ios.ascAppId` → App Store Connect App ID
- [ ] `ios.appleTeamId` → Apple Team ID
- [ ] `android.serviceAccountKeyPath` → Verify path is correct

### `store/legal/`
- [ ] `PRIVACY_POLICY.md` → Replace all placeholders
- [ ] `TERMS_OF_SERVICE.md` → Replace all placeholders
- [ ] `SUPPORT.md` → Replace all placeholders

### Root Directory
- [ ] `google-service-account.json` → Download from Google Cloud

---

## Final Checklist

### Before First Build
- [ ] Ran `eas init` and got project ID
- [ ] Updated `app.json` with owner and project ID
- [ ] Have Apple Developer account
- [ ] Have Google Play Developer account
- [ ] Created apps in both stores

### Before Submission
- [ ] Updated `eas.json` with Apple credentials
- [ ] Created and saved Google service account JSON
- [ ] Production build completes without errors
- [ ] Tested production build on physical device
- [ ] Legal documents hosted and accessible
- [ ] Screenshots prepared (see SCREENSHOT_GUIDE.md)
- [ ] App Store metadata ready (see APP_STORE_METADATA.md)

### In App Store Connect
- [ ] App information complete
- [ ] Pricing set (Free)
- [ ] Screenshots uploaded
- [ ] Privacy policy URL added
- [ ] Age rating questionnaire complete
- [ ] App review information filled

### In Google Play Console
- [ ] Store listing complete
- [ ] Content rating questionnaire complete
- [ ] Target audience set
- [ ] Data safety form complete
- [ ] Screenshots uploaded

---

## Common Issues

### "No matching provisioning profile"
Run: `eas credentials` and follow prompts to create/update profiles

### "App Store Connect API key not found"
You may need to create an API key in App Store Connect:
1. Users and Access → Keys → App Store Connect API
2. Generate key with "Admin" access
3. Download and store securely

### "Service account doesn't have permission"
Ensure service account has "Release manager" role in Play Console

### Build fails with signing error
Run: `eas credentials --platform ios` to manage certificates

---

*Good luck with your submission!*
