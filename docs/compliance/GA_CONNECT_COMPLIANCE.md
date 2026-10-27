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

**Referenced but not yet obtained** (request at Stage 1 intake):

- *GA CONNECT API Integration Test Procedure* (BRS 3B). Accreditation testing
  is run against it, the BRS and the Australian Rules of Handicapping.
- *World Handicap System. Official Reference Guide for Australian
  administrators*. The BRS "operates in concert with" it, and it governs
  format allowances (see D6).
- *Big Swings 2026–2030* (Guide §9). Needed for the strategic-alignment score.

**Citing the BRS:** its numbering is inconsistent. The contents page calls the
display sections 10A/10B, but the body headings are 9A/9B. Four-ball rules are
cross-referenced as "Section 11" but sit under "10. Four-ball Scores". The
batching rule is cross-referenced as "7.C(i)" but is 6C(i). Cite the **body
headings**. Bullets without letters are cited by position.

**Status key:** ✅ Pass · 🟡 Partial · ❌ Fail · ⬜ Not started · ➖ Not applicable (yet)

**Last reviewed:** 2026-10-27 (full re-read of Guide, BRS and LSPA)

---

## 1. Summary

The Nineteenth has **no GA CONNECT integration**. It would currently fail
the Stage 2 eligibility gate (Guide §3) on data location, display of GA
handicaps / use of WHS, webhook security (nothing built) and consent capture.

**Product direction (revised 2026-10-27):** a golfer-facing app, not a club
product. We don't expect affiliated clubs as customers. The goals are:

1. Players link their GA Handicap so friends' competitions use accurate
   Daily Handicaps.
2. Later, players submit rounds (Conforming Social Scores) through the app.

Neither licence type the documents describe in detail fits:

- A **CMS** can **never** submit Conforming Social Scores: "CSSs are not
  permitted to be submitted either directly or indirectly via a GA-Licenced
  CMS (including via an associated app)" (BRS 6A). A CMS is also built around
  club-run competitions.
- A **VMS** manages club members and handicaps. The only third-party CSS route
  the BRS describes is "an app approved by GA to integrate with a GA-Licenced
  VMS" (6A), with the player's home club approving each score.
- API credentials are issued per club (BRS 3C). No golfer-level access is
  described.
- GA Handicaps may only be shown when the software is operated by an
  affiliated club or a GA-approved organisation. Any software may show the
  Daily Handicap for a specific round (BRS 9B Notes iii–iv).
- GA's own app already offers handicap look-up and score lodgement.

**Likely licence type:** **"Other"** (Guide §3), which the documents don't
define. Stage 1 intake asks GA whether it covers this use case (section 8).
Rows written for the earlier club-product direction (2026-10-07), such as
S1–S9, D2, G5, A6 and A8, stay as reference until GA says which licence
applies.

**The biggest risks are contractual, not technical** (see section 6): the
LSPA has no limitation of liability, Support Hours run every day, a change in
control of the company lets GA terminate, and the Australian-storage rule
covers player data we collect, not just data from GA.

**Accreditation stage:** Pre-Stage 1. Licensing questions (section 8, I1–I9) emailed to GA on 2026-10-28; awaiting a reply.

---

## 2. Stage 2 eligibility gate (Guide §3)

Every row must pass. A single fail means the application is "Not eligible".

| # | Requirement | Status | Current state | Gap / next action |
|---|---|---|---|---|
| E1 | Licence type and scope accepted (VMS / CMS / Other) | ⬜ | Direction revised 2026-10-27: golfer-facing app, "Other" licence. Not yet discussed with GA. | Stage 1 intake: describe the consumer use case and ask whether an "Other" licence covers it (section 8, I1). |
| E2 | GA "reserved functions" and link-out (BRS 2A/2B) | ❌ | No link-out exists. The app edits course and tee data itself. | Reserved functions include: course data editing; the Daily Handicap look-up chart generator (golf.com.au); setting Conforming Social Score status; Home Club transfers; club contacts and golf.com.au display info. For GA comps, read course data from GA CONNECT only. Add the menu link plus a GA-approved page that says the user is leaving our ecosystem and "will need to login… using different credentials" (2B). |
| E3 | Commit to GA testing, including the trouble-free period (Guide §6, BRS 3B) | ⬜ | No monitoring or logging evidence (no Sentry). Test procedure document not obtained. | Get the API Integration Test Procedure. Add error tracking and structured logs for the GA integration before Stage 4. Minor defects must be fixed before the trouble-free period starts. |
| E4 | Webhook security: HTTPS listener plus HMAC verification (BRS 13) | ❌ | Nothing built. | Edge function verifies `X-DotGolf-Signature: hmacsha256=…` over the raw request body. Return **401** on a bad signature; GA sends deliberately bad calls every day and disables any webhook that accepts them. Return 200 quickly (GA retries up to 15 times with backoff). Unclear: whether the key is a provider secret or each club's `client_secret`, and the signature encoding (section 8, Q2). |
| E5 | Privacy, consent and breach obligations | 🟡 | Privacy policy corrected but has TODOs (entity, ABN, address, GolfAPI.io location), so not publishable yet. Breach runbook written (`docs/legal/DATA_BREACH_RESPONSE.md`). Account-deletion fix on prod since 2026-10-12. | Consent capture at signup. Fill the policy TODOs and publish. **Move hosting to Australia** (A1). |
| E6 | GA IP and display obligations (BRS 9B) | ❌ | WHS / "Official" / "Verified" claims removed from copy (1333d808). The app still calculates its own WHS-method index and shows handicap history (Social tier). It may also show self-entered GA Handicaps to other players (D4). | See section 4, D1–D4. |

