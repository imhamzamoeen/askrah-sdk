/**
 * Configuration options for the AskRah browser SDK
 */
export interface AskRahBrowserConfig {
  /**
   * Whether to automatically detect and store ref params from URL
   * @default true
   */
  autoDetect?: boolean

  /**
   * Cookie expiry in days
   * @default 30
   */
  cookieExpiry?: number

  /**
   * Storage key prefix
   * @default 'askrah'
   */
  storagePrefix?: string

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean

  /**
   * URL parameter name for referral code
   * @default 'ref'
   */
  refParam?: string

  /**
   * URL parameter name for click ID
   * @default 'click_id'
   */
  clickIdParam?: string
}

/**
 * Attribution data stored in localStorage/cookie
 */
export interface AttributionData {
  /**
   * The referral code from the link
   */
  ref_code: string

  /**
   * Unique click ID for this referral click
   */
  click_id?: string

  /**
   * Timestamp when attribution was captured (ms since epoch)
   */
  timestamp: number

  /**
   * How the attribution was captured
   */
  source: 'url_param' | 'manual'
}

/**
 * Result of getting attribution data
 */
export interface AttributionResult {
  refCode: string | null
  clickId: string | null
  timestamp: number | null
}
