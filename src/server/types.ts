/**
 * Configuration for the server-side referral cookie handler.
 */
export interface RefHandlerConfig {
  /**
   * The signing secret used to HMAC-sign cookie values.
   * Same signingSecret from your AskRah dashboard (sk_xxx).
   */
  signingSecret: string

  /**
   * Cookie name.
   * @default "askrah_ref"
   */
  cookieName?: string

  /**
   * Cookie max-age in seconds.
   * @default 2592000 (30 days)
   */
  cookieMaxAge?: number

  /**
   * Cookie path.
   * @default "/"
   */
  cookiePath?: string

  /**
   * Cookie domain. If omitted, defaults to the current domain.
   * Set this if your site uses subdomains and you want the cookie on the root domain.
   */
  cookieDomain?: string

  /**
   * SameSite attribute.
   * @default "Lax"
   */
  cookieSameSite?: 'Strict' | 'Lax' | 'None'

  /**
   * Whether to require Secure attribute (HTTPS only).
   * @default true
   */
  cookieSecure?: boolean

  /**
   * Enable debug logging.
   * @default false
   */
  debug?: boolean
}

/**
 * The shape of the signed cookie payload.
 */
export interface SignedRefPayload {
  /** The referral code */
  ref: string
  /** Optional click ID */
  cid?: string
  /** Timestamp (seconds since epoch) when the cookie was created */
  ts: number
}

/**
 * Web-standard request handlers returned by createRefHandler.
 */
export interface RefHandler {
  /** POST handler: sets the signed HttpOnly cookie */
  POST: (request: Request) => Promise<Response>
  /** DELETE handler: clears the cookie */
  DELETE: (request: Request) => Promise<Response>
}

/**
 * Result of reading and verifying the ref cookie.
 */
export interface RefCookieResult {
  /** The verified referral code */
  refCode: string
  /** The click ID (if present) */
  clickId: string | null
  /** Timestamp when the attribution was captured (seconds since epoch) */
  timestamp: number
}
