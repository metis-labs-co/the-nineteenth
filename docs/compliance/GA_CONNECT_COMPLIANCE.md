# GA CONNECT Compliance Tracker

Running record of where The Nineteenth stands against Golf Australia's
requirements for becoming a GA CONNECT Licensed Software Provider (LSP).
Update a row whenever its status changes, and add an entry to the change log.

**Source documents** (not in the repo; held in `~/Downloads/GA Connect`):

| Short name | Document |
|---|---|
| **Guide** | GA CONNECT LSP Integration Guide V7 (the 5-stage accreditation process) |
| **BRS** | GA CONNECT Business Requirements Specifications (technical and functional rules) |
| **LSPA** | GA CONNECT Platform Licensed Software Provider Agreement (template contract) |

**Status key:** ✅ Pass · 🟡 Partial · ❌ Fail · ⬜ Not started · ➖ Not applicable (yet)

**Last reviewed:** 2026-10-07

---

## 1. Summary

The Nineteenth has **no GA CONNECT integration**. It would currently fail
the Stage 2 eligibility gate (Guide §3) on data location, display of GA
handicaps / use of WHS, webhook security (nothing built) and consent capture.

**Product direction (agreed 2026-10-07):** GA integration is a club-level
product, not a per-user subscription tier. It supports paid daily
competitions run by affiliated clubs and stays separate from the existing
social competitions. The reasons:

- GA credentials (`client_id` / `client_secret`) are issued per club (BRS 3C).
- Score batches need committee approval by a club administrator (BRS 6).
- A competition-only (CMS) licence cannot submit Conforming Social Scores
  unless GA specifically approves it (BRS 5A, 6A).
- GA data and GA Handicaps may only be shown when the software is operated by
  an affiliated club or a GA-approved organisation (BRS 9B Notes iii–iv).

**Likely licence type:** GA-Licenced **CMS** (competition management only).
We do not manage club members or handicaps.

**Accreditation stage:** Pre-Stage 1. Intake has not been submitted.

---

## 2. Stage 2 eligibility gate (Guide §3)

Every row must pass. A single fail means the application is "Not eligible".

| # | Requirement | Status | Current state | Gap / next action |
|---|---|---|---|---|
| E1 | Licence type and scope accepted (VMS / CMS / Other) | ⬜ | Direction chosen (CMS, club product). Not yet discussed with GA. | Stage 1 intake: describe the club competition product and request CMS classification. |
| E2 | GA "reserved functions" and link-out (BRS 2a/2b) | ❌ | No link-out exists. The app edits course and tee data itself (reserved function 2a-A for GA courses). | For GA comps, read course data from GA CONNECT only. Add the menu link plus a GA-approved explanatory page that leads into the GA CONNECT VMS. |
| E3 | Commit to GA testing, including the trouble-free period (Guide §6) | ⬜ | No monitoring or logging evidence (no Sentry). | Add error tracking and structured logs for the GA integration before Stage 4. |
| E4 | Webhook security: HTTPS listener plus HMAC verification (BRS 13) | ❌ | Nothing built. | Edge function verifies `X-DotGolf-Signature: hmacsha256=…` (key = provider secret, message = raw body). Return **401** on a bad signature; GA sends deliberately bad calls every day and disables any webhook that accepts them. Return 200 quickly (GA retries up to 15 times with backoff). |
| E5 | Privacy, consent and breach obligations | 🟡 | Privacy policy corrected (2026-10-07, not yet published). Breach runbook written (`docs/legal/DATA_BREACH_RESPONSE.md`). Account-deletion fix migration written. | Consent capture at signup. Fill the policy TODOs (entity, ABN, address) and publish. Deploy the deletion fix. **Move hosting to Australia** (see P1). |
| E6 | GA IP and display obligations (BRS 9B) | ❌ | WHS / "Official" / "Verified" claims removed from copy (1333d808). The app still calculates its own WHS-style index and shows handicap history (Social tier). | See section 4, D1–D4. |

---

## 3. Scored assessment (Guide §4): 100 points, 19 criteria, each scored 0–5

Decision bands: <65 not recommended · 65–79 conditional pilot · ≥80 recommend.
Scores below are our own estimates.

