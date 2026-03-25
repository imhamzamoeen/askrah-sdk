export { b as ApiResponse, A as AskRahClient, a as AskRahConfig, C as ConversionRequest, d as ConversionResponse, S as SignupRequest, c as SignupResponse } from './client-0-9482Ai.js';

/**
 * Base error class for all AskRah SDK errors
 */
declare class AskRahError extends Error {
    readonly code: string;
    readonly statusCode?: number | undefined;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, statusCode?: number | undefined, details?: Record<string, unknown> | undefined);
}
/**
 * Thrown when request validation fails (400)
 */
declare class ValidationError extends AskRahError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Thrown when authentication fails (401/403)
 */
declare class AuthenticationError extends AskRahError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Thrown when a resource is not found (404)
 */
declare class NotFoundError extends AskRahError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Thrown when there's a conflict (409) - e.g., duplicate signup
 */
declare class ConflictError extends AskRahError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Thrown when rate limit is exceeded (429)
 */
declare class RateLimitError extends AskRahError {
    readonly resetAt?: Date | undefined;
    constructor(message: string, resetAt?: Date | undefined, details?: Record<string, unknown>);
}
/**
 * Thrown when the server returns an error (5xx)
 */
declare class ServerError extends AskRahError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Thrown when there's a network connectivity issue
 */
declare class NetworkError extends AskRahError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Thrown when a request times out
 */
declare class TimeoutError extends AskRahError {
    constructor(message?: string);
}

export { AskRahError, AuthenticationError, ConflictError, NetworkError, NotFoundError, RateLimitError, ServerError, TimeoutError, ValidationError };
