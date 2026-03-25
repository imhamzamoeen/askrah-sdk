"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/browser/index.ts
var browser_exports = {};
__export(browser_exports, {
  AskRah: () => AskRah,
  AskRahBrowser: () => AskRahBrowser,
  AttributionStorage: () => AttributionStorage,
  ServerAttributionStorage: () => ServerAttributionStorage,
  URLDetector: () => URLDetector
});
module.exports = __toCommonJS(browser_exports);

// src/browser/storage.ts
var DEFAULT_EXPIRY_DAYS = 30;
function isLocalStorageAvailable() {
  try {
    const test = "__askrah_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
function isCookieAvailable() {
  try {
    document.cookie = "__askrah_test__=1; SameSite=Lax";
    const result = document.cookie.includes("__askrah_test__");
    document.cookie = "__askrah_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    return result;
  } catch {
    return false;
  }
}
function setCookie(name, value, days) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
function deleteCookie(name) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
var AttributionStorage = class {
  constructor(prefix = "askrah", cookieExpiry = DEFAULT_EXPIRY_DAYS, debug = false) {
    this.prefix = prefix;
    this.cookieExpiry = cookieExpiry;
    this.debug = debug;
  }
  log(...args) {
    if (this.debug) {
      console.log("[AskRah]", ...args);
    }
  }
  getStorageKey() {
    return `${this.prefix}_attribution`;
  }
  getCookieName() {
    return `${this.prefix}_ref`;
  }
  /**
   * Save attribution data to storage
   */
  save(data) {
    this.log("Saving attribution:", data);
    if (isLocalStorageAvailable()) {
      try {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
        this.log("Saved to localStorage");
        return true;
      } catch (e) {
        this.log("localStorage save failed:", e);
      }
    }
    if (isCookieAvailable()) {
      try {
        setCookie(this.getCookieName(), data.ref_code, this.cookieExpiry);
        if (data.click_id) {
          setCookie(`${this.prefix}_click_id`, data.click_id, this.cookieExpiry);
        }
        this.log("Saved to cookie");
        return true;
      } catch (e) {
        this.log("Cookie save failed:", e);
      }
    }
    this.log("No storage available");
    return false;
  }
  /**
   * Load attribution data from storage
   */
  load() {
    if (isLocalStorageAvailable()) {
      try {
        const stored = localStorage.getItem(this.getStorageKey());
        if (stored) {
          const data = JSON.parse(stored);
          this.log("Loaded from localStorage:", data);
          return data;
        }
      } catch (e) {
        this.log("localStorage load failed:", e);
      }
    }
    if (isCookieAvailable()) {
      const refCode = getCookie(this.getCookieName());
      if (refCode) {
        const clickId = getCookie(`${this.prefix}_click_id`);
        const data = {
          ref_code: refCode,
          click_id: clickId || void 0,
          timestamp: Date.now(),
          // Unknown original timestamp
          source: "url_param"
        };
        this.log("Loaded from cookie:", data);
        return data;
      }
    }
    this.log("No attribution data found");
    return null;
  }
  /**
   * Clear attribution data from storage
   */
  clear() {
    this.log("Clearing attribution data");
    if (isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(this.getStorageKey());
      } catch {
      }
    }
    if (isCookieAvailable()) {
      deleteCookie(this.getCookieName());
      deleteCookie(`${this.prefix}_click_id`);
    }
  }
  /**
   * Check if attribution data exists
   */
  hasData() {
    return this.load() !== null;
  }
};
var ServerAttributionStorage = class {
  constructor(endpoint, debug = false) {
    this.endpoint = endpoint;
    this.debug = debug;
  }
  log(...args) {
    if (this.debug) {
      console.log("[AskRah]", ...args);
    }
  }
  /**
   * POST the ref data to the server endpoint to set the HttpOnly cookie.
   */
  async save(data) {
    this.log("Saving attribution via server:", data);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_code: data.ref_code,
          click_id: data.click_id
        }),
        credentials: "same-origin"
      });
      if (!response.ok) {
        this.log("Server save failed:", response.status);
        return false;
      }
      this.log("Saved via server successfully");
      return true;
    } catch (e) {
      this.log("Server save error:", e);
      return false;
    }
  }
  /**
   * HttpOnly cookie cannot be read by JavaScript.
   * Use getRefFromRequest() server-side instead.
   */
  load() {
    this.log(
      "Server mode: cookie is HttpOnly, use getRefFromRequest() server-side"
    );
    return null;
  }
  /**
   * Clear the cookie via the server endpoint.
   */
  async clear() {
    this.log("Clearing attribution via server");
    try {
      await fetch(this.endpoint, {
        method: "DELETE",
        credentials: "same-origin"
      });
    } catch (e) {
      this.log("Server clear error:", e);
    }
  }
  /**
   * Cannot determine presence of HttpOnly cookie from JavaScript.
   */
  hasData() {
    this.log("Server mode: cannot check HttpOnly cookie from JavaScript");
    return false;
  }
};