| Category | Weight | Self-estimate | Evidence we have | Main gaps |
|---|---|---|---|---|
| 1. Organisation and delivery capability | 15 | Low | Working app in the stores; CI gate (`verify:gate`). | One developer. No written support model, SLA process or incident process. No cyber insurance. |
| 2. Strategic alignment (Big Swings: EVOLVE / BELONG / CONNECT) | 25 | Medium | Social golf, groups, leagues: a "more people play more golf" story. | Haven't read *Big Swings 2026–2030*. Need a feature-to-pillar mapping and metrics. |
| 3. Participation growth and engagement | 15 | Medium | Usage data in Supabase (rounds, comps, retention). | Package conversion and retention evidence. |
| 4. Technical integration and platform compliance | 30 | Low | Strong scoring engine with characterization/golden tests. 9-hole daily handicap now matches the BRS formula. | No integration. Stored results rank on net, not net-vs-par (D5). Allowance stacking (D6). Gendered ratings in sync (D7). |
| 5. Privacy, legal and risk | 15 | Low | Breach plan, corrected policy, data export. | Data in Singapore. Players table readable by all users. Course/tee tables writable by any user. No consent records. No insurance. |

---

## 4. BRS requirements: product and scoring

### Display of handicaps and WHS (BRS 9B)

| # | Requirement | Status | Current state | Action |
|---|---|---|---|---|
| D1 | No unauthorised use of WHS in Australia (9B(i)(c)) | 🟡 | Decision (2026-10-07): keep it as an app-specific **Social Handicap**. Renamed from "Social Handicap Index" everywhere, with a shared disclaimer (`src/constants/handicap.ts`): unique to The Nineteenth, not an official golf handicap. The calculation still uses the WHS method (`src/services/handicap`, leagues). | Confirm with GA at intake that a clearly-labelled app-only figure is acceptable. |
| D2 | GA Handicap display only inside club environs, in the listed scenarios only (9B(ii) a–f) | ➖ | No GA Handicaps held yet. | When GA comps are built, gate every display on comp type plus approved club, and limit it to the listed scenarios (live leaderboard, results, entry list, team event). |
| D3 | No handicap records or histories (9B(ii)(g)) | 🟡 (for GA data) | The Social tier history is now labelled "Social Handicap history" and applies only to the app figure. | Never show history for GA-sourced handicaps; link to golf.com.au instead. Keep app-index history clearly separate (depends on D1). |
| D4 | Non-approved entities may show the Daily Handicap only (Note iii) | ➖ | — | Social comps must never show a GA Handicap. |
| D5 | Rank stroke comps on **net versus par** (9A(i)) | 🟡 | Live boards OK for single-tee play. Stored results / finalise rank on net, which is wrong for mixed tees or genders. | Switch ranking to net-vs-par everywhere (scoring guardrails apply). Stableford and Par comparisons are already direct (9A ii–iii). |

### Daily Handicap and scoring (BRS 1, 6D/6E, 14)

| # | Requirement | Status | Current state | Action |
|---|---|---|---|---|
| H1 | 18-hole Daily Handicap = ((GA Hcp × Slope/113) + (Scratch − Par)) × 0.93 × CF (CF women 1.0483, men 0.9986) | 🟡 | Formula implemented in `src/utils/dailyHandicap.ts`. | A **95% allowance is stacked** on top for some formats (D6). |
| H2 | 9-hole Daily Handicap uses GA Hcp ÷ 2 with 9-hole slope/scratch/par, rounded once (Appendix B; 6D) | ✅ | Fixed 2026-10-07 (merged at c1a86ef5) in live scoring, sync and recalculation. | Device QA outstanding. |
| H3 | Submit only the 9-hole DH in `CourseHandicap` for 8–15 hole rounds; send the 9 hole scores matching the selected 9-hole tee set (6D iii) | ➖ | — | Build into the GA submission. |
| H4 | 10–15 hole rounds use the 18-hole DH for display and results (6D iv) | ⬜ | Not checked. | Check the end-round-early work against this. |
| H5 | Gendered ratings: the player's gender selects the tee's ratings | ❌ | Sync uses men's ratings for women. | Fix in sync (`getRatingsForGender`). |
| H6 | Expected score for holes not played (8 of 9, 16–17 of 18) (Appendix C) | ➖ | GA calculates this server-side. | Send nulls for unplayed holes; don't fill with net par. |
| H7 | Hole-by-hole gross is required; Adjusted Gross must not bypass it (5B, 12E) | ⬜ | App holds hole-by-hole data. Pickups use the PICKUP_SCORE sentinel. | Map pickups and sentinels to null for submission. |
| H8 | Players can't choose a Score Status in app UIs; admin screens only (5B) | ➖ | — | Status selection only in the club-admin UI. |
| D6 | Allowance stacking: 95% on top of the AU Daily Handicap | ❌ | Applied for some formats. | Per-country decision: AU DH already includes 0.93 × CF. |
| D7 | API fields that must not be used in AU: 20-score record, match play scores, penalty scores, `DefaultAffiliationCategoryUID`, `Index` (use `displayIndex`) (BRS 12) | ➖ | — | Exclude in the client mapping layer. Note: match play scores can't be submitted. |

