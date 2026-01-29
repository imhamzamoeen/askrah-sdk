# @askrah/sdk

Official TypeScript SDK for the [AskRah](https://askrah.com) referral platform. Track referrals, record conversions, and manage affiliate commissions.

## Installation

```bash
npm install @askrah/sdk
# or
pnpm add @askrah/sdk
# or
yarn add @askrah/sdk
```

## Quick Start

### 1. Get Your Credentials

From your AskRah dashboard, get:
- **Project ID**: `proj_abc123...` (public identifier)
- **Signing Secret**: `sk_xyz789...` (keep this secure!)

### 2. Frontend: Capture Referral Attribution

```typescript
// In your app initialization (e.g., _app.tsx, layout.tsx)
import { AskRah } from '@askrah/sdk/browser';

// Initialize - automatically captures ?ref= from URL
AskRah.init();
```

```typescript
// During signup
import { AskRah } from '@askrah/sdk/browser';

const refCode = AskRah.getRefCode();

// Send to your backend
await fetch('/api/signup', {
  method: 'POST',
  body: JSON.stringify({ email, password, refCode })
});
```

### 3. Backend: Record Events

```typescript
// In your backend (e.g., API routes, webhooks)
import { AskRahEvents } from '@askrah/sdk/events';

const askrah = new AskRahEvents({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!
});

// Record signup
await askrah.emit('signup', {
  userId: user.id,
  email: user.email,
  refCode: refCode  // From frontend
});

// Record payment (triggers commission calculation)
await askrah.emit('payment', {
  userId: user.id,
  amountCents: 9900,  // $99.00
  currency: 'USD',
  planName: 'Pro Monthly',
  eventId: stripeEvent.id  // For deduplication
});
```

---

## SDK Modules

### `@askrah/sdk` - Main Client

Low-level client for direct API calls.

```typescript
import { AskRahClient } from '@askrah/sdk';

const client = new AskRahClient({
  projectId: 'proj_xxx',
  signingSecret: 'sk_xxx'
});

// Record signup
await client.recordSignup({
  refCode: 'ABC123',
  externalUserId: 'user_123',
  externalEmail: 'user@example.com'
});

// Record conversion
await client.recordConversion({
  externalUserId: 'user_123',
  amountCents: 9900,
  currency: 'USD'
});

// Send any event type
await client.sendEvent('refund', {
  userId: 'user_123',
  amountCents: 9900,
  originalEventId: 'evt_xxx'
});
```

### `@askrah/sdk/browser` - Browser Attribution

Handles referral tracking in the browser.

```typescript
import { AskRah } from '@askrah/sdk/browser';

// Initialize (auto-detects ?ref= and ?click_id= from URL)
AskRah.init();

// Get stored referral code
const refCode = AskRah.getRefCode();        // 'ABC123' or null
const clickId = AskRah.getClickId();        // 'uuid' or null

// Get full attribution data
const attribution = AskRah.getAttribution();
// { refCode: 'ABC123', clickId: 'uuid', timestamp: 1706400000 }

// Check if user has attribution
if (AskRah.hasAttribution()) {
  // Show referral badge or apply discount
}

// Manually set attribution (for custom flows)
AskRah.setRefCode('CUSTOM123', 'click_uuid');

// Clear stored attribution
AskRah.clearAttribution();

// Remove ?ref= from URL (cleaner URLs)
AskRah.cleanURL();
```

**Configuration:**

```typescript
AskRah.init({
  autoDetect: true,        // Auto-detect URL params (default: true)
  cookieExpiry: 30,        // Days to store attribution (default: 30)
  storagePrefix: 'askrah', // Cookie/storage prefix (default: 'askrah')
  debug: false,            // Enable console logging (default: false)
  refParam: 'ref',         // URL param for ref code (default: 'ref')
  clickIdParam: 'click_id' // URL param for click ID (default: 'click_id')
});
```

### `@askrah/sdk/events` - Event Emitter

High-level wrapper with fire-and-forget semantics.

```typescript
import { AskRahEvents } from '@askrah/sdk/events';

const askrah = new AskRahEvents({
  projectId: 'proj_xxx',
  signingSecret: 'sk_xxx',
  throwOnError: false,  // Log errors instead of throwing (default: false)
  debug: false          // Enable debug logging (default: false)
});
```

---

## Event Types

### `signup` - User Registration

Record when a referred user signs up.

```typescript
await askrah.emit('signup', {
  userId: 'user_123',        // Required: Your user ID
  refCode: 'ABC123',         // Required: Referral code
  email: 'user@example.com'  // Optional: User's email
});
```

### `payment` - Payment Received

Record payments to trigger commission calculation.

```typescript
await askrah.emit('payment', {
  userId: 'user_123',        // Required: Your user ID
  amountCents: 9900,         // Required: Amount in cents ($99.00)
  currency: 'USD',           // Optional: ISO currency code (default: USD)
  planName: 'Pro Monthly',   // Optional: Plan/product name
  eventId: 'evt_stripe_xxx'  // Optional: External ID for deduplication
});
```

**Commission Calculation:**
- If project commission rate is 25%: `$99.00 × 0.25 = $24.75`
- Commission becomes eligible after payout delay (default: 30 days)

### `refund` - Payment Refunded

Record refunds to clawback commission.

```typescript
await askrah.emit('refund', {
  userId: 'user_123',             // Required: Your user ID
  amountCents: 9900,              // Required: Refund amount in cents
  currency: 'USD',                // Optional: ISO currency code
  originalEventId: 'evt_stripe_x' // Optional: Link to original payment
});
```

**Commission Clawback:**
- Negative commission is recorded
- Deducted from referrer's pending balance

### `subscription.created` - New Subscription

Record when user starts a subscription.

```typescript
await askrah.emit('subscription.created', {
  userId: 'user_123',       // Required: Your user ID
  planName: 'Pro Monthly',  // Optional: Plan name
  eventId: 'sub_stripe_xxx' // Optional: External ID
});
```

### `subscription.updated` - Plan Changed

Record subscription upgrades/downgrades.

```typescript
await askrah.emit('subscription.updated', {
  userId: 'user_123',
  planName: 'Enterprise',  // New plan name
  eventId: 'sub_stripe_xxx'
});
```

### `subscription.cancelled` - Subscription Ended

Record when user cancels subscription.

```typescript
await askrah.emit('subscription.cancelled', {
  userId: 'user_123',
  eventId: 'sub_stripe_xxx'
});
```

### `dispute.created` - Chargeback

Record chargebacks/disputes to clawback commission.

```typescript
await askrah.emit('dispute.created', {
  userId: 'user_123',        // Required: Your user ID
  amountCents: 9900,         // Required: Disputed amount
  eventId: 'dp_stripe_xxx'   // Optional: External ID
});
```

---

## Stripe Webhook Integration

Example handler for common Stripe webhooks:

```typescript
// app/api/webhooks/stripe/route.ts
import { AskRahEvents } from '@askrah/sdk/events';

const askrah = new AskRahEvents({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!
});

export async function POST(req: Request) {
  const event = await verifyStripeWebhook(req);

  switch (event.type) {
    // Payment successful
    case 'invoice.paid':
    case 'checkout.session.completed': {
      const payment = event.data.object;
      await askrah.emit('payment', {
        userId: payment.customer as string,
        amountCents: payment.amount_total || payment.amount || 0,
        currency: payment.currency?.toUpperCase() || 'USD',
        planName: payment.metadata?.plan_name,
        eventId: event.id
      });
      break;
    }

    // Refund processed
    case 'charge.refunded': {
      const charge = event.data.object;
      await askrah.emit('refund', {
        userId: charge.customer as string,
        amountCents: charge.amount_refunded,
        originalEventId: charge.payment_intent as string
      });
      break;
    }

    // Subscription started
    case 'customer.subscription.created': {
      const sub = event.data.object;
      await askrah.emit('subscription.created', {
        userId: sub.customer as string,
        planName: sub.items.data[0]?.price?.nickname || undefined,
        eventId: event.id
      });
      break;
    }

    // Subscription cancelled
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await askrah.emit('subscription.cancelled', {
        userId: sub.customer as string,
        eventId: event.id
      });
      break;
    }

    // Chargeback/dispute
    case 'charge.dispute.created': {
      const dispute = event.data.object;
      await askrah.emit('dispute.created', {
        userId: dispute.customer as string,
        amountCents: dispute.amount,
        eventId: event.id
      });
      break;
    }
  }

  return Response.json({ received: true });
}
```

---

## Error Handling

The SDK provides typed errors for different scenarios:

```typescript
import {
  AskRahError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError
} from '@askrah/sdk';

try {
  await client.recordSignup({ ... });
} catch (error) {
  if (error instanceof ValidationError) {
    // 400 - Invalid parameters
    console.error('Validation failed:', error.message);
  } else if (error instanceof AuthenticationError) {
    // 401 - Invalid credentials
    console.error('Auth failed:', error.message);
  } else if (error instanceof NotFoundError) {
    // 404 - Referral code not found
    console.error('Not found:', error.message);
  } else if (error instanceof ConflictError) {
    // 409 - Duplicate user/event
    console.error('Already exists:', error.message);
  } else if (error instanceof RateLimitError) {
    // 429 - Too many requests
    console.error('Rate limited, retry at:', error.resetAt);
  } else if (error instanceof ServerError) {
    // 5xx - Server error
    console.error('Server error:', error.message);
  } else if (error instanceof NetworkError) {
    // Network connectivity issue
    console.error('Network error:', error.message);
  } else if (error instanceof TimeoutError) {
    // Request timed out
    console.error('Request timed out');
  }
}
```

---

## Configuration Options

### AskRahClient / AskRahEvents

```typescript
interface AskRahConfig {
  // Required
  projectId: string;       // Your project ID (proj_xxx)
  signingSecret: string;   // Your signing secret (sk_xxx)

  // Optional
  baseUrl?: string;              // API base URL (default: https://askrah.com)
  tokenExpirySeconds?: number;   // JWT expiry, max 300 (default: 300)
  tokenRefreshThreshold?: number; // Refresh before expiry (default: 60)
  timeout?: number;              // Request timeout in ms (default: 30000)
  fetch?: typeof fetch;          // Custom fetch implementation
}

// AskRahEvents additional options
interface AskRahEventsConfig extends AskRahConfig {
  throwOnError?: boolean;  // Throw vs log errors (default: false)
  debug?: boolean;         // Enable debug logging (default: false)
}
```

---

## Complete Integration Example

### Environment Variables

```env
# .env.local
ASKRAH_PROJECT_ID=proj_abc123xyz...
ASKRAH_SIGNING_SECRET=sk_secret789...
```

### Frontend (Next.js)

```typescript
// app/layout.tsx
'use client';
import { useEffect } from 'react';
import { AskRah } from '@askrah/sdk/browser';

export default function RootLayout({ children }) {
  useEffect(() => {
    AskRah.init();
  }, []);

  return <html><body>{children}</body></html>;
}
```

```typescript
// app/signup/page.tsx
'use client';
import { AskRah } from '@askrah/sdk/browser';

export default function SignupPage() {
  async function handleSubmit(formData: FormData) {
    const refCode = AskRah.getRefCode();

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
        refCode
      })
    });

    if (response.ok) {
      // Clear attribution after successful signup
      AskRah.clearAttribution();
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

### Backend (Next.js API Route)

```typescript
// app/api/auth/signup/route.ts
import { AskRahEvents } from '@askrah/sdk/events';

const askrah = new AskRahEvents({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!
});

export async function POST(req: Request) {
  const { email, password, refCode } = await req.json();

  // Create user in your database
  const user = await db.users.create({ email, password });

  // Record signup with AskRah (if referred)
  if (refCode) {
    await askrah.emit('signup', {
      userId: user.id,
      email: user.email,
      refCode
    });
  }

  return Response.json({ user });
}
```

---

## How the Referral Flow Works

```
1. Referrer shares link     → askrah.com/r/ABC123
2. User clicks link         → AskRah records click, redirects to uncensy.com?ref=ABC123
3. Browser SDK              → Stores "ABC123" in cookies (30-day expiry)
4. User signs up (later)    → Frontend: AskRah.getRefCode() returns "ABC123"
5. Backend records signup   → askrah.emit('signup', { userId, refCode: 'ABC123' })
6. User makes payment       → askrah.emit('payment', { userId, amountCents: 9900 })
7. Commission calculated    → $99 × 25% = $24.75 (payout after 30 days)
8. User requests refund     → askrah.emit('refund', { ... }) → Commission clawed back
```

---

## API Reference

### POST /api/v1/events

Unified endpoint for all event types.

**Headers:**
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request:**
```json
{
  "event": "signup | payment | refund | subscription.created | subscription.updated | subscription.cancelled | dispute.created",
  "user_id": "your_user_id",
  "ref_code": "ABC123",
  "data": {
    "amount_cents": 9900,
    "currency": "USD",
    "plan_name": "Pro",
    "event_id": "evt_xxx"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "event_id": "uuid",
    "message": "Event recorded successfully",
    "commission_cents": 2475,
    "eligible_at": "2026-03-01T00:00:00Z"
  }
}
```

**Error Codes:**
- `400` - Invalid request body
- `401` - Invalid or expired JWT
- `404` - Referral code not found
- `409` - Duplicate event
- `429` - Rate limit exceeded

---

## Security Notes

**IMPORTANT**: The server SDK is designed for server-side use only.

- **Never expose your `signingSecret` in client-side code**
- Store credentials in environment variables
- The SDK automatically handles JWT generation and refresh
- JWTs expire after 5 minutes maximum
- Rate limit: 100 requests per minute per project

---

## Requirements

- Node.js 18 or later
- TypeScript 5.0+ (if using TypeScript)

## Support

- Documentation: [docs.askrah.com](https://docs.askrah.com)
- Issues: [github.com/askrah/askrah-sdk/issues](https://github.com/askrah/askrah-sdk/issues)

## License

MIT