---

## 3. Scored assessment (Guide §4): 100 points, 19 criteria, each scored 0–5

Decision bands: <65 not recommended · 65–79 conditional pilot · ≥80 recommend.
Scores below are our own estimates.

| Category | Weight | Self-estimate | Evidence we have | Main gaps |
|---|---|---|---|---|
| 1. Organisation and delivery capability | 15 | Low | Working app in the stores; CI gate (`verify:gate`). | One developer (single-director Pty Ltd). Support Hours are every day, 6am Melbourne to 6pm Perth (A7). No written support model, SLA process or incident process. No cyber insurance. |
| 2. Strategic alignment (Big Swings: EVOLVE / BELONG / CONNECT) | 25 | Medium | Social golf, groups, leagues: a "more people play more golf" story. | Haven't obtained *Big Swings 2026–2030*. Need a feature-to-pillar mapping and metrics (venues committed, % who feel they belong, new people connected). |
| 3. Participation growth and engagement | 15 | Medium | Usage data in Supabase (rounds, comps, retention). | Package conversion and retention evidence. |
| 4. Technical integration and platform compliance | 30 | Low | Strong scoring engine with characterization/golden tests. 9-hole daily handicap now matches the BRS formula. | No integration. Stored results rank on net, not net-vs-par (D5). Allowance stacking (D6). Women get men's ratings in sync (H5). |
| 5. Privacy, legal and risk | 15 | Low | Breach plan, corrected policy, data export, player column lock. | Data in Singapore. Course/tee tables writable by any user. No consent records. No insurance. |

---

## 4. BRS requirements: product and scoring

### Display of handicaps and results (BRS 9A, 9B, 4H, 13)

| # | Requirement | Status | Current state | Action |
|---|---|---|---|---|
| D1 | No unauthorised use of WHS in Australia (9B(i)(c)) | 🟡 | Decision (2026-10-07): keep it as an app-specific **Social Handicap**. Renamed from "Social Handicap Index" everywhere, with a shared disclaimer (`src/constants/handicap.ts`): unique to The Nineteenth, not an official golf handicap. The calculation still uses the WHS method (`src/services/handicap`, leagues). | Confirm with GA at intake that a clearly-labelled app-only figure is acceptable (section 8, Q8). Note LSPA 4.4.1 (L6): if the licensed product is defined as the whole app, the Rules of Handicapping may reach the Social Handicap. |
| D2 | GA Handicap display only inside club environs, in the listed scenarios only (9B(ii) a–f) | ➖ | No GA Handicaps held yet. | When GA comps are built, gate every display on comp type plus approved club, and limit it to the listed scenarios (live leaderboard, results, entry list, team event, timesheets). On a digital timesheet a logged-in user's own GA Handicap is not shown; link to golf.com.au instead. "Club environs" means the club's website, app, newsletter, social accounts, screens at the facility and physical form (Note ii). |
| D3 | No handicap records or histories (9B(ii)(g)) | 🟡 (for GA data) | The Social tier history is now labelled "Social Handicap history" and applies only to the app figure. | Never show history for GA-sourced handicaps; link to golf.com.au instead. Keep app-index history clearly separate (depends on D1). |
| D4 | Non-approved entities may show the Daily Handicap only (9B Note iii) | ⬜ | Players enter their own handicap, stored per scorecard as `ga_handicap_used`. For Australian golfers that number is their GA Handicap. | Check whether other players can see it in social comps (profiles, leaderboards, entry lists). If so, this may already be a 9B issue. Ask GA (section 8, Q8). Social comps must never show a GA Handicap sourced from GA. |
| D5 | Stroke results include a net-vs-par column, used for finishing positions (9A(i)) | 🟡 | Live boards OK for single-tee play. Stored results / finalise rank on net, which is wrong for mixed tees or genders. | Switch ranking to net-vs-par everywhere (scoring guardrails apply). Gross comps rank on gross vs par. Stableford and Par comparisons are already direct (9A ii–iii). |
| D8 | Handicap and score display rules (4H, 13) | ➖ | — | Label any shown `stablefordScore` "Handicapping Score", and use GA's exact wording when holes were not attempted. Don't show a GA Handicap when the player is Lapsed (`isResigned` / `isDeceased`). Show Provisional over Frozen. Show `displayIndex` verbatim. Handicap statuses (Unallocated, Normal, Frozen, Provisional, Suspended, Lapsed) come from the handicap and member endpoints; check global `isResigned` via the visitors endpoint. |
| D9 | Score statuses and disqualification in results (5B–5D) | ➖ | — | Results show "Disqualified" without a score, or "withdrew", depending on the scenario. Keep Competition Score and Handicapping Score separate (scenarios 7 and 13). |

