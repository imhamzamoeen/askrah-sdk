"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/events/index.ts
var events_exports = {};
__export(events_exports, {
  AskRahEvents: () => AskRahEvents
});
module.exports = __toCommonJS(events_exports);

// src/auth/jwt.ts
var import_jose = require("jose");
function createJWTManager(projectId, signingSecret, expirySeconds = 300, refreshThreshold = 60) {
  let cachedToken = null;
  let tokenExpiresAt = null;
  const generateToken = async () => {
    const secret = new TextEncoder().encode(signingSecret);
    const token = await new import_jose.SignJWT({ sub: projectId }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime(`${expirySeconds}s`).sign(secret);
    cachedToken = token;
    const payload = (0, import_jose.decodeJwt)(token);
    tokenExpiresAt = payload.exp * 1e3;
    return token;
  };
  const isTokenValid = () => {
    if (!cachedToken || !tokenExpiresAt) {
      return false;
    }
    const now = Date.now();
    const expiresIn = tokenExpiresAt - now;
    return expiresIn > refreshThreshold * 1e3;
  };
  return {
    async getToken() {
      if (isTokenValid() && cachedToken) {
        return cachedToken;
      }
      return generateToken();
    },
    invalidateToken() {
      cachedToken = null;
      tokenExpiresAt = null;
    }
  };
}

// src/errors/index.ts
var AskRahError = class _AskRahError extends Error {
  constructor(message, code, statusCode, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AskRahError";
    Object.setPrototypeOf(this, _AskRahError.prototype);
  }
};
var ValidationError = class _ValidationError extends AskRahError {
  constructor(message, details) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, _ValidationError.prototype);
  }
};
var AuthenticationError = class _AuthenticationError extends AskRahError {
  constructor(message, details) {
    super(message, "AUTHENTICATION_ERROR", 401, details);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, _AuthenticationError.prototype);
  }
};
var NotFoundError = class _NotFoundError extends AskRahError {
  constructor(message, details) {
    super(message, "NOT_FOUND", 404, details);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, _NotFoundError.prototype);
  }
};
var ConflictError = class _ConflictError extends AskRahError {
  constructor(message, details) {
    super(message, "CONFLICT", 409, details);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, _ConflictError.prototype);
  }
};
var RateLimitError = class _RateLimitError extends AskRahError {
  constructor(message, resetAt, details) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, details);
    this.resetAt = resetAt;
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, _RateLimitError.prototype);
  }
};
var ServerError = class _ServerError extends AskRahError {
  constructor(message, details) {
    super(message, "SERVER_ERROR", 500, details);
    this.name = "ServerError";
    Object.setPrototypeOf(this, _ServerError.prototype);
  }
};
var NetworkError = class _NetworkError extends AskRahError {
  constructor(message, details) {
    super(message, "NETWORK_ERROR", void 0, details);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, _NetworkError.prototype);
  }
};
var TimeoutError = class _TimeoutError extends AskRahError {
  constructor(message = "Request timed out") {
    super(message, "TIMEOUT");
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, _TimeoutError.prototype);
  }
};

