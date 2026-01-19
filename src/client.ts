import { createJWTManager, type JWTManager } from './auth/jwt'
import { request } from './utils/http'
import type { AskRahConfig } from './types/config'
import type { SignupRequest, ConversionRequest } from './types/requests'
import type { SignupResponse, ConversionResponse } from './types/responses'
import { ValidationError } from './errors'

const DEFAULT_BASE_URL = 'https://askrah.com'
const DEFAULT_TOKEN_EXPIRY = 300 // 5 minutes
const DEFAULT_REFRESH_THRESHOLD = 60 // 1 minute
const DEFAULT_TIMEOUT = 30000 // 30 seconds

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
export class AskRahClient {
  private readonly config: Required<Omit<AskRahConfig, 'fetch'>> & {
    fetch?: typeof fetch
  }
  private readonly jwtManager: JWTManager

  constructor(config: AskRahConfig) {
    // Validate required config
    if (!config.projectId || !config.projectId.startsWith('proj_')) {
      throw new ValidationError('Invalid projectId: must start with "proj_"')
    }
    if (!config.signingSecret || !config.signingSecret.startsWith('sk_')) {
      throw new ValidationError('Invalid signingSecret: must start with "sk_"')
    }

    this.config = {
      projectId: config.projectId,
      signingSecret: config.signingSecret,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      tokenExpirySeconds: Math.min(
        config.tokenExpirySeconds ?? DEFAULT_TOKEN_EXPIRY,
        300
      ),
      tokenRefreshThreshold:
        config.tokenRefreshThreshold ?? DEFAULT_REFRESH_THRESHOLD,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      fetch: config.fetch,
    }

    this.jwtManager = createJWTManager(
      this.config.projectId,
      this.config.signingSecret,
      this.config.tokenExpirySeconds,
      this.config.tokenRefreshThreshold
    )
  }

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
  async recordSignup(params: SignupRequest): Promise<SignupResponse> {
    this.validateSignupParams(params)

    const token = await this.jwtManager.getToken()
    const url = `${this.config.baseUrl}/api/v1/referrals/signup`

    const raw = await request<Record<string, unknown>>(
      url,
      token,
      {
        method: 'POST',
        body: {
          ref_code: params.refCode,
          external_user_id: params.externalUserId,
          external_email: params.externalEmail,
        },
        timeout: this.config.timeout,
      },
      this.config.fetch
    )

    return this.transformSignupResponse(raw)
  }

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
  async recordConversion(params: ConversionRequest): Promise<ConversionResponse> {
    this.validateConversionParams(params)

    const token = await this.jwtManager.getToken()
    const url = `${this.config.baseUrl}/api/v1/referrals/conversion`

    const raw = await request<Record<string, unknown>>(
      url,
      token,
      {
        method: 'POST',
        body: {
          external_user_id: params.externalUserId,
          amount_cents: params.amountCents,
          currency: params.currency ?? 'USD',
          plan_name: params.planName,
          description: params.description,
          external_event_id: params.externalEventId,
        },
        timeout: this.config.timeout,
      },
      this.config.fetch
    )

    return this.transformConversionResponse(raw)
  }

  /**
   * Force refresh the JWT token
   *
   * Useful if you suspect the token has been invalidated server-side.
   */
  invalidateToken(): void {
    this.jwtManager.invalidateToken()
  }

  private validateSignupParams(params: SignupRequest): void {
    if (
      !params.refCode ||
      params.refCode.length < 4 ||
      params.refCode.length > 32
    ) {
      throw new ValidationError('refCode must be 4-32 characters')
    }
    if (!/^[A-Za-z0-9_-]+$/.test(params.refCode)) {
      throw new ValidationError(
        'refCode must be alphanumeric with hyphens/underscores only'
      )
    }
    if (!params.externalUserId || params.externalUserId.length > 255) {
      throw new ValidationError(
        'externalUserId is required and must be <= 255 characters'
      )
    }
    if (
      params.externalEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.externalEmail)
    ) {
      throw new ValidationError('externalEmail must be a valid email address')
    }
  }

  private validateConversionParams(params: ConversionRequest): void {
    if (!params.externalUserId || params.externalUserId.length > 255) {
      throw new ValidationError(
        'externalUserId is required and must be <= 255 characters'
      )
    }
    if (
      typeof params.amountCents !== 'number' ||
      params.amountCents < 0 ||
      !Number.isInteger(params.amountCents)
    ) {
      throw new ValidationError('amountCents must be a non-negative integer')
    }
    if (params.currency && params.currency.length !== 3) {
      throw new ValidationError('currency must be a 3-letter code')
    }
    if (params.planName && params.planName.length > 100) {
      throw new ValidationError('planName must be <= 100 characters')
    }
    if (params.description && params.description.length > 500) {
      throw new ValidationError('description must be <= 500 characters')
    }
  }

  // Transform snake_case API response to camelCase
  private transformSignupResponse(raw: Record<string, unknown>): SignupResponse {
    return {
      referredUserId: raw.referred_user_id as string,
      message: raw.message as string,
    }
  }

  private transformConversionResponse(
    raw: Record<string, unknown>
  ): ConversionResponse {
    return {
      eventId: raw.event_id as string,
      commissionCents: raw.commission_cents as number,
      eligibleAt: raw.eligible_at as string,
      message: raw.message as string,
    }
  }
}
