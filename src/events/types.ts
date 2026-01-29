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
 * @deprecated Use PaymentEventPayload instead
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
 * Event payload for payment events
 */
export interface PaymentEventPayload {
  /** Your user's ID in your system */
  userId: string
  /** Payment amount in cents (e.g., 9900 = $99.00) */
  amountCents: number
  /** Currency code (default: USD) */
  currency?: string
  /** Plan or product name */
  planName?: string
  /** Unique event ID to prevent duplicates (e.g., Stripe event ID) */
  eventId?: string
}

/**
 * Event payload for refund events
 */
export interface RefundEventPayload {
  /** Your user's ID in your system */
  userId: string
  /** Refund amount in cents */
  amountCents: number
  /** Currency code (default: USD) */
  currency?: string
  /** Original payment event ID to link the refund */
  originalEventId?: string
}

/**
 * Event payload for subscription events (legacy)
 * @deprecated Use specific subscription event payloads instead
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
 * Event payload for subscription.created events
 */
export interface SubscriptionCreatedPayload {
  /** Your user's ID in your system */
  userId: string
  /** Plan or product name */
  planName?: string
  /** Unique event ID to prevent duplicates */
  eventId?: string
}

/**
 * Event payload for subscription.updated events
 */
export interface SubscriptionUpdatedPayload {
  /** Your user's ID in your system */
  userId: string
  /** New plan or product name */
  planName?: string
  /** Unique event ID to prevent duplicates */
  eventId?: string
}

/**
 * Event payload for subscription.cancelled events
 */
export interface SubscriptionCancelledPayload {
  /** Your user's ID in your system */
  userId: string
  /** Unique event ID to prevent duplicates */
  eventId?: string
}

/**
 * Event payload for dispute events
 */
export interface DisputeEventPayload {
  /** Your user's ID in your system */
  userId: string
  /** Disputed amount in cents */
  amountCents: number
  /** Unique event ID to prevent duplicates (e.g., Stripe dispute ID) */
  eventId?: string
}

/**
 * All supported event types
 */
export type AskRahEventType =
  | 'signup'
  | 'conversion' // Legacy alias for 'payment'
  | 'payment'
  | 'refund'
  | 'subscription' // Legacy
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'dispute.created'

/**
 * Event payload map
 */
export interface AskRahEventPayloads {
  signup: SignupEventPayload
  conversion: ConversionEventPayload // Legacy
  payment: PaymentEventPayload
  refund: RefundEventPayload
  subscription: SubscriptionEventPayload // Legacy
  'subscription.created': SubscriptionCreatedPayload
  'subscription.updated': SubscriptionUpdatedPayload
  'subscription.cancelled': SubscriptionCancelledPayload
  'dispute.created': DisputeEventPayload
}

/**
 * Event listener function type
 */
export type AskRahEventListener<T extends AskRahEventType> = (
  payload: AskRahEventPayloads[T]
) => void | Promise<void>