### Daily Handicap and scoring (BRS 1, 6D/6E, 14, Appendices A–C)

| # | Requirement | Status | Current state | Action |
|---|---|---|---|---|
| H1 | 18-hole Daily Handicap = ((GA Hcp × Slope/113) + (Scratch − Par)) × 0.93 × CF (CF women 1.0483, men 0.9986), rounded to the nearest whole number (Appendix A) | 🟡 | Formula implemented in `src/utils/dailyHandicap.ts`. | A **95% allowance is stacked** on top for some formats (D6). The combined multipliers (0.974919 women, 0.928698 men) keep all decimal places (14). |
| H2 | 9-hole Daily Handicap uses GA Hcp ÷ 2 with 9-hole slope/scratch/par, rounded once (Appendix B; 6D(i)) | ✅ | Fixed 2026-10-07 (merged at c1a86ef5) in live scoring, sync and recalculation. | Device QA outstanding. |
| H3 | Submit only the 9-hole DH in `CourseHandicap` for 8–15 hole rounds; send the 9 hole scores matching the selected 9-hole tee set (6D(ii)–(iii)) | ➖ | — | Build into the GA submission. |
| H4 | 10–15 hole rounds use the 18-hole DH for display and results (6D(iv)) | ➖ | End-round-early (1.15.0) is social-only and keeps the planned-holes DH. | Apply to the GA comp type. |
| H9 | 8–9 hole rounds may use either the 9- or 18-hole DH for display and results (6D(iv)) | ➖ | — | If the 18-hole DH is used, award strokes only on the holes played, by 18-hole stroke index (the "Michelle" example). |
| H5 | Gendered ratings: rate the player off the tee marker whose gender matches the player's GA gender | ❌ | Sync calls `getRatingsForGender`, but `teeBoxToRatings` (`src/utils/teeTransformers.ts`) hard-codes women's ratings to null, so women get men's ratings. | Fix the transformer (scoring guardrails apply). In GA data each tee marker carries its own gender (`gender` M/F), so map per marker. |
| H6 | Holes not attempted: send with `didNotAttempt = true` and gross omitted; GA fills in Expected Scores (4H, 6E, Appendix C) | ➖ | GA calculates Expected Scores server-side. | Don't send null gross: a null hole counts as a pick-up worth 0 points (5B). Exception: hole closures entered by an administrator use net par (Appendix C(ix)). |
| H7 | Hole-by-hole gross is required; pick-ups flagged (4H, 5B, 12E) | ⬜ | App holds hole-by-hole data. Pickups use the PICKUP_SCORE sentinel. | Map pickups to `pickedUp = true` with gross omitted. Leave out `adjustedGrossScore`. Hole gross must be 1–30. |
| H8 | Players can't choose a Score Status in app UIs; admin screens only (5B) | ➖ | — | Status selection only in the club-admin UI. |
| D6 | Allowance stacking: 95% on top of the AU Daily Handicap | ❌ | `getHandicapAllowance` (`src/services/scoring/utils/handicapUtils.ts`) returns 0.95 for stroke and stableford. | The BRS is silent on format allowances; the WHS Official Reference Guide governs them. `stablefordScore` must be calculated with `courseHandicap` (4H). Per-country decision: the AU DH already includes 0.93 × CF. |
| D7 | API fields that must not be used in AU: 20-score record, match play scores, penalty scores, `DefaultAffiliationCategoryUID`, `Index` (BRS 12) | ➖ | — | Exclude in the client mapping layer. `isMatchPlayScore` must be false and `isPenaltyScore` false or omitted. Section 13 describes `index` as "the GA Handicap value", which conflicts with 12; confirm which field drives the DH calculation (section 8, Q3). |

### Score submission, batches and PCC (BRS 5, 6, 10)

