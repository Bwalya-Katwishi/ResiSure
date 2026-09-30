# ResiSure System Audit

**Date:** 5 September 2026  
**Scope:** Existing repository only — no rebuild. Findings are based on code inspection of `apps/api`, `apps/web`, and `apps/mobile`.  
**Status of this document:** Initial audit completed, then updated after implementation. See [Final Status](#final-status) at the end.

---

## A. Current Architecture

### What the project actually uses

The original proposal mentioned MTN MoMo / Airtel Money sandbox. The **implemented** stack is:

| Layer | Actual technology |
| ----- | ----------------- |
| Monorepo | npm workspaces (`apps/api`, `apps/web`, `apps/mobile`) |
| Frontend | Next.js 14.2 (Pages Router), React 18, Tailwind CSS 3.4, axios, lucide-react, react-hot-toast |
| Mobile | Expo 53 / React Native 0.79 student prototype |
| Backend | Node.js, Express 5, CommonJS |
| Database | PostgreSQL via `pg` Pool (parameterized SQL, no ORM) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs (cost 12), Bearer token in `localStorage` |
| File storage | Multer; Cloudinary if credentials exist, otherwise local `apps/api/uploads` |
| Payments | In-process simulation in `payment.service.js` — **not** a live or licensed MTN/Airtel integration |
| Jobs | `node-cron` every 5 minutes (move-in window, reminders, auto-release) |
| Security middleware | helmet, cors, morgan |
| Tests | **None** (`npm test` prints “Tests coming in Sprint 3”) |
| Deployment | No Dockerfile, CI, or host config in-repo |

### Frontend

- Public: home, property browse/detail, login/register, legal pages.
- Role dashboards: student, landlord, admin.
- Booking detail page drives accept / pay / confirm / dispute.
- Auth state is client-side JWT in `localStorage` (`resisure_token`).
- Route guards are UI-only; real enforcement is on the API.

### Backend

Express app in `apps/api/src/app.js`:

- `/api/auth` — register, login, me
- `/api/properties` — public list/detail; landlord CRUD + images
- `/api/bookings` — student/landlord/admin booking lifecycle
- `/api/admin` — landlord verification + open disputes
- `/api/notifications` — in-app list/read
- `/api/landlords` — landlord profile + verification document upload

### Database

Core tables from `001_initial_schema.sql` plus incremental migrations:

- `users` (roles: student / landlord / admin)
- `landlord_profiles` (pending / verified / rejected)
- `properties`, `property_images`
- `bookings` (custom state machine — see Feature Checklist)
- `escrow_transactions` (capture / release / refund)
- `booking_audit_log` (booking status transitions only)
- `disputes`, `notifications`

There is **no** dedicated `payments` table. Payment is represented as an escrow `capture` row.

### Authentication

- Register (student/landlord only; admin cannot self-register).
- Login issues a JWT (`id`, `role`) with configurable expiry (default 7d).
- `protect` + `restrictTo` middleware.
- No password reset, no refresh tokens, no logout invalidation (stateless JWT).
- Hardcoded JWT fallback secret if `JWT_SECRET` is unset.

### Storage

- Property photos: local disk or Cloudinary; MIME + 5MB limit; public `/uploads/properties`.
- Landlord verification docs: local opaque `local:` refs or Cloudinary; served only through authenticated routes (good).

### Payments

`PaymentService.initiateSandboxPayment()` waits 600ms, validates a Zambian number, and:

- succeeds for most numbers
- fails if the number ends in `000`

It labels the result as `mtn_momo` or `airtel_money`. **No live credentials, webhooks, or provider SDKs exist.** This is a demo simulator that is too tightly named as if MTN/Airtel were connected.

### Deployment / external services

- PostgreSQL (env-configured; example uses port 5433).
- Optional Cloudinary.
- No email/SMS provider.
- No production process manager or container definition.

---

## B. Feature Checklist

| Feature | Status | Evidence | Issues | Priority |
| ------- | ------ | -------- | ------ | -------- |
| Authentication | PARTIAL | `auth.service.js`, `auth.routes.js`, login/register pages | Works for register/login/me. No password reset, no refresh tokens, hardcoded JWT fallback, no auth rate limit. | HIGH |
| Student accounts | PARTIAL | Register role `student`; student dashboard + bookings | Register/login/browse/book work. No profile edit, no favorites, no standalone transaction history page (ledger is on booking detail). | HIGH |
| Landlord accounts | PARTIAL | Register creates `landlord_profiles`; landlord dashboard | Create listing, images, verification upload, accept/reject bookings work. No property edit form in UI. Ownership checks exist on API. | HIGH |
| Admin accounts | PARTIAL | Seeded `admin@resisure.zm`; `restrictTo('admin')` | Cannot self-register (correct). Dashboard only covers landlord verify + disputes. Missing users/properties/bookings/payments/escrow/stats/audit APIs. | HIGH |
| Property listings | PARTIAL | CRUD + images; seed listings | Listings are immediately public. No amenities model, no property type, no availability calendar. Landlord cannot edit via UI. | HIGH |
| Property verification | PARTIAL / MISLEADING | Landlord `verification_status` used as the “Verified” badge | **No property-level PENDING → UNDER_REVIEW → VERIFIED → REJECTED.** New listings are trusted as soon as they are created. Badge is landlord verification, not listing verification. No rejection reason on properties. Not auditable as a property action. | HIGH |
| Search | PARTIAL | `GET /api/properties?area=` (LIKE) | Backend search by area exists. No full-text, no pagination. Frontend search is request-based (good) but loads the full result set. | MEDIUM |
| Filtering | PARTIAL | min/max price, area, verified (landlord), available | Missing property type, amenities, sort, pagination. `verified` filters landlord, not listing. Public list does not hide unverified listings. | MEDIUM |
| Booking | PARTIAL | Create → landlord accept/reject → pay → confirm/dispute | States exist and are used. Duplicate *student+property* active booking blocked. Room decrement on accept is transactional. No student cancel. No date-range exclusivity (inventory is room-count, not calendar). `createBooking` does not lock rooms (over-acceptance is gated at accept). | HIGH |
| Payments | PARTIAL | Simulated debit in `payment.service.js` | Amount taken from booking (cannot be client-forged). Coupled to fake MTN/Airtel labels. Only SUCCESS and one fail rule. No PENDING lifecycle, no webhook/idempotency callback, no refunds at provider layer. Pay gated until move-in date (blocks demo if date is in the future). | HIGH |
| Escrow | PARTIAL | Capture holds funds; landlord not paid on capture | **Correct idea:** pay → hold → confirm → release. Capture uses `FOR UPDATE` + unique capture index. Confirm/release/refund/auto-release do **not** lock rows — double-release race possible. Confirm immediately releases (no separate release-request). Auto-release skips disputed (status filter). No platform audit of escrow events. | HIGH |
| Move-in confirmation | PARTIAL | `PUT /bookings/:id/confirm` student-only | Works conceptually. Landlord cannot confirm (role + student_id check). Race on concurrent confirm. Status jumps `move_in_window` → `confirmed` → `completed` in one request. | HIGH |
| Disputes | PARTIAL | Student raise during window; admin refund/release | Blocks auto-release while `disputed`. No landlord response. No partial refund. Resolve is not transactional / not locked. Admin UI lists open disputes. | HIGH |
| Notifications | PARTIAL | In-app table + bell | Created for booking, payment, move-in, dispute, landlord verify, deadline, auto-release. Missing: payment failure, property verification, some status changes. No email/SMS (acceptable for MVP). | MEDIUM |
| Admin dashboard | PARTIAL | `pages/dashboard/admin.js` + `/api/admin` | Server-side `protect` + `restrictTo('admin')` — not just hidden buttons. Incomplete vs required admin surface. | HIGH |
| Audit logs | PARTIAL | `booking_audit_log` only | Booking transitions logged. No platform log for LOGIN, PROPERTY_*, PAYMENT_*, ESCROW_*, DISPUTE_*. Actor/entity metadata incomplete. | HIGH |
| Mobile app | PARTIAL | Expo student prototype | Browse → book → sandbox pay → confirm/dispute. Not feature-complete vs web. Not a substitute for web MVP. | LOW |
| Testing | MISSING | `apps/api` test script is a stub; zero test files | No auth, booking, payment, escrow, or E2E coverage. | HIGH |
| Security | PARTIAL | helmet, parameterized SQL, bcrypt 12, ownership checks, doc downloads authenticated | See Security section. Critical: JWT fallback secret, no rate limit, 500s may leak `err.message`, CORS_ALLOW_ALL in example, public property photos, landlord phone on public property API. | HIGH |

---

## Booking state mapping

Existing states (do not replace — they already express the business lifecycle):

| Existing | Rough equivalent |
| -------- | ---------------- |
| `pending` | booking request |
| `accepted` | PENDING_PAYMENT |
| `rejected` / `cancelled` | CANCELLED |
| `escrow_held` | payment held, before move-in window |
| `move_in_window` | MOVE_IN_PENDING (funds held) |
| `confirmed` | MOVE_IN_CONFIRMED (transient) |
| `completed` | COMPLETED + released |
| `disputed` | DISPUTED (release blocked) |
| `refunded` | REFUNDED |
| `timed_out` | auto-release path (then completed) |

---

## Security findings (initial)

| Severity | Issue |
| -------- | ----- |
| Critical | `JWT_SECRET` falls back to `'resisure_super_secret_change_this_in_production'` in auth service and middleware |
| High | Escrow confirm / dispute resolve / auto-release lack row locks — double release/refund possible under concurrency |
| High | New properties are publicly bookable without listing verification |
| High | No rate limiting on login/register (credential stuffing) |
| Medium | Global error handler returns `err.message`; 500s can leak internals |
| Medium | `CORS_ALLOW_ALL=true` in `.env.example` |
| Medium | Public `GET /api/properties/:id` exposes landlord phone |
| Medium | JWT stored in `localStorage` (XSS → session theft). No refresh/rotation. |
| Medium | Landlord `PUT /properties/:id` can set `available_rooms` / `status` directly |
| Low | No password reset; long-lived JWT (7d) |
| Low | Property images are world-readable if URL is known (acceptable for listings) |

**Already in good shape (do not rewrite):**

- Parameterized SQL (no string-concat queries).
- Password hashing with bcrypt cost 12.
- Role middleware on booking/admin/landlord routes.
- Booking IDOR checks in `getBookingById`.
- Property update/delete/image ownership checks.
- Verification documents are not in the public static tree.
- Payment amount is server-side from the booking row.
- Only the booking student can pay or confirm move-in.
- Unique index on completed capture per booking.

---

## Database notes

- FKs exist; escrow and disputes cascade with booking delete (financial rows can vanish if a booking is deleted — risky).
- No unique constraint on completed release/refund.
- No property verification columns.
- Search indexes exist for booking/property status; missing area/price/verification indexes.
- `users.accepted_terms_at` added in migration 003.

---

## UI / UX notes

- Core student/landlord flows exist and are understandable.
- Payment copy presents MTN/Airtel as if a sandbox PSP were connected — misleading.
- Pay button hidden until move-in date — demo-hostile.
- Empty/loading states exist on list/dashboard pages.
- Navbar is responsive; booking sidebar stacks on small screens.
- “Verified” on cards is landlord verification, easy to misread as listing verification.
- No dedicated transaction-history page for students.
- Landlord has no edit-listing UI.

---

## Payment architecture verdict

The **idea** is right: booking state ≠ escrow ledger; amount is not client-trusted; capture is idempotent.

It is **not** ready for MTN/Airtel:

- Provider names are hardcoded in service + UI.
- No provider interface / factory.
- No webhook/callback endpoint or idempotency key for incoming PSP events.
- No PENDING → SUCCESS/FAILED completion path.

**Required work:** extract a `PaymentProvider` with `MockPaymentProvider` (SUCCESS / FAILED / PENDING), keep escrow independent of provider, document real MTN/Airtel integration points. Do **not** fake live mobile-money transactions.

---

## Implementation order (this audit)

1. P0 — JWT secret, error leakage, rate limit, escrow races, listing verification gate  
2. P1 — Mock payment provider, pay-after-accept → escrow held, property verification lifecycle, audit log, admin APIs  
3. P2 — Search pagination/filters, notifications gaps, tests, payment docs, demo seed  
4. P3 — Mobile parity (now implemented) and remaining visual polish

---

## Post-implementation checklist

| Feature | Status after audit work | Notes |
| ------- | ----------------------- | ----- |
| Authentication | COMPLETE for MVP | Register/login/me, bcrypt 12, JWT, role guards. No password reset. |
| Student accounts | COMPLETE for MVP | Browse, book, pay, confirm, dispute, profile edit, transaction history, favorites. |
| Landlord accounts | COMPLETE for MVP | Listings, edit, images, verification upload, accept/reject, released-funds ledger. Ownership enforced. |
| Admin accounts | COMPLETE for MVP | Server-side `restrictTo('admin')`. Stats, users, landlords, properties, bookings, disputes, audit logs. |
| Property listings | COMPLETE for MVP | CRUD, images, type, amenities. Public list is verified-only. |
| Property verification | COMPLETE | `pending` → `under_review` → `verified` / `rejected` with reason. Auditable. Badge is listing verification. |
| Search | COMPLETE for MVP | Area/title/address `q`, server-side pagination. |
| Filtering | COMPLETE for MVP | Price, area, type, available, amenities, sort. Server-side. |
| Booking | COMPLETE for MVP | Request → accept/reject → pay → confirm/dispute. Duplicate active booking blocked. Cancel unpaid. Room lock on accept. |
| Payments | COMPLETE | Mock plus live MTN Collection and Airtel Collection adapters, webhooks, and phone routing. |
| Escrow | COMPLETE for MVP | Pay holds; confirm/timeout/admin release. Row locks + unique capture/release/refund. Disputed bookings are not auto-released. |
| Move-in confirmation | COMPLETE | Student-only. Landlord impersonation rejected (tested). |
| Disputes | COMPLETE for MVP | Create, freeze, admin refund or release. No partial refund. |
| Notifications | COMPLETE for MVP | In-app for booking, payment success/fail, verification, move-in, release, dispute. |
| Admin dashboard | COMPLETE for MVP | Tabs for overview, landlords, properties, bookings, disputes, audit. |
| Audit logs | COMPLETE for MVP | Platform `audit_logs` plus existing booking status log. Secrets stripped. |
| Mobile app | COMPLETE for MVP | Role-aware Expo app: student/landlord/admin flows, favorites, filters, notifications, profile. |
| Testing | COMPLETE for critical paths | 24 API tests including core escrow E2E, profile update, transaction history, and favorites. |
| Security | IMPROVED | JWT fallback hardened, auth rate limit, 500 leakage reduced, IDOR checks verified, listing gate, UUID validation. Remaining: localStorage JWT, no password reset, CORS_ALLOW_ALL in example. |

---

## Final Status

### Fully Implemented

- Student / landlord / admin registration and login (admin seeded only)
- Role-based API authorization and booking/property ownership checks
- Verified-only public listings with listing-level verification lifecycle
- Search, price/area/type/availability filters, sort, pagination
- Booking request, landlord accept/reject, student cancel (unpaid)
- Mock payment SUCCESS / FAILED / PENDING
- Escrow hold on payment success (landlord not paid)
- Student move-in confirmation → single release
- 72-hour auto-release for undisputed `move_in_window` bookings
- Disputes that freeze funds; admin refund or release
- In-app notifications for the core events
- Admin dashboard: users, landlords, properties, bookings, disputes, stats, audit logs
- Platform audit log for login, property, booking, payment, escrow, and dispute actions
- Seeded demo accounts
- Critical API tests including the full student → pay → hold → confirm → release path
- Student/landlord profile edit (`PATCH /api/auth/me`)
- Student transaction history and landlord released-funds ledger
- Landlord listing edit UI
- Amenities filter on the browse form
- Student favorites (`GET/POST/DELETE /api/favorites`) with web hearts and a Saved page
- Mobile parity for student, landlord, and admin (browse, book, pay, listings, verify, disputes)

### Partially Implemented

- **Password reset / refresh tokens** — not built
- **Email/SMS** — SMTP + Africa's Talking / Twilio when credentials are set; otherwise in-app only

### Not Implemented

- MTN/Airtel merchant onboarding (adapters and webhooks exist; live debit needs portal credentials)
- Partial refunds
- Calendar-based (date-range) exclusivity — inventory is room-count
- Production deployment / CI pipeline

### Fixed During Audit

- Extracted `PaymentProvider` / `MockPaymentProvider`; stopped presenting demo debit as MTN/Airtel
- Payment allowed after landlord accept (demo no longer blocked by future move-in date)
- Future move-in dates now go to `escrow_held` until the window opens
- Escrow confirm, dispute, resolve, and auto-release use row locks and unique release/refund indexes
- Property verification columns, public listing gate, admin approve/reject with reason
- Platform `audit_logs` and admin APIs/UI
- Search pagination, property type, amenities, sort
- JWT secret no longer silently uses a production-looking hardcoded fallback
- Auth rate limiting; 500 responses no longer expose stack traces
- Allowed localhost:3001 / 127.0.0.1 origins so Next.js still works when port 3000 is taken
- Landlord phone removed from public property payloads
- Landlords cannot set `available_rooms` directly via update
- Stale `bookings_status_check` that rejected `accepted` (this was breaking the live booking flow)
- Seed resets demo passwords; includes a pending listing for verification demo
- Added Jest/Supertest coverage for auth, authorization, verification, payment, escrow, and disputes
- Profile update, transaction history, listing edit UI, amenities browse filter
- CORS origins for Next.js ports 3001/3002 when 3000 is already taken

### Known Limitations

- **MTN MoMo is not integrated**
- **Airtel Money is not integrated**
- Cloudinary is optional; local disk is used when unset
- JWT is stored in `localStorage` (XSS would steal the session)
- `CORS_ALLOW_ALL=true` remains in `.env.example` for local/mobile convenience
- Auto-release is a 5-minute cron, not a hard real-time cutover
- No email/SMS delivery
- Tests require a migrated and seeded PostgreSQL database

### Testing Completed

Command: `npm test` in `apps/api` (also `npm test` from repo root).

| Suite | Result |
| ----- | ------ |
| `tests/auth.test.js` | PASS — register/login, admin self-register blocked, validation |
| `tests/authorization.test.js` | PASS — student/landlord denied admin; IDOR on foreign property update; admin stats |
| `tests/escrow.e2e.test.js` | PASS — unverified hidden; admin verify; book; duplicate 409; accept; pay fail 402; landlord cannot pay/confirm; pay success holds (no release); second pay rejected; confirm releases once; dispute blocks confirm; admin refund |

**20 tests, 3 suites, all passing** (5 September 2026, after continued profile/ledger/filter work).

### Demo Flow

Password for all seeded accounts: `password123`

1. `cd apps/api && npm run migrate && npm run seed`
2. Start API (`npm run dev` in `apps/api`) and web (`npm run dev` in `apps/web`)
3. Open http://localhost:3000
4. Login as **student@resisure.zm**
5. Browse verified listings (Chelstone / Libala / Kalingalinga). The Emmasdale “Pending Review” listing must not appear
6. Open a verified property, choose today’s move-in date, book
7. Login as **landlord@resisure.zm** → Incoming Bookings → Accept
8. Login as student → Pay with mock provider → **Success** → escrow ledger shows `capture` / held. Landlord is not paid
9. Optionally retry a new booking later with outcome **Failed** (or phone ending `000`)
10. As student, **Confirm move-in**
11. Login as landlord — booking is completed / funds released (`release` row)
12. Login as **admin@resisure.zm**
    - Properties tab: approve or reject the pending Emmasdale listing (rejection needs a reason)
    - Landlords tab: verification documents
    - Audit tab: LOGIN, PROPERTY_*, PAYMENT_*, ESCROW_*, MOVE_IN_CONFIRMED
13. Dispute demo: book and pay another listing (or use a second student), choose Confirm window → Raise dispute → admin Refund or Release

See `docs/PAYMENT_INTEGRATION.md` for mock outcomes and future MTN/Airtel work.