### Score submission, batches and PCC (BRS 5, 6)

| # | Requirement | Status | Action |
|---|---|---|---|
| S1 | Score intents → competition batches → PCC batches; committee approval | ➖ | Design the GA comp lifecycle around batches. Club admin approves the batch. |
| S2 | Submit all applicable Score Types (singles, CSS, four-ball rules per BRS 10) | ➖ | Four-ball AU scores are not submitted via `isFourBallCompetition`. Read BRS 10 before building. |
| S3 | Rate limit 300 requests/min per username; respect the `X-Rate-Limit-*` headers | ➖ | Queue and backoff in the GA client. |
| S4 | Conforming Social Scores | ➖ | Only if GA approves CSS for us. Out of scope for a CMS licence. |
| S5 | `ScoreBatchProcessingCompleted` webhook updates PCC and handicaps | ➖ | Covered by E4. |

### Course data (BRS 7)

| # | Requirement | Status | Action |
|---|---|---|---|
| C1 | GA CONNECT is the single source of truth for AU scratch/slope/par/stroke index | ❌ | GA comps must use GA course data, not GolfAPI.io. Handle split indexing and 9-hole stroke index formats. |
| C2 | Course data usage is restricted to stated use cases (12B) | ⬜ | Declare use cases at intake. |
| C3 | Tee data effective on the date of play | ➖ | Store the tee snapshot per round. |

### Golfer data (BRS 4)

| # | Requirement | Status | Action |
|---|---|---|---|
| G1 | Golf ID (10 digits) mapped to our player | ⬜ | Add `golf_id` to players; link it via a club membership. |
| G2 | Mandatory fields: last name, first name, gender (2 options), DOB, email | 🟡 | We don't collect DOB. Our gender options may differ. |
| G3 | Consent for personal data to go between club, us and GA | ❌ | Capture per-player consent when they join a GA comp. Store consent records. |

---

## 5. LSP Agreement obligations

| # | Clause | Obligation | Status | Notes |
|---|---|---|---|---|
| A1 | LSPA 4.4.8, 10.1.1 | **GA data stored, backed up and processed in Australia only** | ❌ | Prod Supabase is in Singapore (ap-southeast-1). Needs a Sydney project (or GA data isolated in an AU store), plus AU-region edge functions and backups. |
| A2 | LSPA 4.2.1, 4.3 | Upload all Required Player Data and course data to GA via the API | ➖ | Schedule 1 lists the items. |
| A3 | LSPA 4.4.4–4.4.7 | Limit use to Permitted Purposes; no reverse engineering; no merging GA data with other programs | ⬜ | Keep GA data in separate tables; no analytics or marketing use. |
| A4 | LSPA 4.5.2, 8.3 | No use of "Golf Australia" or GA marks without written approval | ⬜ | Includes marketing and App Store copy. |
| A5 | LSPA 4.6, 9.2.7, 10.1.6 | Notify GA **immediately** of a suspected breach or misuse | 🟡 | Add a GA step to `DATA_BREACH_RESPONSE.md` once licensed. |
| A6 | LSPA 4.7 | End User Agreement with each club, able to cut off access at GA's request | ⬜ | Club terms for the GA product. Per-club kill switch. |
| A7 | LSPA 6 | 98% monthly availability; Sev1 acknowledgement in 1h / fix in 4h; Sev2 4h/12h; support hours 6am Melbourne to 6pm Perth | ❌ | No on-call, status page or alerting. |
| A8 | LSPA 7 | Records and quarterly reports (club list, complaints/communications summary) | ⬜ | Admin query or export. |
| A9 | LSPA 9 | Privacy: notify users of disclosure to GA; secure handling; return or destroy data on exit | 🟡 | Privacy policy needs a GA disclosure section once licensed. |
| A10 | LSPA 10.1.2–10.1.3 | Industry-standard security controls | 🟡 | GolfAPI key moved server-side (deployed 2026-10-07). Still open: players-table RLS, course/tee write RLS, key rotation. |
| A11 | LSPA 11 | Confidentiality of GA data, API and credentials | ⬜ | Per-club GA secrets in Supabase Vault, never on the client. |
| A12 | LSPA 12 | Indemnity for breach of clauses 8–11 | ➖ | Legal review. |
| A13 | LSPA 13 | **$2M cyber insurance** (per claim and aggregate) | ❌ | Get a quote. |
| A14 | Guide §8 | Fees: accreditation $4–10k, annual licence, re-certification | ⬜ | Factor into club pricing. |