| # | Requirement | Status | Action |
|---|---|---|---|
| S1 | Competition batches and PCC (score) batches are **independent** (6C(i)); each Score Intent references a score batch; club admin grants committee approval | ➖ | Design the GA comp lifecycle around both batch types. Batches can be split (e.g. AM/PM) by re-assigning `scoreBatchUID`, unprocessed or re-batched. PCC is not applied to "No Score – Not Approved" rounds. |
| S2 | Submit all applicable Score Types (competition singles; four-ball per BRS 10) | ➖ | Four-ball scores can be handicapped only through the four-ball endpoints or the Core VMS. `scoringMode` is G or S only (no Par). Only one partner is flagged as scoring on a hole; for a pick-up, both flags are true. Team formats (ambrose/scramble) are not covered: ask GA (section 8, Q5). |
| S3 | Rate limit 300 requests/min per username; respect the `X-Rate-Limit-*` headers (3C) | ➖ | Queue and backoff in the GA client. Follow `nextPageCursor` pagination. Don't use the hidden `client_credentials` endpoint. |
| S4 | Conforming Social Scores | ➖ | **Not permitted for a CMS** (6A). Out of scope. |
| S5 | `ScoreBatchProcessingCompleted` webhook updates PCC and handicaps | ➖ | Covered by E4. |
| S6 | Submit each completed round score "immediately upon return by that player" (6B) | ➖ | Conflicts with offline queuing. GA comp scoring must submit as soon as the card is returned and connectivity allows; design and document the retry path. |
| S7 | A Score Intent per player-round before the score is submitted (6C(iii)–(v)) | ➖ | Create intents at registration or in the back end before submission. A batch submitted with an unresolved intent creates a "No Score – Not Approved" on the golfer's GA record. The admin UI must offer "No Score – Approved" and "No Score – Illegitimate" via `{scoreIntentUID}/resolve`. Risky for withdrawals, deleted rounds and end-early. |
| S8 | Required score payload fields (4H) | ➖ | `stablefordScore` is required by business rule in all cases (Par rounds convert as +36; not-attempted holes count 0; 9-hole rounds send 9-hole points). `courseHandicap` is always required (the 9-hole value for 9-hole rounds). Also `name`, `isCompetitionScore`, `scoreBatchUID`, and the total for the comp type. Maximum Score comps set `isMaxScoreCompetition` and cap hole gross. `markerUID` is the **tee marker**, not the person who marked. Send holes in `holeNo` order. |
| S9 | Accepted hole counts (6E) | ➖ | GA accepts only 8–9 holes on a 9-hole tee set or 16–18 on an 18-hole set. For 10–15 holes, send holes 1–9 or 10–18 (or 8 holes of one nine). Under 8 holes of either nine: don't submit. |

### Course data (BRS 7, 12B, 13)

| # | Requirement | Status | Action |
|---|---|---|---|
| C1 | GA CONNECT is the single source of truth for AU scratch/slope/par/stroke index (7A) | ❌ | GA comps must use GA course data, not GolfAPI.io. Handle split indexing and 9-hole stroke index formats. |
| C2 | Course data usage is restricted to declared use cases at courses "operating under the Licensee's software management systems" (7A, 12B) | ⬜ | Declare use cases at intake. On this reading GA course data can't feed social comps at other courses, but LSPA 2.1.2 and 2.8 allow showing it to "public players"; ask GA (section 8, Q10). |
| C3 | Tee data effective on the date of play | ➖ | Use the v3 effective-dated markers (`fromUTC`, `EffectiveAtUTC`, `ExpiresBeforeUTC`, `DeletedAtUTC`) and store the tee snapshot per round. |
| C4 | Course display rules (7B, 13(ii)) | ➖ | Show 18-hole scratch ratings as integers and 9-hole ones as whole or ".5". Show only active tee markers to golfers. There is no 9/18 flag, so count the holes. 9-hole tee sets use stroke index 1–9. `additionalStrokeIndices` covers handicaps to 54 (plus handicaps as negative). |
| C5 | Course Changes webhook (13(ii)) | ➖ | Subscribe and refresh affected courses. Covered by E4 for security. |

### Golfer data (BRS 4)

| # | Requirement | Status | Action |
|---|---|---|---|
| G1 | Golf ID (10 digits) mapped to our player (4A) | 🟡 | `players.golf_id` exists but is self-entered and, since 20260328000000, allows 4–15 alphanumeric characters (international IDs). For GA comps, take the Golf ID from GA via club membership only, never from user entry, and never create one. |
| G4 | Use `memberUID` in every API call (4F) | ⬜ | `memberUID` is "different to the Golf ID". Store it alongside the Golf ID. |
| G2 | Golfer data fields | ⬜ | BRS 4C's mandatory profile fields (DOB, address, email) apply to creating and maintaining Golf ID profiles, which is VMS-only, so not collecting DOB is not a CMS gap. But LSPA Schedule 1 Item 2 lists Required Player Data including address, postcode, suburb, state, country, club name and membership category; ask GA which applies to a CMS (section 8, Q6). Minimise: keep the GA-sourced gender and only what GA confirms. |
| G3 | Consent for personal data to go between club, us and GA | ❌ | BRS 4C puts consent in each club's service terms with GA. Our own duty comes from the Privacy Act and LSPA 9.2.1 (notify users of disclosure to GA and its service providers). Capture per-player consent when they join a GA comp and store consent records. |
| G5 | Membership categories (4E) | ➖ | Creating and assigning categories is a VMS accreditation requirement. A CMS at most reads `categoryUID`; never hard-code category names or codes. |