// src/browser/detector.ts
var DEFAULT_REF_PARAM = "ref";
var DEFAULT_CLICK_ID_PARAM = "click_id";
var URLDetector = class {
  constructor(refParam = DEFAULT_REF_PARAM, clickIdParam = DEFAULT_CLICK_ID_PARAM, debug = false) {
    this.refParam = refParam;
    this.clickIdParam = clickIdParam;
    this.debug = debug;
  }
  log(...args) {
    if (this.debug) {
      console.log("[AskRah]", ...args);
    }
  }
  /**
   * Check if the current URL has referral parameters
   */
  hasReferralParams() {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has(this.refParam);
  }
  /**
   * Extract referral data from the current URL
   */
  detect() {
    if (typeof window === "undefined") {
      this.log("Window not available (SSR)");
      return null;
    }
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get(this.refParam);
    if (!refCode) {
      this.log("No ref param found in URL");
      return null;
    }
    const clickId = params.get(this.clickIdParam);
    const data = {
      ref_code: refCode,
      click_id: clickId || void 0,
      timestamp: Date.now(),
      source: "url_param"
    };
    this.log("Detected referral params:", data);
    return data;
  }
  /**
   * Clean referral parameters from the URL (optional, for cleaner URLs)
   * Note: This modifies the browser history without page reload
   */
  cleanURL() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    let modified = false;
    if (url.searchParams.has(this.refParam)) {
      url.searchParams.delete(this.refParam);
      modified = true;
    }
    if (url.searchParams.has(this.clickIdParam)) {
      url.searchParams.delete(this.clickIdParam);
      modified = true;
    }
    if (modified) {
      const newURL = url.toString();
      this.log("Cleaning URL to:", newURL);
      window.history.replaceState({}, "", newURL);
    }
  }
};

