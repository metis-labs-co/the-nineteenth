# Plan: Skins Phase 3 - Payments MVP (Reduced Scope)

## Overview

Add payment settlement for skins games using Stripe Connect. This reduced-scope MVP focuses on the core flow: link bank account → game ends → settle debts automatically.

**Key Reductions from Original Plan:**
- Removed competition batch processing (Task 9.5)
- Simplified to 4 settlement statuses instead of 7
- Removed `settlement_threshold` feature (simple ON/OFF)
- Removed `skins_settlement_transactions` table (use Stripe's logs)
- Integrated with existing `SkinsSettlementCard` instead of parallel UI

## Approach

1. **Legal/Compliance** - Must complete before any implementation
2. **Stripe Setup** - Configure React Native Stripe with Connect
3. **Database** - Minimal schema for accounts and settlements
4. **Core Flow** - Account linking → settlement processing
5. **UI Integration** - Enable existing "Mark as Settled" button

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment processor | Stripe Connect Express | Fastest onboarding, handles compliance |
| Settlement statuses | 4 (pending, processing, completed, failed) | Simplest viable state machine |
| Transaction logging | Use Stripe's logs, not separate table | Avoid duplication, Stripe is source of truth |
| Auto-settlement | Simple ON/OFF toggle | Skip threshold complexity for MVP |
| UI approach | Extend existing SkinsSettlementCard | Reuse existing component, not parallel UI |
| Pool-sourced payouts | MVP: Direct pot only | Pool-sourced requires platform account architecture |

## Scope

**In Scope:**
- Direct pot games (player-to-player settlement)
- Bank account linking via Stripe Connect Express
- Auto-settlement for linked accounts
- Manual fallback for unlinked accounts
- Settlement status tracking

**Out of Scope (Phase 3.5+):**
- Pool-sourced game payouts (needs platform account design)
- Competition-level batch processing
- Settlement thresholds
- Detailed transaction logging
- Refund flows

---

## Phase 0: Legal & Prerequisites

### Step 0.1: Legal and Compliance Review
**Status:** ⏳ Pending
**Type:** Manual
**Command:** N/A

**Prompt:**
```
This is a BLOCKING prerequisite. No implementation should begin until legal review is complete.

Research and document:
1. Australian online gambling regulations for peer-to-peer social betting
2. Stripe Connect requirements for marketplace payments in Australia
3. Whether this qualifies as "gambling" under Australian law or "social gaming"
4. Terms of Service additions required
5. Privacy Policy updates for financial data
6. Age verification requirements (if any)

Output: Create docs/guides/SKINS_PAYMENTS_COMPLIANCE.md with findings and checklist.

IMPORTANT: This may require actual legal consultation. Document what needs lawyer review vs. what can be determined from public documentation.
```

**Deliverables:**
- [ ] `docs/guides/SKINS_PAYMENTS_COMPLIANCE.md`
- [ ] Legal checklist with blocking items identified
- [ ] Decision: proceed, modify approach, or abandon

**Dependencies:** None
**Notes:** This step may take weeks if legal consultation is needed. Do not proceed to implementation until cleared.

---

## Phase 1: Stripe Setup

### Step 1.1: Install and Configure React Native Stripe
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Install and configure Stripe for React Native with Expo:

1. Install package:
   pnpm add @stripe/stripe-react-native

2. Update app.config.js to add Stripe configuration:
   - Add merchantIdentifier for Apple Pay (optional for MVP)
   - Configure URL scheme for deep links: "thenineteenth"

3. Update .env.example with new variables:
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_... (server-side only)
   STRIPE_WEBHOOK_SECRET=whsec_...

4. Wrap app with StripeProvider in App.tsx or create a StripeProviderWrapper

5. Create src/services/payments/stripeConfig.ts with initialization logic

Reference: https://stripe.com/docs/payments/accept-a-payment?platform=react-native
```

**Deliverables:**
- [ ] `@stripe/stripe-react-native` installed
- [ ] `app.config.js` updated with Stripe config
- [ ] `.env.example` updated
- [ ] StripeProvider wrapper added
- [ ] `src/services/payments/stripeConfig.ts`

**Dependencies:** Step 0.1 (legal clearance)

---

### Step 1.2: Create Payment Types
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create src/types/database/payments.types.ts following existing pattern (skins.types.ts):

// Enums
export type PaymentProvider = 'stripe';
export type PaymentAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled';
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Database types
export interface PlayerPaymentAccount {
  id: string;
  player_id: string;
  provider: PaymentProvider;
  provider_account_id: string;  // Stripe Connect account ID
  account_status: PaymentAccountStatus;
  payout_enabled: boolean;
  charges_enabled: boolean;
  details_submitted: boolean;
  auto_settlement_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkinsSettlement {
  id: string;
  skins_game_id: string;
  skins_payout_id: string | null;  // Links to calculated payout
  from_player_id: string;  // Payer (debtor)
  to_player_id: string;    // Payee (creditor)
  amount: number;
  currency: string;
  status: SettlementStatus;
  provider_transfer_id: string | null;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkinsSettlementWithPlayers extends SkinsSettlement {
  from_player: { id: string; name: string };
  to_player: { id: string; name: string };
}

// Input types
export interface CreatePaymentAccountInput {
  return_url: string;
  refresh_url: string;
}

export interface PaymentAccountOnboardingResult {
  account_id: string;
  onboarding_url: string;
}

// Summary type
export interface SettlementSummary {
  total_owed: number;      // What I owe others
  total_owing: number;     // What others owe me
  pending_count: number;
  completed_count: number;
}

Export from src/types/database/index.ts
```

**Deliverables:**
- [ ] `src/types/database/payments.types.ts`
- [ ] Export added to `src/types/database/index.ts`

**Dependencies:** None

---

## Phase 2: Database Schema

### Step 2.1: Payment Accounts Table
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/db`

**Prompt:**
```
Create migration for player payment accounts table.

Table: player_payment_accounts
- id: UUID PK DEFAULT gen_random_uuid()
- player_id: UUID FK to players ON DELETE CASCADE, UNIQUE
- provider: TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe'))
- provider_account_id: TEXT NOT NULL (Stripe Connect account ID)
- account_status: TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending', 'active', 'restricted', 'disabled')
- payout_enabled: BOOLEAN DEFAULT FALSE
- charges_enabled: BOOLEAN DEFAULT FALSE
- details_submitted: BOOLEAN DEFAULT FALSE
- auto_settlement_enabled: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()

Indexes:
- player_id (unique)
- provider_account_id

RLS Policies:
- SELECT: users can view own account (auth.uid() = player_id OR player is in user's competitions as organizer)
- INSERT: users can create own account
- UPDATE: users can update own account
- DELETE: users can delete own account

Trigger: update updated_at on change
```

**Deliverables:**
- [ ] `supabase/migrations/2026XXXX_player_payment_accounts.sql`
- [ ] RLS policies
- [ ] Indexes

**Dependencies:** Step 1.2 (types)

---

### Step 2.2: Settlements Table
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/db`

**Prompt:**
```
Create migration for skins settlements table.

Table: skins_settlements
- id: UUID PK DEFAULT gen_random_uuid()
- skins_game_id: UUID FK to skins_games ON DELETE CASCADE
- skins_payout_id: UUID FK to skins_payouts NULL (links to calculated payout)
- from_player_id: UUID FK to players NOT NULL (payer/debtor)
- to_player_id: UUID FK to players NOT NULL (payee/creditor)
- amount: DECIMAL(10,2) NOT NULL CHECK (amount > 0)
- currency: TEXT DEFAULT 'AUD'
- status: TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending', 'processing', 'completed', 'failed')
- provider_transfer_id: TEXT NULL (Stripe transfer ID)
- processed_at: TIMESTAMPTZ NULL
- completed_at: TIMESTAMPTZ NULL
- failed_at: TIMESTAMPTZ NULL
- failure_reason: TEXT NULL
- created_at: TIMESTAMPTZ DEFAULT NOW()
- updated_at: TIMESTAMPTZ DEFAULT NOW()

Constraints:
- UNIQUE (skins_game_id, from_player_id, to_player_id)

Indexes:
- skins_game_id
- from_player_id
- to_player_id
- status
- skins_payout_id

RLS Policies:
- SELECT: users can see settlements where they are from_player or to_player
- INSERT: service role only (settlements created by backend)
- UPDATE: service role only
- DELETE: none (audit trail)

Trigger: update updated_at on change
```

**Deliverables:**
- [ ] `supabase/migrations/2026XXXX_skins_settlements.sql`
- [ ] RLS policies
- [ ] Indexes

**Dependencies:** Step 2.1

---

## Phase 3: Stripe Service

### Step 3.1: Stripe Connect Service
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create src/services/payments/stripeService.ts for Stripe Connect operations.

This service handles Stripe API calls. For MVP, focus on:

1. createConnectAccount(email: string, country: string = 'AU')
   - Creates Stripe Express account
   - Returns account_id

2. createAccountLink(accountId: string, returnUrl: string, refreshUrl: string)
   - Creates onboarding link for user to complete Stripe setup
   - Returns { url: string }

3. getAccountStatus(accountId: string)
   - Fetches account from Stripe
   - Returns { payoutEnabled, chargesEnabled, detailsSubmitted, status }

4. createTransfer(params: {
     amount: number,
     currency: string,
     destinationAccountId: string,
     sourceAccountId: string,
     metadata: { settlement_id: string, skins_game_id: string }
   })
   - Creates direct charge on source, transfers to destination
   - Returns transfer ID

Error handling:
- Create PaymentError class extending Error with code and message
- Handle rate limiting with exponential backoff
- Log all API calls for debugging

Note: This uses Stripe's server-side SDK. For React Native, API calls go through
Supabase Edge Functions, not directly from the app.
```

**Deliverables:**
- [ ] `src/services/payments/stripeService.ts`
- [ ] `src/services/payments/PaymentError.ts`
- [ ] `src/services/payments/index.ts` (barrel export)

**Dependencies:** Step 1.1

---

### Step 3.2: Stripe Webhook Edge Function
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create Supabase Edge Function for Stripe webhooks.

File: supabase/functions/stripe-webhook/index.ts

Handle these webhook events:

1. account.updated
   - Update player_payment_accounts with new status/capabilities
   - Fields: payout_enabled, charges_enabled, details_submitted, account_status

2. transfer.created / transfer.paid
   - Find settlement by metadata.settlement_id
   - Update status to 'completed', set completed_at

3. transfer.failed
   - Find settlement by metadata.settlement_id
   - Update status to 'failed', set failed_at, failure_reason

Security:
- Verify webhook signature using Stripe signing secret
- Return 200 immediately, process async if needed
- Log all events for debugging

Database updates use service role client (bypasses RLS).

Push notifications (if enabled):
- On transfer.paid: Notify recipient "You received $X from skins game"
- On transfer.failed: Notify sender "Payment to X failed"
```

**Deliverables:**
- [ ] `supabase/functions/stripe-webhook/index.ts`
- [ ] Signature verification
- [ ] Event handlers for account and transfer events

**Dependencies:** Step 2.2, Step 3.1

---

## Phase 4: Settlement Logic

### Step 4.1: Settlement Service
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create src/services/payments/settlementService.ts for settlement logic.

Functions:

1. createSettlementsForGame(skinsGameId: string)
   - Fetch skins_payouts for game
   - Calculate net positions using existing calculateNetPositions()
   - Simplify debts using existing simplifyDebts()
   - Create skins_settlements records for each debt transaction
   - Link to skins_payout_id where applicable
   - Only for pool_source='direct' games (MVP scope)

2. processSettlement(settlementId: string)
   - Validate both parties have linked payment accounts
   - Check accounts are active (payout_enabled, charges_enabled)
   - Call stripeService.createTransfer()
   - Update settlement status to 'processing'
   - Return { success: boolean, error?: string }

3. processAutoSettlements(skinsGameId: string)
   - Find all pending settlements for game
   - Filter where both parties have auto_settlement_enabled=true
   - Process each settlement
   - Return summary { processed: number, failed: number }

4. getSettlementsByGame(skinsGameId: string)
   - Fetch all settlements with player details
   - Return SkinsSettlementWithPlayers[]

5. getSettlementSummary(playerId: string)
   - Calculate totals: owed, owing, pending, completed
   - Return SettlementSummary

Import existing functions from skinsCalculations.ts:
- calculateNetPositions
- simplifyDebts
```

**Deliverables:**
- [ ] `src/services/payments/settlementService.ts`
- [ ] Integration with existing skinsCalculations.ts
- [ ] Settlement creation and processing logic

**Dependencies:** Step 3.1, Step 2.2

---

### Step 4.2: Settlement Hooks
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/hook`

**Prompt:**
```
Create src/hooks/useSettlements.ts with TanStack Query hooks.

Query keys (add to queryKeys.ts):
- settlements: { all: ['settlements'], byGame: (id) => [..., 'game', id], byPlayer: (id) => [..., 'player', id], summary: (id) => [..., 'summary', id] }

Hooks:

1. useGameSettlements(gameId: string)
   - Fetch settlements for a skins game
   - Returns { settlements: SkinsSettlementWithPlayers[], isLoading, error }

2. useMySettlementSummary()
   - Fetch current user's settlement summary
   - Returns { summary: SettlementSummary, isLoading, error }

3. useProcessSettlement()
   - Mutation to manually process a pending settlement
   - Invalidates game settlements on success

4. useCreateGameSettlements()
   - Mutation to create settlements for a completed game
   - Called when game is finalized

Follow patterns from existing useSkins.ts for query structure.
```

**Deliverables:**
- [ ] `src/hooks/useSettlements.ts`
- [ ] Query key additions to `src/hooks/queryKeys.ts`

**Dependencies:** Step 4.1

---

## Phase 5: Payment Account UI

### Step 5.1: Payment Account Hooks
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/hook`

**Prompt:**
```
Create src/hooks/usePaymentAccount.ts for payment account management.

Query keys:
- paymentAccount: (playerId) => ['payment', 'account', playerId]

Hooks:

1. useMyPaymentAccount()
   - Fetch current user's payment account (may be null)
   - Returns { account: PlayerPaymentAccount | null, isLoading, error }

2. useCreatePaymentAccount()
   - Mutation that:
     a. Calls Supabase Edge Function to create Stripe Connect account
     b. Saves account to database
     c. Returns onboarding URL
   - Returns { mutate, isLoading, data: { onboardingUrl } }

3. useRefreshAccountStatus()
   - Mutation to fetch latest status from Stripe
   - Updates local database record
   - Useful after user completes onboarding

4. useUpdatePaymentPreferences()
   - Mutation to update auto_settlement_enabled
   - Invalidates account query

5. useDisconnectPaymentAccount()
   - Mutation to set account_status='disabled'
   - Does not delete (audit trail)
```

**Deliverables:**
- [ ] `src/hooks/usePaymentAccount.ts`

**Dependencies:** Step 2.1

---

### Step 5.2: Payment Account Screen
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/screen`

**Prompt:**
```
Create PaymentAccountScreen for managing linked payment account.

Route: 'PaymentAccount' (no params)
Location: src/screens/profile/PaymentAccountScreen.tsx

Layout depends on account state:

IF NO ACCOUNT LINKED:
- PageHeader: "Payment Account"
- Explainer card with icon: "Link your bank account for automatic skins settlement"
- Benefits list:
  - "Automatic payments when games end"
  - "Secure payments via Stripe"
  - "No need to chase money"
- Primary button: "Link Bank Account"
  - Opens Stripe Connect onboarding in browser via Linking
- Note: "Manual settlement always available as backup"

IF ACCOUNT LINKED:
- PageHeader: "Payment Account"
- Status card showing:
  - Account status (active, pending verification, restricted)
  - Green checkmark for active, yellow for pending, red for restricted
- Auto-settlement toggle:
  - Label: "Auto-settle skins games"
  - Description: "Automatically pay/receive when games complete"
- "Disconnect Account" button (destructive style)
  - Confirmation dialog before disconnecting

Deep link handling:
- Handle return from Stripe onboarding via URL scheme
- Call refreshAccountStatus on return
- Show success/error toast

Add navigation:
- Add to ProfileStackNavigator
- Add link from SettingsScreen under "Payments" section
```

**Deliverables:**
- [ ] `src/screens/profile/PaymentAccountScreen.tsx`
- [ ] Navigation registration
- [ ] Link from SettingsScreen

**Dependencies:** Step 5.1

---

## Phase 6: UI Integration

### Step 6.1: Update SkinsSettlementCard
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update existing src/components/skins/SkinsSettlementCard.tsx to show settlement status.

Current state: Has disabled "Mark as Settled" button (lines 316-330)

Changes needed:

1. Add new props:
   - settlements?: SkinsSettlementWithPlayers[]
   - onProcessSettlement?: (settlementId: string) => void

2. In "WHO OWES WHO" section, show settlement status per debt:
   - If settlement exists and completed: green checkmark + "Paid"
   - If settlement exists and processing: spinner + "Processing"
   - If settlement exists and failed: red X + "Failed" + retry button
   - If settlement exists and pending: "Pending" + process button (if manual)
   - If no settlement: show as before (manual settlement needed)

3. Update "Mark as Settled" button:
   - Enable when all debts have settlements in 'completed' status
   - Or show "All Settled" with checkmark if already complete

4. Add "Process All" button:
   - Visible when settlements exist but aren't processed
   - Triggers batch processing for pending settlements
   - Shows loading state during processing

5. Add warning banner if any player missing payment account:
   - "Some players haven't linked payment accounts. Manual settlement may be required."

Keep existing share functionality unchanged.
```

**Deliverables:**
- [ ] Updated `src/components/skins/SkinsSettlementCard.tsx`
- [ ] Settlement status display
- [ ] Process buttons
- [ ] Missing account warning

**Dependencies:** Step 4.2

---

### Step 6.2: Integrate Settlement Creation on Game Finalize
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update skins game finalization to create settlements automatically.

Modify useSkins.ts useFinalizeSkinsGame() mutation:

1. After successful finalize, call createSettlementsForGame()
2. Then call processAutoSettlements() to process any that can auto-settle
3. Handle errors gracefully (settlement failure shouldn't fail game finalization)

The flow:
1. Game completes (all 18 holes scored)
2. User finalizes game
3. Payouts calculated and saved (existing)
4. Settlements created from payouts (new)
5. Auto-settlements processed for users with linked accounts (new)
6. UI shows settlement status

Add to onSuccess callback of finalize mutation:
- Invalidate settlements queries
- Show toast: "Game finalized. Settlements being processed."

Error handling:
- Log settlement errors but don't block finalization
- Settlement can be retried manually later
```

**Deliverables:**
- [ ] Updated `useFinalizeSkinsGame` in `src/hooks/useSkins.ts`
- [ ] Settlement creation on finalize
- [ ] Auto-settlement triggering

**Dependencies:** Step 4.1, Step 4.2

---

### Step 6.3: Add Settlements to Round View
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update ViewRoundScreen skins tab to show settlement status.

File: src/screens/rounds/ViewRoundScreen.tsx (or wherever skins tab is rendered)

When displaying SkinsSettlementCard:
1. Fetch settlements for the game using useGameSettlements(gameId)
2. Pass settlements to SkinsSettlementCard
3. Pass onProcessSettlement handler that uses useProcessSettlement mutation

Show appropriate states:
- If game not complete: show current skins results (existing)
- If game complete, settlements pending: show settlement card with pending status
- If game complete, settlements processed: show settlement card with completion status
- If game complete, no settlements (legacy game): show settlement card without status

This integrates the settlement UI into the existing round viewing flow.
```

**Deliverables:**
- [ ] Updated round view with settlement integration
- [ ] Settlement data fetching
- [ ] Process settlement handler

**Dependencies:** Step 6.1

---

## Phase 7: Documentation

### Step 7.1: Update Documentation
**Status:** ⏳ Pending
**Type:** Command
**Command:** `/docs`

**Prompt:**
```
Update documentation for payment integration.

Files to update:

1. docs/database/DATABASE_SCHEMA.md
   - Add player_payment_accounts table
   - Add skins_settlements table
   - Document relationships

2. docs/guides/SKINS_GAME.md
   - Add "Payments & Settlement" section
   - Explain automatic settlement flow
   - Document manual settlement fallback
   - Cover account linking process

3. CLAUDE.md
   - Add payments to tech stack (Stripe Connect)
   - Mention payment integration in skins feature

4. .env.example
   - Ensure Stripe variables documented

Keep documentation concise and practical.
```

**Deliverables:**
- [ ] `docs/database/DATABASE_SCHEMA.md` updated
- [ ] `docs/guides/SKINS_GAME.md` extended
- [ ] `CLAUDE.md` updated
- [ ] `.env.example` complete

**Dependencies:** All previous steps

---

## Critical Files

### To Create
| File | Purpose |
|------|---------|
| `src/types/database/payments.types.ts` | Payment type definitions |
| `src/services/payments/stripeService.ts` | Stripe API integration |
| `src/services/payments/settlementService.ts` | Settlement logic |
| `src/services/payments/index.ts` | Barrel export |
| `src/hooks/usePaymentAccount.ts` | Payment account hooks |
| `src/hooks/useSettlements.ts` | Settlement hooks |
| `src/screens/profile/PaymentAccountScreen.tsx` | Account management UI |
| `supabase/functions/stripe-webhook/index.ts` | Webhook handler |
| `supabase/migrations/2026XXXX_player_payment_accounts.sql` | Accounts table |
| `supabase/migrations/2026XXXX_skins_settlements.sql` | Settlements table |
| `docs/guides/SKINS_PAYMENTS_COMPLIANCE.md` | Legal requirements |

### To Modify
| File | Changes |
|------|---------|
| `src/types/database/index.ts` | Export payments types |
| `src/hooks/queryKeys.ts` | Add settlement query keys |
| `src/hooks/useSkins.ts` | Settlement creation on finalize |
| `src/components/skins/SkinsSettlementCard.tsx` | Add settlement status UI |
| `src/screens/profile/SettingsScreen.tsx` | Link to payment account |
| `src/navigation/types.ts` | Add PaymentAccount route |
| `app.config.js` | Stripe configuration |
| `.env.example` | Stripe environment variables |

---

## Verification

How to verify the plan is complete:

- [ ] Legal compliance document reviewed and approved
- [ ] User can link bank account via Stripe Connect
- [ ] Account status updates via webhooks
- [ ] Completing a skins game creates settlements
- [ ] Settlements auto-process for users with linked accounts
- [ ] Settlement status visible in SkinsSettlementCard
- [ ] Manual process button works for pending settlements
- [ ] Users without accounts see appropriate messaging
- [ ] Stripe test mode works end-to-end

---

## Deferred to Phase 3.5

These features were removed from MVP scope:

1. **Pool-sourced game payouts** - Requires platform account architecture
2. **Competition batch processing** - Task 9.5 from original plan
3. **Settlement threshold** - Auto-pay amounts over $X
4. **Transaction logging table** - skins_settlement_transactions
5. **Refund flows** - Handle after MVP based on real usage
6. **Detailed statuses** - approved, cancelled, refunded

---

## Time Estimates

| Phase | Steps | Est. Hours |
|-------|-------|------------|
| Phase 0: Legal | 1 | Variable (blocking) |
| Phase 1: Stripe Setup | 2 | 4-6 |
| Phase 2: Database | 2 | 3-4 |
| Phase 3: Stripe Service | 2 | 6-8 |
| Phase 4: Settlement Logic | 2 | 5-6 |
| Phase 5: Account UI | 2 | 5-6 |
| Phase 6: UI Integration | 3 | 6-8 |
| Phase 7: Documentation | 1 | 2-3 |

**Total: ~32-41 hours** (down from 48-66 in original plan)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Legal blocks feature | Complete Phase 0 before any implementation |
| Stripe onboarding abandonment | Manual settlement always works as fallback |
| Webhook delivery issues | Retry logic + manual status refresh |
| Users don't link accounts | Feature degrades gracefully to manual |

---

**Last Updated:** 2026-01-24
**Prerequisites:** Legal review must complete before implementation
**Reduced from:** Original 17 tasks to 15 tasks (13 implementation + 1 legal + 1 docs)
