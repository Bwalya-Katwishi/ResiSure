# ResiSure Trust & Safety Audit

**Date:** 2026-09-14  
**Scope:** Full repository audit of escrow, verification, payments, moderation, auth, and tests  
**Auditor role:** Lead engineer review (codebase evidence only — not legal advice)

---

## A. Executive Summary

ResiSure is a monorepo student-accommodation platform (`apps/api`, `apps/web`, `apps/mobile`) with PostgreSQL, JWT auth, manual identity/listing verification, and a mock/MTN/Airtel payment capture flow. Funds are **held in platform ledger** (`escrow_transactions`) until student move-in confirmation, dispute resolution, or a documented 72-hour auto-release policy.

**Overall assessment:** The core escrow lifecycle is implemented with server-side gates, row locks, unique financial indexes, and automated tests. This audit added trust-profile transparency, move-in codes, extended verification states, content reporting, basic fraud flags, and fixed auto-release timing.

**Not safe for real money yet** without:
- Real disbursement/refund integration at the PSP layer (MTN MoMo primary, Airtel Money secondary)
- Production webhook hardening and reconciliation

**Product decisions recorded (2026-09-14):**
- Use **escrow-style protected payment** language; ResiSure is not a financial institution
- **MTN MoMo** primary, **Airtel Money** secondary, **mock** for academic/demo
- **Zambia Data Protection Act, 2021** as primary privacy framework (not POPIA)
- **72-hour auto-release** from move-in window open; blocked during active disputes or pending payments

---

## B. Architecture and Relevant File Map

| Area | Path |
|------|------|
| API entry | `apps/api/src/server.js`, `apps/api/src/app.js` |
| Auth | `apps/api/src/middleware/auth.middleware.js`, `apps/api/src/services/auth.service.js` |
| Verification gates | `apps/api/src/utils/verification.js` |
| Bookings / escrow | `apps/api/src/services/booking.service.js`, `apps/api/src/services/escrow.service.js` |
| Payments | `apps/api/src/services/payment.service.js`, `apps/api/src/services/payments/*` |
| Properties | `apps/api/src/services/property.service.js`, `apps/api/src/models/property.model.js` |
| Admin | `apps/api/src/services/admin.service.js`, `apps/api/src/routes/admin.routes.js` |
| Trust profile | `apps/api/src/services/trustProfile.service.js` |
| Reports | `apps/api/src/services/report.service.js`, `apps/api/src/routes/report.routes.js` |
| Risk flags | `apps/api/src/services/riskFlag.service.js` |
| Audit | `apps/api/src/services/audit.service.js` |
| Cron | `apps/api/src/jobs/escrow.cron.js` |
| Migrations | `apps/api/src/migrations/*.sql` |
| Tests | `apps/api/tests/*.test.js` |
| Web UI | `apps/web/pages/`, `apps/web/lib/bookingStatus.js` |
| CI | `.github/workflows/ci.yml` |

**Roles:** `student`, `landlord`, `admin` (DB CHECK + JWT `restrictTo`). Admin is seed-only, not self-registerable.

**Commands:**
- Install: `npm install` (repo root)
- Migrate: `npm run migrate`
- Seed: `npm run seed`
- Test: `npm test` (API Jest suite)
- Lint: `cd apps/web && npm run lint`
- Build: `npm run build:web`

---

## C. Existing Escrow / Payment Lifecycle

```
pending → accepted → [pay] → escrow_held | move_in_window
escrow_held → (cron) → move_in_window (+ move-in code, 72h timer from window open)
move_in_window → confirm (student + code) → completed + release ledger row
move_in_window → dispute → disputed → admin resolve → refunded | completed
move_in_window → (72h timeout) → completed + auto-release ledger row
```

**Ledger (`escrow_transactions`):** `capture`, `release`, `refund` with unique indexes per booking. Amounts from `bookings.amount` (server-side).

**PSP:** Mock (dev/test), MTN MoMo, Airtel Money. Webhooks verified via `PAYMENTS_WEBHOOK_SECRET`; handler re-fetches status from provider (does not trust callback body alone).

**Gap (BLOCKED):** Release/refund are ledger-only — no PSP disbursement or refund API calls.

---

## D. Existing Listing / Verification Lifecycle