---

## 5. LSP Agreement obligations

Clause numbers were rebuilt from the text and checked against the agreement's
own cross-references. Sub-numbers inside clauses 2.5–2.8 and 6 are inferred.

| # | Clause | Obligation | Status | Notes |
|---|---|---|---|---|
| A1 | LSPA 4.4.8, 10.1.1, 9.2.5 | Store, back up and process **"the Data and Required Player Data"** solely in the named cloud environment in Australia. Covers player data we collect for GA, not just data from GA. Binds sub-contractors. Moving it needs GA's written consent. Don't let clubs move Data offshore. | ❌ | Prod Supabase is in Singapore (ap-southeast-1). Runbook: `docs/guides/SUPABASE_SYDNEY_MIGRATION.md`. Also keep this data away from offshore processors: the AI comp generator (`supabase/functions/generate-competition`, Anthropic, US), Expo push payloads and any future Sentry. |
| A2 | LSPA 4.2, 4.3, Sch 1 | Upload all Required Player Data and course data to GA via the API | ➖ | Schedule 1 lists the items; Item 3 (Activity Data) includes `markerUID`, `playedAtUTC`, `scoreIntentUID`, `scoreBatchUID`. Read literally, 4.3.2 requires uploading course data "inputted… by any Approved Third Party or User" (see L4). |
| A3 | LSPA 4.4.4–4.4.7 | Limit use to Permitted Purposes; no reverse engineering; no merging GA data with other programs | ⬜ | Keep GA data in separate tables; no analytics or marketing use. |
| A4 | LSPA 2.1.3, 4.5.2, 8.3, 8.4.2, 8.6 | No use of "Golf Australia" or GA marks without written approval. "Golf Australia Licensed" may appear only on a platform "accessible solely by Approved Third Parties and their Users" | ⬜ | Not on the App Store listing or the public site. Don't register domains or social handles using GA IP. Report any infringement. |
| A5 | LSPA 4.6, 9.2.7, 10.1.6 | Notify GA **immediately** of any breach of clause 9 **or any Data Protection Laws**, not only breaches involving GA data | 🟡 | `DATA_BREACH_RESPONSE.md` already has a GA section; the GA security contact is a TODO until signing. |
| A6 | LSPA 4.7 | End User Agreement with each club, "entirely consistent" with the LSPA, able to cut off access at GA's request (4.7.2: also when the club's agreement ends) | ⬜ | Club terms for the GA product. Per-club kill switch. |
| A7 | LSPA 6 | 98% monthly availability, excluding scheduled maintenance. Targets are in **Support Hours**, which are **every day**, 6am Melbourne to 6pm Perth (6.1.5). Sev1: acknowledge 1h, communicate 2h, restore 4h. Sev2: acknowledge 4h, communicate 6h, restore 12h. Sev3: acknowledge 2 Business Days, communicate 5 Business Days, resolve within four weeks. Maintenance only on Business Days outside Support Hours. Duty is mutual and "reasonable efforts" (6.1.1). | ❌ | No on-call, status page or alerting. One person can't cover ~100 hours a week; a backup is a sub-contract needing consent (A20). |
| A8 | LSPA 7.2 | On GA's reasonable request, **no more than once every 3 months**: report of clubs newly given access, all clubs with access, and a summary of communications | ⬜ | Admin query or export. Separate from the fee reports in A16. |
| A9 | LSPA 9 | Notify users of disclosure to "GA and its service providers" (9.2.1). Return or destroy data on exit **or at any other time on GA's written request** (9.2.4) | 🟡 | Privacy policy needs a GA disclosure section once licensed. The Platform Provider is DotGolf NZ LP, so add overseas-disclosure (APP 8) wording. See L5 for the effect of 9.2.4 on our own copy. |
| A10 | LSPA 10.1.2–10.1.3 | Industry-standard security controls | 🟡 | GolfAPI key moved server-side (deployed 2026-10-07). Player column lock on prod (2026-10-14). Still open: course/tee write RLS, key rotation. |
| A11 | LSPA 11 | Confidentiality of GA data, API, credentials **and the agreement's own terms** (employees and advisors only) | ⬜ | Per-club GA secrets in Supabase Vault, never on the client. Keep the signed agreement and this tracker's contract notes private. |
| A12 | LSPA 12.1 | One-way indemnity to GA for breach of clauses 8–11, **including consequential losses**. The agreement has **no limitation-of-liability clause** | ➖ | Uncapped; falls on the company. Lawyer review (L1). |
| A13 | LSPA 13 | **$2M cyber insurance** per claim and in the aggregate; mutual ("each party"); certificates on request (13.2) | ❌ | Only cyber is required. Ask a broker whether the policy covers the contractual indemnity (often excluded). |
| A14 | LSPA 3, Sch 3 | Fees: accreditation $10,000 / $7,500 / $4,000 by integration level; **annual fee $10,000** in advance; re-certification quoted per qualifying release; transaction fees per active member per quarter and per booking / % of booking value (amounts blank) | ⬜ | Factor into club pricing. Ask whether paid comp entries count as "Bookings" (section 8, Q7). |
| A15 | LSPA 3.3, 3.5, 14.2.4 | Pay each invoice within 14 days. Late interest at RBA cash rate + 3%. GA can suspend access and, if unpaid 14 days after notice, terminate | ⬜ | — |
| A16 | LSPA 3.6, 3.7, Sch 3 | Fees can rise yearly by the greater of 4% or CPI on 60 days' notice. Keep fee records; GA can audit; quarterly fee reports within 30 days of quarter end | ⬜ | Needed once transaction fees apply. |
| A17 | LSPA 4.2 | Integration development by a GA-set date; as a precondition, provide all User Data to GA | ⬜ | Date is blank in the template. |
| A18 | LSPA 4.4.1, 4.4.5 | Comply with the Australian Rules of Handicapping in the Licensee Products and Services. Make no representations about the accuracy of GA data | ⬜ | Scope depends on how the product is defined (L2). Check UI copy. |
| A19 | LSPA 2.5, 4.4.10–4.4.12, 10.1.5 | Keep up with BRS changes, tell GA about integration changes, follow GA instructions. Re-certification is paid per qualifying release | ⬜ | Plan release cadence for the GA module around re-certification cost. |
| A20 | LSPA 2.2.1, 18.1.1 | No sub-contracting or assignment without GA's consent | ⬜ | Covers support backup, contractors and hosting. |
| A21 | LSPA 2.2.2 | Never make Data available to anyone who isn't an approved club, its users, or a customer with a valid User ID, or who is based outside Australia | ⬜ | Gate GA data on club membership and location. |
| A22 | LSPA 14.2, 14.3, 15.2 | No cure period: GA can terminate immediately for breach of clauses 3, 4, 8.3, 9, 10 or 11. No termination for convenience. On exit: stop use, return Confidential Information and disable club access within **10 days** | ⬜ | Build the per-club and global kill switch (A6). |
| A23 | LSPA 16 | Force majeure lets either side terminate after 20 days; the list excludes cyber attacks and cloud outages | ⬜ | Availability and incident planning must assume no force-majeure cover for hosting outages. |

