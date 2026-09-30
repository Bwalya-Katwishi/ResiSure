# Payment Integration

ResiSure uses an **escrow-style protected payment workflow** that holds accommodation payments pending student move-in confirmation. ResiSure is **not a financial institution** and does not independently hold customer funds. Collections run through the configured mobile-money provider.

**Live providers:** MTN MoMo, Airtel Money, Zamtel Kwacha (when merchant credentials are supplied). **Demonstration:** mock provider (local development and academic use only).

> **Regulatory note:** Accepting or holding landlord funds may require appropriate merchant agreements and regulatory arrangements with each mobile-money operator. This document describes technical integration only — not legal or compliance certification.

## Architecture

```
BookingService.payForBooking
        ↓
EscrowService.capturePayment
        ↓
PaymentService.initiatePayment
        ↓
getPaymentProvider(phone, provider?)   # mock | auto | mtn_momo | airtel_money | zamtel_kwacha
        ↓
Mock | MTN Collection | Airtel Collection | Zamtel Collection
        ↓
Webhook or status poll → EscrowService.finalizeByReference
```

Each provider adapter implements a consistent interface:

| Method | Purpose |
| ------ | ------- |
| `charge()` | Initiate collection; returns `pending`, `success`, or `failed` |
| `getStatus(reference)` | Server-side status reconciliation |
| `configured()` | Whether required env vars are present |

Shared utilities live in `apps/api/src/services/payments/providerUtils.js` (`normalizeProviderStatus`, `sanitizeProviderPayload`, `maskPhone`).

## Provider selection

`PAYMENT_PROVIDER`:

| Value | Behaviour |
| ----- | --------- |
| `mock` | Demo debit only. Never talks to a mobile-money network. |
| `auto` | Routes by phone prefix when live credentials exist. Otherwise mock (dev only). |
| `mtn_momo` | Always MTN MoMo Collection. Fails if credentials are missing. |
| `airtel_money` | Always Airtel Money Collection. Fails if credentials are missing. |
| `zamtel_kwacha` | Always Zamtel Kwacha. Fails if merchant URL/credentials are missing. |

`NODE_ENV=test` always uses mock.

Zambian routing (auto mode):

| Network | Prefixes |
| ------- | -------- |
| MTN MoMo | `096`, `076` |
| Airtel Money | `097`, `077` |
| Zamtel Kwacha | `095`, `075` |

Live `charge()` returns **pending**. Escrow is not marked paid until webhook confirmation or server-side status poll succeeds.

## MTN MoMo Collection

**Files:** `apps/api/src/services/payments/mtn.provider.js`

