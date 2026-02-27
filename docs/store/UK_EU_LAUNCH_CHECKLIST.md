# UK & EU Launch Checklist

**The Nineteenth — Store Configuration for UK & EU Markets**
**Last Updated: February 2026**

> This checklist covers the non-code steps required to make the app available in the UK and EU.

---

## 1. App Store Connect (Apple)

### Pricing & Availability
- [ ] Navigate to **App Store Connect > My Apps > The Nineteenth > Pricing and Availability**
- [ ] Enable **United Kingdom** in the country list
- [ ] Enable all **27 EU member states**: Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden
- [ ] Verify GBP and EUR pricing tiers align with AUD equivalents for Social and Premium subscriptions
- [ ] Review auto-generated pricing for each territory and adjust if needed

### App Privacy
- [ ] Navigate to **App Store Connect > App Privacy**
- [ ] Verify all data collection declarations are current:
  - Contact Info (email)
  - Identifiers (user ID)
  - Usage Data (product interaction)
  - Purchases (subscription history)
  - Location (approximate, when permitted)
- [ ] Confirm **Data Linked to You** includes: Email, Name, User ID
- [ ] Confirm **Data Not Linked to You** includes: Crash Data, Performance Data

### Account Deletion
- [ ] Navigate to **App Store Connect > App Information**
- [ ] Under **Account Deletion**, select **Yes** for "Does your app offer account deletion?"
- [ ] Provide the account deletion URL/instructions: Profile > Privacy & Data > Delete Account
- [ ] Verify the flow works end-to-end before submission

### App Review Notes
- [ ] Update review notes to mention UK/EU availability
- [ ] Include test account credentials for reviewers
- [ ] Note that account deletion is available in Profile > Privacy & Data

---

## 2. Google Play Console

### Availability
- [ ] Navigate to **Google Play Console > Release > Production > Countries / regions**
- [ ] Enable **United Kingdom**
- [ ] Enable all **27 EU countries** (same list as above)
- [ ] Set pricing in GBP and EUR

### Data Safety
- [ ] Navigate to **Google Play Console > App content > Data safety**
- [ ] Review and update data safety declarations:
  - Data collected: Email, Name, User IDs, App interactions, Purchase history
  - Data shared: None (no third-party sharing)
  - Security practices: Data encrypted in transit, data can be deleted
- [ ] Confirm **Account deletion** is declared as available
- [ ] Add link to Privacy Policy

### Account Deletion
- [ ] Under **Data safety > Data deletion**, select "Users can request that their data is deleted"
- [ ] Provide the in-app path: Profile > Privacy & Data > Delete Account

---

## 3. RevenueCat

- [ ] Navigate to **RevenueCat Dashboard > Project Settings > Apps**
- [ ] Verify offerings (Social Monthly, Social Yearly, Premium Monthly, Premium Yearly) are available in UK and EU territories
- [ ] Check that Apple and Google IAP products are configured for new territories
- [ ] Verify GBP and EUR pricing is correct in each store
- [ ] Test purchase flow from a UK/EU device or VPN

---

## 4. Legal & Regulatory

### ICO Registration (UK)
- [ ] Register with the **Information Commissioner's Office** (ICO)
- [ ] Website: https://ico.org.uk/for-organisations/register/
- [ ] Cost: ~GBP 40/year (for small organisations with turnover under GBP 632,000)
- [ ] Add ICO registration number to Privacy Policy once issued

### EU Representative (GDPR Article 27)
- [ ] If not established in the EU, appoint an **EU Representative**
- [ ] Services available: GDPR-Rep.eu, DataRep, Prighter (EUR 100-500/year)
- [ ] Add representative's name and contact details to Privacy Policy Section 11
- [ ] Representative must be in an EU member state

### Legal Document Review
- [ ] Have updated Privacy Policy reviewed by a lawyer familiar with GDPR
- [ ] Have updated Terms of Service reviewed by same lawyer
- [ ] Verify GDPR Article 13/14 requirements are met (information provided at collection)
- [ ] Verify GDPR Article 15-20 rights are implementable (access, rectification, erasure, portability)

---

## 5. Technical Verification

### Pre-Launch Testing
- [ ] Test account deletion flow end-to-end (create account, add data, delete, verify removal)
- [ ] Test data export flow (trigger export, verify JSON contains all user data, verify share sheet)
- [ ] Test signup screen legal links (tap Terms, tap Privacy — should open in browser)
- [ ] Verify Privacy & Data screen is accessible from Profile menu
- [ ] Test from UK/EU timezone to verify date formatting works correctly

### Database
- [ ] Run migration `20260227000000_account_deletion.sql` on production
- [ ] Deploy `delete-account` edge function: `supabase functions deploy delete-account`
- [ ] Deploy `export-data` edge function: `supabase functions deploy export-data`
- [ ] Set any required secrets: `supabase secrets set REVENUECAT_API_KEY=...`

---

## 6. Post-Launch Monitoring

- [ ] Monitor error rates for delete-account and export-data functions
- [ ] Track account deletion requests (volume and success rate)
- [ ] Track data export requests
- [ ] Monitor for GDPR/ICO complaints via support@thenineteenth.golf
- [ ] Set up alerts for failed deletion attempts

---

## Timeline

| Step | Task | Est. Time | Dependencies |
|------|------|-----------|--------------|
| 1 | App Store Connect configuration | 1 hour | Legal docs finalised |
| 2 | Google Play Console configuration | 1 hour | Legal docs finalised |
| 3 | RevenueCat verification | 30 min | Store configuration |
| 4a | ICO registration | 1 week (processing) | None |
| 4b | EU Representative appointment | 1-2 weeks | None |
| 4c | Legal review | 1-2 weeks | Updated docs |
| 5 | Technical verification | 2 hours | Deployment |
| 6 | Post-launch monitoring setup | 1 hour | Launch |

---

*This checklist should be reviewed before each submission to UK/EU stores.*
