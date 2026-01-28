import type { AttributionData } from './types'

/**
 * Default URL parameter names
 */
const DEFAULT_REF_PARAM = 'ref'
const DEFAULT_CLICK_ID_PARAM = 'click_id'

/**
 * Detects referral parameters from the current URL
 */
export class URLDetector {
  private refParam: string
  private clickIdParam: string
  private debug: boolean

  constructor(
    refParam: string = DEFAULT_REF_PARAM,
    clickIdParam: string = DEFAULT_CLICK_ID_PARAM,
    debug: boolean = false
  ) {
    this.refParam = refParam
    this.clickIdParam = clickIdParam
    this.debug = debug
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[AskRah]', ...args)
    }
  }

  /**
   * Check if the current URL has referral parameters
   */
  hasReferralParams(): boolean {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.has(this.refParam)
  }

  /**
   * Extract referral data from the current URL
   */
  detect(): AttributionData | null {
    if (typeof window === 'undefined') {
      this.log('Window not available (SSR)')
      return null
    }

    const params = new URLSearchParams(window.location.search)
    const refCode = params.get(this.refParam)

    if (!refCode) {
      this.log('No ref param found in URL')
      return null
    }

    const clickId = params.get(this.clickIdParam)

    const data: AttributionData = {
      ref_code: refCode,
      click_id: clickId || undefined,
      timestamp: Date.now(),
      source: 'url_param',
    }

    this.log('Detected referral params:', data)
    return data
  }

  /**
   * Clean referral parameters from the URL (optional, for cleaner URLs)
   * Note: This modifies the browser history without page reload
   */
  cleanURL(): void {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    let modified = false

    if (url.searchParams.has(this.refParam)) {
      url.searchParams.delete(this.refParam)
      modified = true
    }
    if (url.searchParams.has(this.clickIdParam)) {
      url.searchParams.delete(this.clickIdParam)
      modified = true
    }

    if (modified) {
      const newURL = url.toString()
      this.log('Cleaning URL to:', newURL)
      window.history.replaceState({}, '', newURL)
    }
  }
}
