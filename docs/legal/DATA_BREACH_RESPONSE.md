# Data Breach Response Plan

**The Nineteenth** - operated by [TODO: legal entity name, ABN, address]
**Owner / response lead:** Sam (sole developer) - support@thenineteenth.golf
**Last reviewed:** October 2026 (review at least annually and after any incident)

This is a practical runbook for a one-person operator. It follows the OAIC's four steps:
**Contain -> Assess -> Notify -> Review.** Steps 1-3 can run in parallel; containment always comes first.

> **Does the Notifiable Data Breaches (NDB) scheme apply?** The NDB scheme (Part IIIC, Privacy Act 1988) binds "APP entities". A business with annual turnover of A$3m or less is generally *not* an APP entity unless an exception applies (e.g. it trades in personal information, provides a health service, or has opted in). Record our current status here: **[TODO: APP-entity status and reason]**. Even if NDB does not strictly apply, follow this plan and notify affected users - GDPR/UK GDPR (72-hour regulator notification) and US state laws may apply to overseas users regardless of turnover.

---

## What counts as a breach

Unauthorised access to, unauthorised disclosure of, or loss of personal information we hold. Examples for this stack:

- Leaked Supabase service-role key, database password, or a third-party API key (Anthropic, Resend, RevenueCat, GolfAPI.io, Google Maps, Expo access token)
- An RLS policy bug that lets one user read another user's profile, email, scores or shot-log GPS data
- A public storage bucket exposing avatars or exports that should be private
- A compromised developer laptop, GitHub account, Supabase/Expo/Apple/Google account
- A data export (`export-data`) or support email sent to the wrong person

---

## Step 1 - Contain (immediately, within hours)

Work through what is relevant; record every action and time in the incident log below.

**Supabase (production project, Singapore ap-southeast-1)**
1. Rotate API keys: Dashboard -> Project Settings -> API Keys. Roll the **secret (service-role)** key first, then the **publishable (anon)** key if exposed. Update edge function secrets and any CI/EAS secrets that use them.
2. Reset the database password (Project Settings -> Database) if DB credentials may be exposed; update any pooler connection strings.
3. Rotate the JWT signing secret / signing keys if tokens may be forged - this **revokes all user sessions** (everyone is signed out). For a narrower response, revoke a specific user's sessions via the Auth admin API (`auth.admin.signOut` / delete their refresh tokens).
4. Fix or temporarily lock down the faulty RLS policy or storage bucket (worst case: revoke `SELECT` from `anon`/`authenticated` on the affected table until fixed).
5. Disable or redeploy any compromised edge function.

**Third-party keys** (rotate in each provider dashboard, then update `supabase secrets` / EAS secrets / `.env`):
- Anthropic API key (`generate-competition`)
- Resend API key (`send-support-email`, `notify-content-report`)
- RevenueCat secret key and webhook secret (`revenuecat-webhook`, `sync-subscription-from-revenuecat`)
- GolfAPI.io key, Google Maps keys (iOS/Android), Expo access token, Apple/Google sign-in client secrets
- GitHub tokens and deploy keys

**Accounts:** change passwords and revoke sessions/tokens on GitHub, Supabase, Expo, Apple Developer, Google Play Console, RevenueCat; confirm 2FA is on.

**Preserve evidence:** do not delete logs. Export what you need before it ages out.

## Step 2 - Assess (complete within 30 days; aim for days)

Under the NDB scheme, where there are reasonable grounds to *suspect* an eligible data breach, a reasonable and expeditious assessment must be completed within **30 days**.

1. **Check logs** (Supabase Dashboard -> Logs): API/PostgREST logs (unusual IPs, high-volume reads, requests using the service-role key), Auth logs (sign-ins, token refreshes), Postgres logs, Edge Function logs, Storage logs. Note Supabase log retention depends on plan - export early.
2. **Scope:** which tables/columns, how many users, which countries. Sensitive items here: email, phone, gender, age band, handicap, shot-log GPS coordinates, custom tee GPS points, comments, push tokens.
3. **Is it an eligible data breach?** All three must be true:
   - unauthorised access/disclosure/loss of personal information occurred;
   - it is likely to result in **serious harm** to one or more individuals (consider sensitivity, whether data was encrypted, who obtained it, location data revealing routines);
   - remedial action has **not** removed the likelihood of serious harm (e.g. the data was not retrieved/deleted before misuse).
4. Record the decision and reasoning in the log, even if the answer is "not eligible".

## Step 3 - Notify (as soon as practicable once eligible)

If it is an eligible data breach (and we are an APP entity):
1. **OAIC:** lodge the Notifiable Data Breach statement online - https://www.oaic.gov.au/privacy/notifiable-data-breaches/report-a-data-breach. Include: our identity and contact details, a description of the breach, the kinds of information involved, and recommended steps for individuals.
2. **Affected individuals:** notify directly (email via the address on their account; in-app notice if needed) with the same content. If direct notice is impracticable, publish the statement on thenineteenth.golf and take reasonable steps to publicise it.
3. **EU/UK users:** notify the relevant supervisory authority (e.g. ICO) within **72 hours** of becoming aware where required.
4. **Partners:** notify any partner whose contract requires it (see Golf Australia note below), app stores if keys/accounts were involved, and the affected third-party provider.

Even where notification is not mandatory, consider a voluntary notice to affected users - it is usually the right thing to do.

### Golf Australia CONNECT (future integration)

If the app later integrates with **Golf Australia CONNECT** (or any national handicap system API), GA must be notified **immediately** of any **actual or suspected** security breach affecting the integration, its credentials, or data obtained from it - this is in addition to, and earlier than, any OAIC timeframe. Add the GA contact here when the agreement is signed: **[TODO: GA security contact]**.

## Step 4 - Review (within 2 weeks of closing)

- Root cause and why existing controls (RLS tests, `pnpm verify:gate`, secret-scanning pre-commit hook) did not catch it
- Fixes: code/migration changes, new tests (e.g. an RLS test for the leaked table), secret-handling changes
- Update this plan, the privacy policy (if practices changed), and the incident log

---

## Contacts

| Who | How |
|---|---|
| Response lead | Sam - support@thenineteenth.golf, [TODO: phone] |
| OAIC | https://www.oaic.gov.au - 1300 363 992 |
| UK ICO | https://ico.org.uk - 0303 123 1113 |
| Supabase support | https://supabase.com/dashboard/support |
| Golf Australia (if integrated) | [TODO] |

## Incident log template

Copy one block per incident into a private location (not this public repo if it contains personal data).

```
Incident ID:            YYYY-MM-DD-<slug>
Discovered (date/time): 
Discovered by / how:    
Description:            
Data / tables involved: 
Individuals affected:   (count, countries)
Containment actions:    (time - action - who)
Assessment started:     
Eligible data breach?:  yes / no / undetermined - reasoning
Assessment completed:   (must be within 30 days of suspicion)
OAIC notified:          date, reference no. / not required (reason)
Individuals notified:   date, method
Other notifications:    (ICO/EU SA, Golf Australia, providers, app stores)
Root cause:             
Remediation & follow-ups: 
Closed:                 
```
