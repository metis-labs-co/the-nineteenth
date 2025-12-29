# Skins Game - Phase 3 Implementation Plan

**Goal:** Add bank account linking and automatic payment settlement for skins games
**Status:** Not Started - 0% (0/15 tasks)
**Prerequisites:** Phase 1 and Phase 2 complete

---

## Overview

This plan implements **Phase 3** of the Skins gambling feature - integrating payment processing to enable automatic settlement of skins games. This phase transforms skins from a manual settlement feature into a seamless payment experience.

### Key Features
- **Bank account linking** - Securely link payment method via Stripe Connect
- **Automatic settlement** - Losers pay winners automatically after game
- **Settlement history** - Track all payments made/received
- **Payment preferences** - Auto-pay vs manual approval
- **New "Pro" tier** - Gambling features may require dedicated tier

### Payment Flow

```
Game Ends → Calculate Payouts → Send Payment Requests
                                      ↓
         ┌─────────────────────────────┼─────────────────────────────┐
         ↓                             ↓                             ↓
   [Auto-pay ON]               [Auto-pay OFF]               [No Bank Linked]
         ↓                             ↓                             ↓
   Process Payment             Send Notification              Show Reminder
         ↓                       "Approve $X?"                "Link Bank"
   Send Receipt                      ↓                             ↓
                              Approve/Decline                 Manual Settlement
                                     ↓
                              Process if Approved
```

### Legal & Compliance Considerations

This phase involves real money transfers and requires:
- **Stripe Connect** or similar payment processor
- **KYC verification** for accounts over thresholds
- **Australian gambling regulations** compliance
- **Terms of Service** updates
- **Privacy Policy** updates for financial data
- **Potential "Pro" subscription tier** for payment features

---

## Sprint 1: Planning & Architecture

### Task 1: Legal and Compliance Review
**Status:** Not Started
**Command:**
```bash
/docs "Create docs/guides/SKINS_PAYMENTS_COMPLIANCE.md documenting legal requirements for skins payment processing. Research and document: (1) Australian online gambling regulations for peer-to-peer social betting. (2) Stripe Connect requirements for marketplace payments. (3) KYC/AML requirements and thresholds. (4) Required Terms of Service additions. (5) Privacy Policy updates for financial data. (6) Age verification requirements. (7) State/territory specific restrictions (if any). (8) Tax reporting obligations (1099-K equivalent in Australia). Include checklist of items to complete before launch. Note: This task may require legal consultation - document what needs lawyer review."
```
**Deliverables:**
- [ ] `docs/guides/SKINS_PAYMENTS_COMPLIANCE.md`
- [ ] Gambling regulations summary
- [ ] Stripe Connect requirements
- [ ] Legal checklist
- [ ] Items requiring lawyer review

**Dependencies:** None
**Estimated Time:** 4-6 hours (research)

---

### Task 2: Payment Architecture Design
**Status:** Not Started
**Command:**
```bash
/docs "Create docs/guides/SKINS_PAYMENTS_ARCHITECTURE.md documenting payment system architecture. Include: (1) Payment processor choice (Stripe Connect recommended). (2) Account linking flow diagram. (3) Settlement flow diagram. (4) Webhook handling design. (5) Error handling and retry logic. (6) Refund handling. (7) Database schema overview (linked_accounts, settlements, transactions). (8) Security considerations (PCI compliance via Stripe, no card data storage). (9) Edge cases: insufficient funds, declined payments, disputed transactions. (10) Notification strategy for payment events. Create architecture decision record (ADR) format."
```
**Deliverables:**
- [ ] `docs/guides/SKINS_PAYMENTS_ARCHITECTURE.md`
- [ ] Payment processor decision
- [ ] Flow diagrams
- [ ] Security design
- [ ] Edge case handling

**Dependencies:** Task 1
**Estimated Time:** 3-4 hours

---

## Sprint 2: Database Schema