**Landlord:** Upload NRC + land title → admin manual review → `pending|verified|rejected|suspended|expired`  
**Student:** Upload NRC + university slip → admin review → same status enum  
**Property:** Create (`pending`) → submit review (`under_review`) → admin verify (`verified|rejected|suspended`)  
**Critical field edits** on verified listings reset to `pending` (title, address, description, rent, rooms, area)

Public browse filters to `verification_status = 'verified'` only.

---

## E. Move-In / Dispute Lifecycle

- Move-in code generated when window opens (8-char, expires with 72h window)
- Student-only confirm; landlord cannot confirm on student's behalf
- Code hidden from landlord API responses
- Dispute pauses release; admin resolves `refunded` or `released`
- Auto-release after 72h from **window open** (fixed from prior move-in-date anchoring bug)

---

## F. Security and Privacy Observations

| Finding | Severity |
|---------|----------|
| JWT in localStorage (XSS risk) | Medium |
| Verification docs served via authenticated routes (good) | — |
| Public `/uploads/properties` and `/uploads/profiles` | Medium |
| Production env validation (JWT, CORS, webhook secret) | Good |
| Rate limiting on auth + API | Good |
| Audit log sanitization in `audit.service.js` | Good |
| No server-side session revocation | Medium |
| Identity doc retention policy documented (Zambia DPA 2021) | Partial — policy in privacy page; automated deletion job not implemented |

---

## G. Trust & Safety Checklist

### 1. Landlord Identity Verification

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** (was PARTIAL → improved) |
| **Evidence** | `landlord_profiles.verification_status`, `apps/api/src/services/landlord.service.js`, `admin.service.js` verifyLandlord, `verification.js` gates |
| **Risk** | Critical |
| **What was weak** | No suspended/expired states; no rejection reason; limited test coverage for non-happy paths |
| **Change made** | Migration 011: `suspended`, `expired`, `rejection_reason`, `verified_by`, `verification_expires_at`; admin API extended; gates enforce suspended/expired |
| **Tests** | `trust-safety.test.js` (suspended landlord blocked), `verification.test.js` |
| **Acceptance** | Suspended landlord blocked via API ✓; verified badge backend-driven ✓; expired/suspended states in schema ✓; document upload tests still missing |

### 2. Property and Listing Verification

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `property.service.js`, migration 005/011, `property.model.js`, `escrow.e2e.test.js` |
| **Risk** | Critical |
| **What was weak** | No listing suspension; critical-field reset incomplete; no duplicate detection |
| **Change made** | `suspended` status; expanded critical fields; duplicate address + low-price risk flags; re-verification audit event |
| **Tests** | `escrow.e2e.test.js`, `trust-safety.test.js` (suspended listing, critical field reset) |
| **Acceptance** | Unverified/suspended cannot book ✓; critical edits reset verification ✓; duplicate reporting via risk flags ✓; photo duplicate detection not implemented |

### 3. TrustScore / Trust Profile

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** (new) |
| **Evidence** | `trustProfile.service.js`, `GET /api/properties/:id/trust-profile` |
| **Risk** | Medium |
| **What was weak** | No trust transparency; UI badges without explainability |
| **Change made** | Transparent signal-based trust profile (no opaque score); legal disclaimer included |
| **Tests** | `trust-safety.test.js` |
| **Acceptance** | Signals trace to backend ✓; no client-side score manipulation ✓; no booking-tied reviews yet (FAIL — see below) |

**Reviews:** Not implemented — no review table or booking-completed eligibility checks.

### 4. Payment and Escrow State Machine

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `escrow.service.js`, `booking_audit_log`, `escrow_transactions`, migrations 004/005 |
| **Risk** | Critical |
| **What was weak** | Dead statuses (`confirmed`, `timed_out`); auto-release timing bug; no real disbursement |
| **Change made** | Auto-release anchored to window open; move-in code; idempotent capture/release/refund indexes preserved |
| **Tests** | `escrow.e2e.test.js`, `payments.test.js`, `trust-safety.test.js` |
| **Acceptance** | Student cannot force release ✓; duplicate capture blocked ✓; webhook auth tested ✓; PSP payout **BLOCKED** |