// src/browser/index.ts
var DEFAULT_CONFIG = {
  autoDetect: true,
  cookieExpiry: 30,
  storagePrefix: "askrah",
  debug: false,
  refParam: "ref",
  clickIdParam: "click_id",
  trackEndpoint: ""
};
var AskRahBrowser = class {
  constructor() {
    this.config = DEFAULT_CONFIG;
    this.storage = null;
    this.serverStorage = null;
    this.detector = null;
    this.initialized = false;
    this.isServerMode = false;
  }
  /**
   * Initialize the AskRah browser SDK
   *
   * @param config - Configuration options
   */
  init(config = {}) {
    if (this.initialized) {
      this.log("Already initialized");
      return;
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log("Initializing with config:", this.config);
    if (this.config.trackEndpoint) {
      this.isServerMode = true;
      this.serverStorage = new ServerAttributionStorage(
        this.config.trackEndpoint,
        this.config.debug
      );
      this.log("Using server mode with endpoint:", this.config.trackEndpoint);
    } else {
      this.storage = new AttributionStorage(
        this.config.storagePrefix,
        this.config.cookieExpiry,
        this.config.debug
      );
    }
    this.detector = new URLDetector(
      this.config.refParam,
      this.config.clickIdParam,
      this.config.debug
    );
    if (this.config.autoDetect) {
      this.detectAndStore();
    }
    this.initialized = true;
    this.log("Initialized successfully");
  }
  /**
   * Detect ref params from URL and store them
   * Implements "last-click wins" - always overwrites existing data
   */
  detectAndStore() {
    if (!this.detector) return;
    const detected = this.detector.detect();
    if (!detected) return;
    this.log("Detected referral, storing (last-click wins)");
    if (this.isServerMode && this.serverStorage) {
      this.serverStorage.save(detected).catch((e) => {
        this.log("Server storage save failed:", e);
      });
    } else if (this.storage) {
      this.storage.save(detected);
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
  getRefCode() {
    this.ensureInitialized();
    if (this.isServerMode) {
      this.log(
        "Server mode: ref code is in HttpOnly cookie. Use getRefFromRequest() server-side."
      );
      return null;
    }
    const data = this.storage?.load();
    return data?.ref_code ?? null;
  }
  /**
   * Get the stored click ID
   *
   * In server mode, returns null because the HttpOnly cookie
   * cannot be read by JavaScript. Use getRefFromRequest() server-side.
   *
   * @returns The click ID or null if none stored
   */
  getClickId() {
    this.ensureInitialized();
    if (this.isServerMode) {
      this.log(
        "Server mode: click ID is in HttpOnly cookie. Use getRefFromRequest() server-side."
      );
      return null;
    }
    const data = this.storage?.load();
    return data?.click_id ?? null;
  }
  /**
   * Get full attribution data
   *
   * In server mode, returns nulls because the HttpOnly cookie
   * cannot be read by JavaScript. Use getRefFromRequest() server-side.
   *
   * @returns Attribution result with all available data
   */
  getAttribution() {
    this.ensureInitialized();
    if (this.isServerMode) {
      this.log(
        "Server mode: attribution is in HttpOnly cookie. Use getRefFromRequest() server-side."
      );
      return { refCode: null, clickId: null, timestamp: null };
    }
    const data = this.storage?.load();
    return {
      refCode: data?.ref_code ?? null,
      clickId: data?.click_id ?? null,
      timestamp: data?.timestamp ?? null
    };
  }
  /**
   * Manually set the referral code
   * Useful for custom attribution scenarios
   *
   * @param refCode - The referral code to store
   * @param clickId - Optional click ID
   */
  setRefCode(refCode, clickId) {
    this.ensureInitialized();
    const data = {
      ref_code: refCode,
      click_id: clickId,
      timestamp: Date.now(),
      source: "manual"
    };
    if (this.isServerMode && this.serverStorage) {
      this.serverStorage.save(data).catch((e) => {
        this.log("Server storage save failed:", e);
      });
    } else {
      this.storage?.save(data);
    }
  }
  /**
   * Clear all stored attribution data
   */
  clearAttribution() {
    this.ensureInitialized();
    if (this.isServerMode && this.serverStorage) {
      this.serverStorage.clear().catch((e) => {
        this.log("Server storage clear failed:", e);
      });
    } else {
      this.storage?.clear();
    }
    this.log("Attribution cleared");
  }
  /**
   * Check if there is stored attribution data
   *
   * In server mode, always returns false because the HttpOnly cookie
   * cannot be checked by JavaScript.
   */
  hasAttribution() {
    this.ensureInitialized();
    if (this.isServerMode) {
      this.log(
        "Server mode: cannot check HttpOnly cookie from JavaScript"
      );
      return false;
    }
    return this.storage?.hasData() ?? false;
  }
  /**
   * Clean referral parameters from the current URL
   * Useful for cleaner URLs after capturing attribution
   */
  cleanURL() {
    this.ensureInitialized();
    this.detector?.cleanURL();
  }
  ensureInitialized() {
    if (!this.initialized) {
      this.init();
    }
  }
  log(...args) {
    if (this.config.debug) {
      console.log("[AskRah]", ...args);
    }
  }
};
var AskRah = new AskRahBrowser();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AskRah,
  AskRahBrowser,
  AttributionStorage,
  ServerAttributionStorage,
  URLDetector
});