### Task 3: Payment Accounts Table
**Status:** Not Started
**Command:**
```bash
/db "Create migration for payment accounts table. New table player_payment_accounts: id UUID PK, player_id UUID FK to players ON DELETE CASCADE, provider TEXT NOT NULL CHECK IN ('stripe') DEFAULT 'stripe', provider_account_id TEXT NOT NULL (Stripe Connect account ID), provider_customer_id TEXT NULL (Stripe customer ID for receiving), account_status TEXT NOT NULL CHECK IN ('pending', 'active', 'restricted', 'disabled') DEFAULT 'pending', account_type TEXT NOT NULL CHECK IN ('express', 'standard') DEFAULT 'express' (Stripe account type), capabilities JSONB DEFAULT '{}' (card_payments, transfers enabled status), payout_enabled BOOLEAN DEFAULT FALSE, charges_enabled BOOLEAN DEFAULT FALSE, details_submitted BOOLEAN DEFAULT FALSE, default_currency TEXT DEFAULT 'AUD', auto_settlement_enabled BOOLEAN DEFAULT TRUE, settlement_threshold DECIMAL(10,2) DEFAULT 0 (min amount before auto-settle), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), verified_at TIMESTAMPTZ NULL. Add UNIQUE constraint on (player_id, provider). RLS: users view/manage own accounts only. Indexes on player_id, provider_account_id."
```
**Deliverables:**
- [ ] `supabase/migrations/2025XXXX_player_payment_accounts.sql`
- [ ] `player_payment_accounts` table
- [ ] RLS policies
- [ ] Indexes

**Dependencies:** Task 2 (architecture)
**Estimated Time:** 2-3 hours

---

### Task 4: Settlements Table
**Status:** Not Started
**Command:**
```bash
/db "Create migration for skins settlements table. New table skins_settlements: id UUID PK, skins_game_id UUID FK to skins_games ON DELETE CASCADE, from_player_id UUID FK to players (payer), to_player_id UUID FK to players (payee), amount DECIMAL(10,2) NOT NULL CHECK > 0, currency TEXT DEFAULT 'AUD', status TEXT NOT NULL CHECK IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending', provider TEXT DEFAULT 'stripe', provider_transfer_id TEXT NULL (Stripe transfer ID), provider_charge_id TEXT NULL (Stripe charge ID), requires_approval BOOLEAN DEFAULT FALSE (true if auto_settlement disabled), approved_at TIMESTAMPTZ NULL, approved_by UUID FK to players NULL (should be from_player_id), processed_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, failed_at TIMESTAMPTZ NULL, failure_reason TEXT NULL, refunded_at TIMESTAMPTZ NULL, refund_reason TEXT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(). Add UNIQUE constraint on (skins_game_id, from_player_id, to_player_id). RLS: users see settlements they're party to. Index on status, from_player_id, to_player_id."
```
**Deliverables:**
- [ ] `supabase/migrations/2025XXXX_skins_settlements.sql`
- [ ] `skins_settlements` table
- [ ] RLS policies
- [ ] Status flow constraints

**Dependencies:** Task 3
**Estimated Time:** 2-3 hours

---

### Task 5: Settlement Transactions Log
**Status:** Not Started
**Command:**
```bash
/db "Create migration for settlement transaction logs. New table skins_settlement_transactions: id UUID PK, settlement_id UUID FK to skins_settlements ON DELETE CASCADE, transaction_type TEXT NOT NULL CHECK IN ('charge', 'transfer', 'refund', 'payout'), provider TEXT DEFAULT 'stripe', provider_transaction_id TEXT NOT NULL, amount DECIMAL(10,2) NOT NULL, fee_amount DECIMAL(10,2) DEFAULT 0, net_amount DECIMAL(10,2) NOT NULL, currency TEXT DEFAULT 'AUD', status TEXT NOT NULL CHECK IN ('pending', 'succeeded', 'failed'), failure_code TEXT NULL, failure_message TEXT NULL, metadata JSONB DEFAULT '{}' (store full Stripe response), created_at TIMESTAMPTZ DEFAULT NOW(). Index on settlement_id, provider_transaction_id. RLS: inherits from settlement visibility."
```
**Deliverables:**
- [ ] `skins_settlement_transactions` table
- [ ] Transaction types
- [ ] Fee tracking
- [ ] Audit trail

**Dependencies:** Task 4
**Estimated Time:** 1-2 hours

---

## Sprint 3: TypeScript Types

