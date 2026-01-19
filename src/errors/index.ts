/**
 * Base error class for all AskRah SDK errors
 */
export class AskRahError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AskRahError'
    Object.setPrototypeOf(this, AskRahError.prototype)
  }
}

/**
 * Thrown when request validation fails (400)
 */
export class ValidationError extends AskRahError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Thrown when authentication fails (401/403)
 */
export class AuthenticationError extends AskRahError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details)
    this.name = 'AuthenticationError'
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * Thrown when a resource is not found (404)
 */
export class NotFoundError extends AskRahError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, details)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * Thrown when there's a conflict (409) - e.g., duplicate signup
 */
export class ConflictError extends AskRahError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * Thrown when rate limit is exceeded (429)
 */
export class RateLimitError extends AskRahError {
  constructor(
    message: string,
    public readonly resetAt?: Date,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details)
    this.name = 'RateLimitError'
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

/**
 * Thrown when the server returns an error (5xx)
 */
export class ServerError extends AskRahError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SERVER_ERROR', 500, details)
    this.name = 'ServerError'
    Object.setPrototypeOf(this, ServerError.prototype)
  }
}

/**
 * Thrown when there's a network connectivity issue
 */
export class NetworkError extends AskRahError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', undefined, details)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Thrown when a request times out
 */
export class TimeoutError extends AskRahError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT')
    this.name = 'TimeoutError'
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}