### 5. Move-In Confirmation

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** (improved from PARTIAL) |
| **Evidence** | `escrow.service.js`, `moveInCode.js`, migration 011 |
| **Risk** | Critical |
| **Change made** | Secure 8-char codes; expiry tied to window; student-only; landlord cannot see code |
| **Tests** | `escrow.e2e.test.js`, `trust-safety.test.js` |
| **Acceptance** | Code required ✓; invalid/reused blocked ✓; dispute pauses release ✓; evidence upload not implemented |

### 6. Disputes, Refunds, and Support

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `escrow.service.js` raiseDispute/resolveDispute, `disputes` table |
| **Risk** | High |
| **What was weak** | No evidence upload; no landlord response; ledger-only refund |
| **Tests** | `escrow.e2e.test.js` (refund path) |
| **Acceptance** | Dispute pauses release ✓; admin resolve audited ✓; PSP refund **BLOCKED** |

### 7. Fraud Detection and Abuse Prevention

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** (new) |
| **Evidence** | `riskFlag.service.js`, `risk_flags` table, admin routes |
| **Risk** | Medium |
| **Change made** | Duplicate phone/email/address flags; unusually low price vs area average; rapid listing creation |
| **Tests** | Indirect via listing creation in trust-safety tests |
| **Acceptance** | Flags stored with reason/severity ✓; admin review endpoint ✓; photo hash duplicate not implemented |

### 8. Reporting and Moderation

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** (new) |
| **Evidence** | `report.service.js`, `content_reports` table, `POST /api/reports`, admin report routes |
| **Risk** | High |
| **Change made** | Student/landlord can report entities; admin can investigate/resolve; reporter notified |
| **Tests** | `trust-safety.test.js` |
| **Acceptance** | Report creation ✓; admin moderation API ✓; web UI for reports not added |

### 9. Authentication and Authorization

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `auth.middleware.js`, `authorization.test.js`, service-level ownership checks |
| **Risk** | Critical |
| **Change made** | Account-level suspension check in `protect` middleware |
| **Tests** | `authorization.test.js`, `trust-safety.test.js` |
| **Acceptance** | Role gates ✓; object-level booking/property checks ✓; MFA/step-up not implemented |

### 10. Privacy and Data Protection

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `legal/privacy.js`, `legal/terms.js`, `verificationUpload.js`, `audit.service.js` sanitization |
| **Risk** | High |
| **Change made** | Privacy policy updated for Zambia Data Protection Act, 2021; identity document principles documented |
| **Remaining** | Automated retention/deletion job, formal DPAs with Cloudinary/SMS providers, malware scanning |
| **Acceptance** | Docs access-controlled ✓; audit sanitization ✓; legal framework documented ✓ |

### 11. Notifications and User Experience

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `notification.service.js`, escrow/property/admin flows |
| **Risk** | Medium |
| **Change made** | Move-in code included in payment/window notifications |
| **Acceptance** | Core lifecycle notifications ✓; trust profile API for UI ✓; web not yet consuming trust-profile endpoint |

### 12. Observability and Auditability

| Field | Value |
|-------|-------|
| **Status** | **PARTIAL** |
| **Evidence** | `audit_logs`, `booking_audit_log`, `GET /api/admin/audit-logs` |
| **Risk** | Medium |
| **What was weak** | No automated audit assertions; no external monitoring |
| **Tests** | Audit creation not explicitly asserted (recommended follow-up) |
| **Acceptance** | Platform + booking audit trails exist ✓; structured request IDs not implemented |

---

## H. Recommended Implementation Order

1. Implement PSP payout/refund adapters with idempotency (MTN MoMo primary)
2. Automated identity-document retention/deletion job per Zambia DPA 2021
3. Formal data-processing agreements with third-party processors
4. Web UI: trust profile display, report listing button, move-in code entry
5. Booking-completed reviews (legitimate eligibility only)
6. Dispute evidence upload
7. Audit log test coverage + alerting on webhook failures
8. Move JWT to httpOnly cookies or short-lived tokens + refresh

---

## I. Risks and Assumptions

- **Assumption:** Manual admin verification is acceptable interim KYC (no third-party identity provider configured)
- **Confirmed:** 72-hour auto-release from move-in window open; disclosed in terms; blocked during disputes/pending payments
- **Risk:** Ledger release without PSP transfer creates reconciliation gap
- **Risk:** Mock payments must never be enabled in production without explicit `ALLOW_MOCK_PAYMENTS`
- **Risk:** JWT in localStorage remains XSS-exposed

---

## J. Files Changed (This Audit)