// src/utils/http.ts
async function request(url, token, options, fetchFn = fetch) {
  const controller = new AbortController();
  const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : void 0;
  try {
    const response = await fetchFn(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: options.body ? JSON.stringify(options.body) : void 0,
      signal: controller.signal
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ServerError("Invalid JSON response from server");
    }
    if (!response.ok || !data.success) {
      throw createErrorFromResponse(response.status, data.error);
    }
    return data.data;
  } catch (error) {
    if (error instanceof AskRahError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new TimeoutError();
      }
      throw new NetworkError(`Network request failed: ${error.message}`);
    }
    throw new NetworkError("Unknown network error");
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
function createErrorFromResponse(status, message) {
  const errorMessage = message || "Unknown error";
  switch (status) {
    case 400:
      return new ValidationError(errorMessage);
    case 401:
    case 403:
      return new AuthenticationError(errorMessage);
    case 404:
      return new NotFoundError(errorMessage);
    case 409:
      return new ConflictError(errorMessage);
    case 429:
      return new RateLimitError(errorMessage);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(errorMessage);
    default:
      return new AskRahError(errorMessage, "UNKNOWN_ERROR", status);
  }
}

// src/client.ts
var DEFAULT_BASE_URL = "https://askrah.com";
var DEFAULT_TOKEN_EXPIRY = 300;
var DEFAULT_REFRESH_THRESHOLD = 60;
var DEFAULT_TIMEOUT = 3e4;
var AskRahClient = class {
  constructor(config) {
    if (!config.projectId || !config.projectId.startsWith("proj_")) {
      throw new ValidationError('Invalid projectId: must start with "proj_"');
    }
    if (!config.signingSecret || !config.signingSecret.startsWith("sk_")) {
      throw new ValidationError('Invalid signingSecret: must start with "sk_"');
    }
    this.config = {
      projectId: config.projectId,
      signingSecret: config.signingSecret,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      tokenExpirySeconds: Math.min(
        config.tokenExpirySeconds ?? DEFAULT_TOKEN_EXPIRY,
        300
      ),
      tokenRefreshThreshold: config.tokenRefreshThreshold ?? DEFAULT_REFRESH_THRESHOLD,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      fetch: config.fetch
    };
    this.jwtManager = createJWTManager(
      this.config.projectId,
      this.config.signingSecret,
      this.config.tokenExpirySeconds,
      this.config.tokenRefreshThreshold
    );
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
  async recordSignup(params) {
    this.validateSignupParams(params);
    const token = await this.jwtManager.getToken();
    const url = `${this.config.baseUrl}/api/v1/referrals/signup`;
    const raw = await request(
      url,
      token,
      {
        method: "POST",
        body: {
          ref_code: params.refCode,
          external_user_id: params.externalUserId,
          external_email: params.externalEmail
        },
        timeout: this.config.timeout
      },
      this.config.fetch
    );
    return this.transformSignupResponse(raw);
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
  async recordConversion(params) {
    this.validateConversionParams(params);
    const token = await this.jwtManager.getToken();
    const url = `${this.config.baseUrl}/api/v1/referrals/conversion`;
    const raw = await request(
      url,
      token,
      {
        method: "POST",
        body: {
          external_user_id: params.externalUserId,
          amount_cents: params.amountCents,
          currency: params.currency ?? "USD",
          plan_name: params.planName,
          description: params.description,
          external_event_id: params.externalEventId
        },
        timeout: this.config.timeout
      },
      this.config.fetch
    );
    return this.transformConversionResponse(raw);
  }
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
  async sendEvent(eventType, payload) {
    if (!payload.userId || typeof payload.userId !== "string") {
      throw new ValidationError("userId is required and must be a string");
    }
    const token = await this.jwtManager.getToken();
    const url = `${this.config.baseUrl}/api/v1/events`;
    const body = this.transformEventPayload(eventType, payload);
    const raw = await request(
      url,
      token,
      {
        method: "POST",
        body,
        timeout: this.config.timeout
      },
      this.config.fetch
    );
    return this.transformEventResponse(raw);
  }
  /**
   * Force refresh the JWT token
   *
   * Useful if you suspect the token has been invalidated server-side.
   */
  invalidateToken() {
    this.jwtManager.invalidateToken();
  }
  validateSignupParams(params) {
    if (!params.refCode || params.refCode.length < 4 || params.refCode.length > 32) {
      throw new ValidationError("refCode must be 4-32 characters");
    }
    if (!/^[A-Za-z0-9_-]+$/.test(params.refCode)) {
      throw new ValidationError(
        "refCode must be alphanumeric with hyphens/underscores only"
      );
    }
    if (!params.externalUserId || params.externalUserId.length > 255) {
      throw new ValidationError(
        "externalUserId is required and must be <= 255 characters"
      );
    }
    if (params.externalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.externalEmail)) {
      throw new ValidationError("externalEmail must be a valid email address");
    }
  }
  validateConversionParams(params) {
    if (!params.externalUserId || params.externalUserId.length > 255) {
      throw new ValidationError(
        "externalUserId is required and must be <= 255 characters"
      );
    }
    if (typeof params.amountCents !== "number" || params.amountCents < 0 || !Number.isInteger(params.amountCents)) {
      throw new ValidationError("amountCents must be a non-negative integer");
    }
    if (params.currency && params.currency.length !== 3) {
      throw new ValidationError("currency must be a 3-letter code");
    }
    if (params.planName && params.planName.length > 100) {
      throw new ValidationError("planName must be <= 100 characters");
    }
    if (params.description && params.description.length > 500) {
      throw new ValidationError("description must be <= 500 characters");
    }
  }
  // Transform snake_case API response to camelCase
  transformSignupResponse(raw) {
    return {
      referredUserId: raw.referred_user_id,
      message: raw.message
    };
  }
  transformConversionResponse(raw) {
    return {
      eventId: raw.event_id,
      commissionCents: raw.commission_cents,
      eligibleAt: raw.eligible_at,
      message: raw.message
    };
  }
  /**
   * Transform event payload from camelCase to snake_case API format
   */
  transformEventPayload(eventType, payload) {
    const base = {
      event: eventType,
      user_id: payload.userId
    };
    if (eventType === "signup" && payload.refCode) {
      base.ref_code = payload.refCode;
    }
    const data = {};
    const keyMapping = {
      amountCents: "amount_cents",
      currency: "currency",
      planName: "plan_name",
      eventId: "event_id",
      originalEventId: "original_event_id",
      email: "email"
    };
    for (const [camelKey, snakeKey] of Object.entries(keyMapping)) {
      if (payload[camelKey] !== void 0) {
        data[snakeKey] = payload[camelKey];
      }
    }
    if (Object.keys(data).length > 0) {
      base.data = data;
    }
    return base;
  }
  /**
   * Transform event response from snake_case to camelCase
   */
  transformEventResponse(raw) {
    const response = {
      eventId: raw.event_id ?? null,
      message: raw.message
    };
    if (raw.commission_cents !== void 0) {
      response.commissionCents = raw.commission_cents;
    }
    if (raw.eligible_at !== void 0) {
      response.eligibleAt = raw.eligible_at;
    }
    if (raw.clawback_cents !== void 0) {
      response.clawbackCents = raw.clawback_cents;
    }
    return response;
  }
};

// src/events/emitter.ts
var AskRahEvents = class {
  constructor(config) {
    this.config = {
      throwOnError: false,
      debug: false,
      ...config
    };
    this.client = new AskRahClient(config);
    this.listeners = /* @__PURE__ */ new Map();
  }
  log(...args) {
    if (this.config.debug) {
      console.log("[AskRah Events]", ...args);
    }
  }
  async handleError(error, eventType) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[AskRah Events] Error handling ${eventType}:`, message);
    if (this.config.throwOnError) {
      throw error;
    }
  }
  /**
   * Emit an event to AskRah
   *
   * @param event - Event type
   * @param payload - Event data
   */
  async emit(event, payload) {
    this.log(`Emitting ${event}:`, payload);
    try {
      switch (event) {
        case "signup":
          await this.handleSignup(payload);
          break;
        case "conversion":
          await this.handlePayment(payload);
          break;
        case "payment":
          await this.handlePayment(payload);
          break;
        case "refund":
          await this.handleRefund(payload);
          break;
        case "subscription":
          await this.handleLegacySubscription(payload);
          break;
        case "subscription.created":
          await this.handleSubscriptionEvent("subscription.created", payload);
          break;
        case "subscription.updated":
          await this.handleSubscriptionEvent("subscription.updated", payload);
          break;
        case "subscription.cancelled":
          await this.handleSubscriptionEvent("subscription.cancelled", payload);
          break;
        case "dispute.created":
          await this.handleDispute(payload);
          break;
        default:
          this.log(`Unknown event type: ${event}`);
      }
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        for (const listener of eventListeners) {
          try {
            await listener(payload);
          } catch (e) {
            this.log(`Custom listener error for ${event}:`, e);
          }
        }
      }
    } catch (error) {
      await this.handleError(error, event);
    }
  }
  /**
   * Add a custom event listener
   */
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }
  /**
   * Remove all listeners for an event
   */
  off(event) {
    this.listeners.delete(event);
  }
  /**
   * Handle signup events using the legacy endpoint for backward compatibility
   */
  async handleSignup(payload) {
    this.log("Recording signup:", payload);
    await this.client.recordSignup({
      refCode: payload.refCode,
      externalUserId: payload.userId,
      externalEmail: payload.email
    });
    this.log("Signup recorded successfully");
  }
  /**
   * Handle payment events using the unified endpoint
   */
  async handlePayment(payload) {
    this.log("Recording payment:", payload);
    await this.client.sendEvent("payment", {
      userId: payload.userId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      planName: payload.planName,
      eventId: payload.eventId
    });
    this.log("Payment recorded successfully");
  }
  /**
   * Handle refund events using the unified endpoint
   */
  async handleRefund(payload) {
    this.log("Recording refund:", payload);
    await this.client.sendEvent("refund", {
      userId: payload.userId,
      amountCents: payload.amountCents,
      currency: payload.currency,
      originalEventId: payload.originalEventId
    });
    this.log("Refund recorded successfully");
  }
  /**
   * Handle subscription events using the unified endpoint
   */
  async handleSubscriptionEvent(eventType, payload) {
    this.log(`Recording ${eventType}:`, payload);
    await this.client.sendEvent(eventType, {
      userId: payload.userId,
      planName: payload.planName,
      eventId: payload.eventId
    });
    this.log(`${eventType} recorded successfully`);
  }
  /**
   * Handle dispute events using the unified endpoint
   */
  async handleDispute(payload) {
    this.log("Recording dispute:", payload);
    await this.client.sendEvent("dispute.created", {
      userId: payload.userId,
      amountCents: payload.amountCents,
      eventId: payload.eventId
    });
    this.log("Dispute recorded successfully");
  }
  /**
   * Handle legacy subscription format (backward compatibility)
   * @deprecated Use specific subscription events instead
   */
  async handleLegacySubscription(payload) {
    this.log("Recording legacy subscription event:", payload);
    switch (payload.type) {
      case "subscription_start":
        await this.client.sendEvent("subscription.created", {
          userId: payload.userId,
          planName: payload.planName,
          eventId: payload.eventId
        });
        break;
      case "subscription_cancel":
        await this.client.sendEvent("subscription.cancelled", {
          userId: payload.userId,
          eventId: payload.eventId
        });
        break;
      case "subscription_renew":
        if (payload.amountCents) {
          await this.client.sendEvent("payment", {
            userId: payload.userId,
            amountCents: payload.amountCents,
            currency: payload.currency,
            planName: payload.planName,
            eventId: payload.eventId
          });
        }
        break;
      case "trial_start":
        await this.client.sendEvent("subscription.created", {
          userId: payload.userId,
          planName: payload.planName ? `${payload.planName} (Trial)` : "Trial",
          eventId: payload.eventId
        });
        break;
    }
    this.log("Legacy subscription event recorded successfully");
  }
  /**
   * Get the underlying client for advanced usage
   */
  getClient() {
    return this.client;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AskRahEvents
});