### Task 6: Payment Type Definitions
**Status:** Not Started
**Command:**
```bash
/refactor "Add payment types to src/types/database/skins.types.ts or new file src/types/database/payments.types.ts. Types: PaymentProvider = 'stripe', PaymentAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled', SettlementStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded'. Interfaces: PlayerPaymentAccount (all columns as camelCase), PaymentAccountCapabilities ({cardPayments: boolean, transfers: boolean}), SkinsSettlement (all columns), SkinsSettlementWithPlayers extends with fromPlayer and toPlayer objects, SettlementTransaction (all columns), CreateSettlementInput, ApproveSettlementInput, PaymentAccountOnboardingResult ({accountId, onboardingUrl}), SettlementSummary ({totalOwed, totalOwing, pendingSettlements, completedSettlements}). Export all."
```
**Deliverables:**
- [ ] Payment type definitions
- [ ] Settlement types
- [ ] Transaction types
- [ ] Input types

**Dependencies:** Tasks 3, 4, 5 (schema)
**Estimated Time:** 1-2 hours

---

## Sprint 4: Stripe Integration

### Task 7: Stripe Service Setup
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/services/payments/stripeService.ts for Stripe Connect integration. Setup: Configure Stripe SDK with publishable key from env. Functions: (1) createConnectAccount(playerId, email, country) - creates Stripe Express account, returns account_id. (2) createAccountLink(accountId, returnUrl, refreshUrl) - creates onboarding link. (3) getAccountStatus(accountId) - fetches account capabilities and status. (4) createTransfer(amount, currency, destinationAccountId, metadata) - transfers to connected account. (5) createCharge(amount, currency, sourceAccountId, destinationAccountId, metadata) - charges source, transfers to destination. (6) createRefund(chargeId, amount, reason) - refunds a charge. (7) getBalance(accountId) - gets account balance. Error handling with custom PaymentError class. Rate limiting consideration. Export as stripeService singleton."
```
**Deliverables:**
- [ ] `src/services/payments/stripeService.ts`
- [ ] Account creation
- [ ] Onboarding links
- [ ] Transfer functions
- [ ] Error handling

**Dependencies:** Task 6 (types)
**Estimated Time:** 4-5 hours

---

### Task 8: Webhook Handlers
**Status:** Not Started
**Command:**
```bash
/refactor "Create Supabase Edge Function for Stripe webhooks. File: supabase/functions/stripe-webhook/index.ts. Handle events: (1) account.updated - update player_payment_accounts with new capabilities/status. (2) transfer.created, transfer.updated, transfer.failed - update skins_settlement_transactions. (3) charge.succeeded, charge.failed, charge.refunded - update settlement status. (4) payout.paid, payout.failed - track payouts to bank. Verify webhook signature using Stripe signing secret. Log all events. Update settlement status based on transfer/charge outcomes. Send push notifications on significant events (payment received, payment failed). Create helper function processStripeEvent(event) with switch on event.type."
```
**Deliverables:**
- [ ] `supabase/functions/stripe-webhook/index.ts`
- [ ] Event handlers for all types
- [ ] Signature verification
- [ ] Database updates
- [ ] Push notifications

**Dependencies:** Task 7 (service)
**Estimated Time:** 4-5 hours

---

## Sprint 5: Settlement Logic

### Task 9: Settlement Service
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/services/payments/settlementService.ts for settlement logic. Functions: (1) createSettlementsForGame(skinsGameId) - reads skins_payouts, calculates who owes whom (using simplifyDebts from skinsCalculations), creates skins_settlements records. (2) processSettlement(settlementId) - checks if both parties have payment accounts, validates amounts, calls stripeService to process, updates status. (3) approveSettlement(settlementId, approverId) - marks approved if manual approval required. (4) cancelSettlement(settlementId, reason) - cancels pending settlement. (5) refundSettlement(settlementId, reason) - initiates refund for completed settlement. (6) getSettlementSummary(playerId) - returns SettlementSummary with totals. (7) processAutoSettlements() - batch process all pending settlements where both parties have auto-settlement enabled. Export as settlementService."
```
**Deliverables:**
- [ ] `src/services/payments/settlementService.ts`
- [ ] Settlement creation
- [ ] Processing logic
- [ ] Auto-settlement batch
- [ ] Summary calculations

**Dependencies:** Task 7 (stripe), Phase 1 calculations
**Estimated Time:** 4-5 hours

---