---

## 6. Before signing: lawyer, entity and insurance

These need to be settled before Stage 2, when the LSPA is signed.

| # | Item | Notes |
|---|---|---|
| L1 | Liability | Clause 12 indemnity is uncapped, one-way and includes consequential loss; there is no limitation-of-liability clause. Negotiate a cap. |
| L2 | Product definition | "Licensee Products and Services" means software "that provides Required Player Data and Course Data to the GA Central Database". If that covers the whole app, the Rules of Handicapping (4.4.1), SLAs and goodwill clause (2.7) reach social features. Define it narrowly as the GA-integrated features. |
| L3 | Entity | The operator is an existing Pty Ltd. Make sure the company, with its ACN, is the signing party, not the director personally. The licence is "personal, non-assignable" (2.1), and a change in control lets GA terminate immediately (14.2.5), so any future share sale or outside investment needs GA's consent first. With a single director, the "reasonable opinion" limb of Insolvency Event could arguably be triggered if the director is unavailable; ask the lawyer. |
| L4 | Course data upload | Course Data covers every course "using any Licensee's Products and Services", and 4.3.2 requires uploading course data entered by any user. That could push GolfAPI.io-derived and user-edited tee data to GA, which may breach GolfAPI.io's terms. |
| L5 | Our copy of uploaded data | Uploaded data is assigned to GA (2.4.5); no right in it is granted to us once uploaded (2.6); GA can demand return or destruction at any time (9.2.4). Negotiate a carve-out for our own copy, held with player consent, so GA-comp scores can still feed history, stats, the Social Handicap and leagues. |
| L6 | Capture scope | Clause 4.3.1 requires capturing "all Required Player Data". Get written confirmation that this excludes members' social rounds. |
| L7 | Sub-contractors vs hosting | 2.2.1 (no sub-contracting without consent) against 10.1 (named cloud environment). Name Supabase/AWS Sydney in the agreement. |
| L8 | Template blanks | Expiry Date, the 4.2/4.3 dates, `[INSERT PLATFORM]`, Schedule 2, the Schedule 3 ticks and transaction fee amounts. Schedule 1 refers to "the note in Item 2 below", which is missing from the text. |
| L9 | Insurance | $2M cyber (A13). Confirm the policy covers the contractual indemnity. |

