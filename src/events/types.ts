/**
 * Event payload for signup events
 */
export interface SignupEventPayload {
  /** Your user's ID in your system */
  userId: string
  /** User's email (optional) */
  email?: string
  /** Referral code from AskRah.getRefCode() */
  refCode: string
  /** Click ID from AskRah.getClickId() (optional) */
  clickId?: string
}

/**
 * Event payload for conversion/payment events
 */
export interface ConversionEventPayload {
  /** Your user's ID in your system */
  userId: string
  /** Payment amount in cents (e.g., 9900 = $99.00) */
  amountCents: number
  /** Currency code (default: USD) */
  currency?: string
  /** Plan or product name */
  planName?: string
  /** Additional description */
  description?: string
  /** Unique event ID to prevent duplicates (e.g., Stripe event ID) */
  eventId?: string
}

/**
 * Event payload for subscription events
 */
export interface SubscriptionEventPayload {
  /** Your user's ID in your system */
  userId: string
  /** Event type */
  type: 'trial_start' | 'subscription_start' | 'subscription_cancel' | 'subscription_renew'
  /** Plan name */
  planName?: string
  /** Amount in cents (for renewals) */
  amountCents?: number
  /** Currency code */
  currency?: string
  /** Unique event ID to prevent duplicates */
  eventId?: string
}

/**
 * All supported event types
 */
export type AskRahEventType = 'signup' | 'conversion' | 'subscription'

/**
 * Event payload map
 */
export interface AskRahEventPayloads {
  signup: SignupEventPayload
  conversion: ConversionEventPayload
  subscription: SubscriptionEventPayload
}

/**
 * Event listener function type
 */
export type AskRahEventListener<T extends AskRahEventType> = (
  payload: AskRahEventPayloads[T]
) => void | Promise<void>
