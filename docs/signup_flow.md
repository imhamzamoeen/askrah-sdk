# Secure Signup Flow with @askrah/sdk

This guide walks through integrating AskRah's referral tracking into your project using **secure server-side cookies**. The referral code is stored in an `HttpOnly`, `Secure`, HMAC-signed cookie that cannot be read or tampered with from the browser.

## Overview

```
User clicks referral link
  → askrah.com/r/ABC123
  → Redirects to yoursite.com?ref=ABC123

Browser SDK detects ?ref=ABC123
  → POSTs { ref_code: "ABC123" } to /api/askrah/ref (your server)
  → Server signs it with HMAC-SHA256 and sets HttpOnly cookie

User signs up (minutes, hours, or days later)
  → Signup form submits to your server
  → Server reads the HttpOnly cookie
  → Verifies the HMAC signature (tamper-proof)
  → Extracts ref code → calls AskRah API to record the signup

User makes a payment
  → Your server calls AskRah API to record the conversion
  → Commission is calculated automatically
```

## Prerequisites

From your [AskRah dashboard](https://askrah.com), get:

- **Project ID**: `proj_abc123...`
- **Signing Secret**: `sk_xyz789...`

Install the SDK:

```bash
npm install @askrah/sdk
# or
pnpm add @askrah/sdk
```

---

## Step 1: Create the Cookie Endpoint

This endpoint receives the referral code from the browser and sets a signed, HttpOnly cookie.

### Next.js (App Router)

Create the file `app/api/askrah/ref/route.ts`:

```typescript
import { createRefHandler } from '@askrah/sdk/server'

const handler = createRefHandler({
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

export const POST = handler.POST
export const DELETE = handler.DELETE
```

### Express

```typescript
import express from 'express'
import { createRefHandler } from '@askrah/sdk/server'

const app = express()
const handler = createRefHandler({
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

app.post('/api/askrah/ref', async (req, res) => {
  const response = await handler.POST(req)
  const body = await response.json()
  // Forward Set-Cookie header
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) res.setHeader('set-cookie', setCookie)
  res.status(response.status).json(body)
})

app.delete('/api/askrah/ref', async (req, res) => {
  const response = await handler.DELETE(req)
  const body = await response.json()
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) res.setHeader('set-cookie', setCookie)
  res.status(response.status).json(body)
})
```

### Handler Configuration

`createRefHandler` accepts these options:

```typescript
createRefHandler({
  signingSecret: 'sk_xxx',     // Required — your AskRah signing secret

  // Optional overrides:
  cookieName: 'askrah_ref',    // Cookie name (default: "askrah_ref")
  cookieMaxAge: 2592000,       // Max age in seconds (default: 30 days)
  cookiePath: '/',             // Cookie path (default: "/")
  cookieDomain: undefined,     // Cookie domain (default: current domain)
  cookieSameSite: 'Lax',       // SameSite attribute (default: "Lax")
  cookieSecure: true,          // Secure flag — HTTPS only (default: true)
  debug: false,                // Enable console logging (default: false)
})
```

### What the handler does

When the browser SDK sends `POST /api/askrah/ref` with `{ "ref_code": "ABC123" }`:

1. Validates the ref code (4-32 alphanumeric characters)
2. Creates a payload: `{ ref: "ABC123", ts: 1706400000 }`
3. Signs it with HMAC-SHA256 using your signing secret
4. Sets the cookie:
   ```
   Set-Cookie: askrah_ref=<signed_value>; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly; Secure
   ```

The cookie value is `base64url(payload).base64url(hmac_signature)` — changing any part invalidates the signature.

---

## Step 2: Initialize the Browser SDK

Add the SDK initialization to your app's entry point. The `trackEndpoint` option tells the SDK to use your server endpoint instead of client-side cookies.

### Next.js (App Router)

Create a client component for initialization:

```typescript
// components/askrah-init.tsx
'use client'

import { useEffect } from 'react'
import { AskRah } from '@askrah/sdk/browser'

export function AskRahInit() {
  useEffect(() => {
    AskRah.init({
      trackEndpoint: '/api/askrah/ref',
      // debug: true,  // Enable to see logs in console
    })
  }, [])

  return null
}
```

Add it to your root layout:

```typescript
// app/layout.tsx
import { AskRahInit } from '@/components/askrah-init'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <AskRahInit />
      </body>
    </html>
  )
}
```

### Plain HTML / Vanilla JS

```html
<script type="module">
  import { AskRah } from '@askrah/sdk/browser'

  AskRah.init({
    trackEndpoint: '/api/askrah/ref',
  })
</script>
```

### What happens on page load

When a user visits `https://yoursite.com?ref=ABC123`:

1. `AskRah.init()` runs
2. The SDK detects `?ref=ABC123` in the URL
3. The SDK sends `POST /api/askrah/ref` with `{ "ref_code": "ABC123" }`
4. Your server signs and sets the HttpOnly cookie
5. The cookie persists for 30 days across page navigations

The `?ref=` parameter is only needed on the first visit. After that, the cookie handles attribution.

---

## Step 3: Read the Ref Code on Signup

When the user signs up, read the referral code from the HttpOnly cookie on the **server side** and record it with AskRah.

### Next.js — Server Action

```typescript
// app/signup/actions.ts
'use server'

import { getRefFromRequest } from '@askrah/sdk/server'
import { AskRahClient } from '@askrah/sdk'

const askrah = new AskRahClient({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. Create user in your database
  const user = await db.users.create({ email, password })

  // 2. Read referral code from HttpOnly cookie
  //    headers() gives you access to the incoming request cookies
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')

  // Build a minimal Request to pass to getRefFromRequest
  const req = new Request('https://localhost', {
    headers: { cookie: cookieHeader || '' },
  })

  const ref = await getRefFromRequest(req, process.env.ASKRAH_SIGNING_SECRET!)

  // 3. Record signup with AskRah (if referred)
  if (ref) {
    await askrah.recordSignup({
      refCode: ref.refCode,
      externalUserId: user.id,
      externalEmail: user.email,
    })
  }

  return { success: true }
}
```

### Next.js — API Route

```typescript
// app/api/auth/signup/route.ts
import { getRefFromRequest } from '@askrah/sdk/server'
import { AskRahClient } from '@askrah/sdk'

const askrah = new AskRahClient({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

export async function POST(request: Request) {
  const { email, password } = await request.json()

  // 1. Create user in your database
  const user = await db.users.create({ email, password })

  // 2. Read referral code from HttpOnly cookie
  const ref = await getRefFromRequest(request, process.env.ASKRAH_SIGNING_SECRET!)

  // 3. Record signup with AskRah (if referred)
  if (ref) {
    await askrah.recordSignup({
      refCode: ref.refCode,
      externalUserId: user.id,
      externalEmail: user.email,
    })
  }

  return Response.json({ user: { id: user.id, email: user.email } })
}
```

### Express

```typescript
import { getRefFromRequest } from '@askrah/sdk/server'
import { AskRahClient } from '@askrah/sdk'

const askrah = new AskRahClient({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body

  const user = await db.users.create({ email, password })

  // Build a Request object from Express req
  const request = new Request('https://localhost', {
    headers: { cookie: req.headers.cookie || '' },
  })

  const ref = await getRefFromRequest(request, process.env.ASKRAH_SIGNING_SECRET!)

  if (ref) {
    await askrah.recordSignup({
      refCode: ref.refCode,
      externalUserId: user.id,
      externalEmail: user.email,
    })
  }

  res.json({ user: { id: user.id, email: user.email } })
})
```

### What `getRefFromRequest` returns

```typescript
// If a valid, non-expired, non-tampered cookie exists:
{
  refCode: 'ABC123',        // The verified referral code
  clickId: 'uuid-xxx',      // Click ID (if captured), or null
  timestamp: 1706400000     // When the attribution was captured (unix seconds)
}

// If no cookie, expired, or tampered:
null
```

---

## Step 4: Record Conversions

When a referred user makes a payment, record the conversion to trigger commission calculation.

```typescript
// In your payment webhook or checkout handler
import { AskRahClient } from '@askrah/sdk'

const askrah = new AskRahClient({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

// Record payment
const result = await askrah.recordConversion({
  externalUserId: user.id,     // Same ID used in recordSignup
  amountCents: 9900,           // $99.00
  currency: 'USD',
  planName: 'Pro Monthly',
  externalEventId: 'evt_xxx',  // For deduplication
})

console.log('Commission:', result.commissionCents)  // e.g., 2475 ($24.75)
console.log('Eligible at:', result.eligibleAt)       // e.g., "2026-03-01T00:00:00Z"
```

Or using the event emitter (fire-and-forget):

```typescript
import { AskRahEvents } from '@askrah/sdk/events'

const askrah = new AskRahEvents({
  projectId: process.env.ASKRAH_PROJECT_ID!,
  signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
})

await askrah.emit('payment', {
  userId: user.id,
  amountCents: 9900,
  currency: 'USD',
  planName: 'Pro Monthly',
  eventId: stripeEvent.id,
})
```

---

## Complete File Structure

After setup, your project should have these AskRah-related files:

```
your-project/
├── .env.local
│   ├── ASKRAH_PROJECT_ID=proj_abc123...
│   └── ASKRAH_SIGNING_SECRET=sk_xyz789...
│
├── app/
│   ├── api/
│   │   └── askrah/
│   │       └── ref/
│   │           └── route.ts          ← Step 1: Cookie endpoint
│   │
│   ├── layout.tsx                    ← Step 2: AskRahInit component
│   │
│   └── api/auth/signup/
│       └── route.ts                  ← Step 3: Read cookie on signup
│
└── components/
    └── askrah-init.tsx               ← Step 2: Browser SDK init
```

---

## Environment Variables

Add to your `.env.local`:

```env
ASKRAH_PROJECT_ID=proj_abc123...
ASKRAH_SIGNING_SECRET=sk_xyz789...
```

The signing secret is used for:
1. HMAC-signing the referral cookie (server handler)
2. Verifying the cookie on signup (getRefFromRequest)
3. JWT authentication when calling AskRah API (AskRahClient / AskRahEvents)

**Never expose the signing secret in client-side code.** The browser SDK only needs the `trackEndpoint` URL — no secrets.

---

## Cookie Security Details

The cookie set by this flow has these attributes:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | yes | JavaScript cannot read or modify it |
| `Secure` | yes | Only sent over HTTPS |
| `SameSite` | Lax | Sent on same-site requests and top-level navigations |
| `Max-Age` | 2592000 | 30-day expiry |
| HMAC-SHA256 | signed payload | Tamper-proof — changing the ref code invalidates the signature |

### Why is this secure?

- **XSS protection**: `HttpOnly` means even if an attacker injects JavaScript, they cannot read the referral cookie.
- **Tamper-proof**: The cookie value is signed with your secret. Modifying the referral code, click ID, or timestamp invalidates the HMAC signature. Without your `signingSecret`, a valid signature cannot be forged.
- **HTTPS only**: The `Secure` flag ensures the cookie is never sent over unencrypted HTTP.
- **Expiry validation**: The timestamp is inside the signed payload. Even replaying an old cookie is rejected after `maxAge` seconds.

---

## SDK Functions Reference

### Browser Side (`@askrah/sdk/browser`)

| Function | What it does |
|----------|--------------|
| `AskRah.init({ trackEndpoint })` | Initializes the SDK. Detects `?ref=` in the URL and POSTs it to your server endpoint. |
| `AskRah.cleanURL()` | Removes `?ref=` and `?click_id=` from the browser URL bar (no reload). |
| `AskRah.setRefCode(code)` | Manually set a referral code (POSTs to server in secure mode). |
| `AskRah.clearAttribution()` | Clears the cookie via `DELETE` to your endpoint. |

> In server mode, `getRefCode()`, `getClickId()`, `getAttribution()`, and `hasAttribution()` return `null`/`false` because the HttpOnly cookie is not readable by JavaScript. This is by design. Read the ref code on the server using `getRefFromRequest()`.

### Server Side (`@askrah/sdk/server`)

| Function | What it does |
|----------|--------------|
| `createRefHandler(config)` | Returns `{ POST, DELETE }` handlers to mount at your API route. Sets/clears the signed HttpOnly cookie. |
| `getRefFromRequest(request, secret)` | Reads the cookie from the request, verifies the HMAC signature, checks expiry, and returns `{ refCode, clickId, timestamp }` or `null`. |

### Server Side (`@askrah/sdk`)

| Function | What it does |
|----------|--------------|
| `client.recordSignup({ refCode, externalUserId, externalEmail? })` | Records a referred user signup with AskRah. |
| `client.recordConversion({ externalUserId, amountCents, currency?, ... })` | Records a payment and triggers commission calculation. |
| `client.sendEvent(type, payload)` | Sends any event type (payment, refund, subscription.*, dispute.created). |

### Server Side (`@askrah/sdk/events`)

| Function | What it does |
|----------|--------------|
| `askrah.emit('signup', { userId, refCode, email? })` | Fire-and-forget signup event. |
| `askrah.emit('payment', { userId, amountCents, ... })` | Fire-and-forget payment event. |
| `askrah.emit('refund', { userId, amountCents, ... })` | Fire-and-forget refund event. |

---

## Troubleshooting

### Cookie not being set

- Ensure `cookieSecure: true` and your site is served over HTTPS. On `localhost`, set `cookieSecure: false` during development.
- Check the browser's DevTools Network tab — look for the `Set-Cookie` header in the response to `POST /api/askrah/ref`.
- Enable `debug: true` in both `AskRah.init()` and `createRefHandler()` to see console logs.

### `getRefFromRequest` returns null

- The cookie may have expired (default: 30 days).
- The cookie may have been tampered with (HMAC verification failed).
- The cookie header might not be reaching your server — check that `credentials: 'same-origin'` is set (the SDK does this automatically).
- Verify the same `signingSecret` is used in both `createRefHandler` and `getRefFromRequest`.

### Ref code not detected from URL

- Confirm the URL contains `?ref=CODE` (default parameter name is `ref`).
- If using a custom parameter name, set `refParam` in `AskRah.init()`.
- Ensure `AskRah.init()` runs **after** the page loads (e.g., inside `useEffect`).