---

## 7. Evidence pack (Guide §7)

| Area | Item | Status | Where |
|---|---|---|---|
| Organisational | Company profile, ownership, insurance | ⬜ | Pty Ltd exists (L3). Company name, ACN/ABN and address still TODO in the privacy policy. |
| Organisational | Implementation and change-management plan | ⬜ | — |
| Organisational | Support model, SLAs, incident process | ⬜ | Must cover every-day Support Hours (A7). |
| Product | Collateral and demo | 🟡 | `docs/APP_STORE_METADATA.md` |
| Product | Big Swings feature mapping | ⬜ | Document not yet obtained. |
| Product | Engagement outcomes | ⬜ | Supabase analytics |
| Product | Data model and consent approach | 🟡 | `docs/database/DATABASE_SCHEMA.md`; consent not built |
| Technical | Architecture diagram and data flows with GA | ⬜ | — |
| Technical | API notes (auth, errors, monitoring, webhooks) | ⬜ | — |
| Technical | Data mapping: Golf ID, memberUID, membership categories (read-only for a CMS), score payloads | ⬜ | See G1, G4, G5, S8. |
| Legal | Privacy policy | 🟡 | `docs/legal/PRIVACY_POLICY.md` (TODOs, unpublished) |
| Legal | Security controls overview | ⬜ | — |

Internal docs going into the pack must match D1: `CLAUDE.md` still describes
leagues as using "WHS handicap differentials".

---

## 8. Questions for GA

### Stage 1 intake (consumer direction, 2026-10-27)

| # | Question | Rows |
|---|---|---|
| I1 | Is there an "Other" licence for a golfer-facing app with no affiliated clubs as customers? What would it allow, what are the fees, and how does the assessment differ from a CMS or VMS? | E1 |
| I2 | Can a licensed provider read an individual golfer's GA Handicap with that golfer's consent, without per-club credentials (BRS 3C)? How would the golfer authorise it? | G1, G4 |
| I3 | In a friends' competition, may we show each player's Daily Handicap for the round (9B Note iii)? Could GA approve showing the GA Handicap itself (9B Note i)? | D2, D4 |
| I4 | Is there a route for a golfer-facing app to submit Conforming Social Scores: approval from GA directly, or only by integrating with a GA-Licenced VMS (6A)? How would home-club approval work? | S4 |
| I5 | Is a clearly-labelled app-only Social Handicap acceptable alongside a licence? | D1 |
| I6 | Until licensed, is it acceptable for players to enter their own handicap so we can calculate Daily Handicaps for social games? Should we change how it's displayed? | D4 |
| I7 | Can a golfer-facing app use GA course data for social rounds anywhere in Australia? | C1, C2 |
| I8 | Please send the API Integration Test Procedure, the WHS Official Reference Guide for Australian administrators, *Big Swings 2026–2030*, and any documentation for the "Other" licence. | Sources |
| I9 | What should the Stage 1 product overview include? | — |

### Follow-up detail (written for the club-product direction, 2026-10-27)

