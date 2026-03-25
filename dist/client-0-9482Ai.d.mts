/**
 * Configuration options for the AskRah SDK client
 */
interface AskRahConfig {
    /**
     * Project identifier (e.g., "proj_abc123...")
     * Obtained from AskRah dashboard when creating a project
     */
    projectId: string;
    /**
     * Signing secret (e.g., "sk_xyz789...")
     * Obtained from AskRah dashboard - keep secure, never expose to client
     */
    signingSecret: string;
    /**
     * Base URL for the AskRah API
     * @default "https://askrah.com"
     */
    baseUrl?: string;
    /**
     * JWT expiration time in seconds
     * Maximum allowed: 300 (5 minutes)
     * @default 300
     */
    tokenExpirySeconds?: number;
    /**
     * Time in seconds before expiry to refresh the token
     * @default 60
     */
    tokenRefreshThreshold?: number;
    /**
     * Request timeout in milliseconds
     * @default 30000
     */
    timeout?: number;
    /**
     * Custom fetch implementation (useful for testing or special environments)
     * Must be compatible with the global fetch API
     */
    fetch?: typeof fetch;
}

/**
 * Request payload for recording a signup event
 */
interface SignupRequest {
    /**
     * The referral code from the referral link
     * Must be 4-32 characters, alphanumeric with hyphens/underscores
     */
    refCode: string;
    /**
     * The user's unique ID in your system
     * Used to track conversions for this user later
     */
    externalUserId: string;
    /**
     * Optional: The user's email address
     */
    externalEmail?: string;
}
/**
 * Request payload for recording a conversion (payment) event
 */
interface ConversionRequest {
    /**
     * The user's unique ID in your system
     * Must match the ID used in the signup call
     */
    externalUserId: string;
    /**
     * Payment amount in cents (e.g., $99.00 = 9900)
     */
    amountCents: number;
    /**
     * 3-letter currency code
     * @default "USD"
     */
    currency?: string;
    /**
     * Name of the subscription plan (optional)
     */
    planName?: string;
    /**
     * Description of the conversion (optional)
     */
    description?: string;
    /**
     * Unique ID from your system for deduplication
     * If provided, duplicate requests with same ID are rejected
     */
    externalEventId?: string;
}

/**
 * Generic API response wrapper
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
/**
 * Response from the signup endpoint
 */
interface SignupResponse {
    /**
     * The ID of the referred user in AskRah's system
     */
    referredUserId: string;
    /**
     * Success message
     */
    message: string;
}
/**
 * Response from the conversion endpoint
 */
interface ConversionResponse {
    /**
     * The ID of the conversion event in AskRah's system
     */
    eventId: string;
    /**
     * The calculated commission amount in cents
     */
    commissionCents: number;
    /**
     * ISO 8601 date when the commission becomes eligible for payout
     */
    eligibleAt: string;
    /**
     * Success message
     */
    message: string;
}
/**
 * Response from the unified events endpoint
 */
interface EventResponse {
    /**
     * The ID of the created event in AskRah's system
     * May be null if the event was ignored (e.g., refund for non-tracked user)
     */
    eventId: string | null;
    /**
     * Success message describing what happened
     */
    message: string;
    /**
     * The calculated commission amount in cents (for payment events)
     */
    commissionCents?: number;
    /**
     * ISO 8601 date when the commission becomes eligible for payout (for payment events)
     */
    eligibleAt?: string | null;
    /**
     * The clawback amount in cents (for refund/dispute events)
     */
    clawbackCents?: number;
}

/**
 * AskRah SDK Client
 *
 * The main entry point for interacting with the AskRah referral platform API.
 *
 * @example
 * ```typescript
 * const client = new AskRahClient({
 *   projectId: 'proj_abc123...',
 *   signingSecret: 'sk_xyz789...',
 * })
 *
 * await client.recordSignup({
 *   refCode: 'ABC123',
 *   externalUserId: 'user_123',
 * })
 * ```
 */
declare class AskRahClient {
    private readonly config;
    private readonly jwtManager;
    constructor(config: AskRahConfig);
    /**
     * Record a signup event for a referred user
     *
     * Call this when a user signs up through a referral link in your application.
     *
     * @param params - Signup parameters
     * @returns The created referred user record
     * @throws {ValidationError} If parameters are invalid
     * @throws {ConflictError} If user already signed up
     * @throws {AuthenticationError} If credentials are invalid
     *
     * @example
     * ```typescript
     * const result = await client.recordSignup({
     *   refCode: 'ABC123',
     *   externalUserId: 'user_123',
     *   externalEmail: 'user@example.com',
     * })
     * console.log('Referred user ID:', result.referredUserId)
     * ```
     */
    recordSignup(params: SignupRequest): Promise<SignupResponse>;
    /**
     * Record a conversion (payment) event for a referred user
     *
     * Call this when a referred user makes a payment in your application.
     *
     * @param params - Conversion parameters
     * @returns The created conversion event with commission details
     * @throws {ValidationError} If parameters are invalid
     * @throws {NotFoundError} If the user hasn't signed up yet
     * @throws {ConflictError} If duplicate externalEventId
     * @throws {AuthenticationError} If credentials are invalid
     *
     * @example
     * ```typescript
     * const result = await client.recordConversion({
     *   externalUserId: 'user_123',
     *   amountCents: 9900, // $99.00
     *   currency: 'USD',
     *   planName: 'Pro Monthly',
     * })
     * console.log('Commission:', result.commissionCents / 100)
     * ```
     */
    recordConversion(params: ConversionRequest): Promise<ConversionResponse>;
    /**
     * Send an event to the unified events endpoint
     *
     * This is the primary method for sending all event types to AskRah.
     * Use this for payment, refund, subscription, and dispute events.
     * For signup events, you can use recordSignup() or this method.
     *
     * @param eventType - The event type (payment, refund, subscription.*, dispute.created)
     * @param payload - Event payload with userId and event-specific data
     * @returns Event response with event ID and commission details
     * @throws {ValidationError} If parameters are invalid
     * @throws {NotFoundError} If user not found (for non-signup events)
     * @throws {ConflictError} If duplicate eventId
     * @throws {AuthenticationError} If credentials are invalid
     *
     * @example
     * ```typescript
     * // Payment event
     * const result = await client.sendEvent('payment', {
     *   userId: 'user_123',
     *   amountCents: 9900,
     *   currency: 'USD',
     *   planName: 'Pro Monthly',
     *   eventId: 'evt_stripe_xxx'
     * })
     *
     * // Refund event
     * await client.sendEvent('refund', {
     *   userId: 'user_123',
     *   amountCents: 9900,
     *   originalEventId: 'evt_stripe_xxx'
     * })
     *
     * // Subscription event
     * await client.sendEvent('subscription.created', {
     *   userId: 'user_123',
     *   planName: 'Pro Monthly'
     * })
     * ```
     */
    sendEvent(eventType: string, payload: Record<string, unknown>): Promise<EventResponse>;
    /**
     * Force refresh the JWT token
     *
     * Useful if you suspect the token has been invalidated server-side.
     */
    invalidateToken(): void;
    private validateSignupParams;
    private validateConversionParams;
    private transformSignupResponse;
    private transformConversionResponse;
    /**
     * Transform event payload from camelCase to snake_case API format
     */
    private transformEventPayload;
    /**
     * Transform event response from snake_case to camelCase
     */
    private transformEventResponse;
}

export { AskRahClient as A, type ConversionRequest as C, type SignupRequest as S, type AskRahConfig as a, type ApiResponse as b, type SignupResponse as c, type ConversionResponse as d };