### New files
- `apps/api/src/migrations/011_trust_safety.sql`
- `apps/api/src/config/productLanguage.js`
- `apps/api/src/utils/moveInCode.js`
- `apps/api/src/services/trustProfile.service.js`
- `apps/api/src/services/report.service.js`
- `apps/api/src/services/riskFlag.service.js`
- `apps/api/src/controllers/report.controller.js`
- `apps/api/src/routes/report.routes.js`
- `apps/api/tests/trust-safety.test.js`
- `docs/resisure-trust-safety-audit.md`

### Modified files
- `apps/api/src/utils/verification.js`
- `apps/api/src/middleware/auth.middleware.js`
- `apps/api/src/models/user.model.js`
- `apps/api/src/models/property.model.js`
- `apps/api/src/services/escrow.service.js`
- `apps/api/src/services/booking.service.js`
- `apps/api/src/services/admin.service.js`
- `apps/api/src/services/property.service.js`
- `apps/api/src/controllers/booking.controller.js`
- `apps/api/src/controllers/property.controller.js`
- `apps/api/src/routes/admin.routes.js`
- `apps/api/src/routes/property.routes.js`
- `apps/api/src/app.js`
- `apps/api/tests/escrow.e2e.test.js`
- `apps/api/tests/verification.test.js`
- `apps/web/pages/legal/terms.js`
- `apps/web/pages/legal/privacy.js`
- `apps/web/lib/bookingStatus.js`
- `apps/web/pages/index.js`
- `docs/PAYMENT_INTEGRATION.md`

---

## Phase 6 — Verification Results

### Commands run
```bash
cd apps/api
npm run migrate   # ✅ 11 migrations applied
npm test          # ✅ 8 suites, 42 tests passed
```

### New / modified APIs
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/properties/:id/trust-profile` | Public trust signals for a listing |
| POST | `/api/reports` | Submit content report |
| GET | `/api/reports/my` | Reporter's report status |
| GET | `/api/admin/reports` | Admin list reports |
| PUT | `/api/admin/reports/:id` | Admin update report |
| GET | `/api/admin/risk-flags` | Admin list risk flags |
| PUT | `/api/admin/risk-flags/:id` | Admin review flag |
| PUT | `/api/bookings/:id/confirm` | Now accepts `{ move_in_code }` |
| PUT | `/api/admin/landlords/:userId/verify` | Extended statuses + rejection_reason |
| PUT | `/api/admin/students/:userId/verify` | Extended statuses + rejection_reason |
| PUT | `/api/admin/properties/:id/verify` | Now supports `suspended` |

### Database migration added
- `011_trust_safety.sql` — account_status, extended verification, move-in codes, content_reports, risk_flags

### Known limitations
- No real money disbursement/refund at PSP
- No review/rating system
- No dispute evidence upload
- No web/mobile UI for new report/trust-profile APIs
- Photo duplicate detection not implemented
- `confirmed` and `timed_out` booking statuses remain in schema but unused

### Recorded product decisions (2026-09-14)
1. **Legal:** Use escrow-style protected payment language; ResiSure is not a financial institution (`productLanguage.js`, terms page).
2. **Payment provider:** MTN MoMo primary, Airtel Money secondary, mock for demo; no claim of provider-regulated escrow.
3. **Data protection:** Zambia Data Protection Act, 2021; identity docs collected/used/retained per stated purpose (privacy page).
4. **Auto-release:** 72 hours from move-in window open; no release during active dispute or pending capture.

### Remaining blockers
1. **PSP disbursement/refund:** Real money movement at MTN/Airtel layer not integrated.
2. **Operational compliance:** Formal DPAs, automated document deletion, legal sign-off on retention periods.

### Manual setup
- Run `npm run migrate` after deploy
- No new required env vars (existing `PAYMENTS_WEBHOOK_SECRET` still required for live payments)

### Recommended next steps
1. Legal review of terms/privacy vs. actual data flows
2. Integrate PSP disbursement with idempotent payout references
3. Add web UI for move-in code entry and trust profile display
4. Add audit-log assertions to CI
5. Implement booking-completed reviews

---

## ⚠️ Production Money Warning

**This system is NOT safe to use with real money in production** until PSP disbursement/refund is integrated, legal escrow/trust wording is approved, and reconciliation processes exist between ledger and provider statements.
