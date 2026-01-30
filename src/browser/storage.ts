import type { AttributionData } from './types'

const DEFAULT_EXPIRY_DAYS = 30

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__askrah_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Check if cookies are available
 */
function isCookieAvailable(): boolean {
  try {
    document.cookie = '__askrah_test__=1; SameSite=Lax'
    const result = document.cookie.includes('__askrah_test__')
    document.cookie = '__askrah_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    return result
  } catch {
    return false
  }
}

/**
 * Set a cookie with the given value
 */
function setCookie(name: string, value: string, days: number): void {
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

/**
 * Storage manager for attribution data
 * Uses localStorage as primary, cookie as fallback
 */
export class AttributionStorage {
  private prefix: string
  private cookieExpiry: number
  private debug: boolean

  constructor(
    prefix: string = 'askrah',
    cookieExpiry: number = DEFAULT_EXPIRY_DAYS,
    debug: boolean = false
  ) {
    this.prefix = prefix
    this.cookieExpiry = cookieExpiry
    this.debug = debug
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[AskRah]', ...args)
    }
  }

  private getStorageKey(): string {
    return `${this.prefix}_attribution`
  }

  private getCookieName(): string {
    return `${this.prefix}_ref`
  }

  /**
   * Save attribution data to storage
   */
  save(data: AttributionData): boolean {
    this.log('Saving attribution:', data)

    // Try localStorage first
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(data))
        this.log('Saved to localStorage')
        return true
      } catch (e) {
        this.log('localStorage save failed:', e)
      }
    }

    // Fallback to cookie (simplified format)
    if (isCookieAvailable()) {
      try {
        // Store ref_code in cookie as fallback
        setCookie(this.getCookieName(), data.ref_code, this.cookieExpiry)
        // Store click_id in separate cookie if present
        if (data.click_id) {
          setCookie(`${this.prefix}_click_id`, data.click_id, this.cookieExpiry)
        }
        this.log('Saved to cookie')
        return true
      } catch (e) {
        this.log('Cookie save failed:', e)
      }
    }

    this.log('No storage available')
    return false
  }

  /**
   * Load attribution data from storage
   */
  load(): AttributionData | null {
    // Try localStorage first
    if (isLocalStorageAvailable()) {
      try {
        const stored = localStorage.getItem(this.getStorageKey())
        if (stored) {
          const data = JSON.parse(stored) as AttributionData
          this.log('Loaded from localStorage:', data)
          return data
        }
      } catch (e) {
        this.log('localStorage load failed:', e)
      }
    }

    // Fallback to cookie
    if (isCookieAvailable()) {
      const refCode = getCookie(this.getCookieName())
      if (refCode) {
        const clickId = getCookie(`${this.prefix}_click_id`)
        const data: AttributionData = {
          ref_code: refCode,
          click_id: clickId || undefined,
          timestamp: Date.now(), // Unknown original timestamp
          source: 'url_param',
        }
        this.log('Loaded from cookie:', data)
        return data
      }
    }

    this.log('No attribution data found')
    return null
  }

  /**
   * Clear attribution data from storage
   */
  clear(): void {
    this.log('Clearing attribution data')

    // Clear localStorage
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(this.getStorageKey())
      } catch {
        // Ignore errors
      }
    }

    // Clear cookies
    if (isCookieAvailable()) {
      deleteCookie(this.getCookieName())
      deleteCookie(`${this.prefix}_click_id`)
    }
  }

  /**
   * Check if attribution data exists
   */
  hasData(): boolean {
    return this.load() !== null
  }
}

/**
 * Server-side storage that delegates to an HTTP endpoint for HttpOnly cookie management.
 * Used when trackEndpoint is configured.
 */
export class ServerAttributionStorage {
  private endpoint: string
  private debug: boolean

  constructor(endpoint: string, debug: boolean = false) {
    this.endpoint = endpoint
    this.debug = debug
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[AskRah]', ...args)
    }
  }

  /**
   * POST the ref data to the server endpoint to set the HttpOnly cookie.
   */
  async save(data: AttributionData): Promise<boolean> {
    this.log('Saving attribution via server:', data)
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref_code: data.ref_code,
          click_id: data.click_id,
        }),
        credentials: 'same-origin',
      })

      if (!response.ok) {
        this.log('Server save failed:', response.status)
        return false
      }

      this.log('Saved via server successfully')
      return true
    } catch (e) {
      this.log('Server save error:', e)
      return false
    }
  }

  /**
   * HttpOnly cookie cannot be read by JavaScript.
   * Use getRefFromRequest() server-side instead.
   */
  load(): AttributionData | null {
    this.log(
      'Server mode: cookie is HttpOnly, use getRefFromRequest() server-side'
    )
    return null
  }

  /**
   * Clear the cookie via the server endpoint.
   */
  async clear(): Promise<void> {
    this.log('Clearing attribution via server')
    try {
      await fetch(this.endpoint, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
    } catch (e) {
      this.log('Server clear error:', e)
    }
  }

  /**
   * Cannot determine presence of HttpOnly cookie from JavaScript.
   */
  hasData(): boolean {
    this.log('Server mode: cannot check HttpOnly cookie from JavaScript')
    return false
  }
}
