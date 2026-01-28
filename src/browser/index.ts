import type {
  AskRahBrowserConfig,
  AttributionData,
  AttributionResult,
} from './types'
import { AttributionStorage } from './storage'
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
 * // Initialize (auto-detects ref params from URL)
 * AskRah.init();
 *
 * // Get the referral code during signup
 * const refCode = AskRah.getRefCode();
 * if (refCode) {
 *   await api.signup({ userId, email, refCode });
 * }
 * ```
 */
class AskRahBrowser {
  private config: Required<AskRahBrowserConfig> = DEFAULT_CONFIG
  private storage: AttributionStorage | null = null
  private detector: URLDetector | null = null
  private initialized = false

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

    // Create storage and detector instances
    this.storage = new AttributionStorage(
      this.config.storagePrefix,
      this.config.cookieExpiry,
      this.config.debug
    )

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
    if (!this.detector || !this.storage) return

    const detected = this.detector.detect()
    if (detected) {
      this.log('Detected referral, storing (last-click wins)')
      this.storage.save(detected)
    }
  }

  /**
   * Get the stored referral code
   *
   * @returns The referral code or null if none stored
   */
  getRefCode(): string | null {
    this.ensureInitialized()
    const data = this.storage?.load()
    return data?.ref_code ?? null
  }

  /**
   * Get the stored click ID
   *
   * @returns The click ID or null if none stored
   */
  getClickId(): string | null {
    this.ensureInitialized()
    const data = this.storage?.load()
    return data?.click_id ?? null
  }

  /**
   * Get full attribution data
   *
   * @returns Attribution result with all available data
   */
  getAttribution(): AttributionResult {
    this.ensureInitialized()
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
    this.storage?.save({
      ref_code: refCode,
      click_id: clickId,
      timestamp: Date.now(),
      source: 'manual',
    })
  }

  /**
   * Clear all stored attribution data
   */
  clearAttribution(): void {
    this.ensureInitialized()
    this.storage?.clear()
    this.log('Attribution cleared')
  }

  /**
   * Check if there is stored attribution data
   */
  hasAttribution(): boolean {
    this.ensureInitialized()
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
export { AskRahBrowser, AttributionStorage, URLDetector }