### Task 10: Settlement React Query Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/useSettlements.ts with TanStack Query hooks. Query keys in queryKeys.ts: settlements: () => [...skinsKeys.all, 'settlements'], settlementsByPlayer: (playerId) => [...settlements(), 'player', playerId], settlementsByGame: (gameId) => [...settlements(), 'game', gameId], settlementSummary: (playerId) => [...settlements(), 'summary', playerId]. Hooks: (1) useMySettlements(options?: {status?: SettlementStatus}) - settlements where current user is from or to, filterable by status. (2) useGameSettlements(gameId) - all settlements for a game. (3) useSettlementSummary() - summary for current user. (4) useApproveSettlement() - mutation to approve. (5) useProcessSettlement() - mutation to process (admin/manual). (6) useCancelSettlement() - mutation to cancel. Mutations invalidate relevant queries."
```
**Deliverables:**
- [ ] `src/hooks/useSettlements.ts`
- [ ] Query hooks
- [ ] Mutation hooks
- [ ] Query key patterns

**Dependencies:** Task 9 (service), Task 6 (types)
**Estimated Time:** 2-3 hours

---

## Sprint 6: Payment Account UI

### Task 11: Payment Account Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/usePaymentAccount.ts for payment account management. Query keys: paymentAccount: (playerId) => ['payment', 'account', playerId]. Hooks: (1) useMyPaymentAccount() - fetches current user's payment account, null if not linked. (2) useCreatePaymentAccount() - mutation that calls stripeService.createConnectAccount, saves to DB, returns onboarding URL. (3) useRefreshAccountStatus() - mutation that fetches latest status from Stripe, updates DB. (4) useUpdatePaymentPreferences(updates) - mutation to update auto_settlement_enabled, settlement_threshold. (5) useDisconnectPaymentAccount() - mutation to disable (not delete) account."
```
**Deliverables:**
- [ ] `src/hooks/usePaymentAccount.ts`
- [ ] Account query
- [ ] Create/onboard mutation
- [ ] Preferences mutations

**Dependencies:** Task 7 (service)
**Estimated Time:** 2-3 hours

---

### Task 12: PaymentAccountScreen
**Status:** Not Started
**Command:**
```bash
/screen "PaymentAccountScreen - Manage linked payment account. Route: 'PaymentAccount' no params. Layout: ScrollView with PageHeader 'Payment Account'. If no account linked: (1) Explainer card 'Link your bank account for automatic skins settlement'. (2) Benefits list: 'Automatic payments', 'Instant settlement', 'Secure via Stripe'. (3) 'Link Account' primary button → opens Stripe onboarding. If account linked: (1) Account status card (verified, pending, restricted). (2) Auto-settlement toggle with explanation. (3) Settlement threshold input 'Auto-pay amounts over $X'. (4) 'View Payment History' link. (5) 'Disconnect Account' destructive button. Handle onboarding return via deep link. Show appropriate status messages. Add to navigation and link from SettingsScreen."
```
**Deliverables:**
- [ ] `src/screens/payments/PaymentAccountScreen.tsx`
- [ ] Unlinked state with onboarding
- [ ] Linked state with settings
- [ ] Deep link handling
- [ ] Navigation setup

**Dependencies:** Task 11 (hooks)
**Estimated Time:** 4-5 hours

---

## Sprint 7: Settlement UI

### Task 13: SettlementCard Component
**Status:** Not Started
**Command:**
```bash
/component "SettlementCard - Display a single settlement with actions. Props: settlement (SkinsSettlementWithPlayers), currentUserId (string), onApprove (() => void optional), onCancel (() => void optional). Layout: Card showing: (1) Header with game info/date. (2) Amount prominently displayed. (3) Direction indicator 'You owe PlayerName' or 'PlayerName owes you'. (4) Status badge (pending, processing, completed, etc). (5) If pending and current user is payer and requires_approval: 'Approve' and 'Decline' buttons. (6) If completed: 'Completed' checkmark with date. (7) If failed: error message with 'Retry' option. Color code: green for incoming, red for outgoing. Animate status changes."
```
**Deliverables:**
- [ ] `src/components/payments/SettlementCard.tsx`
- [ ] Status display
- [ ] Action buttons
- [ ] Direction styling
- [ ] Status animations

