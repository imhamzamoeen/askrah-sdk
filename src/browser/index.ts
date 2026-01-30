import type {
  AskRahBrowserConfig,
  AttributionData,
  AttributionResult,
} from './types'
import { AttributionStorage, ServerAttributionStorage } from './storage'
import { URLDetector } from './detector'

// Re-export types
export type { AskRahBrowserConfig, AttributionData, AttributionResult }

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<AskRahBrowserConfig> = {
  autoDetect: true,
  cookieExpiry: 30,
  storagePrefix: 'askrah',
  debug: false,
  refParam: 'ref',
  clickIdParam: 'click_id',
  trackEndpoint: '',
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
class AskRahBrowser {
  private config: Required<AskRahBrowserConfig> = DEFAULT_CONFIG
  private storage: AttributionStorage | null = null
  private serverStorage: ServerAttributionStorage | null = null
  private detector: URLDetector | null = null
  private initialized = false
  private isServerMode = false

  /**
   * Initialize the AskRah browser SDK
   *
   * @param config - Configuration options
   */
  init(config: AskRahBrowserConfig = {}): void {
    if (this.initialized) {
      this.log('Already initialized')
      return
    }

    // Merge config with defaults
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.log('Initializing with config:', this.config)

    // Determine storage mode
    if (this.config.trackEndpoint) {
      this.isServerMode = true
      this.serverStorage = new ServerAttributionStorage(
        this.config.trackEndpoint,
        this.config.debug
      )
      this.log('Using server mode with endpoint:', this.config.trackEndpoint)
    } else {
      this.storage = new AttributionStorage(
        this.config.storagePrefix,
        this.config.cookieExpiry,
        this.config.debug
      )
    }

    this.detector = new URLDetector(
      this.config.refParam,
      this.config.clickIdParam,
      this.config.debug
    )

    // Auto-detect and store ref params if enabled
    if (this.config.autoDetect) {
      this.detectAndStore()
    }

    this.initialized = true
    this.log('Initialized successfully')
  }

  /**
   * Detect ref params from URL and store them
   * Implements "last-click wins" - always overwrites existing data
   */
  private detectAndStore(): void {
    if (!this.detector) return

    const detected = this.detector.detect()
    if (!detected) return

    this.log('Detected referral, storing (last-click wins)')

    if (this.isServerMode && this.serverStorage) {
      this.serverStorage.save(detected).catch((e) => {
        this.log('Server storage save failed:', e)
      })
    } else if (this.storage) {
      this.storage.save(detected)
    }
  }

  /**
   * Get the stored referral code
   *
   * In server mode, returns null because the HttpOnly cookie
   * cannot be read by JavaScript. Use getRefFromRequest() server-side.
   *
   * @returns The referral code or null if none stored
   */
  getRefCode(): string | null {
    this.ensureInitialized()
    if (this.isServerMode) {
      this.log(
        'Server mode: ref code is in HttpOnly cookie. Use getRefFromRequest() server-side.'
      )
      return null
    }
    const data = this.storage?.load()
    return data?.ref_code ?? null
  }

  /**
   * Get the stored click ID
   *
   * In server mode, returns null because the HttpOnly cookie
   * cannot be read by JavaScript. Use getRefFromRequest() server-side.
   *
   * @returns The click ID or null if none stored
   */
  getClickId(): string | null {
    this.ensureInitialized()
    if (this.isServerMode) {
      this.log(
        'Server mode: click ID is in HttpOnly cookie. Use getRefFromRequest() server-side.'
      )
      return null
    }
    const data = this.storage?.load()
    return data?.click_id ?? null
  }

  /**
   * Get full attribution data
   *
   * In server mode, returns nulls because the HttpOnly cookie
   * cannot be read by JavaScript. Use getRefFromRequest() server-side.
   *
   * @returns Attribution result with all available data
   */
  getAttribution(): AttributionResult {
    this.ensureInitialized()
    if (this.isServerMode) {
      this.log(
        'Server mode: attribution is in HttpOnly cookie. Use getRefFromRequest() server-side.'
      )
      return { refCode: null, clickId: null, timestamp: null }
    }
    const data = this.storage?.load()
    return {
      refCode: data?.ref_code ?? null,
      clickId: data?.click_id ?? null,
      timestamp: data?.timestamp ?? null,
    }
  }

  /**
   * Manually set the referral code
   * Useful for custom attribution scenarios
   *
   * @param refCode - The referral code to store
   * @param clickId - Optional click ID
   */
  setRefCode(refCode: string, clickId?: string): void {
    this.ensureInitialized()
    const data: AttributionData = {
      ref_code: refCode,
      click_id: clickId,
      timestamp: Date.now(),
      source: 'manual',
    }

    if (this.isServerMode && this.serverStorage) {
      this.serverStorage.save(data).catch((e) => {
        this.log('Server storage save failed:', e)
      })
    } else {
      this.storage?.save(data)
    }
  }

  /**
   * Clear all stored attribution data
   */
  clearAttribution(): void {
    this.ensureInitialized()
    if (this.isServerMode && this.serverStorage) {
      this.serverStorage.clear().catch((e) => {
        this.log('Server storage clear failed:', e)
      })
    } else {
      this.storage?.clear()
    }
    this.log('Attribution cleared')
  }

  /**
   * Check if there is stored attribution data
   *
   * In server mode, always returns false because the HttpOnly cookie
   * cannot be checked by JavaScript.
   */
  hasAttribution(): boolean {
    this.ensureInitialized()
    if (this.isServerMode) {
      this.log(
        'Server mode: cannot check HttpOnly cookie from JavaScript'
      )
      return false
    }
    return this.storage?.hasData() ?? false
  }

  /**
   * Clean referral parameters from the current URL
   * Useful for cleaner URLs after capturing attribution
   */
  cleanURL(): void {
    this.ensureInitialized()
    this.detector?.cleanURL()
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      // Auto-initialize with defaults if not done
      this.init()
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[AskRah]', ...args)
    }
  }
}

// Export singleton instance
export const AskRah = new AskRahBrowser()

// Also export class for advanced usage
export {
  AskRahBrowser,
  AttributionStorage,
  ServerAttributionStorage,
  URLDetector,
}
