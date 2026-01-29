/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Response from the signup endpoint
 */
export interface SignupResponse {
  /**
   * The ID of the referred user in AskRah's system
   */
  referredUserId: string

  /**
   * Success message
   */
  message: string
}

/**
 * Response from the conversion endpoint
 */
export interface ConversionResponse {
  /**
   * The ID of the conversion event in AskRah's system
   */
  eventId: string

  /**
   * The calculated commission amount in cents
   */
  commissionCents: number

  /**
   * ISO 8601 date when the commission becomes eligible for payout
   */
  eligibleAt: string

  /**
   * Success message
   */
  message: string
}

/**
 * Response from the unified events endpoint
 */
export interface EventResponse {
  /**
   * The ID of the created event in AskRah's system
   * May be null if the event was ignored (e.g., refund for non-tracked user)
   */
  eventId: string | null

  /**
   * Success message describing what happened
   */
  message: string

  /**
   * The calculated commission amount in cents (for payment events)
   */
  commissionCents?: number

  /**
   * ISO 8601 date when the commission becomes eligible for payout (for payment events)
   */
  eligibleAt?: string | null

  /**
   * The clawback amount in cents (for refund/dispute events)
   */
  clawbackCents?: number
}