**Dependencies:** Task 6 (types)
**Estimated Time:** 2-3 hours

---

### Task 14: SettlementsScreen
**Status:** Not Started
**Command:**
```bash
/screen "SettlementsScreen - View all settlements and summary. Route: 'Settlements' no params. Layout: (1) Summary card at top showing 'You owe: $X' (red) and 'Owed to you: $X' (green). (2) Filter tabs: All, Pending, Completed. (3) FlatList of SettlementCard items. (4) Empty state per filter. (5) Pull-to-refresh. If any pending settlements requiring approval, show badge on navigation. Add 'Pay All' button if multiple pending outgoing - batch processes all. Link from ProfileScreen/SettingsScreen. Show in tab bar badge if pending settlements > 0."
```
**Deliverables:**
- [ ] `src/screens/payments/SettlementsScreen.tsx`
- [ ] Summary display
- [ ] Filtered list
- [ ] Pay All batch action
- [ ] Navigation and badges

**Dependencies:** Task 13 (component), Task 10 (hooks)
**Estimated Time:** 3-4 hours

---

## Sprint 8: Integration & Documentation

### Task 15: Integrate Settlements with Game Flow
**Status:** Not Started
**Command:**
```bash
/refactor "Update skins game flow to create settlements automatically. In finalize_skins_game() database function or finalizeSkinsGame service: after calculating payouts, call settlementService.createSettlementsForGame(). Update ReviewScorecardScreen skins tab: after showing SkinsSettlementCard (manual), if payment accounts exist for all players, show 'Settlements are being processed' message instead. If any player missing payment account, show 'Some players need to link payment accounts for automatic settlement'. Add settlement status indicators to SkinsSettlementCard (from Phase 1) - show payment status next to each 'who owes who' line. Update push notifications to notify on settlement completion."
```
**Deliverables:**
- [ ] Auto-create settlements on game finalize
- [ ] ReviewScorecardScreen updates
- [ ] Settlement status in results
- [ ] Push notification integration

**Dependencies:** Phase 1 complete, Task 9 (service)
**Estimated Time:** 3-4 hours

---

### Task 16: Documentation Update
**Status:** Not Started
**Command:**
```bash
/docs "Update all documentation for payment integration. Files: (1) docs/database/DATABASE_SCHEMA.md - add player_payment_accounts, skins_settlements, skins_settlement_transactions tables. (2) docs/guides/SKINS_GAME.md - add 'Payments & Settlement' section explaining automatic settlement, manual settlement fallback, account linking. (3) Update CLAUDE.md to mention payment integration. (4) Create docs/guides/SKINS_PAYMENTS.md - comprehensive payment guide covering setup, onboarding flow, settlement process, troubleshooting, FAQ. (5) Update docs/guides/SUBSCRIPTION_TIERS.md if new Pro tier added."
```
**Deliverables:**
- [ ] DATABASE_SCHEMA.md updated
- [ ] SKINS_GAME.md extended
- [ ] SKINS_PAYMENTS.md created
- [ ] CLAUDE.md updated
- [ ] SUBSCRIPTION_TIERS.md updated (if applicable)

**Dependencies:** All Phase 3 tasks
**Estimated Time:** 3-4 hours

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 16
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 16 (100%)

### Sprint Progress

**Sprint 1: Planning & Architecture** - Not Started
- Task 1: Legal and Compliance Review
- Task 2: Payment Architecture Design

**Sprint 2: Database Schema** - Not Started
- Task 3: Payment Accounts Table
- Task 4: Settlements Table
- Task 5: Settlement Transactions Log

**Sprint 3: TypeScript Types** - Not Started
- Task 6: Payment Type Definitions

**Sprint 4: Stripe Integration** - Not Started
- Task 7: Stripe Service Setup
- Task 8: Webhook Handlers

**Sprint 5: Settlement Logic** - Not Started
- Task 9: Settlement Service
- Task 10: Settlement React Query Hooks

**Sprint 6: Payment Account UI** - Not Started
- Task 11: Payment Account Hooks
- Task 12: PaymentAccountScreen

**Sprint 7: Settlement UI** - Not Started
- Task 13: SettlementCard Component
- Task 14: SettlementsScreen