**Official docs:** [MTN MoMo Open API — Collection](https://momodeveloper.mtn.com/API-collections#collection)

**Required env:**

```env
MTN_COLLECTION_SUBSCRIPTION_KEY=your-subscription-key
MTN_API_USER=your-api-user-uuid
MTN_API_KEY=your-api-key
MTN_TARGET_ENVIRONMENT=sandbox
MTN_CALLBACK_URL=https://your-api.example.com/api/payments/webhooks/mtn
MTN_CURRENCY=ZMW
```

The provider:

1. Fetches a collection token (`POST /collection/token/`)
2. Calls `POST /collection/v1_0/requesttopay` with `X-Reference-Id`
3. Returns pending
4. On webhook, re-reads `GET /collection/v1_0/requesttopay/{id}` and finalizes escrow

Sandbox currency defaults to `EUR`. Production Zambia uses `ZMW`. Override with `MTN_CURRENCY`.

**Readiness:** Ready when credentials above are configured. Sandbox available via MTN Developer Portal.

## Airtel Money Collection

**Files:** `apps/api/src/services/payments/airtel.provider.js`

**Official docs:** [Airtel Africa Developer Portal](https://developers.airtel.africa/)

**Required env:**

```env
AIRTEL_CLIENT_ID=your-client-id
AIRTEL_CLIENT_SECRET=your-client-secret
AIRTEL_ENVIRONMENT=sandbox
AIRTEL_CURRENCY=ZMW
```

Uses OAuth2 token, `POST /merchant/v1/payments/` for collection, and `GET /standard/v1/payments/{id}` for status.

**Readiness:** Ready when credentials above are configured. Sandbox available via Airtel Developer Portal.

## Zamtel Kwacha

**Files:** `apps/api/src/services/payments/zamtel.provider.js`

**Status:** **Not fully operational until merchant onboarding.** Zamtel does not publish a self-service public API comparable to MTN/Airtel. The adapter posts to a merchant-supplied collection URL provided during commercial onboarding.

**Required env:**

```env
ZAMTEL_COLLECTION_URL=https://merchant-supplied-endpoint.example/collect
ZAMTEL_STATUS_URL=https://merchant-supplied-endpoint.example/status
ZAMTEL_THIRD_PARTY_ID=your-third-party-id
ZAMTEL_PASSWORD=your-password
ZAMTEL_SHORTCODE=your-shortcode
ZAMTEL_ENVIRONMENT=sandbox
ZAMTEL_CALLBACK_URL=https://your-api.example.com/api/payments/webhooks/zamtel
ZAMTEL_WEBHOOK_SECRET=your-webhook-secret
```

**Outstanding work:**

- Obtain official API specification and sandbox credentials from Zamtel commercial/merchant onboarding
- Confirm request/response field mapping against the live merchant contract
- Validate webhook signature scheme (optional `ZAMTEL_WEBHOOK_SECRET` supported)

## Database

Migration `013_payment_metadata.sql` adds to `escrow_transactions`:

| Column | Purpose |
| ------ | ------- |
| `idempotency_key` | Prevents duplicate capture (`capture-{booking_id}`) |
| `provider_status` | Raw provider status normalized for display |
| `provider_payload` | Sanitized provider response (no secrets) |
| `updated_at` | Last status update |
| `confirmed_at` | When payment was confirmed |

Run migration:

```bash
cd apps/api && npm run migrate
```

## API endpoints

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| GET | `/api/payments/methods` | Public | List configured payment methods and mode |
| GET | `/api/payments/bookings/:bookingId/status` | Student (owner) | Poll payment status for a booking |
| POST | `/api/payments/bookings/:bookingId/reconcile` | Student (owner) | Force server-side status refresh |
| POST | `/api/payments/webhooks/:provider` | Webhook secret | Provider callback (mtn, airtel, zamtel) |
| PUT | `/api/bookings/:id/pay` | Student | Initiate payment (body: `phone`, optional `provider`, demo `outcome`) |

Payment amount always comes from `bookings.amount` — never from client input.

## Webhooks

`POST /api/payments/webhooks/:provider`

Protect with `PAYMENTS_WEBHOOK_SECRET` as `?token=` or `X-ResiSure-Webhook-Secret`.

Zamtel additionally supports `ZAMTEL_WEBHOOK_SECRET` via `?token=` or `X-Zamtel-Webhook-Secret`.

The handler does **not** trust the callback body. It asks the provider for the current status via `getStatus()`, then calls `EscrowService.finalizeByReference` once. Unique capture indexes prevent a second debit.

`NODE_ENV=production` will not start if mock payments are the only option unless `ALLOW_MOCK_PAYMENTS=true`. Live providers also require `PAYMENTS_WEBHOOK_SECRET`. Unauthenticated webhooks are rejected in production.

## Mock (development only)

| Outcome | How to trigger | Result |
| ------- | -------------- | ------ |
| `success` | `outcome=success` | Capture completed |
| `failed` | `outcome=failed` or phone ending `000` | HTTP 402 |
| `pending` | `outcome=pending` or phone ending `111` | Complete with webhook or `PUT /api/bookings/:id/complete-pending-payment` |

Mock is **blocked in production** unless `ALLOW_MOCK_PAYMENTS=true`. The web and mobile UIs show a clear "Demo payment mode" banner when mock is active.

## Frontend integration

**Web:** `apps/web/pages/bookings/[id].js` — provider selection (live mode), demo banner (mock mode), bounded status polling (5s × 24 attempts).

**Mobile:** `apps/mobile/src/screens/BookingDetailScreen.js` — same backend API, no provider secrets in the app.

Neither frontend treats a browser redirect or client-side state as proof of payment.

## Local testing

1. Copy `apps/api/.env.example` to `apps/api/.env`
2. Set `PAYMENT_PROVIDER=mock` and `ALLOW_MOCK_PAYMENTS=true`
3. Run migrations: `cd apps/api && npm run migrate`
4. Start API: `npm run dev`
5. Create a booking, accept it, pay with demo outcome

For live sandbox testing, configure MTN and/or Airtel sandbox credentials and set `PAYMENT_PROVIDER=auto`. Use ngrok or similar to expose webhook URL.

## Production activation

1. Obtain merchant credentials from MTN, Airtel, and/or Zamtel
2. Set all required env vars (see `.env.example`)
3. Set `PAYMENT_PROVIDER=auto` (or force a specific provider)
4. Set `ALLOW_MOCK_PAYMENTS=false`
5. Set `PAYMENTS_WEBHOOK_SECRET` to a strong random value
6. Configure provider callback URLs to `https://your-api/api/payments/webhooks/{mtn|airtel|zamtel}?token=...`
7. Run migrations on production database
8. Verify a small test transaction in sandbox before going live

## Reconciliation and troubleshooting

- **Pending too long:** Student can call `POST /api/payments/bookings/:id/reconcile` or wait for webhook
- **Duplicate payment blocked:** Unique index on `(booking_id, idempotency_key)` returns HTTP 409
- **Wrong network:** Auto mode rejects mismatched phone prefix vs forced provider
- **Webhook 401:** Check `PAYMENTS_WEBHOOK_SECRET` matches query param or header
- **Production won't start:** Ensure at least one live provider is configured OR `ALLOW_MOCK_PAYMENTS=true`

## Security

- Amount always from `bookings.amount`
- Webhook secrets stay on the API only
- Phones masked in logs; tokens and credentials never logged
- Provider payloads sanitized before storage
- Landlord is never paid from `charge()` — only from confirm / timeout / admin release
- HTTPS required for public webhook URLs
