/**
 * Request payload for recording a signup event
 */
export interface SignupRequest {
  /**
   * The referral code from the referral link
   * Must be 4-32 characters, alphanumeric with hyphens/underscores
   */
  refCode: string

  /**
   * The user's unique ID in your system
   * Used to track conversions for this user later
   */
  externalUserId: string

  /**
   * Optional: The user's email address
   */
  externalEmail?: string
}

/**
 * Request payload for recording a conversion (payment) event
 */
export interface ConversionRequest {
  /**
   * The user's unique ID in your system
   * Must match the ID used in the signup call
   */
  externalUserId: string

  /**
   * Payment amount in cents (e.g., $99.00 = 9900)
   */
  amountCents: number

  /**
   * 3-letter currency code
   * @default "USD"
   */
  currency?: string

  /**
   * Name of the subscription plan (optional)
   */
  planName?: string

  /**
   * Description of the conversion (optional)
   */
  description?: string

  /**
   * Unique ID from your system for deduplication
   * If provided, duplicate requests with same ID are rejected
   */
  externalEventId?: string
}