**Sprint 8: Integration & Documentation** - Not Started
- Task 15: Integrate Settlements with Game Flow
- Task 16: Documentation Update

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/2025XXXX_player_payment_accounts.sql` | Payment accounts table |
| `supabase/migrations/2025XXXX_skins_settlements.sql` | Settlements table |
| `supabase/functions/stripe-webhook/index.ts` | Webhook handler |
| `src/services/payments/stripeService.ts` | Stripe SDK integration |
| `src/services/payments/settlementService.ts` | Settlement logic |
| `src/services/payments/index.ts` | Barrel export |
| `src/hooks/usePaymentAccount.ts` | Payment account hooks |
| `src/hooks/useSettlements.ts` | Settlement hooks |
| `src/components/payments/SettlementCard.tsx` | Settlement display |
| `src/screens/payments/PaymentAccountScreen.tsx` | Account management |
| `src/screens/payments/SettlementsScreen.tsx` | Settlement list |
| `docs/guides/SKINS_PAYMENTS.md` | Payment documentation |
| `docs/guides/SKINS_PAYMENTS_COMPLIANCE.md` | Legal requirements |
| `docs/guides/SKINS_PAYMENTS_ARCHITECTURE.md` | Architecture design |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/database/skins.types.ts` | Add payment types (or new file) |
| `src/hooks/queryKeys.ts` | Add settlement keys |
| `src/screens/scoring/ReviewScorecardScreen.tsx` | Show settlement status |
| `src/components/skins/SkinsSettlementCard.tsx` | Add payment status |
| `src/screens/profile/SettingsScreen.tsx` | Link to PaymentAccount |
| `src/navigation/types.ts` | Add payment routes |
| `src/navigation/RootNavigator.tsx` | Register screens |
| `docs/database/DATABASE_SCHEMA.md` | Document tables |
| `docs/guides/SKINS_GAME.md` | Add payments section |
| `.env.example` | Add Stripe keys |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 1: Planning | 2 | 7-10 hours |
| Sprint 2: Database | 3 | 5-8 hours |
| Sprint 3: Types | 1 | 1-2 hours |
| Sprint 4: Stripe | 2 | 8-10 hours |
| Sprint 5: Settlement | 2 | 6-8 hours |
| Sprint 6: Account UI | 2 | 6-8 hours |
| Sprint 7: Settlement UI | 2 | 5-7 hours |
| Sprint 8: Integration | 2 | 6-8 hours |

**Total Estimated:** 44-61 hours

---

## Key Design Decisions

1. **Stripe Connect Express**: Simplest onboarding, Stripe handles compliance
2. **Auto-settlement Default**: Opt-out rather than opt-in for seamless experience
3. **Manual Fallback**: Always show manual settlement option if payments unavailable
4. **Debt Simplification**: Minimize transactions between players
5. **Threshold Setting**: Allow users to control auto-pay threshold
6. **Webhook-driven**: Status updates via webhooks for reliability
7. **Audit Trail**: Full transaction logging for disputes

---

## Risk Considerations

### Technical Risks
- Stripe Connect onboarding abandonment
- Webhook delivery failures
- Currency conversion complexity (future international support)

### Business Risks
- Australian gambling regulations may restrict features
- Payment processing fees reduce attractiveness
- Users uncomfortable linking bank accounts

### Mitigations
- Robust manual settlement fallback
- Clear fee disclosure
- Strong security messaging
- Legal review before launch

---

## Future Considerations (Beyond Phase 3)

- **International support**: Multi-currency, regional payment providers
- **Crypto payments**: Bitcoin/Ethereum settlement option
- **Credit system**: In-app credits to reduce transaction fees
- **Group settlement**: Aggregate multiple games before settling
- **Dispute resolution**: In-app mediation for contested games

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks |
| `/refactor` | Modifying existing code, services |
| `/docs` | Documentation updates |

---

**Last Updated:** 2025-12-29
**Prerequisites:** Phase 1 and Phase 2 must be complete
**Current Sprint:** Not started

---

## Important Notes

**This phase requires:**
1. **Legal consultation** before implementation
2. **Stripe account setup** with Connect enabled
3. **Apple/Google compliance** for in-app gambling features
4. **User consent flows** for financial data handling
5. **Extensive testing** with Stripe test mode

**Do not begin implementation until legal review is complete.**
