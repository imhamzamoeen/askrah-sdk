/**
 * Configuration for the server-side referral cookie handler.
 */
interface RefHandlerConfig {
    /**
     * The signing secret used to HMAC-sign cookie values.
     * Same signingSecret from your AskRah dashboard (sk_xxx).
     */
    signingSecret: string;
    /**
     * Cookie name.
     * @default "askrah_ref"
     */
    cookieName?: string;
    /**
     * Cookie max-age in seconds.
     * @default 2592000 (30 days)
     */
    cookieMaxAge?: number;
    /**
     * Cookie path.
     * @default "/"
     */
    cookiePath?: string;
    /**
     * Cookie domain. If omitted, defaults to the current domain.
     * Set this if your site uses subdomains and you want the cookie on the root domain.
     */
    cookieDomain?: string;
    /**
     * SameSite attribute.
     * @default "Lax"
     */
    cookieSameSite?: 'Strict' | 'Lax' | 'None';
    /**
     * Whether to require Secure attribute (HTTPS only).
     * @default true
     */
    cookieSecure?: boolean;
    /**
     * Enable debug logging.
     * @default false
     */
    debug?: boolean;
}
/**
 * The shape of the signed cookie payload.
 */
interface SignedRefPayload {
    /** The referral code */
    ref: string;
    /** Optional click ID */
    cid?: string;
    /** Timestamp (seconds since epoch) when the cookie was created */
    ts: number;
}
/**
 * Web-standard request handlers returned by createRefHandler.
 */
interface RefHandler {
    /** POST handler: sets the signed HttpOnly cookie */
    POST: (request: Request) => Promise<Response>;
    /** DELETE handler: clears the cookie */
    DELETE: (request: Request) => Promise<Response>;
}
/**
 * Result of reading and verifying the ref cookie.
 */
interface RefCookieResult {
    /** The verified referral code */
    refCode: string;
    /** The click ID (if present) */
    clickId: string | null;
    /** Timestamp when the attribution was captured (seconds since epoch) */
    timestamp: number;
}

/**
 * Create request handlers for server-side referral cookie management.
 *
 * Returns { POST, DELETE } handlers using Web-standard Request/Response.
 * Mount these at your chosen API route (e.g., /api/askrah/ref).
 *
 * @example
 * ```typescript
 * // Next.js App Router
 * import { createRefHandler } from '@askrah/sdk/server'
 *
 * const handler = createRefHandler({
 *   signingSecret: process.env.ASKRAH_SIGNING_SECRET!,
 * })
 *
 * export const POST = handler.POST
 * export const DELETE = handler.DELETE
 * ```
 */
declare function createRefHandler(config: RefHandlerConfig): RefHandler;
/**
 * Read and verify the referral code from the request's cookies.
 *
 * Call this server-side when a user signs up to extract the
 * tamper-proof ref code from the HttpOnly cookie.
 *
 * @param request - The incoming Web-standard Request
 * @param signingSecret - The same signing secret used in createRefHandler
 * @param cookieName - Cookie name (default: "askrah_ref")
 * @param maxAgeSeconds - Max age for validity check (default: 30 days)
 * @returns The verified ref data, or null if no valid cookie
 *
 * @example
 * ```typescript
 * import { getRefFromRequest } from '@askrah/sdk/server'
 *
 * const ref = await getRefFromRequest(request, process.env.ASKRAH_SIGNING_SECRET!)
 * if (ref) {
 *   await askrah.recordSignup({
 *     refCode: ref.refCode,
 *     externalUserId: user.id,
 *   })
 * }
 * ```
 */
declare function getRefFromRequest(request: Request, signingSecret: string, cookieName?: string, maxAgeSeconds?: number): Promise<RefCookieResult | null>;

export { type RefCookieResult, type RefHandler, type RefHandlerConfig, type SignedRefPayload, createRefHandler, getRefFromRequest };
