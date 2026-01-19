# AskRah SDK

Official TypeScript SDK for the [AskRah](https://askrah.com) referral platform.

## Installation

```bash
# From GitHub (private or public repo)
npm install github:askrah/askrah-sdk

# Or with yarn
yarn add github:askrah/askrah-sdk

# Or with pnpm
pnpm add github:askrah/askrah-sdk
```

## Quick Start

```typescript
import { AskRahClient } from '@askrah/sdk'

// Initialize the client
const askrah = new AskRahClient({
  projectId: process.env.ASKRAH_PROJECT_ID!,   // e.g., "proj_abc123..."
  signingSecret: process.env.ASKRAH_SECRET!,   // e.g., "sk_xyz789..."
})

// Record a signup when a user joins via referral
await askrah.recordSignup({
  refCode: 'ABC123',           // The referral code from the URL
  externalUserId: 'user_123',  // Your user's unique ID
  externalEmail: 'user@example.com', // Optional
})

// Record a conversion when the user pays
const result = await askrah.recordConversion({
  externalUserId: 'user_123',
  amountCents: 9900,           // $99.00
  currency: 'USD',
  planName: 'Pro Monthly',
})

console.log(`Commission: $${result.commissionCents / 100}`)
console.log(`Eligible for payout: ${result.eligibleAt}`)
```

## Configuration

```typescript
const askrah = new AskRahClient({
  // Required
  projectId: 'proj_...',
  signingSecret: 'sk_...',

  // Optional
  baseUrl: 'https://askrah.com',  // Default
  tokenExpirySeconds: 300,         // Max 5 minutes
  tokenRefreshThreshold: 60,       // Refresh 1 min before expiry
  timeout: 30000,                  // Request timeout in ms
})
```

## API Reference

### `recordSignup(params)`

Records a signup event for a referred user.

```typescript
interface SignupRequest {
  refCode: string          // 4-32 chars, alphanumeric with -/_
  externalUserId: string   // Your user's ID (max 255 chars)
  externalEmail?: string   // Optional email
}

interface SignupResponse {
  referredUserId: string   // AskRah's internal ID for this user
  message: string
}
```

### `recordConversion(params)`

Records a payment conversion for a referred user.

```typescript
interface ConversionRequest {
  externalUserId: string      // Must match signup
  amountCents: number         // Payment in cents (e.g., 9900 = $99)
  currency?: string           // 3-letter code, default "USD"
  planName?: string           // Subscription plan name
  description?: string        // Optional description
  externalEventId?: string    // For deduplication
}

interface ConversionResponse {
  eventId: string             // AskRah's event ID
  commissionCents: number     // Calculated commission
  eligibleAt: string          // ISO date when commission is payable
  message: string
}
```

## Error Handling

The SDK throws typed errors for different failure scenarios:

```typescript
import {
  AskRahClient,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
} from '@askrah/sdk'

try {
  await askrah.recordSignup({ ... })
} catch (error) {
  if (error instanceof ValidationError) {
    // Invalid input parameters
    console.error('Validation failed:', error.message)
  } else if (error instanceof AuthenticationError) {
    // Invalid credentials or inactive project
    console.error('Auth failed:', error.message)
  } else if (error instanceof NotFoundError) {
    // User not found (for conversions)
    console.error('Not found:', error.message)
  } else if (error instanceof ConflictError) {
    // Duplicate signup or event
    console.error('Conflict:', error.message)
  } else if (error instanceof RateLimitError) {
    // Too many requests (100/min limit)
    console.error('Rate limited, retry later')
  } else if (error instanceof NetworkError) {
    // Network connectivity issues
    console.error('Network error:', error.message)
  } else if (error instanceof TimeoutError) {
    // Request timed out
    console.error('Request timed out')
  }
}
```

## Security Notes

**IMPORTANT**: This SDK is designed for server-side use only.

- **Never expose your `signingSecret` in client-side code**
- Store credentials in environment variables
- The SDK automatically handles JWT generation and refresh
- JWTs expire after 5 minutes maximum

## Requirements

- Node.js 18 or later
- TypeScript 5.0+ (if using TypeScript)

## License

MIT