| # | Question | Rows |
|---|---|---|
| Q1 | Does a multi-club consumer app count as a club's own app ("club environs", 9B Note ii) when a club runs a GA comp in it? | E1, D2 |
| Q2 | Is the webhook HMAC key a provider-level secret or each club's `client_secret`? What encoding is the signature? | E4 |
| Q3 | Which field drives the Daily Handicap calculation: `index` (12 says don't use it; 13 calls it the GA Handicap value) or `displayIndex`? | D7 |
| Q4 | How are visitors from other clubs entered in a CMS competition? | G1, G4 |
| Q5 | Can team formats (ambrose, scramble) be submitted, and how? Can GA comps include match play? | S2, D7 |
| Q6 | Does LSPA Schedule 1 Item 2's player-data list apply to a CMS, given BRS 4C makes profile maintenance VMS-only? What is the missing "note in Item 2"? | G2, L8 |
| Q7 | Do paid competition entries count as "Bookings" for transaction fees? | A14 |
| Q8 | Is a clearly-labelled app-only Social Handicap acceptable? Is showing a player's self-entered handicap to others in social comps acceptable? | D1, D4 |
| Q9 | Please send the API Integration Test Procedure, the WHS Official Reference Guide for Australian administrators, and *Big Swings 2026–2030*. | Sources |
| Q10 | Can GA course data be shown in social rounds at clubs that don't use our club product (BRS 7A/12B vs LSPA 2.1.2/2.8)? | C2 |

---

## 9. Platform hygiene: open items found in the review

These are not GA-specific, but GA assessment category 5 will find them.

| # | Item | Severity | Status |
|---|---|---|---|
| X1 | `players` table readable by every signed-in user (email, phone, handicap) | High | ✅ App reads only public columns; leaking RPCs closed (20261008000000); column lock (20261014000000) applied to prod 2026-10-14 with 1.15.0. Smoke test under the lock pending. |
| X2 | Course and tee tables writable by any signed-in user | High | ❌ Open (`20260424100000_open_cache_writes_tees_coordinates.sql`) |
| X3 | GolfAPI key in git history and old app builds | High | 🟡 Proxy live. Rotate after the force-update minimum version is raised. |
| X4 | Account deletion broken for all users | High | ✅ `20261007000000_fix_account_deletion.sql` applied to staging 2026-10-08 and prod 2026-10-12. |
| X5 | Data export missing tables | Medium | 🟡 `export-data` fixed; deploy not confirmed. |
| X6 | Deleting an organiser cascades to their competitions | Medium | ❌ Open |
| X7 | No error tracking (Sentry) | Medium | ❌ Open. If added, keep GA-related data out of it (A1). |
| X8 | Signup consent not recorded | Medium | ❌ Open |

---

## 10. Roadmap to application

1. **Clean up (no GA access needed):** X2, X3, X5–X8, D1/D3 decision, D4 check, D5, D6, H5, publish the privacy policy.
2. **Commercial readiness:** lawyer review of section 6, cyber insurance (A13), support/SLA model covering every-day Support Hours (A7), club terms (A6).
3. **Data residency:** run the Sydney migration (A1, `docs/guides/SUPABASE_SYDNEY_MIGRATION.md`).
4. **Stage 1 intake:** product overview to GA Digital Product describing the consumer use case; ask the intake questions in section 8 (I1–I9), including the missing documents.
5. **Stage 2:** evidence pack (section 7), negotiate and sign the LSPA, pay the accreditation fee.
6. **Stage 3:** staging credentials. Build to the licence GA grants: handicap linking, display gating, GA course data and, if approved, round submission.
7. **Stage 4:** accreditation test suite and trouble-free period.
8. **Stage 5:** annual fee, production credentials, pilot club.

---

## 11. Change log

| Date | Change | Ref |
|---|---|---|
| 2026-10-07 | Initial review of Guide, BRS and LSPA. Tracker created. | — |
| 2026-10-07 | Removed WHS / Official / Verified handicap claims from app and store copy (E6 partial). | 1333d808 |
| 2026-10-07 | GolfAPI.io key moved to the `golfapi-proxy` edge function; deployed to staging and prod (X3 partial). | a8ffb817 |
| 2026-10-07 | Privacy policy corrected, breach runbook added, export-data completed, account-deletion fix migration written (E5 partial; not deployed). | c1a86ef5 |
| 2026-10-07 | 9-hole Daily Handicap matches BRS Appendix B (H2). | c1a86ef5 |
| 2026-10-07 | App index renamed to "Social Handicap", with a not-official disclaimer in app, store, privacy and marketing copy (D1, D3 partial). | feat/social-handicap-label |
| 2026-10-08 | Player privacy: other players' email/phone/age no longer shown or fetched; global achievement board anonymises non-friends; email-leaking RPCs closed; column lock prepared (X1 partial). | feat/player-privacy |
| 2026-10-12 | Account-deletion fix applied to prod (X4). | 20261007000000 |
| 2026-10-14 | Player column lock applied to prod with 1.15.0 (X1). | 20261014000000 |
| 2026-10-27 | Full re-review of Guide, BRS and LSPA. Corrected: CMS can never submit CSSs (Summary, S4); not-attempted holes and pickups use `didNotAttempt` / `pickedUp`, not nulls (H6, H7); batches are independent (S1); G2 and G3 basis; A1, A5, A7, A8, A9, A12, A13, A14 wording; H1 rounding; H3 citation; E2 reserved functions. Refreshed X1, X4, G1, H5, E5. Added D8, D9, H9, S6–S9, C4, C5, G4, G5, A15–A23, section 6 (lawyer/entity/insurance), section 8 (questions for GA), missing source documents and BRS numbering note. | — |
| 2026-10-27 | Corrected entity: the operator is an existing single-director Pty Ltd, not a sole trader (Summary, category 1, A12, L3, evidence pack, roadmap). | — |
| 2026-10-27 | Product direction revised: golfer-facing app with no affiliated clubs as customers; ask GA about an "Other" licence instead of CMS. Added intake questions I1–I9; club-product questions kept as follow-up detail (Summary, E1, L2, section 8, roadmap). | — |
| 2026-10-28 | Licensing questions I1–I9 emailed to GA (GA first sent the documents on 2026-08-21). | — |