---

## 6. Evidence pack (Guide §7)

| Area | Item | Status | Where |
|---|---|---|---|
| Organisational | Company profile, ownership, insurance | ⬜ | Entity, ABN and address still TODO in the privacy policy. |
| Organisational | Implementation and change-management plan | ⬜ | — |
| Organisational | Support model, SLAs, incident process | ⬜ | — |
| Product | Collateral and demo | 🟡 | `docs/APP_STORE_METADATA.md` |
| Product | Big Swings feature mapping | ⬜ | — |
| Product | Engagement outcomes | ⬜ | Supabase analytics |
| Product | Data model and consent approach | 🟡 | `docs/database/DATABASE_SCHEMA.md`; consent not built |
| Technical | Architecture diagram and data flows with GA | ⬜ | — |
| Technical | API notes (auth, errors, monitoring, webhooks) | ⬜ | — |
| Technical | Data mapping: Golf ID, membership categories, score payloads | ⬜ | — |
| Legal | Privacy policy | 🟡 | `docs/legal/PRIVACY_POLICY.md` (TODOs, unpublished) |
| Legal | Security controls overview | ⬜ | — |

---

## 7. Platform hygiene: open items found in the review

These are not GA-specific, but GA assessment category 5 will find them.

| # | Item | Severity | Status |
|---|---|---|---|
| X1 | `players` table readable by every signed-in user (email, phone, handicap) | High | 🟡 `feat/player-privacy`: app reads only public columns; leaking RPCs closed (20261008000000). Column lock held in `supabase/migrations_pending/` until the force-update release. |
| X2 | Course and tee tables writable by any signed-in user | High | ❌ Open |
| X3 | GolfAPI key in git history and old app builds | High | 🟡 Proxy live. Rotate after the force-update minimum version is raised. |
| X4 | Account deletion broken for all users | High | 🟡 Migration `20261007000000_fix_account_deletion.sql` written, not deployed. |
| X5 | Data export missing tables | Medium | 🟡 `export-data` fixed, not deployed. |
| X6 | Deleting an organiser cascades to their competitions | Medium | ❌ Open |
| X7 | No error tracking (Sentry) | Medium | ❌ Open |
| X8 | Signup consent not recorded | Medium | ❌ Open |

---

## 8. Roadmap to application

1. **Clean up (no GA access needed):** X1–X8, D1/D3 decision, D5, D6, H5, publish the privacy policy.
2. **Commercial readiness:** entity details, cyber insurance (A13), support/SLA model (A7), club terms (A6).
3. **Data residency:** plan and run the Sydney migration (A1).
4. **Stage 1 intake:** product overview to GA Digital Product; request CMS classification; declare course-data use cases (C2).
5. **Stage 2:** evidence pack (section 6), sign the LSPA, pay the accreditation fee.
6. **Stage 3:** staging credentials. Build the GA comp type: Golf ID linking, GA course data, batches, webhooks, admin approval, display gating.
7. **Stage 4:** accreditation test suite and trouble-free period.
8. **Stage 5:** annual fee, production credentials, pilot club.

---

## 9. Change log

| Date | Change | Ref |
|---|---|---|
| 2026-10-07 | Initial review of Guide, BRS and LSPA. Tracker created. | — |
| 2026-10-07 | Removed WHS / Official / Verified handicap claims from app and store copy (E6 partial). | 1333d808 |
| 2026-10-07 | GolfAPI.io key moved to the `golfapi-proxy` edge function; deployed to staging and prod (X3 partial). | a8ffb817 |
| 2026-10-07 | Privacy policy corrected, breach runbook added, export-data completed, account-deletion fix migration written (E5 partial; not deployed). | c1a86ef5 |
| 2026-10-07 | 9-hole Daily Handicap matches BRS Appendix B (H2). | c1a86ef5 |
| 2026-10-07 | App index renamed to "Social Handicap", with a not-official disclaimer in app, store, privacy and marketing copy (D1, D3 partial). | feat/social-handicap-label |
| 2026-10-08 | Player privacy: other players' email/phone/age no longer shown or fetched; global achievement board anonymises non-friends; email-leaking RPCs closed; column lock prepared (X1 partial). | feat/player-privacy |
