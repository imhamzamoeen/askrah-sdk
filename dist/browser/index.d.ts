/**
 * Configuration options for the AskRah browser SDK
 */
interface AskRahBrowserConfig {
    /**
     * Whether to automatically detect and store ref params from URL
     * @default true
     */
    autoDetect?: boolean;
    /**
     * Cookie expiry in days
     * @default 30
     */
    cookieExpiry?: number;
    /**
     * Storage key prefix
     * @default 'askrah'
     */
    storagePrefix?: string;
    /**
     * Enable debug logging
     * @default false
     */
    debug?: boolean;
    /**
     * URL parameter name for referral code
     * @default 'ref'
     */
    refParam?: string;
    /**
     * URL parameter name for click ID
     * @default 'click_id'
     */
    clickIdParam?: string;
    /**
     * Server endpoint for secure HttpOnly cookie storage.
     * When set, the SDK POSTs the ref code to this endpoint instead of
     * storing it in localStorage/document.cookie.
     *
     * The endpoint must be created using createRefHandler() from '@askrah/sdk/server'.
     *
     * When using server mode:
     * - getRefCode() returns null (HttpOnly cookies are not readable by JS)
     * - Use getRefFromRequest() server-side to read the ref code
     *
     * @example '/api/askrah/ref'
     */
    trackEndpoint?: string;
}
/**
 * Attribution data stored in localStorage/cookie
 */
interface AttributionData {
    /**
     * The referral code from the link
     */
    ref_code: string;
    /**
     * Unique click ID for this referral click
     */
    click_id?: string;
    /**
     * Timestamp when attribution was captured (ms since epoch)
     */
    timestamp: number;
    /**
     * How the attribution was captured
     */
    source: 'url_param' | 'manual';
}
/**
 * Result of getting attribution data
 */
interface AttributionResult {
    refCode: string | null;
    clickId: string | null;
    timestamp: number | null;
}

/**
 * Storage manager for attribution data
 * Uses localStorage as primary, cookie as fallback
 */
declare class AttributionStorage {
    private prefix;
    private cookieExpiry;
    private debug;
    constructor(prefix?: string, cookieExpiry?: number, debug?: boolean);
    private log;
    private getStorageKey;
    private getCookieName;
    /**
     * Save attribution data to storage
     */
    save(data: AttributionData): boolean;
    /**
     * Load attribution data from storage
     */
    load(): AttributionData | null;
    /**
     * Clear attribution data from storage
     */
    clear(): void;
    /**
     * Check if attribution data exists
     */
    hasData(): boolean;
}
/**
 * Server-side storage that delegates to an HTTP endpoint for HttpOnly cookie management.
 * Used when trackEndpoint is configured.
 */
declare class ServerAttributionStorage {
    private endpoint;
    private debug;
    constructor(endpoint: string, debug?: boolean);
    private log;
    /**
     * POST the ref data to the server endpoint to set the HttpOnly cookie.
     */
    save(data: AttributionData): Promise<boolean>;
    /**
     * HttpOnly cookie cannot be read by JavaScript.
     * Use getRefFromRequest() server-side instead.
     */
    load(): AttributionData | null;
    /**
     * Clear the cookie via the server endpoint.
     */
    clear(): Promise<void>;
    /**
     * Cannot determine presence of HttpOnly cookie from JavaScript.
     */
    hasData(): boolean;
}

/**
 * Detects referral parameters from the current URL
 */
declare class URLDetector {
    private refParam;
    private clickIdParam;
    private debug;
    constructor(refParam?: string, clickIdParam?: string, debug?: boolean);
    private log;
    /**
     * Check if the current URL has referral parameters
     */
    hasReferralParams(): boolean;
    /**
     * Extract referral data from the current URL
     */
    detect(): AttributionData | null;
    /**
     * Clean referral parameters from the URL (optional, for cleaner URLs)
     * Note: This modifies the browser history without page reload
     */
    cleanURL(): void;
}

/**
 * AskRah Browser SDK
 *
 * Handles referral attribution on external project websites.
 * Automatically detects ?ref=xxx parameters and stores them for later retrieval.
 *
 * @example
 * ```typescript
 * import { AskRah } from '@askrah/sdk/browser';
 *
 * // Client-only mode (localStorage/cookie)
 * AskRah.init();
 *
 * // Secure server mode (HttpOnly cookie)
 * AskRah.init({ trackEndpoint: '/api/askrah/ref' });
 * ```
 */
declare class AskRahBrowser {
    private config;
    private storage;
    private serverStorage;
    private detector;
    private initialized;
    private isServerMode;
    /**
     * Initialize the AskRah browser SDK
     *
     * @param config - Configuration options
     */
    init(config?: AskRahBrowserConfig): void;
    /**
     * Detect ref params from URL and store them
     * Implements "last-click wins" - always overwrites existing data
     */
    private detectAndStore;
    /**
     * Get the stored referral code
     *
     * In server mode, returns null because the HttpOnly cookie
     * cannot be read by JavaScript. Use getRefFromRequest() server-side.
     *
     * @returns The referral code or null if none stored
     */
    getRefCode(): string | null;
    /**
     * Get the stored click ID
     *
     * In server mode, returns null because the HttpOnly cookie
     * cannot be read by JavaScript. Use getRefFromRequest() server-side.
     *
     * @returns The click ID or null if none stored
     */
    getClickId(): string | null;
    /**
     * Get full attribution data
     *
     * In server mode, returns nulls because the HttpOnly cookie
     * cannot be read by JavaScript. Use getRefFromRequest() server-side.
     *
     * @returns Attribution result with all available data
     */
    getAttribution(): AttributionResult;
    /**
     * Manually set the referral code
     * Useful for custom attribution scenarios
     *
     * @param refCode - The referral code to store
     * @param clickId - Optional click ID
     */
    setRefCode(refCode: string, clickId?: string): void;
    /**
     * Clear all stored attribution data
     */
    clearAttribution(): void;
    /**
     * Check if there is stored attribution data
     *
     * In server mode, always returns false because the HttpOnly cookie
     * cannot be checked by JavaScript.
     */
    hasAttribution(): boolean;
    /**
     * Clean referral parameters from the current URL
     * Useful for cleaner URLs after capturing attribution
     */
    cleanURL(): void;
    private ensureInitialized;
    private log;
}
declare const AskRah: AskRahBrowser;

export { AskRah, AskRahBrowser, type AskRahBrowserConfig, type AttributionData, type AttributionResult, AttributionStorage, ServerAttributionStorage, URLDetector };
